import { useState } from 'react';
import type { Task } from '../types';
import { dueLabel } from '../lib/priority';
import { dayCount, type YMD } from '../lib/dates';
import SectionTitle from './SectionTitle';

interface Props {
  today: YMD;
  tasks: Task[];      // 並び替え済み・未完了のみ
  closed: Task[];     // 終わった・消したもの（論理削除なので戻せる）
  onAdd: (title: string, important: boolean, dueDate?: YMD) => void;
  onDone: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}

const VISIBLE = 5;

export default function TaskList(p: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [important, setImportant] = useState(false);
  const [due, setDue] = useState('');

  const shown = expanded ? p.tasks : p.tasks.slice(0, VISIBLE);
  const hidden = p.tasks.length - shown.length;

  const submit = () => {
    if (!title.trim()) return;
    p.onAdd(title.trim(), important, due || undefined);
    setTitle(''); setImportant(false); setDue(''); setAdding(false);
  };

  return (
    <div className="card">
      <div className="rowbar">
        <SectionTitle note={`全${p.tasks.length}件`}>やること</SectionTitle>
        <button onClick={() => setAdding((v) => !v)}>{adding ? 'やめる' : '追加'}</button>
      </div>

      {adding && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <input className="textin" placeholder="やること" value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
          <input className="textin" style={{ width: 160 }} type="date" value={due}
            onChange={(e) => setDue(e.target.value)} />
          <label className="chk" style={{ fontSize: 14 }}>
            <input type="checkbox" checked={important}
              onChange={(e) => setImportant(e.target.checked)} />
            <span>重要</span>
          </label>
          <button className="primary" onClick={submit}>足す</button>
        </div>
      )}

      {p.tasks.length === 0 && <p className="empty">やることはありません。</p>}

      {shown.map((t) => {
        const d = dueLabel(t, p.today);
        return (
          <div className="item" key={t.id}>
            <div className="head">
              <span className="title-1line" title={t.title}>{t.title}</span>
              <span className="sub" style={{ whiteSpace: 'nowrap' }}>
                {t.important && '重要　'}
                {d ? d.text : '〆切なし'}
                {'　'}
                <button className="linkish" onClick={() => p.onDone(t.id)}>終わった</button>
                {'　'}
                <button className="linkish" onClick={() => p.onDelete(t.id)}>消す</button>
              </span>
            </div>
          </div>
        );
      })}

      {(hidden > 0 || expanded) && p.tasks.length > VISIBLE && (
        <p className="more">
          {hidden > 0 && <>ほか{hidden}件 ・ </>}
          <button className="linkish" onClick={() => setExpanded((v) => !v)}>
            {expanded ? '畳む' : 'すべて見る'}
          </button>
        </p>
      )}

      {p.closed.length > 0 && (
        <p className="more">
          <button className="linkish" onClick={() => setShowClosed((v) => !v)}>
            終わった・消したもの（{p.closed.length}件）
          </button>
        </p>
      )}
      {showClosed && p.closed.map((t) => (
        <div className="item" key={t.id}>
          <div className="head">
            <span className="sub title-1line" title={t.title}>
              {t.title}
              {t.doneAt ? '　終わった' : '　消した'}
            </span>
            <button className="linkish" onClick={() => p.onRestore(t.id)}>戻す</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 「重要だが緊急でない」枠。見出しは「急ぎではないが重要な仕事」。弱点を名指しする言い方にはしない。 */
export function SoonCard({ today, task }: { today: YMD; task: Task | null }) {
  if (!task) return null;
  const days = dayCount(task.createdAt, today);
  return (
    <div className="card">
      <SectionTitle note="〆切がないぶん、後回しになりやすい仕事">重要・急ぎでない</SectionTitle>
      <div className="rowbar">
        <span>{task.title}</span>
        <span className="sub">
          重要・{task.dueDate ? dueLabel(task, today)?.text : '〆切なし'}・
          <span className={days >= 7 ? 'd7' : days >= 3 ? 'd3' : 'd0'}>{days}日目</span>
        </span>
      </div>
    </div>
  );
}
