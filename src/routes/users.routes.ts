import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { ADMIN_ROLES, ROLES } from "../utils/enums";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const { departmentId, role, q } = req.query;
  const users = await prisma.user.findMany({
    where: {
      departmentId: typeof departmentId === "string" ? departmentId : undefined,
      role: typeof role === "string" ? role : undefined,
      name: typeof q === "string" && q ? { contains: q } : undefined,
    },
    include: { department: true },
    orderBy: { name: "asc" },
  });
  res.json((users as any[]).map(({ passwordHash, ...u }) => u));
});

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(ROLES),
  departmentId: z.string().min(1),
  jobTitle: z.string().optional(),
});

router.post("/", requireRole(...ADMIN_ROLES), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Check the name, email, password (6+ chars), role and department." });
  }
  const { password, ...rest } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({ data: { ...rest, passwordHash } });
    const { passwordHash: _, ...safe } = user;
    res.status(201).json(safe);
  } catch {
    res.status(409).json({ error: "A user with that email already exists." });
  }
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(ROLES).optional(),
  departmentId: z.string().optional(),
  jobTitle: z.string().optional(),
  isActive: z.boolean().optional(),
});

router.put("/:id", requireRole(...ADMIN_ROLES), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid user update." });
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: parsed.data });
    const { passwordHash, ...safe } = user;
    res.json(safe);
  } catch {
    res.status(404).json({ error: "User not found." });
  }
});

export default router;
