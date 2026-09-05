// Google カレンダーの読み取り。
// 予定は5本のカレンダーに分かれている（~/esthel-discord-bot/gcal.mjs より）。
// primary はほぼ空なので、それだけを見ると「予定なし」に見える。
import { getCalendarToken } from '../firebase';
import type { YMD } from './dates';

export const CALENDARS: { id: string; name: string }[] = [
  { id: '1ea3dc4d74c714ecb0ecf6284bda49c69f07c8b0d5c2a22e516b389784cfd79a@group.calendar.google.com', name: '仕事' },
  { id: 'veuunp8pav9l1v3it7tmsgvg7c@group.calendar.google.com', name: '仕事(対人)' },
  { id: 'l48tk5jviq0eub5956c86dudeg@group.calendar.google.com', name: '雄太と望美' },
  { id: 'denikin630@gmail.com', name: 'primary' },
];
// 〆切カレンダーは読まない。5段階通知で麻痺した対象を画面にも並べない。

export interface CalEvent {
  start: string | null; // 'HH:MM'。終日予定は null
  title: string;
  calendar: string;
}

export class NoTokenError extends Error {
  constructor() { super('カレンダーのトークンがありません'); }
}

export class CalendarApiError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
    readonly detail: string,
  ) {
    super(detail || `HTTP ${status}`);
  }

  /** 非エンジニアが次に何をすればよいかまで書く。 */
  get advice(): string | null {
    if (this.reason === 'accessNotConfigured' || /has not been used in project|is disabled/.test(this.detail)) {
      return 'このプロジェクトで Google カレンダーの機能がまだ有効になっていません。'
           + 'Google Cloud の「APIとサービス」で Google Calendar API を有効にすると直ります。';
    }
    if (this.reason === 'insufficientPermissions' || this.status === 403) {
      return 'カレンダーを読む許可が下りていません。一度「出る」で出てから入り直し、'
           + '同意画面でカレンダーのチェックを入れてください。';
    }
    return null;
  }
}

export async function fetchTodayEvents(today: YMD): Promise<CalEvent[]> {
  const token = getCalendarToken();
  if (!token) throw new NoTokenError();

  const timeMin = `${today}T00:00:00+09:00`;
  const timeMax = `${today}T23:59:59+09:00`;

  const results = await Promise.all(
    CALENDARS.map(async (cal) => {
      const url = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events`,
      );
      url.searchParams.set('timeMin', timeMin);
      url.searchParams.set('timeMax', timeMax);
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');
      url.searchParams.set('maxResults', '20');

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        if (res.status === 404) return []; // カレンダーが消えている。他は出す
        // 何が起きたかを推測で丸めない。Google が返した理由をそのまま画面へ運ぶ。
        let reason = '';
        let detail = '';
        try {
          const body = await res.json();
          reason = body?.error?.errors?.[0]?.reason ?? body?.error?.status ?? '';
          detail = body?.error?.message ?? '';
        } catch { /* 本文がJSONでないことがある */ }

        // トークンそのものが切れている場合だけ「入り直せば直る」扱いにする。
        if (res.status === 401 || reason === 'authError' || reason === 'invalidCredentials') {
          throw new NoTokenError();
        }
        throw new CalendarApiError(res.status, reason, detail);
      }
      const json = await res.json();
      return (json.items ?? []).map((it: {
        summary?: string; start?: { dateTime?: string; date?: string };
      }): CalEvent => ({
        start: it.start?.dateTime
          ? new Intl.DateTimeFormat('en-GB', {
              timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false,
            }).format(new Date(it.start.dateTime))
          : null,
        title: it.summary || '（件名なし）',
        calendar: cal.name,
      }));
    }),
  );

  return results.flat().sort((a, b) => {
    if (a.start === null) return -1;
    if (b.start === null) return 1;
    return a.start.localeCompare(b.start);
  });
}
