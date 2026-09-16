import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysFromNow(n: number, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding Ahununu Logistics Meeting Management Portal...");

  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.actionItem.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.meetingMinutes.deleteMany();
  await prisma.agendaItem.deleteMany();
  await prisma.meetingParticipant.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  const departments = await Promise.all(
    [
      { name: "Management", code: "MGT", description: "Executive leadership and corporate strategy" },
      { name: "IT", code: "IT", description: "Systems, infrastructure and digital platforms" },
      { name: "Operations", code: "OPS", description: "Fleet operations and route planning" },
      { name: "Logistics", code: "LOG", description: "Freight coordination and supply chain" },
      { name: "Finance", code: "FIN", description: "Accounts, budgeting and payroll" },
      { name: "HR", code: "HR", description: "People operations and recruitment" },
      { name: "Customer Service", code: "CS", description: "Client support and dispute resolution" },
      { name: "Sales & Marketing", code: "S&M", description: "Business development and branding" },
      { name: "Warehouse", code: "WH", description: "Storage, inventory and dispatch" },
    ].map((d) => prisma.department.create({ data: d }))
  );

  const byCode = Object.fromEntries(departments.map((d) => [d.code, d]));
  const passwordHash = await bcrypt.hash("Ahununu@123", 10);

  const userDefs = [
    { name: "Dawit Bekele", email: "dawit.bekele@ahununulogistics.com", role: "SYSTEM_ADMIN", dept: "IT", title: "Systems Administrator" },
    { name: "Selamawit Tesfaye", email: "selamawit.tesfaye@ahununulogistics.com", role: "DEPARTMENT_HEAD", dept: "MGT", title: "Chief Executive Officer" },
    { name: "Yonas Girma", email: "yonas.girma@ahununulogistics.com", role: "DEPARTMENT_HEAD", dept: "MGT", title: "Chief Operating Officer" },
    { name: "Hana Alemu", email: "hana.alemu@ahununulogistics.com", role: "DEPARTMENT_HEAD", dept: "OPS", title: "Operations Manager" },
    { name: "Bereket Mulu", email: "bereket.mulu@ahununulogistics.com", role: "DEPARTMENT_HEAD", dept: "LOG", title: "Logistics Manager" },
    { name: "Tigist Worku", email: "tigist.worku@ahununulogistics.com", role: "DEPARTMENT_HEAD", dept: "FIN", title: "Finance Manager" },
    { name: "Robel Kassa", email: "robel.kassa@ahununulogistics.com", role: "DEPARTMENT_HEAD", dept: "WH", title: "Warehouse Manager" },
    { name: "Meron Fikadu", email: "meron.fikadu@ahununulogistics.com", role: "DEPARTMENT_HEAD", dept: "HR", title: "HR Manager" },
    { name: "Abenezer Solomon", email: "abenezer.solomon@ahununulogistics.com", role: "MEETING_SECRETARY", dept: "MGT", title: "Executive Assistant" },
    { name: "Rahel Assefa", email: "rahel.assefa@ahununulogistics.com", role: "DEPARTMENT_HEAD", dept: "CS", title: "Customer Service Manager" },
    { name: "Kaleab Teshome", email: "kaleab.teshome@ahununulogistics.com", role: "DEPARTMENT_HEAD", dept: "S&M", title: "Sales & Marketing Manager" },
    { name: "Liya Desta", email: "liya.desta@ahununulogistics.com", role: "PARTICIPANT", dept: "IT", title: "Network Engineer" },
    { name: "Samuel Wolde", email: "samuel.wolde@ahununulogistics.com", role: "PARTICIPANT", dept: "OPS", title: "Fleet Dispatcher" },
    { name: "Eyerusalem Getachew", email: "eyerusalem.getachew@ahununulogistics.com", role: "PARTICIPANT", dept: "LOG", title: "Freight Coordinator" },
    { name: "Nathnael Yohannes", email: "nathnael.yohannes@ahununulogistics.com", role: "PARTICIPANT", dept: "WH", title: "Inventory Officer" },
    { name: "Firehiwot Abera", email: "firehiwot.abera@ahununulogistics.com", role: "PARTICIPANT", dept: "FIN", title: "Accountant" },
  ];

  const phoneList = [
    "+251 91 123 4567",
    "+251 91 234 5678",
    "+251 91 345 6789",
    "+251 91 456 7890",
    "+251 91 567 8901",
    "+251 91 678 9012",
    "+251 91 789 0123",
    "+251 91 890 1234",
    "+251 91 901 2345",
    "+251 92 012 3456",
    "+251 92 123 4567",
    "+251 92 234 5678",
    "+251 92 345 6789",
    "+251 92 456 7890",
    "+251 92 567 8901",
    "+251 92 678 9012",
  ];

  const rolePermissionsMap: Record<string, string[]> = {
    SYSTEM_ADMIN: ["Manage Users", "Manage Roles", "Manage Permissions", "Manage Departments"],
    MEETING_SECRETARY: ["Create / Manage Meetings", "Manage Agenda", "Manage Participants", "Manage Documents"],
    DEPARTMENT_HEAD: ["View Department Meetings", "Manage Department Action Items", "Monitor Action Status", "Log Decisions"],
    PARTICIPANT: ["View Assigned Meetings", "View Agenda", "View Assigned Action Items", "Update Assigned Actions"],
  };

  const colors = ["#0F2A4A", "#1F6F5C", "#B4571C", "#3B5166", "#7A4FA3", "#1F9D63", "#C0392B", "#2E7BB0"];
  const users = await Promise.all(
    userDefs.map((u, idx) => {
      // Set one user suspended and one deactivated for demonstrating lifecycle states
      let status = "ACTIVE";
      if (u.name === "Samuel Wolde") status = "SUSPENDED";
      if (u.name === "Firehiwot Abera") status = "DEACTIVATED";

      return prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          phone: phoneList[idx % phoneList.length],
          passwordHash,
          role: u.role,
          status,
          isActive: status === "ACTIVE",
          permissions: JSON.stringify(rolePermissionsMap[u.role] || []),
          responsibilities: `Operational oversight and execution of ${u.title} responsibilities in ${u.dept} department.`,
          jobTitle: u.title,
          avatarColor: colors[idx % colors.length],
          departmentId: byCode[u.dept].id,
        },
      });
    })
  );
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u]));
  const ceo = byEmail["selamawit.tesfaye@ahununulogistics.com"];
  const coo = byEmail["yonas.girma@ahununulogistics.com"];
  const opsMgr = byEmail["hana.alemu@ahununulogistics.com"];
  const logMgr = byEmail["bereket.mulu@ahununulogistics.com"];
  const finMgr = byEmail["tigist.worku@ahununulogistics.com"];
  const whMgr = byEmail["robel.kassa@ahununulogistics.com"];
  const hrMgr = byEmail["meron.fikadu@ahununulogistics.com"];
  const exec = byEmail["abenezer.solomon@ahununulogistics.com"];
  const csMgr = byEmail["rahel.assefa@ahununulogistics.com"];
  const smMgr = byEmail["kaleab.teshome@ahununulogistics.com"];
  const itAdmin = byEmail["dawit.bekele@ahununulogistics.com"];
  const dispatcher = byEmail["samuel.wolde@ahununulogistics.com"];
  const freightCoord = byEmail["eyerusalem.getachew@ahununulogistics.com"];
  const invOfficer = byEmail["nathnael.yohannes@ahununulogistics.com"];
  const netEng = byEmail["liya.desta@ahununulogistics.com"];
  const accountant = byEmail["firehiwot.abera@ahununulogistics.com"];

  let mtgSeq = 0;
  let decSeq = 0;
  let actSeq = 0;
  const nextMtg = () => `MTG-${new Date().getFullYear()}-${String(++mtgSeq).padStart(4, "0")}`;
  const nextDec = () => `DEC-${new Date().getFullYear()}-${String(++decSeq).padStart(4, "0")}`;
  const nextAct = () => `ACT-${new Date().getFullYear()}-${String(++actSeq).padStart(4, "0")}`;

  // ---- Meeting 1: Weekly Executive Committee (today) — In Progress ----
  const m1 = await prisma.meeting.create({
    data: {
      code: nextMtg(),
      title: "Weekly Executive Committee Meeting",
      description: "Cross-department review of KPIs, fleet utilization and Q3 targets.",
      date: daysFromNow(0, 10, 0),
      startTime: "10:00",
      endTime: "11:30",
      location: "HQ Boardroom, Bole",
      onlineLink: "https://meet.ahununulogistics.com/exec-weekly",
      priority: "HIGH",
      status: "IN_PROGRESS",
      organizerId: exec.id,
      departmentId: byCode.MGT.id,
      participants: {
        create: [ceo, coo, opsMgr, logMgr, finMgr, whMgr, hrMgr].map((u) => ({ userId: u.id, status: "ACCEPTED" })),
      },
      agendaItems: {
        create: [
          { order: 0, title: "Fleet utilization review", presenter: "Hana Alemu", durationMin: 20, status: "DISCUSSED" },
          { order: 1, title: "Q3 revenue vs target", presenter: "Tigist Worku", durationMin: 20, status: "DISCUSSED" },
          { order: 2, title: "Warehouse capacity expansion proposal", presenter: "Robel Kassa", durationMin: 25, status: "PENDING" },
          { order: 3, title: "AOB", durationMin: 15, status: "PENDING" },
        ],
      },
    },
  });
  const dec1 = await prisma.decision.create({
    data: { code: nextDec(), meetingId: m1.id, title: "Approve additional 5 trucks for Adama route", description: "Approved to ease congestion on the high-volume Adama corridor.", status: "OPEN" },
  });
  await prisma.actionItem.create({
    data: { code: nextAct(), meetingId: m1.id, decisionId: dec1.id, title: "Draft procurement request for 5 trucks", assignedToId: opsMgr.id, departmentId: byCode.OPS.id, priority: "HIGH", status: "IN_PROGRESS", progressPercent: 40, deadline: daysFromNow(4) },
  });
  await prisma.actionItem.create({
    data: { code: nextAct(), meetingId: m1.id, title: "Prepare Q3 vs target variance report", assignedToId: finMgr.id, departmentId: byCode.FIN.id, priority: "MEDIUM", status: "PENDING", progressPercent: 0, deadline: daysFromNow(6) },
  });

  // ---- Meeting 2: IT Infrastructure Review (in 2 days) — Scheduled ----
  const m2 = await prisma.meeting.create({
    data: {
      code: nextMtg(),
      title: "IT Infrastructure & Systems Security Review",
      description: "Review of tracking system uptime, cybersecurity posture, and the new driver mobile app rollout.",
      date: daysFromNow(2, 14, 0),
      startTime: "14:00",
      endTime: "15:00",
      location: "IT Conference Room",
      onlineLink: "https://meet.ahununulogistics.com/it-review",
      priority: "MEDIUM",
      status: "SCHEDULED",
      organizerId: itAdmin.id,
      departmentId: byCode.IT.id,
      participants: { create: [itAdmin, netEng, coo].map((u) => ({ userId: u.id, status: "ACCEPTED" })) },
      agendaItems: {
        create: [
          { order: 0, title: "GPS tracking platform uptime report", presenter: "Liya Desta", durationMin: 15 },
          { order: 1, title: "Driver mobile app rollout plan", presenter: "Dawit Bekele", durationMin: 20 },
          { order: 2, title: "Cybersecurity audit findings", presenter: "Dawit Bekele", durationMin: 15 },
        ],
      },
    },
  });

  // ---- Meeting 3: Warehouse Capacity Planning (in 5 days) — Scheduled, Critical ----
  const m3 = await prisma.meeting.create({
    data: {
      code: nextMtg(),
      title: "Warehouse Capacity Planning — Kality Site",
      description: "Assess storage capacity constraints ahead of peak season and agree on expansion timeline.",
      date: daysFromNow(5, 9, 30),
      startTime: "09:30",
      endTime: "11:00",
      location: "Kality Warehouse — Site Office",
      priority: "CRITICAL",
      status: "SCHEDULED",
      organizerId: whMgr.id,
      departmentId: byCode.WH.id,
      participants: { create: [whMgr, coo, invOfficer, logMgr].map((u) => ({ userId: u.id, status: "INVITED" })) },
      agendaItems: {
        create: [
          { order: 0, title: "Current utilization vs peak-season forecast", presenter: "Robel Kassa", durationMin: 20 },
          { order: 1, title: "Expansion options and cost estimate", presenter: "Robel Kassa", durationMin: 25 },
        ],
      },
    },
  });

  // ---- Meeting 4: Customer Service & Sales Alignment (yesterday) — Completed ----
  const m4 = await prisma.meeting.create({
    data: {
      code: nextMtg(),
      title: "Customer Service & Sales Alignment",
      description: "Review recurring client complaints and align on retention offers for key accounts.",
      date: daysFromNow(-1, 11, 0),
      startTime: "11:00",
      endTime: "12:00",
      location: "HQ Meeting Room B",
      priority: "MEDIUM",
      status: "COMPLETED",
      organizerId: csMgr.id,
      departmentId: byCode.CS.id,
      participants: { create: [csMgr, smMgr, coo].map((u) => ({ userId: u.id, status: "ATTENDED" })) },
      agendaItems: {
        create: [
          { order: 0, title: "Top 5 recurring complaints — Q3", presenter: "Rahel Assefa", durationMin: 20, status: "DISCUSSED" },
          { order: 1, title: "Key account retention offers", presenter: "Kaleab Teshome", durationMin: 20, status: "DISCUSSED" },
        ],
      },
      minutes: {
        create: {
          recordedById: csMgr.id,
          content:
            "Discussed delayed-delivery complaints concentrated on the Hawassa route (32% of tickets). Sales proposed a loyalty discount for the top 10 clients by volume. Agreed to trial a delivery-window SMS notification for two weeks before wider rollout.",
        },
      },
      decisions: {
        create: {
          code: nextDec(),
          title: "Trial SMS delivery-window notifications",
          description: "Two-week pilot on the Hawassa route before company-wide rollout.",
          status: "IMPLEMENTED",
        },
      },
    },
  });
  await prisma.actionItem.create({
    data: { code: nextAct(), meetingId: m4.id, title: "Configure SMS notification pilot for Hawassa route", assignedToId: netEng.id, departmentId: byCode.IT.id, priority: "HIGH", status: "COMPLETED", progressPercent: 100, deadline: daysFromNow(-2), completedAt: daysFromNow(-1) },
  });
  await prisma.actionItem.create({
    data: { code: nextAct(), meetingId: m4.id, title: "Draft loyalty discount proposal for top 10 clients", assignedToId: smMgr.id, departmentId: byCode["S&M"].id, priority: "MEDIUM", status: "IN_PROGRESS", progressPercent: 60, deadline: daysFromNow(2) },
  });

  // ---- Meeting 5: Finance Month-End Close (3 days ago) — Completed, overdue follow-ups ----
  const m5 = await prisma.meeting.create({
    data: {
      code: nextMtg(),
      title: "Finance Month-End Close Review",
      description: "Review outstanding invoices, fuel cost overruns and payroll reconciliation.",
      date: daysFromNow(-3, 15, 0),
      startTime: "15:00",
      endTime: "16:00",
      location: "Finance Department Office",
      priority: "HIGH",
      status: "COMPLETED",
      organizerId: finMgr.id,
      departmentId: byCode.FIN.id,
      participants: { create: [finMgr, accountant, ceo].map((u) => ({ userId: u.id, status: "ATTENDED" })) },
      agendaItems: { create: [{ order: 0, title: "Fuel cost overrun analysis", presenter: "Tigist Worku", durationMin: 20, status: "DISCUSSED" }] },
      decisions: { create: { code: nextDec(), title: "Cap monthly fuel allowance per route", description: "Introduce a route-based fuel budget cap starting next month.", status: "OPEN" } },
    },
  });
  // Overdue on purpose, to populate the accountability dashboard highlight
  await prisma.actionItem.create({
    data: { code: nextAct(), meetingId: m5.id, title: "Reconcile outstanding client invoices over 60 days", assignedToId: accountant.id, departmentId: byCode.FIN.id, priority: "CRITICAL", status: "PENDING", progressPercent: 10, deadline: daysFromNow(-2) },
  });
  await prisma.actionItem.create({
    data: { code: nextAct(), meetingId: m5.id, title: "Publish route-based fuel budget policy", assignedToId: finMgr.id, departmentId: byCode.FIN.id, priority: "HIGH", status: "PENDING", progressPercent: 0, deadline: daysFromNow(-1) },
  });

  // ---- Meeting 6: Operations Route Optimization (in 8 days) — Scheduled ----
  const m6 = await prisma.meeting.create({
    data: {
      code: nextMtg(),
      title: "Route Optimization & Fuel Efficiency Workshop",
      description: "Workshop with dispatchers and freight coordinators to cut average route time by 10%.",
      date: daysFromNow(8, 9, 0),
      startTime: "09:00",
      endTime: "12:00",
      location: "Operations Training Hall",
      priority: "MEDIUM",
      status: "SCHEDULED",
      organizerId: opsMgr.id,
      departmentId: byCode.OPS.id,
      participants: { create: [opsMgr, dispatcher, freightCoord, logMgr].map((u) => ({ userId: u.id, status: "INVITED" })) },
      agendaItems: { create: [{ order: 0, title: "Current route-time benchmarks", presenter: "Samuel Wolde", durationMin: 30 }] },
    },
  });

  // ---- Meeting 7: HR Quarterly Review (cancelled) ----
  await prisma.meeting.create({
    data: {
      code: nextMtg(),
      title: "HR Quarterly Headcount & Training Review",
      description: "Rescheduled due to CEO travel — see calendar for new date.",
      date: daysFromNow(1, 13, 0),
      startTime: "13:00",
      endTime: "14:00",
      location: "HR Office",
      priority: "LOW",
      status: "CANCELLED",
      organizerId: hrMgr.id,
      departmentId: byCode.HR.id,
      participants: { create: [hrMgr, ceo].map((u) => ({ userId: u.id, status: "DECLINED" })) },
    },
  });

  // ---- A handful of extra completed meetings across recent months for chart history ----
  for (let i = 1; i <= 5; i++) {
    const monthOffset = i * 25;
    const dept = [byCode.OPS, byCode.LOG, byCode.WH, byCode.FIN, byCode.CS][i % 5];
    const organizer = [opsMgr, logMgr, whMgr, finMgr, csMgr][i % 5];
    await prisma.meeting.create({
      data: {
        code: nextMtg(),
        title: `${dept.name} Monthly Review`,
        description: `Routine monthly performance review for the ${dept.name} department.`,
        date: daysFromNow(-monthOffset, 10, 0),
        startTime: "10:00",
        endTime: "11:00",
        location: "HQ Boardroom",
        priority: "MEDIUM",
        status: "COMPLETED",
        organizerId: organizer.id,
        departmentId: dept.id,
        participants: { create: [{ userId: organizer.id, status: "ATTENDED" }] },
      },
    });
  }

  // Extra standalone action items (not tied to a specific highlighted meeting) for richer dashboard data
  const extraAssignees = [dispatcher, freightCoord, invOfficer, netEng, accountant];
  for (let i = 0; i < 6; i++) {
    const assignee = extraAssignees[i % extraAssignees.length];
    const dept = departments.find((d) => d.id === assignee.departmentId)!;
    await prisma.actionItem.create({
      data: {
        code: nextAct(),
        meetingId: m6.id,
        title: [
          "Update driver contact list",
          "Submit weekly mileage report",
          "Reconcile warehouse stock count",
          "Test backup connectivity link",
          "Follow up on client SLA renewal",
          "Audit fuel card transactions",
        ][i],
        assignedToId: assignee.id,
        departmentId: dept.id,
        priority: (["LOW", "MEDIUM", "HIGH", "MEDIUM", "HIGH", "LOW"] as const)[i],
        status: (["PENDING", "IN_PROGRESS", "COMPLETED", "PENDING", "IN_PROGRESS", "COMPLETED"] as const)[i],
        progressPercent: [0, 50, 100, 20, 75, 100][i],
        deadline: daysFromNow([10, 3, -5, -1, 7, -10][i]),
        completedAt: i === 2 || i === 5 ? daysFromNow(-6) : null,
      },
    });
  }

  console.log("Seed complete.");
  console.log("");
  console.log("Sign in with any seeded user, password: Ahununu@123");
  console.log("  System Admin      : dawit.bekele@ahununulogistics.com");
  console.log("  Department Head   : hana.alemu@ahununulogistics.com");
  console.log("  Meeting Secretary : abenezer.solomon@ahununulogistics.com");
  console.log("  Participant       : samuel.wolde@ahununulogistics.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
