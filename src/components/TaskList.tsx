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
  /** 題名・〆切・重要を直す。〆切を空にしたら null を渡す（消す意思と区別する）。 */
  onEdit: (id: string, patch: { title: string; important: boolean; dueDate: YMD | null }) => void;
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

  // 直している最中の1件。開いている間、その行はつかめなくする。
  const [editing, setEditing] = useState<string | null>(null);
  const [eTitle, setETitle] = useState('');
  const [eDue, setEDue] = useState('');
  const [eImp, setEImp] = useState(false);

  const startEdit = (t: Task) => {
    setEditing(t.id); setETitle(t.title);
    setEDue(t.dueDate ?? ''); setEImp(t.important);
  };
  const saveEdit = () => {
    if (!editing || !eTitle.trim()) return;
    p.onEdit(editing, { title: eTitle.trim(), important: eImp, dueDate: eDue || null });
    setEditing(null);
  };

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

    if (editing === t.id) {
      return (
        <div className="item task editing" key={t.id}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="textin" style={{ flex: '1 1 220px' }} value={eTitle} autoFocus
              onChange={(e) => setETitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') setEditing(null);
              }} />
            <input className="textin" style={{ width: 150 }} type="date" value={eDue}
              onChange={(e) => setEDue(e.target.value)} />
            <label className="chk" style={{ fontSize: 14 }}>
              <input type="checkbox" checked={eImp} onChange={(e) => setEImp(e.target.checked)} />
              <span>重要</span>
            </label>
            <button className="primary" disabled={!eTitle.trim()} onClick={saveEdit}>保存</button>
            <button onClick={() => setEditing(null)}>キャンセル</button>
          </div>
          <p className="legend" style={{ margin: '8px 0 0' }}>
            期限を空欄にすると「期限なし」になります。
          </p>
        </div>
      );
    }

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
            <button className="tname title-1line editable" title="クリックすると編集できます"
              onClick={() => startEdit(t)}>{t.title}</button>
          </span>
          <span className="sub right">
            {t.important && <b className="badge">重要</b>}
            <span className={dueClass(t, p.today)}>{d ? d.text : '期限なし'}</span>
            <span className="rowacts">
              <button className="act mv" disabled={i === 0}
                aria-label="上へ移動" title="上へ移動"
                onClick={() => move(band, i, -1)}>↑</button>
              <button className="act mv" disabled={i === lastIndex}
                aria-label="下へ移動" title="下へ移動"
                onClick={() => move(band, i, 1)}>↓</button>
              <button className="act" onClick={() => startEdit(t)}
                title="件名・期限・重要度を編集します">編集</button>
              <button className="act ok" onClick={() => p.onDone(t.id)}
                title="実施済みとして一覧から外します。あとで復元できます。">完了</button>
              <button className="act" onClick={() => p.onDelete(t.id)}
                title="実施せずに一覧から外します。あとで復元できます。">取りやめ</button>
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
        <SectionTitle note={`全${p.tasks.length}件`}>タスク</SectionTitle>
        <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {p.manual && (
            <button className="linkish" onClick={p.onAuto}>並び順を自動に戻す</button>
          )}
          <button onClick={() => setAdding((v) => !v)}>{adding ? 'キャンセル' : '追加'}</button>
        </span>
      </div>

      {p.tasks.length > 0 && (
        <p className="legend">
          行をドラッグして並べ替えられます（矢印でも移動できます）。　
          <b>完了</b>＝実施済み　<b>取りやめ</b>＝実施せず一覧から除外
          （いずれも下の履歴から復元できます）
        </p>
      )}

      {adding && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <input className="textin" placeholder="件名" value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
          <input className="textin" style={{ width: 160 }} type="date" value={due}
            onChange={(e) => setDue(e.target.value)} />
          <label className="chk" style={{ fontSize: 14 }}>
            <input type="checkbox" checked={important}
              onChange={(e) => setImportant(e.target.checked)} />
            <span>重要</span>
          </label>
          <button className="primary" onClick={submit}>追加</button>
        </div>
      )}

      {p.tasks.length === 0 && <p className="empty">登録されているタスクはありません。</p>}

      {p.tasks.length > 0 && (
        <>
          <div
            className={`band first${overBand === 'first' ? ' over' : ''}`}
            {...bandProps('first')}
          >
            <p className="bandname">優先<span className="note">本日、優先して着手するもの</span></p>
            {firstList.length === 0
              ? <p className="drophint">ここへドラッグすると、優先に移動します。</p>
              : firstList.map((t, i) => row(t, i, 'first', firstList.length - 1))}
            {firstList.length > 5 && (
              <p className="drophint">
                優先が{firstList.length}件あります。件数が増えると、順位付けの意味が薄れます。
              </p>
            )}
          </div>

          <div
            className={`band${overBand === 'rest' ? ' over' : ''}`}
            {...bandProps('rest')}
          >
            <p className="bandname">その他<span className="note">重要度・期限順</span></p>
            {restList.length === 0
              ? <p className="drophint">該当するタスクはありません。</p>
              : shownRest.map((t, i) => row(t, i, 'rest', restList.length - 1))}

            {(hidden > 0 || expanded) && restList.length > VISIBLE && (
              <p className="more">
                {hidden > 0 && <>他{hidden}件 ・ </>}
                <button className="linkish" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? '折りたたむ' : 'すべて表示'}
                </button>
              </p>
            )}
          </div>
        </>
      )}

      {p.closed.length > 0 && (
        <p className="more">
          <button className="linkish" onClick={() => setShowClosed((v) => !v)}>
            完了・取りやめ（{p.closed.length}件）
          </button>
        </p>
      )}
      {showClosed && p.closed.map((t) => (
        <div className="item" key={t.id}>
          <div className="head">
            <span className="sub title-1line" title={t.title}>
              {t.title}
              {t.doneAt ? '　完了' : '　取りやめ'}
            </span>
            <button className="linkish" onClick={() => p.onRestore(t.id)}>復元</button>
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
      <SectionTitle note="期限がないため、後回しになりやすい案件">重要・緊急でない</SectionTitle>
      <div className="rowbar">
        <span>{task.title}</span>
        <span className="sub">
          重要・{task.dueDate ? dueLabel(task, today)?.text : '期限なし'}・
          <span className={days >= 7 ? 'd7' : days >= 3 ? 'd3' : 'd0'}>{days}日目</span>
        </span>
      </div>
    </div>
  );
}
