// 項目定義は Firestore に置かない。年1〜2回しか変わらず編集UIも無いのに、
// シード投入スクリプトが必要になり、投入漏れで「チェックリストが空」という
// 起動時バグを生む。Firestore に置くのは logs/{date}.checked[] の状態だけ。

export type Cadence = 'daily' | 'weekly' | 'monthly-mid' | 'monthly-end';

export interface Routine {
  id: string;
  label: string;
  cadence: Cadence;
}

export const ROUTINES: Routine[] = [
  { id: 'mail-check',  label: 'メールの確認',           cadence: 'daily' },
  { id: 'mail-reply',  label: 'メールの返信',           cadence: 'daily' },
  { id: 'jobcan',      label: 'ジョブカンの承認',       cadence: 'daily' },
  { id: 'touchon',     label: 'タッチオンタイムの確認', cadence: 'daily' },
  { id: 'report',      label: '日報の確認',             cadence: 'daily' },
  { id: 'entry-data',  label: '申込データの更新',       cadence: 'weekly' },
  { id: 'kintai-mid',  label: '勤怠の中間確認',         cadence: 'monthly-mid' },
  { id: 'kintai-end',  label: '月末の勤怠締め',         cadence: 'monthly-end' },
];
