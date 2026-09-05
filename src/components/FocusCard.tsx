import { useState } from 'react';
import type { DayLog, Task, WhenTag } from '../types';
import { dueLabel } from '../lib/priority';
import type { YMD } from '../lib/dates';
import SectionTitle from './SectionTitle';

interface Props {
  today: YMD;
  candidate: Task | null;      // まだ選んでいないときの提案（1件だけ）
  chosen: Task | null;         // 今日の1件として選ばれているもの
  log: DayLog;
  hasAnyTask: boolean;
  streak: { hit: number; of: number };
  onChoose: (id: string) => void;
  onSkip: () => void;
  onResult: (r: 'done' | 'started') => void;
  onWhen: (w: WhenTag) => void;
  onCreateFirst: (title: string) => void;
}

const WHENS: { key: Exclude<WhenTag, null>; label: string }[] = [
  { key: 'am', label: '午前' }, { key: 'noon', label: '昼' }, { key: 'pm', label: '夕方' },
];

export default function FocusCard(p: Props) {
  const [draft, setDraft] = useState('');

  if (!p.hasAnyTask) {
    return (
      <div className="card focus">
        <div>
          <SectionTitle>今日の最優先</SectionTitle>
          <h2 style={{ color: 'var(--text-muted)', fontSize: 20 }}>まず1つだけ書いてみましょう</h2>
          <input
            className="textin" style={{ marginTop: 10 }} value={draft}
            placeholder="例：避難訓練の準備"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) p.onCreateFirst(draft.trim()); }}
          />
        </div>
        <div>
          <button className="primary" disabled={!draft.trim()}
            onClick={() => p.onCreateFirst(draft.trim())}>これにする</button>
        </div>
      </div>
    );
  }

  // まだ今日の1件を決めていない。候補は3件ではなく1件。否定だけを操作にする。
  if (!p.chosen) {
    const c = p.candidate;
    return (
      <div className="card focus">
        <div>
          <SectionTitle>今日の最優先</SectionTitle>
          <h2>{c ? c.title : '選べるものがありません'}</h2>
          {c && dueLabel(c, p.today) && (
            <p className={`due${dueLabel(c, p.today)!.over ? ' over' : ''}`}>
              {dueLabel(c, p.today)!.text}
            </p>
          )}
        </div>
        <div className="acts">
          {c && <button className="primary" onClick={() => p.onChoose(c.id)}>これでいい</button>}
          <button onClick={p.onSkip}>別のにする</button>
        </div>
      </div>
    );
  }

  const due = dueLabel(p.chosen, p.today);
  const result = p.log.focusResult ?? null;

  return (
    <div className="card focus">
      <div>
        <SectionTitle>今日の最優先</SectionTitle>
        <h2>{p.chosen.title}</h2>
        {due && <p className={`due${due.over ? ' over' : ''}`}>{due.text}</p>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="acts">
          <button className="primary" aria-pressed={result === 'done'}
            onClick={() => p.onResult('done')}>終わった</button>
          <button aria-pressed={result === 'started'}
            onClick={() => p.onResult('started')}>手はつけた</button>
          <span className="when">
            {WHENS.map((w) => (
              <button key={w.key} aria-pressed={p.log.focusWhen === w.key}
                onClick={() => p.onWhen(p.log.focusWhen === w.key ? null : w.key)}>
                {w.label}
              </button>
            ))}
          </span>
        </div>
        <p className="sub" style={{ margin: '10px 0 0' }}>
          直近30日で{p.streak.hit}日
        </p>
      </div>
    </div>
  );
}
