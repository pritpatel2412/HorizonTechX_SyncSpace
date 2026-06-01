import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/healthz", (_req, res): void => {
  res.json({ status: "ok", uptime: process.uptime() });
});

export default router;
