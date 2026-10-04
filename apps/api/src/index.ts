import "./tz.ts";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import express, { type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";
import { AIError } from "./ai/index.ts";
import { requireMember } from "./auth.ts";
import { initPush, startReminderScheduler } from "./push.ts";
import { aiRouter } from "./routes/ai.ts";
import { audioRouter } from "./routes/audio.ts";
import { authRouter } from "./routes/auth.ts";
import { familyRouter } from "./routes/family.ts";
import { pushRouter } from "./routes/push.ts";
import { studyRouter } from "./routes/study.ts";

const app = express();
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});
app.use("/api/audio", audioRouter);
app.use("/api", authRouter);
app.use("/api/family", requireMember, familyRouter);
app.use("/api/study", requireMember, studyRouter);
app.use("/api/ai", requireMember, aiRouter);
app.use("/api/push", requireMember, pushRouter);

// Em produção a API também serve o build do front (um único container)
const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/dist");
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) return res.status(400).json({ error: err.issues[0]?.message ?? "Dados inválidos." });
  if (err instanceof AIError) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Erro inesperado no servidor." });
});

await initPush();
startReminderScheduler();

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API ouvindo em http://localhost:${port} (fuso ${process.env.TZ})`));
