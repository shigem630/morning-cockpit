// Firestore との出入り口。
// 自前の楽観的更新は書かない。persistentLocalCache に任せ、setDoc を呼ぶだけにする。
import { useEffect, useState } from 'react';
import {
  arrayRemove, arrayUnion, collection, deleteField, doc, onSnapshot, setDoc, updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { DayLog, Stalled, Task } from '../types';
import type { YMD } from './dates';

const ROOT = ['cockpit', 'main'] as const;
export const tasksCol = () => collection(db, ROOT[0], ROOT[1], 'tasks');
export const stalledCol = () => collection(db, ROOT[0], ROOT[1], 'stalled');
export const logDoc = (date: YMD) => doc(db, ROOT[0], ROOT[1], 'logs', date);

export interface SyncState {
  /** サーバーへ送れていない書き込みの件数 */
  pending: number;
  /** キャッシュから読んでいる（＝サーバーと未同期）か */
  fromCache: boolean;
  /** 直近のエラーコード。null なら正常 */
  errorCode: string | null;
  /** 最後にサーバーから読めた時刻 */
  lastServerAt: Date | null;
}

const initialSync: SyncState = {
  pending: 0, fromCache: false, errorCode: null, lastServerAt: null,
};

/** コレクションを購読する。metadata を必ず UI に出せる形で返す。 */
function useCollection<T>(
  make: () => ReturnType<typeof collection>,
  key: string,
): [T[], SyncState] {
  const [rows, setRows] = useState<T[]>([]);
  const [sync, setSync] = useState<SyncState>(initialSync);

  useEffect(() => {
    const un = onSnapshot(
      make(),
      { includeMetadataChanges: true },
      (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
        setSync((s) => ({
          pending: snap.docs.filter((d) => d.metadata.hasPendingWrites).length,
          fromCache: snap.metadata.fromCache,
          errorCode: null,
          lastServerAt: snap.metadata.fromCache ? s.lastServerAt : new Date(),
        }));
      },
      (err) => setSync((s) => ({ ...s, errorCode: err.code || String(err) })),
    );
    return un;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [rows, sync];
}

export function useTasks() { return useCollection<Task>(tasksCol, 'tasks'); }
export function useStalled() { return useCollection<Stalled>(stalledCol, 'stalled'); }

/** 前日の記録だけを読む（今朝の候補を決めるのに使う。書き込みはしない） */
export function useYesterdayLog(date: YMD): DayLog | null {
  const [log, setLog] = useState<DayLog | null>(null);
  useEffect(() => {
    const un = onSnapshot(logDoc(date), (snap) => {
      const raw = (snap.data() as Partial<DayLog> | undefined) ?? null;
      setLog(raw ? { ...raw, checked: raw.checked ?? [] } : null);
    }, () => setLog(null));
    return un;
  }, [date]);
  return log;
}

export function useDayLog(date: YMD): [DayLog, SyncState] {
  const [log, setLog] = useState<DayLog>({ checked: [] });
  const [sync, setSync] = useState<SyncState>(initialSync);

  useEffect(() => {
    const un = onSnapshot(
      logDoc(date),
      { includeMetadataChanges: true },
      (snap) => {
        // Firestore は「書いたフィールドしか無い」ので、checked が無い記録が普通に存在する。
        // （例：先に「今日は出勤」だけ押した日）。ここで一度だけ形を整える。
        // これを怠ると log.checked.includes(...) で画面ごと落ちる。
        const raw = (snap.data() as Partial<DayLog> | undefined) ?? {};
        setLog({ ...raw, checked: raw.checked ?? [] });
        setSync((s) => ({
          pending: snap.metadata.hasPendingWrites ? 1 : 0,
          fromCache: snap.metadata.fromCache,
          errorCode: null,
          lastServerAt: snap.metadata.fromCache ? s.lastServerAt : new Date(),
        }));
      },
      (err) => setSync((s) => ({ ...s, errorCode: err.code || String(err) })),
    );
    return un;
  }, [date]);

  return [log, sync];
}

/** 直近30日ぶんの記録。「直近30日で18日」を出すのに使う。 */
export function useRecentLogs(dates: YMD[]): Record<YMD, DayLog> {
  const [logs, setLogs] = useState<Record<YMD, DayLog>>({});
  const key = dates[0] ?? '';

  useEffect(() => {
    const uns = dates.map((d) =>
      onSnapshot(logDoc(d), (snap) => {
        const data = snap.data() as DayLog | undefined;
        if (data) setLogs((prev) => ({ ...prev, [d]: data }));
      }, () => { /* 個別の失敗は帯で出るので握りつぶさず無視 */ }),
    );
    return () => uns.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return logs;
}

/* ───────── 書き込み ───────── */

/** チェックの更新。配列を丸ごと setDoc しない（タブ2枚で lost update が起きる）。 */
export async function toggleCheck(date: YMD, id: string, on: boolean, eligible: string[]) {
  const ref = logDoc(date);
  // ここで checked を書かないこと。merge:true でも配列は「追記」ではなく「置き換え」なので、
  // { checked: [] } を送ると、その瞬間に今までのチェックが全部消える。
  // ドキュメントが無くても arrayUnion がフィールドごと作ってくれる。
  await setDoc(ref, { eligible }, { merge: true });
  await updateDoc(ref, { checked: on ? arrayUnion(id) : arrayRemove(id) });
}

export async function setWorked(date: YMD, worked: boolean) {
  await setDoc(logDoc(date), { worked }, { merge: true });
}

/** 論理削除の取り消し。deleteDoc を使っていないので元に戻せる。 */
export async function restoreTask(id: string) {
  await updateDoc(doc(tasksCol(), id), { deletedAt: deleteField(), doneAt: deleteField() });
}

export async function unnudge(id: string, day: YMD) {
  await updateDoc(doc(stalledCol(), id), { nudges: arrayRemove(day) });
}

export async function reopenStalled(id: string) {
  await updateDoc(doc(stalledCol(), id), {
    resolvedAt: deleteField(), outcome: deleteField(),
  });
}

export async function setFocus(date: YMD, patch: Partial<DayLog>) {
  await setDoc(logDoc(date), patch, { merge: true });
}

export async function addTask(t: Omit<Task, 'id'>) {
  const id = crypto.randomUUID();
  await setDoc(doc(tasksCol(), id), t);
  return id;
}

export async function updateTask(id: string, patch: Partial<Task>) {
  await updateDoc(doc(tasksCol(), id), patch);
}

export async function addStalled(s: Omit<Stalled, 'id'>) {
  const id = crypto.randomUUID();
  await setDoc(doc(stalledCol(), id), s);
  return id;
}

/** 声をかけた。arrayUnion なので同じ日に何度押しても1件にしかならない。 */
export async function nudge(id: string, today: YMD) {
  await updateDoc(doc(stalledCol(), id), { nudges: arrayUnion(today) });
}

export async function resolveStalled(id: string, today: YMD, outcome: Stalled['outcome']) {
  await updateDoc(doc(stalledCol(), id), { resolvedAt: today, outcome });
}
