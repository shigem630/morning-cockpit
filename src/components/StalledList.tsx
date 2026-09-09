import { useState } from 'react';
import type { Stalled } from '../types';
import {
  businessDaysAfter, businessDaysBefore, dayCount, daysBetween, formatShort, type YMD,
} from '../lib/dates';
import SectionTitle from './SectionTitle';

interface Props {
  today: YMD;
  rows: Stalled[];
  masked: boolean;
  onNudge: (id: string) => void;
  onUnnudge: (id: string) => void;
  onResolve: (id: string, outcome: Stalled['outcome']) => void;
  onReopen: (id: string) => void;
  onAdd: (who: string, what: string, dueDate?: YMD) => void;
  onDue: (id: string, dueDate: YMD | null) => void;
}

const VISIBLE = 3;
/** 赤の希少性を仕組みで守る。同時に赤くするのは最大3件。 */
const MAX_ALERT = 3;
/** 期限の何営業日前に声をかけるか。土日祝は数えない（その日は声をかけられない）。 */
const LEAD_DAYS = 3;
/** 一度声をかけたあと、次に声をかけるまで空ける営業日数。
    毎日「今日、声をかける」と出ると、表示そのものを信用しなくなる。 */
const RENUDGE_DAYS = 2;

type Plan =
  | { kind: 'over'; days: number }          // 期限を過ぎている
  | { kind: 'now'; left: number }           // 今日、声をかける日
  | { kind: 'wait'; days: number }          // あと何日で声をかける日になるか
  | { kind: 'age'; days: number };          // 期限なし。放置日数で見る

/** いつ声をかければよいかを1つに決める。画面はこの結果を出すだけにする。 */
function plan(r: Stalled, today: YMD): Plan {
  if (!r.dueDate) return { kind: 'age', days: dayCount(r.requestedAt, today) };

  const left = daysBetween(today, r.dueDate);
  if (left < 0) return { kind: 'over', days: -left };

  const target = businessDaysBefore(r.dueDate, LEAD_DAYS);
  const lastNudge = r.nudges.length ? [...r.nudges].sort().at(-1)! : null;

  let from = target;
  if (lastNudge) {
    // 声をかけた直後に、また「今日、声をかける」と出さない。
    const next = businessDaysAfter(lastNudge, RENUDGE_DAYS);
    if (next > from) from = next;
    // ただし期限より後ろには送らない。期限を過ぎてから声をかけても遅い。
    if (from > r.dueDate) from = r.dueDate;
  }

  const n = daysBetween(today, from);
  return n > 0 ? { kind: 'wait', days: n } : { kind: 'now', left };
}

/** 期限があるものが先。近い順。期限なしは、頼んでから長い順であとに続く。 */
function sortOpen(rows: Stalled[]): Stalled[] {
  return [...rows].sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.requestedAt.localeCompare(b.requestedAt);
  });
}

export default function StalledList(p: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [adding, setAdding] = useState(false);
  const [who, setWho] = useState('');
  const [what, setWhat] = useState('');
  const [newDue, setNewDue] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const open = sortOpen(p.rows.filter((r) => !r.resolvedAt));
  const closed = p.rows.filter((r) => r.resolvedAt)
    .sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''));

  const shown = expanded ? open : open.slice(0, VISIBLE);
  const hiddenCount = open.length - shown.length;

  let budget = MAX_ALERT;

  const submit = () => {
    if (!who.trim() || !what.trim()) return;
    p.onAdd(who.trim(), what.trim(), newDue || undefined);
    setWho(''); setWhat(''); setNewDue(''); setAdding(false);
  };

  /** 〆切の日付そのものを押したら直せる。リンクを1本減らし、行を詰める。 */
  const dueBtn = (r: Stalled) => (
    <button className="editdue"
      onClick={() => { setDraft(r.dueDate ?? ''); setEditing(r.id); }}>
      {formatShort(r.dueDate!)}
    </button>
  );

  const saveDue = (id: string) => {
    p.onDue(id, draft || null);
    setEditing(null); setDraft('');
  };

  return (
    <div className="card">
      <div className="rowbar">
        <SectionTitle note="人に頼んで、返ってきていない仕事">返事待ち</SectionTitle>
        <button onClick={() => setAdding((v) => !v)}>{adding ? 'やめる' : '足す'}</button>
      </div>

      {adding && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
          <label className="field">
            誰に
            <input className="textin" style={{ width: 120 }} value={who}
              placeholder="田中先生" onChange={(e) => setWho(e.target.value)} />
          </label>
          <label className="field">
            何を頼んだか
            <input className="textin" style={{ width: 180 }} value={what}
              placeholder="次年度授業担当一覧" onChange={(e) => setWhat(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
          </label>
          <label className="field">
            いつまでに
            <input className="textin" style={{ width: 150 }} type="date" value={newDue}
              onChange={(e) => setNewDue(e.target.value)} />
          </label>
          <button className="primary" onClick={submit}>足す</button>
        </div>
      )}

      {open.length === 0 && !adding && (
        <p className="empty">
          まだありません。誰かに仕事を頼んだら、Discordのエステルに一言送ってください。
        </p>
      )}

      {shown.map((r) => {
        const pl = plan(r, p.today);
        const wantsRed = pl.kind === 'over' || (pl.kind === 'age' && pl.days >= 7);
        const red = wantsRed && budget > 0;
        if (red) budget--;
        const nudgedToday = r.nudges.includes(p.today);

        return (
          <div className="item stall" key={r.id}>
            <div className="head">
              <span className="title-1line" title={r.what}>{r.what}</span>
              <button
                aria-pressed={nudgedToday}
                title={nudgedToday ? 'もう一度押すと、今日の記録を取り消します' : undefined}
                onClick={() => (nudgedToday ? p.onUnnudge(r.id) : p.onNudge(r.id))}
              >
                {nudgedToday ? '今日 声をかけた' : '声をかけた'}
              </button>
            </div>

            {editing === r.id ? (
              <p className="meta">
                <input className="textin" style={{ width: 150 }} type="date" value={draft}
                  autoFocus onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveDue(r.id); }} />
                <button className="act ok" onClick={() => saveDue(r.id)}>入れる</button>
                <button className="linkish" onClick={() => setEditing(null)}>やめる</button>
                {r.dueDate && (
                  <button className="linkish" onClick={() => { p.onDue(r.id, null); setEditing(null); }}>
                    期限を消す
                  </button>
                )}
              </p>
            ) : (
              <p className="meta">
                <span>
                  <span className={p.masked ? 'masked' : undefined}>{r.who}</span>
                  {'・'}
                  {pl.kind === 'over' && (
                    <span className={red ? 'd7' : 'd3'}>
                      〆{dueBtn(r)}を{pl.days}日過ぎています
                    </span>
                  )}
                  {pl.kind === 'now' && (
                    <span className="due-soon">
                      今日、声をかける（〆{dueBtn(r)}・{pl.left === 0 ? '今日' : `あと${pl.left}日`}）
                    </span>
                  )}
                  {pl.kind === 'wait' && (
                    <span className="due-far">
                      あと{pl.days}日で声をかける（〆{dueBtn(r)}）
                    </span>
                  )}
                  {pl.kind === 'age' && (
                    <>
                      <span className={red ? 'd7' : pl.days >= 3 ? 'd3' : 'd0'}>{pl.days}日目</span>
                      {'・'}
                      <button className="editdue"
                        onClick={() => { setDraft(''); setEditing(r.id); }}>期限を入れる</button>
                    </>
                  )}
                </span>
                {r.nudges.length > 0 && (
                  <span className="sub">{[...r.nudges].sort().map(formatShort).join('、')}に連絡</span>
                )}
                <span className="exits-inline">
                  <button className="linkish" onClick={() => p.onResolve(r.id, 'done')}>返事が来た</button>
                  <span className="sub">／</span>
                  <button className="linkish" onClick={() => p.onResolve(r.id, 'dropped')}>取り下げる</button>
                  {r.nudges.length >= 3 && (
                    <>
                      <span className="sub">／</span>
                      <button className="linkish" onClick={() => p.onResolve(r.id, 'selfDid')}>自分でやる</button>
                    </>
                  )}
                </span>
              </p>
            )}

          </div>
        );
      })}

      {hiddenCount > 0 || (expanded && open.length > VISIBLE) ? (
        <p className="more">
          {hiddenCount > 0 && <>ほか{hiddenCount}件 ・ </>}
          <button className="linkish" onClick={() => setExpanded((v) => !v)}>
            {expanded ? '畳む' : 'すべて見る'}
          </button>
        </p>
      ) : null}

      {closed.length > 0 && (
        <p className="more">
          <button className="linkish" onClick={() => setShowDone((v) => !v)}>
            片づいたもの（{closed.length}件）
          </button>
        </p>
      )}
      {showDone && closed.map((r) => (
        <div className="item" key={r.id}>
          <div className="head">
            <span className="sub">{r.what}・<span className={p.masked ? 'masked' : undefined}>{r.who}</span></span>
            <button className="linkish" onClick={() => p.onReopen(r.id)}>戻す</button>
          </div>
        </div>
      ))}
    </div>
  );
}
