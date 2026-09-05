// 日付の唯一の入口。
// アプリ内の他の場所で日付を取得しないこと。
// new Date().toISOString().slice(0,10) を書くと、JST 08:00 は UTC 前日 23:00 なので
// このツールが使われる時間帯がまるごと前日になる。
import { HOLIDAYS, HOLIDAY_TABLE_END, SCHOOL_CLOSED, SCHOOL_WORKDAYS } from './holidays';

export type YMD = string; // 'YYYY-MM-DD'

const JST = 'Asia/Tokyo';
const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: JST, year: 'numeric', month: '2-digit', day: '2-digit',
});
const hourFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: JST, hour: '2-digit', hour12: false,
});

/** 1日の境界は 04:00 JST。深夜作業でチェックが全部リセットされるのを防ぐ。 */
export const DAY_BOUNDARY_HOUR = 4;

function ymdOf(d: Date): YMD {
  return fmt.format(d);
}

/** このアプリにとっての「今日」。04:00 より前は前日として扱う。 */
export function logicalToday(now: Date = new Date()): YMD {
  const hour = Number(hourFmt.format(now));
  if (hour < DAY_BOUNDARY_HOUR) return addDays(ymdOf(now), -1);
  return ymdOf(now);
}

/** 日付文字列どうしで加減算する。ms差を86400000で割らない（夏時間・閏秒でずれる）。 */
export function addDays(ymd: YMD, n: number): YMD {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** a から b までの日数。b が後なら正。 */
export function daysBetween(a: YMD, b: YMD): number {
  const p = (s: YMD) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((p(b) - p(a)) / 86400000);
}

/** 「N日目」。依頼日当日を1日目と数える（0日目と言われると意味が伝わらない）。 */
export function dayCount(from: YMD, today: YMD): number {
  return daysBetween(from, today) + 1;
}

const WD = ['日', '月', '火', '水', '木', '金', '土'];

export function weekdayIndex(ymd: YMD): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function formatLong(ymd: YMD): string {
  const [, m, d] = ymd.split('-').map(Number);
  return `${m}月${d}日（${WD[weekdayIndex(ymd)]}）`;
}

export function formatShort(ymd: YMD): string {
  const [, m, d] = ymd.split('-').map(Number);
  return `${m}/${d}`;
}

export function holidayName(ymd: YMD): string | null {
  if (SCHOOL_WORKDAYS[ymd]) return null;
  return SCHOOL_CLOSED[ymd] ?? HOLIDAYS[ymd] ?? null;
}

/** 営業日＝土日でも祝日でも学校休業日でもない日。学校独自の勤務日は営業日に戻す。 */
export function isBusinessDay(ymd: YMD): boolean {
  if (SCHOOL_WORKDAYS[ymd]) return true;
  const wd = weekdayIndex(ymd);
  if (wd === 0 || wd === 6) return false;
  return holidayName(ymd) === null;
}

/** 祝日テーブルが切れている日か。切れていたら画面に出す（黙って平日扱いにしない）。 */
export function isBeyondHolidayTable(ymd: YMD): boolean {
  return ymd > HOLIDAY_TABLE_END;
}

export { HOLIDAY_TABLE_END };

/** その月の最初の営業日 */
export function firstBusinessDayOfMonth(ymd: YMD): YMD {
  const [y, m] = ymd.split('-').map(Number);
  let d: YMD = `${y}-${String(m).padStart(2, '0')}-01`;
  while (!isBusinessDay(d)) d = addDays(d, 1);
  return d;
}

/** その月の最終営業日 */
export function lastBusinessDayOfMonth(ymd: YMD): YMD {
  const [y, m] = ymd.split('-').map(Number);
  const lastDate = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let d: YMD = `${y}-${String(m).padStart(2, '0')}-${String(lastDate).padStart(2, '0')}`;
  while (!isBusinessDay(d)) d = addDays(d, -1);
  return d;
}

/** ymd から n 営業日前 */
export function businessDaysBefore(ymd: YMD, n: number): YMD {
  let d = ymd;
  let left = n;
  while (left > 0) {
    d = addDays(d, -1);
    if (isBusinessDay(d)) left--;
  }
  return d;
}

/** その週（月曜始まり）の最初の営業日 */
export function firstBusinessDayOfWeek(ymd: YMD): YMD {
  const wd = weekdayIndex(ymd);
  const offsetToMonday = wd === 0 ? -6 : 1 - wd;
  let d = addDays(ymd, offsetToMonday);
  const monday = d;
  for (let i = 0; i < 7; i++) {
    if (isBusinessDay(d)) return d;
    d = addDays(d, 1);
  }
  return monday; // 一週間まるごと休みなら月曜を返す
}

/** その日の 13 日以降で最初の営業日 */
export function firstBusinessDayOnOrAfter(ymd: YMD): YMD {
  let d = ymd;
  for (let i = 0; i < 31; i++) {
    if (isBusinessDay(d)) return d;
    d = addDays(d, 1);
  }
  return ymd;
}

/**
 * PCの時計ずれを検知する。「N日目」を信じさせる以上、時計の正しさは前提条件。
 * サーバーの Date ヘッダと端末時刻が SKEW_LIMIT_MS 以上ずれていたら警告する。
 */
export const SKEW_LIMIT_MS = 10 * 60 * 1000;

export async function detectClockSkew(): Promise<number | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}?t=${Date.now()}`, {
      method: 'HEAD', cache: 'no-store',
    });
    const header = res.headers.get('date');
    if (!header) return null;
    return Date.now() - new Date(header).getTime();
  } catch {
    return null;
  }
}
