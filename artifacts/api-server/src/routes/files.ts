import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { db, filesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware, type AuthedRequest } from "../lib/auth.js";
import { upload, UPLOAD_DIR } from "../lib/uploads.js";

const router: IRouter = Router();

router.post(
  "/files/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res): Promise<void> => {
    const authed = req as AuthedRequest;

    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }

    const { roomId } = req.body as { roomId?: string };
    const fileId = uuidv4();

    const [record] = await db
      .insert(filesTable)
      .values({
        fileId,
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedBy: authed.user.userId,
        uploaderName: authed.user.name,
        roomId: roomId ?? null,
      })
      .returning();

    res.status(201).json({
      id: record.id,
      fileId: record.fileId,
      originalName: record.originalName,
      mimeType: record.mimeType,
      size: record.size,
      uploadedBy: record.uploadedBy,
      uploaderName: record.uploaderName,
      roomId: record.roomId,
      createdAt: record.createdAt,
    });
  }
);

router.get("/files", authMiddleware, async (req, res): Promise<void> => {
  const { roomId } = req.query as { roomId?: string };

  let records;
  if (roomId) {
    records = await db.select().from(filesTable).where(eq(filesTable.roomId, roomId));
  } else {
    records = await db.select().from(filesTable);
  }

  res.json(
    records.map((r) => ({
      id: r.id,
      fileId: r.fileId,
      originalName: r.originalName,
      mimeType: r.mimeType,
      size: r.size,
      uploadedBy: r.uploadedBy,
      uploaderName: r.uploaderName,
      roomId: r.roomId,
      createdAt: r.createdAt,
    }))
  );
});

router.get("/files/:fileId", authMiddleware, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;

  const [record] = await db
    .select()
    .from(filesTable)
    .where(eq(filesTable.fileId, rawId))
    .limit(1);

  if (!record) {
    res.status(404).json({ success: false, message: "File not found" });
    return;
  }

  const filePath = path.join(UPLOAD_DIR, record.storedName);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ success: false, message: "File not found on disk" });
    return;
  }

  res.setHeader("Content-Disposition", `attachment; filename="${record.originalName}"`);
  res.setHeader("Content-Type", record.mimeType);
  fs.createReadStream(filePath).pipe(res);
});

export default router;
