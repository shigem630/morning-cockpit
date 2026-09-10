import { HOLIDAY_TABLE_END, SKEW_LIMIT_MS, type YMD } from '../lib/dates';
import type { SyncState } from '../lib/store';

const hhmm = (d: Date) =>
  new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);

/** permission-denied は「オフライン」と別文言にする。原因の切り分けが変わるため。 */
function describe(code: string): { text: string; hint: string } {
  switch (code) {
    case 'permission-denied':
      return {
        text: 'サーバーに拒否されました。保存されていません。',
        hint: 'ログインが切れたか、セキュリティルールが変わった可能性があります。',
      };
    case 'unavailable':
      return {
        text: 'サーバーに接続できません。この端末にのみ保存されています。',
        hint: 'ネットワークが切れているか、通信が遮断されています。',
      };
    case 'unauthenticated':
      return { text: 'ログインが切れています。', hint: '一度ログアウトし、再度ログインしてください。' };
    default:
      return { text: '保存でエラーが起きました。', hint: 'この画面を撮影してお送りください。' };
  }
}

export function SyncBanner({ syncs, onRetry }: { syncs: SyncState[]; onRetry: () => void }) {
  const pending = syncs.reduce((n, s) => n + s.pending, 0);
  const err = syncs.find((s) => s.errorCode)?.errorCode ?? null;
  const lastServer = syncs
    .map((s) => s.lastServerAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  if (!err && pending === 0) return null;
  const d = err ? describe(err) : null;

  return (
    <div className="banner">
      <div>
        {pending > 0 && <>未保存が{pending}件あります。</>}
        {lastServer
          ? <>最後にサーバーへ保存できたのは {hhmm(lastServer)} です。</>
          : <>まだ一度もサーバーへ保存されていません。</>}
        {d && <><br />{d.text} {d.hint}<br /><code>{err}</code></>}
      </div>
      <button onClick={onRetry}>再読み込み</button>
    </div>
  );
}

export function ClockSkewBanner({ skewMs }: { skewMs: number | null }) {
  if (skewMs === null || Math.abs(skewMs) < SKEW_LIMIT_MS) return null;
  const min = Math.round(skewMs / 60000);
  return (
    <div className="banner warn">
      <div>
        このパソコンの時計が、正しい時刻から約{Math.abs(min)}分
        {min > 0 ? '進んで' : '遅れて'}います。
        経過日数の計算がずれるため、時刻を修正してください。
      </div>
    </div>
  );
}

export function HolidayTableBanner({ today }: { today: YMD }) {
  // 期限の3ヶ月前から出す。切れてから気づくと、その間の営業日判定が全部おかしい。
  const warnFrom = HOLIDAY_TABLE_END.slice(0, 4) + '-09-01';
  if (today < warnFrom) return null;
  const expired = today > HOLIDAY_TABLE_END;
  return (
    <div className="banner warn">
      <div>
        {expired
          ? <>祝日データが {HOLIDAY_TABLE_END} までで終了しています。
              現在、祝日を平日として計算しています。内閣府のCSVから再作成してください。</>
          : <>祝日データは {HOLIDAY_TABLE_END} までです。
              年内に内閣府のCSVから再作成してください。</>}
      </div>
    </div>
  );
}
