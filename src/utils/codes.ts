/**
 * Ahununu Logistics tracks meetings, decisions and action items the same
 * way it tracks shipments: every record gets a human-readable manifest
 * code, e.g. MTG-2026-0148, DEC-2026-0091, ACT-2026-0392.
 */
export function makeCode(prefix: "MTG" | "DEC" | "ACT", sequence: number): string {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}
