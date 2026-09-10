import { daysBetween, type YMD } from './dates';
import type { Task } from '../types';

export const URGENT_WITHIN_DAYS = 7;

export function isOpen(t: Task) { return !t.doneAt && !t.deletedAt; }

export function isUrgent(t: Task, today: YMD): boolean {
  if (!t.dueDate) return false;
  return daysBetween(today, t.dueDate) <= URGENT_WITHIN_DAYS;
}

/** 重要×緊急 → 重要×非緊急 → ふつう×緊急 → ふつう×非緊急 */
export function rank(t: Task, today: YMD): number {
  const imp = t.important ? 0 : 2;
  const urg = isUrgent(t, today) ? 0 : 1;
  return imp + urg;
}

/** 自分で並べたものが1つでもあるか。あれば「手で並べている」状態とみなす。 */
export function isManualOrder(tasks: Task[]): boolean {
  return tasks.some((t) => typeof t.order === 'number');
}

export function sortTasks(tasks: Task[], today: YMD): Task[] {
  return [...tasks].sort((a, b) => {
    // まず帯。「先にやる」は本人が入れたものなので、自動の理屈で追い越さない。
    const band = Number(!a.first) - Number(!b.first);
    if (band !== 0) return band;

    // 帯の中。自分で並べたものが先。
    const ao = a.order, bo = b.order;
    if (typeof ao === 'number' && typeof bo === 'number') return ao - bo;
    if (typeof ao === 'number') return -1;
    if (typeof bo === 'number') return 1;

    const r = rank(a, today) - rank(b, today);
    if (r !== 0) return r;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/** 締切の言い回し。「4日超過」ではなく事実だけを短く。 */
export function dueLabel(t: Task, today: YMD): { text: string; over: boolean } | null {
  if (!t.dueDate) return null;
  const n = daysBetween(today, t.dueDate);
  const [, m, d] = t.dueDate.split('-').map(Number);
  const base = `期限 ${m}月${d}日`;
  if (n < 0) return { text: `${base}・${-n}日超過`, over: true };
  if (n === 0) return { text: `${base}・本日`, over: true };
  return { text: `${base}・残り${n}日`, over: false };
}
