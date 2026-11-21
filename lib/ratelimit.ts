export const MAX_REPORTS_PER_HOUR = 5;

/** Indica si un usuario puede crear otro reporte según los que hizo en la última hora. */
export function canCreateReport(createdAt: Date[], now: Date = new Date(), limit = MAX_REPORTS_PER_HOUR): boolean {
  const oneHourAgo = now.getTime() - 60 * 60 * 1000;
  const recent = createdAt.filter((d) => d.getTime() > oneHourAgo).length;
  return recent < limit;
}
