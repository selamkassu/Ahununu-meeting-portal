// Ahununu Logistics - Meeting Management Portal
// Central allowed-value lists. SQL Server has no native ENUM type, so
// Prisma models store these as String columns; validity is enforced here.

export const ROLES = [
  "SYSTEM_ADMIN",
  "MEETING_SECRETARY",
  "DEPARTMENT_HEAD",
  "PARTICIPANT",
] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "SUSPENDED", "DEACTIVATED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, string[]> = {
  SYSTEM_ADMIN: [
    "Manage Users",
    "Manage Roles",
    "Manage Permissions",
    "Manage Departments",
  ],
  MEETING_SECRETARY: [
    "Create / Manage Meetings",
    "Manage Agenda",
    "Manage Participants",
    "Manage Documents",
  ],
  DEPARTMENT_HEAD: [
    "View Department Meetings",
    "Manage Department Action Items",
    "Monitor Action Status",
    "Log Decisions",
  ],
  PARTICIPANT: [
    "View Assigned Meetings",
    "View Agenda",
    "View Assigned Action Items",
    "Update Assigned Actions",
  ],
};

export const MEETING_STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PARTICIPANT_STATUSES = ["INVITED", "ACCEPTED", "DECLINED", "ATTENDED", "ABSENT"] as const;

export const AGENDA_STATUSES = ["PENDING", "DISCUSSED", "DEFERRED"] as const;

export const DECISION_STATUSES = ["OPEN", "IMPLEMENTED", "REVERSED"] as const;

export const ACTION_ITEM_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type ActionItemStatus = (typeof ACTION_ITEM_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "MEETING_INVITE",
  "ACTION_ASSIGNED",
  "ACTION_DUE_SOON",
  "ACTION_OVERDUE",
  "DECISION_LOGGED",
  "MEETING_REMINDER",
] as const;

/** Roles permitted to manage org-wide config (departments, users). */
export const ADMIN_ROLES: Role[] = ["SYSTEM_ADMIN"];
/** Roles that can see cross-department management views. */
export const MANAGEMENT_ROLES: Role[] = ["SYSTEM_ADMIN", "DEPARTMENT_HEAD"];
/** Roles that can create/edit meetings. */
export const ORGANIZER_ROLES: Role[] = ["SYSTEM_ADMIN", "MEETING_SECRETARY", "DEPARTMENT_HEAD"];

export function isOverdue(status: string, deadline: Date): boolean {
  return status !== "COMPLETED" && status !== "CANCELLED" && new Date(deadline).getTime() < Date.now();
}
