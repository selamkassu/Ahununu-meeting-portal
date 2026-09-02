import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthedRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(notifications);
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const n = await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.json(n);
  } catch {
    res.status(404).json({ error: "Notification not found." });
  }
});

router.patch("/read-all", async (req: AuthedRequest, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.userId, isRead: false }, data: { isRead: true } });
  res.json({ ok: true });
});

export default router;
