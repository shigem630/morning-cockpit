import type { YMD } from './lib/dates';

export interface Task {
  id: string;
  title: string;
  important: boolean;
  dueDate?: YMD;
  createdAt: YMD;
  doneAt?: YMD;
  deletedAt?: YMD;   // 削除は論理削除。deleteDoc は使わない
}

export interface Stalled {
  id: string;
  what: string;
  who: string;
  requestedAt: YMD;
  nudges: YMD[];      // 日付の配列。arrayUnion で日単位に冪等（連打で増えない）
  resolvedAt?: YMD;
  outcome?: 'done' | 'selfDid' | 'dropped';
}

export type FocusResult = 'done' | 'started' | null;
export type WhenTag = 'am' | 'noon' | 'pm' | null;

export interface DayLog {
  checked: string[];        // RoutineId の配列
  focusTaskId?: string;
  focusResult?: FocusResult;
  focusWhen?: WhenTag;
  /** その日、最優先を「終わった」か「手はつけた」で一度でも閉じたか。
      選び直しても消さない。運用テストの判定はこの1つだけを数える。 */
  focusClosed?: boolean;
  /** その日を出勤として扱うか。未設定なら暦（平日か祝日か）に従う。
      土曜出勤も、平日の休みも、この1つで表す。 */
  worked?: boolean;
  eligible?: string[];      // その日に出す対象だったチェック項目。過去を再計算しない
}
