import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../utils/jwt";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Enter a valid work email and password." });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email }, include: { department: true } });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  const token = signToken({ userId: user.id, role: user.role, departmentId: user.departmentId });
  const { passwordHash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { department: true },
  });
  if (!user) return res.status(404).json({ error: "User not found." });
  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
});

export default router;
