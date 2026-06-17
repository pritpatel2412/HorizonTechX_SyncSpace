import { Server as SocketServer, type Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { verifyToken } from "../lib/auth.js";
import { logger } from "../lib/logger.js";
import { db, roomsTable, roomParticipantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import Groq from "groq-sdk";

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;


interface RoomUser {
  socketId: string;
  userId: number;
  userName: string;
}

const roomUsers = new Map<string, Map<string, RoomUser>>();
const roomWhiteboards = new Map<string, string>(); // roomId → latest canvasJSON
const roomNotes = new Map<string, string>();       // roomId → latest shared notes
const roomChats = new Map<string, string[]>();     // roomId → chat transcript log

export function initSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const payload = verifyToken(token);
      (socket as Socket & { user: ReturnType<typeof verifyToken> }).user = payload;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = (socket as Socket & { user: { userId: number; name: string; email: string } }).user;
    logger.info({ socketId: socket.id, userId: user?.userId }, "Socket connected");

    socket.on("join-room", async (roomId: string, userId: number, userName: string) => {
      logger.info({ socketId: socket.id, roomId, userId, userName }, "join-room");

      socket.join(roomId);

      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Map());
      }
      if (!roomChats.has(roomId)) {
        roomChats.set(roomId, []);
      }
      const room = roomUsers.get(roomId)!;

      // Evict any ghost socket from the same userId (navigation race condition)
      for (const [existingSocketId, existingUser] of room.entries()) {
        if (existingUser.userId === userId && existingSocketId !== socket.id) {
          room.delete(existingSocketId);
          logger.info({ evicted: existingSocketId, userId }, "evicted ghost socket");
          break;
        }
      }

      const usersInRoom = [...room.values()];

      room.set(socket.id, { socketId: socket.id, userId, userName });

      await db
        .insert(roomParticipantsTable)
        .values({ roomId, userId, userName })
        .onConflictDoNothing();

      await db
        .update(roomsTable)
        .set({ participantCount: room.size })
        .where(eq(roomsTable.roomId, roomId));

      socket.emit("all-users", usersInRoom);

      // Replay current whiteboard state so the new joiner sees existing drawings
      const existingCanvas = roomWhiteboards.get(roomId);
      if (existingCanvas) {
        socket.emit("whiteboard-state", { canvasJSON: existingCanvas });
      }

      // Replay shared meeting notes
      const existingNotes = roomNotes.get(roomId);
      if (existingNotes) {
        socket.emit("notes-state", { notes: existingNotes });
      }

      socket.to(roomId).emit("user-joined-notify", { userId, userName, socketId: socket.id });
    });

    socket.on("send-signal", (data: { to: string; signal: unknown; from: string; userName: string }) => {
      logger.info({ from: data.from, to: data.to }, "send-signal");
      io.to(data.to).emit("user-joined", {
        signal: data.signal,
        callerID: data.from,
        userName: data.userName,
      });
    });

    socket.on("return-signal", (data: { to: string; signal: unknown; callerID: string }) => {
      logger.info({ callerID: data.callerID, to: data.to }, "return-signal");
      io.to(data.to).emit("receiving-returned-signal", {
        id: socket.id,
        signal: data.signal,
      });
    });

    socket.on("chat-message", async (data: { roomId: string; message: string; userName: string; timestamp: string; userId: number }) => {
      logger.info({ roomId: data.roomId, userName: data.userName }, "chat-message");
      
      // Emit the user's message normally
      io.to(data.roomId).emit("receive-message", {
        id: Date.now().toString(),
        message: data.message,
        userName: data.userName,
        userId: data.userId,
        timestamp: data.timestamp,
        read: false,
      });

      // Save to chat history
      if (!roomChats.has(data.roomId)) {
        roomChats.set(data.roomId, []);
      }
      const chatLog = roomChats.get(data.roomId)!;
      chatLog.push(`${data.userName}: ${data.message}`);

      // Check if bot is active in this room
      const room = roomUsers.get(data.roomId);
      const hasBot = room && [...room.values()].some((u) => u.userId === 999);
      if (!hasBot) return;

      const trimmedMsg = data.message.trim();

      // Intercept slash commands
      if (trimmedMsg.startsWith("/")) {
        const command = trimmedMsg.split(" ")[0].toLowerCase();
        
        if (command === "/help") {
          setTimeout(() => {
            io.to(data.roomId).emit("receive-message", {
              id: Date.now().toString(),
              message: "🤖 **SyncBot Commands:**\n- `/help` - Show this help menu\n- `/handraise` - Toggle raising my hand\n- `/draw` - Draw a creative design on the whiteboard\n- `/summarize` - Summarize meeting chat using AI\n- Mention me (e.g. \"hey @SyncBot ...\") to ask questions.",
              userName: "SyncBot (AI)",
              userId: 999,
              timestamp: new Date().toISOString(),
              read: false,
            });
          }, 500);
          return;
        }

        if (command === "/handraise") {
          io.to(data.roomId).emit("hand-raised", { userId: 999, userName: "SyncBot (AI)" });
          setTimeout(() => {
            io.to(data.roomId).emit("receive-message", {
              id: Date.now().toString(),
              message: "✋ I've raised my hand!",
              userName: "SyncBot (AI)",
              userId: 999,
              timestamp: new Date().toISOString(),
              read: false,
            });
          }, 500);
          return;
        }

        if (command === "/draw") {
          const whiteboardJSON = JSON.stringify({
            version: "5.3.0",
            objects: [
              {
                type: "rect",
                left: 150,
                top: 100,
                width: 250,
                height: 150,
                fill: "transparent",
                stroke: "#6366f1",
                strokeWidth: 4,
                rx: 15,
                ry: 15,
              },
              {
                type: "circle",
                left: 450,
                top: 120,
                radius: 80,
                fill: "transparent",
                stroke: "#10b981",
                strokeWidth: 4,
              },
              {
                type: "i-text",
                left: 180,
                top: 150,
                text: "SyncSpace Collaboration!",
                fill: "#e2e8f0",
                fontSize: 16,
                fontFamily: "monospace",
              },
            ],
            background: "#0F1117",
          });
          roomWhiteboards.set(data.roomId, whiteboardJSON);
          io.to(data.roomId).emit("whiteboard-state", { canvasJSON: whiteboardJSON });
          
          setTimeout(() => {
            io.to(data.roomId).emit("receive-message", {
              id: Date.now().toString(),
              message: "🎨 I've drawn a creative design on the whiteboard! Toggle the whiteboard panel to see it.",
              userName: "SyncBot (AI)",
              userId: 999,
              timestamp: new Date().toISOString(),
              read: false,
            });
          }, 500);
          return;
        }

        if (command === "/summarize") {
          io.to(data.roomId).emit("speaker-changed", { userId: 999, active: true });
          io.to(data.roomId).emit("receive-message", {
            id: Date.now().toString(),
            message: "✍️ Generating AI meeting summary from chat logs...",
            userName: "SyncBot (AI)",
            userId: 999,
            timestamp: new Date().toISOString(),
            read: false,
          });

          const summary = await getAISummary(chatLog);
          
          setTimeout(() => {
            io.to(data.roomId).emit("receive-message", {
              id: Date.now().toString(),
              message: `🤖 **AI Meeting Summary:**\n\n${summary}`,
              userName: "SyncBot (AI)",
              userId: 999,
              timestamp: new Date().toISOString(),
              read: false,
            });
            io.to(data.roomId).emit("speaker-changed", { userId: 999, active: false });
          }, 1000);
          return;
        }
      }

      // Check if bot should respond to direct message
      const isMentioned = trimmedMsg.toLowerCase().includes("syncbot") || trimmedMsg.toLowerCase().includes("@bot");
      const isSoloChat = room && room.size === 2; // Only user and bot in the room
      
      if (isMentioned || isSoloChat) {
        // Activate speaking active visualizer for bot
        io.to(data.roomId).emit("speaker-changed", { userId: 999, active: true });

        const reply = await getAIResponse(trimmedMsg, chatLog);

        setTimeout(() => {
          io.to(data.roomId).emit("receive-message", {
            id: Date.now().toString(),
            message: reply,
            userName: "SyncBot (AI)",
            userId: 999,
            timestamp: new Date().toISOString(),
            read: false,
          });
          io.to(data.roomId).emit("speaker-changed", { userId: 999, active: false });
        }, 1500);
      }
    });

    socket.on("whiteboard-update", (data: { roomId: string; canvasJSON: string }) => {
      roomWhiteboards.set(data.roomId, data.canvasJSON);
      socket.to(data.roomId).emit("whiteboard-state", { canvasJSON: data.canvasJSON });
    });

    // Standalone whiteboard page requests current state without triggering join-room
    socket.on("request-whiteboard-state", (roomId: string) => {
      const existing = roomWhiteboards.get(roomId);
      if (existing) {
        socket.emit("whiteboard-state", { canvasJSON: existing });
      }
    });

    // Active speaker detection — broadcast to rest of room
    socket.on("speaking-active", (data: { roomId: string; userId: number; active: boolean }) => {
      socket.to(data.roomId).emit("speaker-changed", { userId: data.userId, active: data.active });
    });

    // Collaborative meeting notes — store + broadcast
    socket.on("notes-update", (data: { roomId: string; notes: string }) => {
      roomNotes.set(data.roomId, data.notes);
      socket.to(data.roomId).emit("notes-state", { notes: data.notes });
    });

    socket.on("hand-raise", (data: { roomId: string; userId: number; userName: string }) => {
      logger.info({ roomId: data.roomId, userId: data.userId }, "hand-raise");
      io.to(data.roomId).emit("hand-raised", { userId: data.userId, userName: data.userName });
    });

    socket.on("screen-share-start", (data: { roomId: string; userId: number; userName: string }) => {
      logger.info({ roomId: data.roomId, userId: data.userId }, "screen-share-start");
      socket.to(data.roomId).emit("screen-sharing", { userId: data.userId, userName: data.userName });
    });

    socket.on("screen-share-stop", (data: { roomId: string }) => {
      logger.info({ roomId: data.roomId }, "screen-share-stop");
      socket.to(data.roomId).emit("screen-share-ended");
    });

    socket.on("add-bot", async (roomId: string) => {
      logger.info({ roomId }, "add-bot");
      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Map());
      }
      const room = roomUsers.get(roomId)!;
      const botSocketId = `bot-${roomId}`;

      // Check if bot already in room
      const hasBot = [...room.values()].some((u) => u.userId === 999);
      if (hasBot) return;

      const botUser = { socketId: botSocketId, userId: 999, userName: "SyncBot (AI)" };
      room.set(botSocketId, botUser);

      await db
        .insert(roomParticipantsTable)
        .values({ roomId, userId: 999, userName: "SyncBot (AI)" })
        .onConflictDoNothing();

      await db
        .update(roomsTable)
        .set({ participantCount: room.size })
        .where(eq(roomsTable.roomId, roomId));

      io.to(roomId).emit("user-joined-notify", { userId: 999, userName: "SyncBot (AI)", socketId: botSocketId });
      io.to(roomId).emit("user-joined", { signal: null, callerID: botSocketId, userName: "SyncBot (AI)", userId: 999, isBot: true });
      io.to(roomId).emit("all-users", [...room.values()]);

      setTimeout(() => {
        io.to(roomId).emit("receive-message", {
          id: Date.now().toString(),
          message: "👋 Hello everyone! I am SyncBot, your AI Assistant. Mention me or ask me a question, or type `/help` to see what I can do!",
          userName: "SyncBot (AI)",
          userId: 999,
          timestamp: new Date().toISOString(),
          read: false,
        });
      }, 1000);
    });

    socket.on("leave-bot", async (roomId: string) => {
      logger.info({ roomId }, "leave-bot");
      const room = roomUsers.get(roomId);
      if (room) {
        const botSocketId = `bot-${roomId}`;
        if (room.has(botSocketId)) {
          room.delete(botSocketId);

          await db
            .update(roomsTable)
            .set({ participantCount: room.size })
            .where(eq(roomsTable.roomId, roomId));

          io.to(roomId).emit("user-left", { userId: 999, socketId: botSocketId });
          io.to(roomId).emit("all-users", [...room.values()]);
        }
      }
    });

    socket.on("leave-room", async (roomId: string) => {
      logger.info({ socketId: socket.id, roomId }, "leave-room");
      await handleLeave(socket, roomId, io);
    });

    socket.on("disconnecting", async () => {
      logger.info({ socketId: socket.id }, "Socket disconnecting");
      for (const roomId of socket.rooms) {
        if (roomId !== socket.id) {
          await handleLeave(socket, roomId, io);
        }
      }
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}

async function handleLeave(socket: Socket, roomId: string, io: SocketServer) {
  socket.leave(roomId);

  const room = roomUsers.get(roomId);
  if (room) {
    const userInfo = room.get(socket.id);
    room.delete(socket.id);

    if (room.size === 0) {
      roomUsers.delete(roomId);
      await db
        .update(roomsTable)
        .set({ isActive: false, endedAt: new Date(), participantCount: 0 })
        .where(eq(roomsTable.roomId, roomId));
    } else {
      await db
        .update(roomsTable)
        .set({ participantCount: room.size })
        .where(eq(roomsTable.roomId, roomId));
    }

    if (userInfo) {
      io.to(roomId).emit("user-left", { userId: userInfo.userId, socketId: socket.id });
    }
  }
}

async function getAIResponse(userMessage: string, chatHistory: string[]): Promise<string> {
  if (!groq) {
    return "🤖 AI features are not configured. Please ensure GROQ_API_KEY is set in environment.";
  }
  try {
    const historyContext = chatHistory.slice(-15).join("\n");
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are SyncBot, a helpful real-time AI assistant inside a SyncSpace meeting room. 
Answer the user's questions concisely, helpful, and in a friendly conversational manner. 
Use the recent chat history context if relevant.
Here is the recent room chat history:
${historyContext}`
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 256
    });
    return completion.choices[0]?.message?.content ?? "No response generated.";
  } catch (err) {
    logger.error({ err }, "Bot AI response error");
    return "⚠️ Sorry, I encountered an issue accessing my AI core.";
  }
}

async function getAISummary(chatHistory: string[]): Promise<string> {
  if (!groq) {
    return "🤖 AI features are not configured.";
  }
  try {
    const historyContext = chatHistory.join("\n");
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are SyncBot. Summarize the following meeting chat log. Extract key items, decisions, and action items in a clean, bulleted format."
        },
        {
          role: "user",
          content: `Meeting chat history:\n\n${historyContext}`
        }
      ],
      max_tokens: 512
    });
    return completion.choices[0]?.message?.content ?? "No summary generated.";
  } catch (err) {
    logger.error({ err }, "Bot AI summary error");
    return "⚠️ Sorry, I encountered an issue summarizing the chat.";
  }
}
