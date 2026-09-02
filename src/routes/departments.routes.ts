import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { ADMIN_ROLES } from "../utils/enums";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true, meetings: true } } },
  });
  res.json(departments);
});

const upsertSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(10),
  description: z.string().optional(),
});

router.post("/", requireRole(...ADMIN_ROLES), async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Provide a department name and short code." });
  try {
    const dept = await prisma.department.create({ data: parsed.data });
    res.status(201).json(dept);
  } catch {
    res.status(409).json({ error: "A department with that name or code already exists." });
  }
});

router.put("/:id", requireRole(...ADMIN_ROLES), async (req, res) => {
  const parsed = upsertSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid department data." });
  try {
    const dept = await prisma.department.update({ where: { id: req.params.id }, data: parsed.data });
    res.json(dept);
  } catch {
    res.status(404).json({ error: "Department not found." });
  }
});

router.patch("/:id/toggle-active", requireRole(...ADMIN_ROLES), async (req, res) => {
  const dept = await prisma.department.findUnique({ where: { id: req.params.id } });
  if (!dept) return res.status(404).json({ error: "Department not found." });
  const updated = await prisma.department.update({
    where: { id: req.params.id },
    data: { isActive: !dept.isActive },
  });
  res.json(updated);
});

router.delete("/:id", requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    await prisma.department.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(409).json({ error: "This department is in use and cannot be deleted. Deactivate it instead." });
  }
});

export default router;
