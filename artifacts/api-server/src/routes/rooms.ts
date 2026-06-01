import { Router, type IRouter } from "express";
import { db, roomsTable, roomParticipantsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware, type AuthedRequest } from "../lib/auth.js";
import { nanoid } from "nanoid";

const router: IRouter = Router();

router.post("/rooms", authMiddleware, async (req, res): Promise<void> => {
  const authed = req as AuthedRequest;
  const { name } = req.body as { name?: string };

  const roomName = name ?? `${authed.user.name}'s Meeting`;
  const roomId = nanoid(8);

  const [room] = await db
    .insert(roomsTable)
    .values({
      roomId,
      name: roomName,
      hostId: authed.user.userId,
      hostName: authed.user.name,
      participantCount: 0,
      isActive: true,
    })
    .returning();

  res.status(201).json({
    id: room.id,
    roomId: room.roomId,
    name: room.name,
    hostId: room.hostId,
    hostName: room.hostName,
    participantCount: room.participantCount,
    isActive: room.isActive,
    createdAt: room.createdAt,
    endedAt: room.endedAt ?? null,
  });
});

router.get("/rooms/history", authMiddleware, async (req, res): Promise<void> => {
  const authed = req as AuthedRequest;

  const participations = await db
    .select()
    .from(roomParticipantsTable)
    .where(eq(roomParticipantsTable.userId, authed.user.userId))
    .orderBy(desc(roomParticipantsTable.joinedAt))
    .limit(20);

  const roomIds = [...new Set(participations.map((p) => p.roomId))];

  if (roomIds.length === 0) {
    res.json([]);
    return;
  }

  const rooms = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.hostId, authed.user.userId))
    .orderBy(desc(roomsTable.createdAt))
    .limit(20);

  res.json(
    rooms.map((r) => ({
      id: r.id,
      roomId: r.roomId,
      name: r.name,
      hostId: r.hostId,
      hostName: r.hostName,
      participantCount: r.participantCount,
      isActive: r.isActive,
      createdAt: r.createdAt,
      endedAt: r.endedAt ?? null,
    }))
  );
});

router.get("/rooms/:roomId", authMiddleware, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId;

  const [room] = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.roomId, rawId))
    .limit(1);

  if (!room) {
    res.status(404).json({ success: false, message: "Room not found" });
    return;
  }

  res.json({
    id: room.id,
    roomId: room.roomId,
    name: room.name,
    hostId: room.hostId,
    hostName: room.hostName,
    participantCount: room.participantCount,
    isActive: room.isActive,
    createdAt: room.createdAt,
    endedAt: room.endedAt ?? null,
  });
});

export default router;
