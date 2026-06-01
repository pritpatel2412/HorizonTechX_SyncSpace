import { Server as SocketServer, type Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { verifyToken } from "../lib/auth.js";
import { logger } from "../lib/logger.js";
import { db, roomsTable, roomParticipantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

interface RoomUser {
  socketId: string;
  userId: number;
  userName: string;
}

const roomUsers = new Map<string, Map<string, RoomUser>>();

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
      const room = roomUsers.get(roomId)!;

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

    socket.on("chat-message", (data: { roomId: string; message: string; userName: string; timestamp: string; userId: number }) => {
      logger.info({ roomId: data.roomId, userName: data.userName }, "chat-message");
      io.to(data.roomId).emit("receive-message", {
        id: Date.now().toString(),
        message: data.message,
        userName: data.userName,
        userId: data.userId,
        timestamp: data.timestamp,
        read: false,
      });
    });

    socket.on("whiteboard-update", (data: { roomId: string; canvasJSON: string }) => {
      socket.to(data.roomId).emit("whiteboard-state", { canvasJSON: data.canvasJSON });
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
