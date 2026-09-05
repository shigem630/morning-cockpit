import { useState } from 'react';
import type { Stalled } from '../types';
import { dayCount, formatShort, type YMD } from '../lib/dates';
import SectionTitle from './SectionTitle';

interface Props {
  today: YMD;
  rows: Stalled[];
  masked: boolean;
  onNudge: (id: string) => void;
  onUnnudge: (id: string) => void;
  onResolve: (id: string, outcome: Stalled['outcome']) => void;
  onReopen: (id: string) => void;
  onAdd: (who: string, what: string) => void;
}

const VISIBLE = 3;
/** 赤の希少性を仕組みで守る。同時に赤くするのは最大3件。 */
const MAX_ALERT = 3;

export default function StalledList(p: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [adding, setAdding] = useState(false);
  const [who, setWho] = useState('');
  const [what, setWhat] = useState('');

  const open = p.rows.filter((r) => !r.resolvedAt)
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
  const closed = p.rows.filter((r) => r.resolvedAt)
    .sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''));

  const shown = expanded ? open : open.slice(0, VISIBLE);
  const hiddenCount = open.length - shown.length;
  const longOnes = open.filter((r) => dayCount(r.requestedAt, p.today) >= 7);
  const overflow = Math.max(0, longOnes.length - MAX_ALERT);

  let budget = MAX_ALERT;

  const submit = () => {
    if (!who.trim() || !what.trim()) return;
    p.onAdd(who.trim(), what.trim());
    setWho(''); setWhat(''); setAdding(false);
  };

  return (
    <div className="card">
      <div className="rowbar">
        <SectionTitle note="人に頼んで、返ってきていない仕事">返事待ち</SectionTitle>
        <button onClick={() => setAdding((v) => !v)}>{adding ? 'やめる' : '足す'}</button>
      </div>

      {adding && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              誰に<br />
              <input className="textin" style={{ width: 130 }} value={who}
                placeholder="田中先生" onChange={(e) => setWho(e.target.value)} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              何を頼んだか<br />
              <input className="textin" style={{ width: 190 }} value={what}
                placeholder="内規案の確認" onChange={(e) => setWhat(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
            </label>
            <button className="primary" onClick={submit}>足す</button>
          </div>
        </div>
      )}

      {open.length === 0 && !adding && (
        <p className="empty">
          まだありません。誰かに仕事を頼んだら、Discordのエステルに一言送ってください。
        </p>
      )}

      {shown.map((r) => {
        const days = dayCount(r.requestedAt, p.today);
        const red = days >= 7 && budget > 0;
        if (red) budget--;
        const cls = red ? 'd7' : days >= 3 ? 'd3' : 'd0';
        const nudgedToday = r.nudges.includes(p.today);
        return (
          <div className="item" key={r.id}>
            <div className="head">
              <span>{r.what}</span>
              <button
                aria-pressed={nudgedToday}
                title={nudgedToday ? 'もう一度押すと、今日の記録を取り消します' : undefined}
                onClick={() => (nudgedToday ? p.onUnnudge(r.id) : p.onNudge(r.id))}
              >
                {nudgedToday ? '今日 声をかけた' : '声をかけた'}
              </button>
            </div>
            <p className="meta">
              <span className={p.masked ? 'masked' : undefined}>{r.who}</span>
              ・<span className={cls}>{days}日目</span>
              {r.nudges.length > 0 && <>・{[...r.nudges].sort().map(formatShort).join('、')}に連絡</>}
            </p>
            <div className="exits">
              <button className="linkish" onClick={() => p.onResolve(r.id, 'done')}>返事が来た</button>
              <span className="sub">／</span>
              <button className="linkish" onClick={() => p.onResolve(r.id, 'dropped')}>取り下げる</button>
              {r.nudges.length >= 3 && (
                <>
                  <span className="sub">／</span>
                  <button className="linkish" onClick={() => p.onResolve(r.id, 'selfDid')}>自分でやる</button>
                </>
              )}
            </div>
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

      {overflow > 0 && <p className="more">ほか{overflow}件が1週間以上</p>}

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
