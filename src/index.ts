import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

import authRoutes from "./routes/auth.routes";
import departmentsRoutes from "./routes/departments.routes";
import usersRoutes from "./routes/users.routes";
import meetingsRoutes from "./routes/meetings.routes";
import actionItemsRoutes from "./routes/actionItems.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import notificationsRoutes from "./routes/notifications.routes";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
// Allow large file uploads by removing size restrictions
app.use(express.json({ limit: "1gb" }));
app.use(express.urlencoded({ limit: "1gb", extended: true }));

const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "Ahununu Logistics — Meeting Management Portal API",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/departments", departmentsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/meetings", meetingsRoutes);
app.use("/api/action-items", actionItemsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  },
);

app.listen(PORT, () => {
  console.log(
    `Ahununu Logistics Meeting Portal API running on http://localhost:${PORT}`,
  );
});
