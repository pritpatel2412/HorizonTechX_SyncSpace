import { Router, type IRouter } from "express";
import Groq from "groq-sdk";
import { authMiddleware } from "../lib/auth.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

router.post("/ai/summarize", authMiddleware, async (req, res): Promise<void> => {
  const { messages, roomId } = req.body as { messages?: string[]; roomId?: string };

  if (!messages || messages.length === 0) {
    res.status(400).json({ success: false, message: "Messages are required" });
    return;
  }

  if (!groq) {
    res.status(503).json({ success: false, message: "AI features not configured (GROQ_API_KEY missing)" });
    return;
  }

  const transcript = messages.join("\n");
  req.log.info({ roomId, messageCount: messages.length }, "AI summarize request");

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a professional meeting assistant. Summarize the following meeting chat transcript concisely. Extract key decisions, action items, and important points. Format as: Summary, Key Points (bullet list), Action Items (bullet list).",
        },
        {
          role: "user",
          content: `Meeting transcript:\n\n${transcript}`,
        },
      ],
      max_tokens: 1024,
    });

    const result = completion.choices[0]?.message?.content ?? "No summary generated.";

    const actionItemMatch = result.match(/action items?:?([\s\S]*?)(?=\n\n|\n#|$)/i);
    const actionItems: string[] = [];
    if (actionItemMatch) {
      const itemsText = actionItemMatch[1];
      const items = itemsText.match(/[-•*]\s+(.+)/g) ?? [];
      actionItems.push(...items.map((i) => i.replace(/^[-•*]\s+/, "").trim()));
    }

    res.json({ success: true, result, actionItems });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    logger.error({ err }, "AI summarize error");
    res.status(500).json({ success: false, message });
  }
});

router.post("/ai/ask", authMiddleware, async (req, res): Promise<void> => {
  const { question, context } = req.body as { question?: string; context?: string };

  if (!question) {
    res.status(400).json({ success: false, message: "Question is required" });
    return;
  }

  if (!groq) {
    res.status(503).json({ success: false, message: "AI features not configured (GROQ_API_KEY missing)" });
    return;
  }

  req.log.info({ question: question.slice(0, 80) }, "AI ask request");

  const systemMsg = context
    ? `You are a helpful meeting assistant for SyncSpace. Use this meeting context to answer: ${context}`
    : "You are a helpful meeting assistant for SyncSpace. Answer questions concisely and professionally.";

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: question },
      ],
      max_tokens: 512,
    });

    const result = completion.choices[0]?.message?.content ?? "No response generated.";
    res.json({ success: true, result, actionItems: [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    logger.error({ err }, "AI ask error");
    res.status(500).json({ success: false, message });
  }
});

export { logger };
export default router;
