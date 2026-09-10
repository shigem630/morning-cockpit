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
  /** 昨日「手はつけた」で終わった仕事。今朝の候補として先に出す。 */
  carriedOver: Task | null;
  streak: { hit: number; of: number };
  onChoose: (id: string) => void;
  onSkip: () => void;
  /** 決めたあとに選び直す。今日の1件を空に戻すだけで、仕事は消さない。 */
  onReselect: () => void;
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
          <SectionTitle>本日の最優先</SectionTitle>
          <h2 style={{ color: 'var(--text-muted)', fontSize: 20 }}>まず1件、登録してください</h2>
          <input
            className="textin" style={{ marginTop: 10 }} value={draft}
            placeholder="例：避難訓練の準備"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) p.onCreateFirst(draft.trim()); }}
          />
        </div>
        <div>
          <button className="primary" disabled={!draft.trim()}
            onClick={() => p.onCreateFirst(draft.trim())}>登録</button>
        </div>
      </div>
    );
  }

  // まだ今日の1件を決めていない。候補は3件ではなく1件。否定だけを操作にする。
  if (!p.chosen) {
    const c = p.candidate;
    const carried = p.carriedOver && c && p.carriedOver.id === c.id;
    return (
      <div className="card focus">
        <div>
          <SectionTitle>本日の最優先</SectionTitle>
          <h2>{c ? c.title : '選択できる項目がありません'}</h2>
          {carried && (
            <p className="sub" style={{ margin: '2px 0 0' }}>昨日着手した案件の続きです</p>
          )}
          {c && dueLabel(c, p.today) && (
            <p className={`due${dueLabel(c, p.today)!.over ? ' over' : ''}`}>
              {dueLabel(c, p.today)!.text}
            </p>
          )}
        </div>
        <div className="acts">
          {c && <button className="primary" onClick={() => p.onChoose(c.id)}>これに決定</button>}
          <button onClick={p.onSkip}>別の候補</button>
        </div>
      </div>
    );
  }

  const due = dueLabel(p.chosen, p.today);
  const result = p.log.focusResult ?? null;

  return (
    <div className="card focus">
      <div>
        <SectionTitle>本日の最優先</SectionTitle>
        <h2 className={result === 'done' ? 'settled' : undefined}>{p.chosen.title}</h2>
        {result === 'done' && <p className="note-done">完了しました。おつかれさまでした。</p>}
        {result === 'started' && (
          <p className="note-started">着手済みです。続きは翌朝の第一候補に表示します。</p>
        )}
        {!result && due && <p className={`due${due.over ? ' over' : ''}`}>{due.text}</p>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="acts">
          <button className="primary" aria-pressed={result === 'done'}
            onClick={() => p.onResult('done')}>完了</button>
          <button aria-pressed={result === 'started'}
            onClick={() => p.onResult('started')}>着手</button>
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
          <button className="linkish" onClick={p.onReselect}>
            {result ? '次の候補を選ぶ' : '候補を変更'}
          </button>
          <span style={{ marginLeft: 14 }}>直近30日で{p.streak.hit}日</span>
        </p>
      </div>
    </div>
  );
}
