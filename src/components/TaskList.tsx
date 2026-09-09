import { useState } from 'react';
import type { Task } from '../types';
import { dueLabel, isUrgent } from '../lib/priority';
import { dayCount, type YMD } from '../lib/dates';
import SectionTitle from './SectionTitle';

type Band = 'first' | 'rest';

interface Props {
  today: YMD;
  tasks: Task[];      // 並び替え済み・未完了のみ（帯 → 順番 の順で並んでいる）
  closed: Task[];     // 終わった・やらないことにしたもの（論理削除なので戻せる）
  manual: boolean;    // 自分で並べている状態か
  onAdd: (title: string, important: boolean, dueDate?: YMD) => void;
  onDone: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  /** 帯と順番をまとめて確定する。呼ばれた順がそのまま並びになる。 */
  onReorder: (items: { id: string; first: boolean }[]) => void;
  onAuto: () => void;
}

const VISIBLE = 5;

/** 〆切の切迫。色は3段階まで。赤を増やすと、どれも急ぎに見えて効かなくなる。 */
function dueClass(t: Task, today: YMD): string {
  const d = dueLabel(t, today);
  if (!d) return 'due-none';
  if (d.over) return 'due-over';
  return isUrgent(t, today) ? 'due-soon' : 'due-far';
}

export default function TaskList(p: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [important, setImportant] = useState(false);
  const [due, setDue] = useState('');

  // つかんでいるもの／落とす先の目印。落とした時点で両方消す。
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overBand, setOverBand] = useState<Band | null>(null);

  const firstList = p.tasks.filter((t) => t.first);
  const restList = p.tasks.filter((t) => !t.first);

  const commit = (f: Task[], r: Task[]) => p.onReorder([
    ...f.map((t) => ({ id: t.id, first: true })),
    ...r.map((t) => ({ id: t.id, first: false })),
  ]);

  /** 帯の中で1つ動かす。つかみ損ねたときの逃げ道として矢印も残す。 */
  const move = (band: Band, i: number, dir: -1 | 1) => {
    const arr = band === 'first' ? [...firstList] : [...restList];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    if (band === 'first') commit(arr, restList); else commit(firstList, arr);
  };

  /** targetId の「上」に差し込む。targetId が null なら、その帯のいちばん下。 */
  const drop = (band: Band, targetId: string | null) => {
    const moved = p.tasks.find((t) => t.id === dragId);
    setDragId(null); setOverId(null); setOverBand(null);
    if (!moved || moved.id === targetId) return;

    const f = firstList.filter((t) => t.id !== moved.id);
    const r = restList.filter((t) => t.id !== moved.id);
    const arr = band === 'first' ? f : r;
    const at = targetId ? arr.findIndex((t) => t.id === targetId) : -1;
    arr.splice(at < 0 ? arr.length : at, 0, moved);
    if (band === 'first') commit(arr, r); else commit(f, arr);
  };

  const submit = () => {
    if (!title.trim()) return;
    p.onAdd(title.trim(), important, due || undefined);
    setTitle(''); setImportant(false); setDue(''); setAdding(false);
  };

  const row = (t: Task, i: number, band: Band, lastIndex: number) => {
    const d = dueLabel(t, p.today);
    const cls = ['item', 'task', dragId === t.id ? 'dragging' : '', overId === t.id ? 'over' : '']
      .filter(Boolean).join(' ');
    return (
      <div
        className={cls} key={t.id} draggable
        onDragStart={(e) => { setDragId(t.id); e.dataTransfer.effectAllowed = 'move'; }}
        onDragEnd={() => { setDragId(null); setOverId(null); setOverBand(null); }}
        onDragOver={(e) => {
          e.preventDefault(); e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
          setOverId(t.id); setOverBand(null);
        }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); drop(band, t.id); }}
      >
        <div className="head">
          <span className="left">
            <span className="grip" aria-hidden="true">⠿</span>
            <span className={`rank${band === 'first' ? ' top' : ''}`}>{i + 1}</span>
            <span className="tname title-1line" title={t.title}>{t.title}</span>
          </span>
          <span className="sub right">
            {t.important && <b className="badge">重要</b>}
            <span className={dueClass(t, p.today)}>{d ? d.text : '〆切なし'}</span>
            <span className="rowacts">
              <button className="act mv" disabled={i === 0}
                aria-label="上へ動かす" title="上へ動かす"
                onClick={() => move(band, i, -1)}>↑</button>
              <button className="act mv" disabled={i === lastIndex}
                aria-label="下へ動かす" title="下へ動かす"
                onClick={() => move(band, i, 1)}>↓</button>
              <button className="act ok" onClick={() => p.onDone(t.id)}
                title="やり切ったものとして一覧から外します。あとで戻せます。">終わった</button>
              <button className="act" onClick={() => p.onDelete(t.id)}
                title="やらないことにして一覧から外します。あとで戻せます。">やらない</button>
            </span>
          </span>
        </div>
      </div>
    );
  };

  /** 帯そのものへの受け皿。行の隙間や余白に落としても、いちばん下に入る。 */
  const bandProps = (band: Band) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move' as const;
      setOverBand(band); setOverId(null);
    },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); drop(band, null); },
  });

  const shownRest = expanded ? restList : restList.slice(0, VISIBLE);
  const hidden = restList.length - shownRest.length;

  return (
    <div className="card">
      <div className="rowbar">
        <SectionTitle note={`全${p.tasks.length}件`}>やること</SectionTitle>
        <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {p.manual && (
            <button className="linkish" onClick={p.onAuto}>並びを自動に戻す</button>
          )}
          <button onClick={() => setAdding((v) => !v)}>{adding ? 'やめる' : '追加'}</button>
        </span>
      </div>

      {p.tasks.length > 0 && (
        <p className="legend">
          行をつかんで動かせます（矢印でも動きます）。　
          <b>終わった</b>＝やり切った　<b>やらない</b>＝やらずに一覧から外す
          （どちらも下の記録から戻せます）
        </p>
      )}

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

      {p.tasks.length > 0 && (
        <>
          <div
            className={`band first${overBand === 'first' ? ' over' : ''}`}
            {...bandProps('first')}
          >
            <p className="bandname">先にやる<span className="note">今日ここから手をつける</span></p>
            {firstList.length === 0
              ? <p className="drophint">ここへ引っぱると、先にやるものになります。</p>
              : firstList.map((t, i) => row(t, i, 'first', firstList.length - 1))}
            {firstList.length > 5 && (
              <p className="drophint">
                先にやるものが{firstList.length}件あります。数が増えると、順番の意味が薄くなります。
              </p>
            )}
          </div>

          <div
            className={`band${overBand === 'rest' ? ' over' : ''}`}
            {...bandProps('rest')}
          >
            <p className="bandname">そのほか<span className="note">重要・急ぎの順</span></p>
            {restList.length === 0
              ? <p className="drophint">ここには何もありません。</p>
              : shownRest.map((t, i) => row(t, i, 'rest', restList.length - 1))}

            {(hidden > 0 || expanded) && restList.length > VISIBLE && (
              <p className="more">
                {hidden > 0 && <>ほか{hidden}件 ・ </>}
                <button className="linkish" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? '畳む' : 'すべて見る'}
                </button>
              </p>
            )}
          </div>
        </>
      )}

      {p.closed.length > 0 && (
        <p className="more">
          <button className="linkish" onClick={() => setShowClosed((v) => !v)}>
            終わった・やらないことにしたもの（{p.closed.length}件）
          </button>
        </p>
      )}
      {showClosed && p.closed.map((t) => (
        <div className="item" key={t.id}>
          <div className="head">
            <span className="sub title-1line" title={t.title}>
              {t.title}
              {t.doneAt ? '　終わった' : '　やらないことにした'}
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
