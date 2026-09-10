import type { CalEvent } from '../lib/calendar';
import type { WhenTag } from '../types';
import SectionTitle from './SectionTitle';

export type CalState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  // live=false は「手元に残っていたぶんを出している」。時刻を必ず添えて、
  // 今この瞬間の予定であるかのようには見せない。
  | { kind: 'ok'; events: CalEvent[]; at: Date; live: boolean }
  | { kind: 'notoken' }
  | { kind: 'error'; message: string; advice?: string | null; at: Date };

interface Props {
  state: CalState;
  nowHHMM: string;
  when: WhenTag;
  onLoad: () => void;
}

const hhmm = (d: Date) =>
  new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);

/** 実行意図の帯。カレンダーには書き込まない。 */
function inBand(start: string | null, when: WhenTag): boolean {
  if (!start || !when) return false;
  const h = Number(start.slice(0, 2));
  if (when === 'am') return h < 12;
  if (when === 'noon') return h >= 12 && h < 14;
  return h >= 14;
}

export default function TodaySchedule({ state, nowHHMM, when, onLoad }: Props) {
  return (
    <div className="card">
      <div className="rowbar">
        <SectionTitle>本日の予定</SectionTitle>
        {state.kind !== 'loading' && (
          <button onClick={onLoad}>{state.kind === 'ok' ? '再取得' : '予定を取得'}</button>
        )}
      </div>

      {state.kind === 'idle' && (
        <p className="empty">「予定を取得」を押すと、本日の予定を表示します。</p>
      )}

      {state.kind === 'loading' && <p className="empty">取得しています…</p>}

      {state.kind === 'notoken' && (
        <p className="empty">
          カレンダーへのアクセス許可が失効しました（約1時間で失効します）。<br />
          「予定を取得」を押すと、再度認証できます。
        </p>
      )}

      {state.kind === 'error' && (
        <p className="empty">
          予定を取得できませんでした（{hhmm(state.at)}）。<br />
          {state.advice && <><span style={{ color: 'var(--warn)' }}>{state.advice}</span><br /></>}
          <code style={{ fontSize: 12 }}>{state.message}</code>
        </p>
      )}

      {state.kind === 'ok' && state.events.length === 0 && (
        <p className="empty">本日の予定はありません（{hhmm(state.at)}時点）。</p>
      )}

      {state.kind === 'ok' && !state.live && (
        <p className="stale">
          {hhmm(state.at)}時点の取得内容です。<br />
          アクセス許可が失効しているため、以降の変更は反映されていません。
        </p>
      )}

      {state.kind === 'ok' && state.events.map((e, i) => {
        const next = state.events[i + 1];
        const isNow =
          e.start !== null && e.start <= nowHHMM &&
          (!next?.start || next.start > nowHHMM);
        const cls = ['sched', isNow ? 'now' : '', inBand(e.start, when) ? 'marked' : '']
          .filter(Boolean).join(' ');
        return (
          <div className={cls} key={`${e.calendar}-${i}`}>
            <span className="t">{e.start ?? '終日'}</span>
            <span>{e.title}</span>
          </div>
        );
      })}
    </div>
  );
}
