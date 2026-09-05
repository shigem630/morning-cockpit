// 書き出し（バックアップ）。
// Firestore の無料枠に自動バックアップは無く、ルールを一度書き間違えるだけで
// 本人が自分のデータから締め出される。押せば全部が手元に落ちる、という出口を用意する。
import { getDocs } from 'firebase/firestore';
import { logDoc, stalledCol, tasksCol } from './store';
import { collection, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { addDays, type YMD } from './dates';

export interface Backup {
  exportedAt: string;
  project: string;
  tasks: unknown[];
  stalled: unknown[];
  logs: Record<string, unknown>;
  briefs: Record<string, unknown>;
}

/** 記録は日付ごとに1件なので、過去N日ぶんを順に読む。 */
const LOG_DAYS = 400;

export async function buildBackup(today: YMD): Promise<Backup> {
  const [taskSnap, stalledSnap] = await Promise.all([
    getDocs(tasksCol()), getDocs(stalledCol()),
  ]);

  const logs: Record<string, unknown> = {};
  const briefs: Record<string, unknown> = {};
  const days: YMD[] = [];
  for (let i = 0; i < LOG_DAYS; i++) days.push(addDays(today, -i));

  // まとめて投げると無料枠の同時接続に響くので、50日ずつ区切って読む
  for (let i = 0; i < days.length; i += 50) {
    const chunk = days.slice(i, i + 50);
    await Promise.all(chunk.map(async (d) => {
      const [lg, bf] = await Promise.all([
        getDoc(logDoc(d)),
        getDoc(doc(collection(db, 'cockpit', 'main', 'briefs'), d)),
      ]);
      if (lg.exists()) logs[d] = lg.data();
      if (bf.exists()) briefs[d] = bf.data();
    }));
  }

  return {
    exportedAt: new Date().toISOString(),
    project: 'morning-cockpit-38e47',
    tasks: taskSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    stalled: stalledSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    logs,
    briefs,
  };
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
