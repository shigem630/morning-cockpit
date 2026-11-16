import type { Task } from '../types';
import { daysBetween, type YMD } from '../lib/dates';
import { isStarted } from '../lib/priority';
import SectionTitle from './SectionTitle';

// 全体を見る画面。休み時間などに「この先これだけある」を眺めるためのもの。
// 見るだけ。直すのはいつもの画面で行う（ここで触れると、眺めるだけのつもりが作業になる）。

interface Props {
  today: YMD;
  tasks: Task[];   // 未完了のすべて（始まる前のものも含む）
  onBack: () => void;
}

const md = (ymd: YMD) => {
  const [, m, d] = ymd.split('-').map(Number);
  return `${m}/${d}`;
};

/** どの月に置くか。始める日 → 期限 の順。どちらも無いものは「日付なし」。 */
function monthKey(t: Task, today: YMD): string {
  if (isStarted(t, today)) return 'now';
  const base = t.startDate ?? t.dueDate;
  return base ? base.slice(0, 7) : 'none';
}

function monthsAhead(key: string, today: YMD): number {
  const [y, m] = key.split('-').map(Number);
  const [ty, tm] = today.split('-').map(Number);
  return (y - ty) * 12 + (m - tm);
}

/** 先の月ほど薄く。いま始まっているものは濃いまま。 */
function fade(n: number): number {
  if (n <= 0) return 1;
  if (n === 1) return 0.8;
  if (n === 2) return 0.65;
  return 0.5;
}

export default function YearView({ today, tasks, onBack }: Props) {
  const groups = new Map<string, Task[]>();
  for (const t of tasks) {
    const k = monthKey(t, today);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(t);
  }
  const key = (t: Task) => t.startDate ?? t.dueDate ?? '9999';
  for (const arr of groups.values()) arr.sort((a, b) => key(a).localeCompare(key(b)));

  const months = [...groups.keys()].filter((k) => k !== 'now' && k !== 'none').sort();
  const order = [
    ...(groups.has('now') ? ['now'] : []),
    ...months,
    ...(groups.has('none') ? ['none'] : []),
  ];
  const upcomingCount = tasks.filter((t) => !isStarted(t, today)).length;

  const label = (k: string) => {
    if (k === 'now') return '今やっているもの';
    if (k === 'none') return '日付なし';
    const [y, m] = k.split('-').map(Number);
    return `${y}年${m}月から始まる`;
  };

  return (
    <div className="card yearview">
      <div className="rowbar">
        <SectionTitle note={`全${tasks.length}件・これから${upcomingCount}件`}>全体</SectionTitle>
        <button onClick={onBack}>いつもの画面へ</button>
      </div>
      <p className="legend">
        この先のやることを、始める月ごとに並べています。先の月ほど薄く表示します。
        ここは見るだけの画面です。直すときはいつもの画面で行ってください。
      </p>

      {order.map((k) => {
        const rows = groups.get(k)!;
        const op = k === 'now' ? 1 : k === 'none' ? 0.6 : fade(monthsAhead(k, today));
        return (
          <section className="ymonth" key={k} style={{ opacity: op }}>
            <p className="bandname">
              {label(k)}<span className="note">{rows.length}件</span>
            </p>
            {rows.map((t) => {
              const bits: string[] = [];
              if (t.startDate && !isStarted(t, today)) bits.push(`${md(t.startDate)}から`);
              if (t.dueDate) {
                const n = daysBetween(today, t.dueDate);
                bits.push(n < 0 ? `期限 ${md(t.dueDate)}・超過` : `期限 ${md(t.dueDate)}`);
              }
              return (
                <div className="item" key={t.id}>
                  <div className="head">
                    <span className="title-1line" title={t.title}>{t.title}</span>
                    <span className="sub right">
                      {t.important && <b className="badge">重要</b>}
                      <span>{bits.join('・') || '期限なし'}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}

      {tasks.length === 0 && <p className="empty">登録されているタスクはありません。</p>}
    </div>
  );
}
