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
        text: 'クラウドに拒否されました。保存できていません。',
        hint: 'ログインが切れたか、セキュリティルールが変わった可能性があります。',
      };
    case 'unavailable':
      return {
        text: 'クラウドにつながりません。手元にだけ残っています。',
        hint: 'ネットワークが切れているか、通信が遮断されています。',
      };
    case 'unauthenticated':
      return { text: 'ログインが切れています。', hint: '一度出て、入り直してください。' };
    default:
      return { text: '保存でエラーが起きました。', hint: 'この画面をそのまま撮って送ってください。' };
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
          ? <>最後にクラウドへ保存できたのは {hhmm(lastServer)} です。</>
          : <>まだ一度もクラウドに届いていません。</>}
        {d && <><br />{d.text} {d.hint}<br /><code>{err}</code></>}
      </div>
      <button onClick={onRetry}>もう一度ためす</button>
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
        「◯日目」の数え方が狂うので、時計を合わせてください。
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
          ? <>祝日の一覧が {HOLIDAY_TABLE_END} で切れています。
              いまは祝日を平日として数えています。内閣府のCSVから作り直してください。</>
          : <>祝日の一覧が {HOLIDAY_TABLE_END} までしかありません。
              年内に内閣府のCSVから作り直してください。</>}
      </div>
    </div>
  );
}
