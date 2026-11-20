import { timingSafeEqual } from "node:crypto";
import { Router } from "express";

export const staffRouter = Router();

function same(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

staffRouter.post("/login", (req, res) => {
  const name = String(req.body?.name || "").trim();
  const password = String(req.body?.password || "");
  const expectedName = process.env.STAFF_NAME || "medical";
  const expectedPassword = process.env.STAFF_PASSWORD || "shis-room";
  if (!same(name, expectedName) || !same(password, expectedPassword)) {
    res.status(401).json({ error: "That name and password do not open the medical room." });
    return;
  }
  res.json({ ok: true });
});
