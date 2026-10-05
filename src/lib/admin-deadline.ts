export function makassarToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function adminDeadline(date: string | null, completed = false, today = makassarToday()) {
  const days = date ? Math.round((Date.parse(date) - Date.parse(today)) / 86400000) : null;
  return {
    note: completed ? 'Completed' : days === null ? 'Not set' : days < 0 ? `Overdue ${-days} days` : days === 0 ? 'Due Today' : days === 1 ? 'Due Tomorrow' : `Due in ${days} days`,
    tone: completed || days === null ? ('normal' as const) : days < 0 ? ('urgent' as const) : days <= 7 ? ('warning' as const) : ('normal' as const),
  };
}
