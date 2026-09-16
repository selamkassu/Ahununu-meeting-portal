import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { isOverdue } from "../utils/enums";

const router = Router();
router.use(requireAuth);

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

router.get("/stats", async (_req, res) => {
  try {
    const now = new Date();
    const today0 = startOfDay(now);
    const today1 = endOfDay(now);

  const [
    totalMeetings,
    todaysMeetings,
    upcomingMeetings,
    completedMeetings,
    allActionItems,
    pendingDecisions,
    departments,
    meetingsForMonthly,
  ] = await Promise.all([
    prisma.meeting.count(),
    prisma.meeting.count({ where: { date: { gte: today0, lte: today1 } } }),
    prisma.meeting.count({ where: { date: { gt: today1 }, status: "SCHEDULED" } }),
    prisma.meeting.count({ where: { status: "COMPLETED" } }),
    prisma.actionItem.findMany({
      include: {
        assignedTo: { select: { id: true, name: true, avatarColor: true } },
        department: { select: { id: true, name: true } },
        meeting: { select: { id: true, title: true, code: true } },
      },
    }),
    prisma.decision.count({ where: { status: "OPEN" } }),
    prisma.department.findMany({ where: { isActive: true } }),
    prisma.meeting.findMany({ select: { date: true, status: true } }),
  ]);

  const actionItemsTyped = allActionItems as any[];
  const departmentsTyped = departments as any[];
  const meetingsTyped = meetingsForMonthly as any[];

  const shapedActions = actionItemsTyped.map((a) => ({ ...a, overdue: isOverdue(a.status, a.deadline) }));
  const pendingActionItems = shapedActions.filter((a) => a.status === "PENDING" || a.status === "IN_PROGRESS").length;
  const overdueActionItems = shapedActions.filter((a) => a.overdue).length;
  const completedActionItems = shapedActions.filter((a) => a.status === "COMPLETED").length;

  // Monthly meetings — trailing 6 months
  const monthly: { month: string; count: number; completed: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = ref.toLocaleString("en-US", { month: "short" });
    const inMonth = meetingsTyped.filter(
      (m) => m.date.getFullYear() === ref.getFullYear() && m.date.getMonth() === ref.getMonth()
    );
    monthly.push({ month: label, count: inMonth.length, completed: inMonth.filter((m) => m.status === "COMPLETED").length });
  }

  // Action item status distribution
  const statusBuckets = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((status) => ({
    status,
    count: shapedActions.filter((a) => a.status === status).length,
  }));

  // Department performance: completion rate of action items per department
  const departmentPerformance = departmentsTyped.map((d) => {
    const items = shapedActions.filter((a) => a.departmentId === d.id);
    const completed = items.filter((a) => a.status === "COMPLETED").length;
    return {
      department: d.name,
      total: items.length,
      completed,
      overdue: items.filter((a) => a.overdue).length,
      completionRate: items.length ? Math.round((completed / items.length) * 100) : 0,
    };
  });

  // Meeting completion rate overall
  const meetingCompletionRate = totalMeetings ? Math.round((completedMeetings / totalMeetings) * 100) : 0;

  // Action & Accountability feed — sorted so overdue + due-soonest float to top
  const accountability = shapedActions
    .filter((a) => a.status !== "CANCELLED")
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    })
    .slice(0, 25);

    res.json({
      cards: {
        totalMeetings,
        todaysMeetings,
        upcomingMeetings,
        completedMeetings,
        pendingActionItems,
        overdueActionItems,
        completedActionItems,
        pendingDecisions,
      },
      charts: {
        monthlyMeetings: monthly,
        actionItemStatus: statusBuckets,
        departmentPerformance,
        meetingCompletionRate,
      },
      accountability,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to load dashboard stats." });
  }
});

export default router;
