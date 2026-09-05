// その日にどのチェック項目を出すか。
// 「ごろ」を消す：出現条件はすべて営業日で定義する。
import { ROUTINES, type Routine } from '../data/routines';
import {
  addDays, businessDaysBefore, firstBusinessDayOfWeek, firstBusinessDayOnOrAfter,
  isBusinessDay, lastBusinessDayOfMonth, type YMD,
} from './dates';

/** force=true は「休日だが出勤した日」。土曜出勤などを画面のボタンで切り替える。 */
export function eligibleRoutines(today: YMD, force = false): Routine[] {
  if (!force && !isBusinessDay(today)) return [];
  return ROUTINES.filter((r) => {
    switch (r.cadence) {
      case 'daily':
        return true;

      // その週の最初の営業日に出現し、金曜（週末）まで残る
      case 'weekly':
        return today >= firstBusinessDayOfWeek(today);

      // 13日以降の最初の営業日に出現し、月末まで残る
      case 'monthly-mid': {
        const [y, m] = today.split('-').map(Number);
        const start = firstBusinessDayOnOrAfter(
          `${y}-${String(m).padStart(2, '0')}-13`,
        );
        return today >= start;
      }

      // 最終営業日の5営業日前から出現する。
      // 「あと26日」を毎日見せるのは、早い通知が効かない本人に早い通知を出すのと同じ。
      case 'monthly-end': {
        const last = lastBusinessDayOfMonth(today);
        return today >= businessDaysBefore(last, 5) && today <= last;
      }
    }
  });
}

/** 直近30日のうち、チェックを1つ以上押した日の数を数えるための対象日一覧 */
export function last30Days(today: YMD): YMD[] {
  const out: YMD[] = [];
  for (let i = 0; i < 30; i++) out.push(addDays(today, -i));
  return out;
}
