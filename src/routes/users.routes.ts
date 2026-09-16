import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { ADMIN_ROLES, ROLES, USER_STATUSES } from "../utils/enums";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const { departmentId, role, status, q } = req.query;
  const users = await prisma.user.findMany({
    where: {
      departmentId: typeof departmentId === "string" ? departmentId : undefined,
      role: typeof role === "string" ? role : undefined,
      status: typeof status === "string" ? status : undefined,
      name: typeof q === "string" && q ? { contains: q, mode: "insensitive" } : undefined,
    },
    include: { department: true },
    orderBy: { name: "asc" },
  });
  res.json((users as any[]).map(({ passwordHash, ...u }) => u));
});

router.get("/:id", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { department: true },
  });
  if (!user) return res.status(404).json({ error: "User not found." });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  password: z.string().min(6),
  role: z.enum(ROLES),
  departmentId: z.string().min(1),
  jobTitle: z.string().optional().nullable(),
  status: z.enum(USER_STATUSES).optional().default("ACTIVE"),
  permissions: z.union([z.array(z.string()), z.string()]).optional().nullable(),
  responsibilities: z.string().optional().nullable(),
});

router.post("/", requireRole(...ADMIN_ROLES), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Check the full name, email, password (6+ chars), role, and department.",
      details: parsed.error.format(),
    });
  }
  const { password, permissions, status, ...rest } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);
  const userStatus = status || "ACTIVE";
  const permissionsStr = Array.isArray(permissions)
    ? JSON.stringify(permissions)
    : (typeof permissions === "string" ? permissions : null);

  try {
    const user = await prisma.user.create({
      data: {
        ...rest,
        status: userStatus,
        isActive: userStatus === "ACTIVE",
        permissions: permissionsStr,
        passwordHash,
      },
      include: { department: true },
    });
    const { passwordHash: _, ...safe } = user;
    res.status(201).json(safe);
  } catch (e: any) {
    res.status(409).json({ error: "A user with that email already exists." });
  }
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  password: z.string().min(6).optional(),
  role: z.enum(ROLES).optional(),
  departmentId: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  status: z.enum(USER_STATUSES).optional(),
  isActive: z.boolean().optional(),
  permissions: z.union([z.array(z.string()), z.string()]).optional().nullable(),
  responsibilities: z.string().optional().nullable(),
});

router.put("/:id", requireRole(...ADMIN_ROLES), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid user update data.", details: parsed.error.format() });

  const { password, permissions, status, isActive, ...rest } = parsed.data;
  const dataToUpdate: any = { ...rest };

  if (password) {
    dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
  }

  if (permissions !== undefined) {
    dataToUpdate.permissions = Array.isArray(permissions)
      ? JSON.stringify(permissions)
      : (typeof permissions === "string" ? permissions : null);
  }

  if (status !== undefined) {
    dataToUpdate.status = status;
    dataToUpdate.isActive = status === "ACTIVE";
  } else if (isActive !== undefined) {
    dataToUpdate.isActive = isActive;
    dataToUpdate.status = isActive ? "ACTIVE" : "SUSPENDED";
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: dataToUpdate,
      include: { department: true },
    });
    const { passwordHash, ...safe } = user;
    res.json(safe);
  } catch {
    res.status(404).json({ error: "User not found." });
  }
});

const statusSchema = z.object({
  status: z.enum(USER_STATUSES),
});

// Quick Lifecycle Route: Active | Suspended | Deactivated
router.patch("/:id/status", requireRole(...ADMIN_ROLES), async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid status. Must be ACTIVE, SUSPENDED, or DEACTIVATED." });
  }

  const { status } = parsed.data;
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        status,
        isActive: status === "ACTIVE",
      },
      include: { department: true },
    });
    const { passwordHash, ...safe } = user;
    res.json(safe);
  } catch {
    res.status(404).json({ error: "User not found." });
  }
});

export default router;
