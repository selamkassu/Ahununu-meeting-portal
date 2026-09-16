import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import {
  ORGANIZER_ROLES,
  MEETING_STATUSES,
  PRIORITIES,
  AGENDA_STATUSES,
  DECISION_STATUSES,
} from "../utils/enums";
import { makeCode } from "../utils/codes";

const router = Router();
router.use(requireAuth);

const detailInclude = {
  organizer: {
    select: { id: true, name: true, email: true, avatarColor: true },
  },
  department: true,
  participants: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarColor: true,
          role: true,
        },
      },
    },
  },
  agendaItems: { orderBy: { order: "asc" as const } },
  minutes: {
    include: { recordedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" as const },
  },
  decisions: { orderBy: { decisionDate: "desc" as const } },
  actionItems: {
    include: {
      assignedTo: { select: { id: true, name: true, avatarColor: true } },
      department: { select: { id: true, name: true } },
    },
    orderBy: { deadline: "asc" as const },
  },
  documents: { include: { uploadedBy: { select: { id: true, name: true } } } },
};

// ---------- List ----------
router.get("/", async (req: AuthedRequest, res) => {
  const { status, departmentId, priority, from, to, q, mine } = req.query;
  const where: any = {};
  if (typeof status === "string" && status) where.status = status;
  if (typeof departmentId === "string" && departmentId)
    where.departmentId = departmentId;
  if (typeof priority === "string" && priority) where.priority = priority;
  if (from || to) {
    where.date = {};
    if (typeof from === "string" && from) where.date.gte = new Date(from);
    if (typeof to === "string" && to) where.date.lte = new Date(to);
  }
  if (typeof q === "string" && q) where.title = { contains: q };
  if (mine === "true") {
    where.OR = [
      { organizerId: req.user!.userId },
      { participants: { some: { userId: req.user!.userId } } },
    ];
  }

  const meetings = await prisma.meeting.findMany({
    where,
    include: {
      organizer: { select: { id: true, name: true, avatarColor: true } },
      department: { select: { id: true, name: true } },
      _count: {
        select: { participants: true, actionItems: true, agendaItems: true },
      },
    },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
  });
  res.json(meetings);
});

// ---------- Create ----------
const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().optional(),
  onlineLink: z.string().optional(),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
  departmentId: z.string().min(1),
  participantIds: z.array(z.string()).default([]),
  agendaItems: z
    .array(
      z.object({
        title: z.string().min(2),
        description: z.string().nullable().optional(),
        presenter: z.string().nullable().optional(),
        durationMin: z.number().optional(),
      }),
    )
    .default([]),
});

router.post(
  "/",
  requireRole(...ORGANIZER_ROLES),
  async (req: AuthedRequest, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Check the meeting title, date, time and department.",
        details: parsed.error.flatten(),
      });
    }
    const data = parsed.data;
    const count = await prisma.meeting.count();

    const meeting = await prisma.meeting.create({
      data: {
        code: makeCode("MTG", count + 1),
        title: data.title,
        description: data.description,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        onlineLink: data.onlineLink,
        priority: data.priority,
        departmentId: data.departmentId,
        organizerId: req.user!.userId,
        participants: {
          create: data.participantIds.map((userId) => ({ userId })),
        },
        agendaItems: {
          create: data.agendaItems.map((a, idx) => ({
            order: idx,
            title: a.title,
            description: a.description?.trim() || null,
            presenter: a.presenter?.trim() || null,
            durationMin: a.durationMin ?? 15,
          })),
        },
      },
      include: detailInclude,
    });

    // Notify invited participants.
    if (data.participantIds.length) {
      await prisma.notification.createMany({
        data: data.participantIds.map((userId) => ({
          userId,
          type: "MEETING_INVITE",
          title: "New meeting invitation",
          message: `You've been invited to "${meeting.title}" (${meeting.code}) on ${new Date(meeting.date).toDateString()}.`,
          link: `/meetings/${meeting.id}`,
        })),
      });
    }

    res.status(201).json(meeting);
  },
);

// ---------- Cross-meeting overviews (used by the standalone Agenda / Minutes modules) ----------
router.get("/agenda-overview/upcoming", async (_req, res) => {
  const items = await prisma.agendaItem.findMany({
    where: {
      meeting: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    },
    include: {
      meeting: {
        select: {
          id: true,
          title: true,
          code: true,
          date: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: [{ meeting: { date: "asc" } }, { order: "asc" }],
    take: 100,
  });
  res.json(items);
});

router.get("/minutes-overview/recent", async (_req, res) => {
  const items = await prisma.meetingMinutes.findMany({
    include: {
      recordedBy: { select: { id: true, name: true } },
      meeting: {
        select: {
          id: true,
          title: true,
          code: true,
          date: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(items);
});

router.get("/decisions-overview/all", async (req, res) => {
  const { status } = req.query;
  const decisions = await prisma.decision.findMany({
    where: typeof status === "string" && status ? { status } : undefined,
    include: {
      meeting: {
        select: {
          id: true,
          title: true,
          code: true,
          date: true,
          department: { select: { name: true } },
        },
      },
      actionItems: { select: { id: true, status: true } },
    },
    orderBy: { decisionDate: "desc" },
    take: 100,
  });
  res.json(decisions);
});

router.get("/documents-overview/all", async (_req, res) => {
  const documents = await prisma.document.findMany({
    include: {
      uploadedBy: { select: { id: true, name: true } },
      meeting: {
        select: {
          id: true,
          title: true,
          code: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(documents);
});

// ---------- Documents (real file upload) ----------
const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`);
  },
});
const upload = multer({
  storage,
});

router.post(
  "/:id/documents",
  requireRole(...ORGANIZER_ROLES),
  upload.single("file"),
  async (req: AuthedRequest, res) => {
    if (!req.file) return res.status(400).json({ error: "No file selected." });
    const meeting = await prisma.meeting.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!meeting) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Meeting not found." });
    }
    const doc = await prisma.document.create({
      data: {
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        storedName: req.file.filename,
        filePath: `/uploads/${encodeURIComponent(req.file.filename)}`,
        meetingId: req.params.id,
        uploadedById: req.user!.userId,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
    res.status(201).json(doc);
  },
);

router.get(
  "/:id/documents/:documentId/download",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.documentId, meetingId: req.params.id },
    });
    if (!doc || !doc.storedName)
      return res.status(404).json({ error: "Document not found." });
    const filePath = path.join(uploadDir, doc.storedName);
    if (!fs.existsSync(filePath))
      return res.status(404).json({ error: "File is no longer available." });
    res.download(filePath, doc.fileName);
  },
);

router.delete(
  "/:id/documents/:documentId",
  requireRole(...ORGANIZER_ROLES),
  async (req, res) => {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.documentId, meetingId: req.params.id },
    });
    if (!doc) return res.status(404).json({ error: "Document not found." });
    if (doc.storedName) {
      const filePath = path.join(uploadDir, doc.storedName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await prisma.document.delete({ where: { id: doc.id } });
    res.status(204).send();
  },
);

// ---------- Detail ----------
router.get("/:id", async (req, res) => {
  const meeting = await prisma.meeting.findUnique({
    where: { id: req.params.id },
    include: detailInclude,
  });
  if (!meeting) return res.status(404).json({ error: "Meeting not found." });
  res.json(meeting);
});

// ---------- Update ----------
const updateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  onlineLink: z.string().optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(MEETING_STATUSES).optional(),
  departmentId: z.string().optional(),
});

router.put("/:id", requireRole(...ORGANIZER_ROLES), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid meeting update." });
  const { date, ...rest } = parsed.data;
  try {
    const meeting = await prisma.meeting.update({
      where: { id: req.params.id },
      data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
      include: detailInclude,
    });
    res.json(meeting);
  } catch {
    res.status(404).json({ error: "Meeting not found." });
  }
});

router.delete("/:id", requireRole(...ORGANIZER_ROLES), async (req, res) => {
  try {
    await prisma.meeting.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Meeting not found." });
  }
});

// ---------- Participants ----------
router.post(
  "/:id/participants",
  requireRole(...ORGANIZER_ROLES),
  async (req, res) => {
    const schema = z.object({ userIds: z.array(z.string()).min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "Provide at least one participant." });
    await prisma.meetingParticipant.createMany({
      data: parsed.data.userIds.map((userId) => ({
        meetingId: req.params.id,
        userId,
      })),
    });
    const meeting = await prisma.meeting.findUnique({
      where: { id: req.params.id },
      include: detailInclude,
    });
    res.json(meeting);
  },
);

// ---------- Agenda ----------
router.post(
  "/:id/agenda",
  requireRole(...ORGANIZER_ROLES),
  async (req, res) => {
    const schema = z.object({
      title: z.string().min(2),
      description: z.string().nullable().optional(),
      presenter: z.string().nullable().optional(),
      durationMin: z.number().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Give the agenda item a title." });
    const count = await prisma.agendaItem.count({
      where: { meetingId: req.params.id },
    });
    const item = await prisma.agendaItem.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description?.trim() || null,
        presenter: parsed.data.presenter?.trim() || null,
        durationMin: parsed.data.durationMin ?? 15,
        order: count,
        meetingId: req.params.id,
      },
    });
    res.status(201).json(item);
  },
);

router.put(
  "/agenda/:agendaId",
  requireRole(...ORGANIZER_ROLES),
  async (req, res) => {
    const schema = z.object({
      title: z.string().min(2).optional(),
      description: z.string().nullable().optional(),
      presenter: z.string().nullable().optional(),
      durationMin: z.number().optional(),
      status: z.enum(AGENDA_STATUSES).optional(),
      order: z.number().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid agenda update." });
    try {
      const dataToUpdate: any = {};
      if (parsed.data.title !== undefined) dataToUpdate.title = parsed.data.title;
      if (parsed.data.description !== undefined) {
        dataToUpdate.description = parsed.data.description?.trim() || null;
      }
      if (parsed.data.presenter !== undefined) {
        dataToUpdate.presenter = parsed.data.presenter?.trim() || null;
      }
      if (parsed.data.durationMin !== undefined) dataToUpdate.durationMin = parsed.data.durationMin;
      if (parsed.data.status !== undefined) dataToUpdate.status = parsed.data.status;
      if (parsed.data.order !== undefined) dataToUpdate.order = parsed.data.order;

      const item = await prisma.agendaItem.update({
        where: { id: req.params.agendaId },
        data: dataToUpdate,
      });
      res.json(item);
    } catch {
      res.status(404).json({ error: "Agenda item not found." });
    }
  },
);

router.delete(
  "/agenda/:agendaId",
  requireRole(...ORGANIZER_ROLES),
  async (req, res) => {
    try {
      await prisma.agendaItem.delete({ where: { id: req.params.agendaId } });
      res.status(204).send();
    } catch {
      res.status(404).json({ error: "Agenda item not found." });
    }
  },
);

// ---------- Minutes ----------
router.post(
  "/:id/minutes",
  requireRole(...ORGANIZER_ROLES),
  async (req: AuthedRequest, res) => {
    const schema = z.object({ content: z.string().min(3) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Minutes cannot be empty." });
    const minutes = await prisma.meetingMinutes.create({
      data: {
        content: parsed.data.content,
        meetingId: req.params.id,
        recordedById: req.user!.userId,
      },
      include: { recordedBy: { select: { id: true, name: true } } },
    });
    res.status(201).json(minutes);
  },
);

// ---------- Decisions ----------
router.post(
  "/:id/decisions",
  requireRole(...ORGANIZER_ROLES),
  async (req, res) => {
    const schema = z.object({
      title: z.string().min(3),
      description: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Give the decision a title." });
    const count = await prisma.decision.count();
    const decision = await prisma.decision.create({
      data: {
        ...parsed.data,
        code: makeCode("DEC", count + 1),
        meetingId: req.params.id,
      },
    });
    res.status(201).json(decision);
  },
);

router.put(
  "/decisions/:decisionId",
  requireRole(...ORGANIZER_ROLES),
  async (req, res) => {
    const schema = z.object({
      title: z.string().min(3).optional(),
      description: z.string().optional(),
      status: z.enum(DECISION_STATUSES).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid decision update." });
    try {
      const decision = await prisma.decision.update({
        where: { id: req.params.decisionId },
        data: parsed.data,
      });
      res.json(decision);
    } catch {
      res.status(404).json({ error: "Decision not found." });
    }
  },
);

export default router;
