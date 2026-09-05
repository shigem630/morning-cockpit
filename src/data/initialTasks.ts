// ~/Documents/ObsidianVault/やることリスト.md の10件（2026-09-05 時点）。
// 元ファイルは消さない。取り込みは一度きりで、押すのは先生。
// important は下書き。画面で直せる。
export interface SeedTask { title: string; important: boolean; dueDate?: string }

export const INITIAL_TASKS: SeedTask[] = [
  { title: '避難訓練の準備',                             important: true,  dueDate: '2026-09-01' },
  { title: '配慮申請書類の作成',                         important: true,  dueDate: '2026-09-20' },
  { title: '満田かなんさんに電話',                       important: true,  dueDate: '2026-09-25' },
  { title: '私学教頭会 内規案の作成',                    important: true,  dueDate: '2026-10-31' },
  { title: '向洋中学校 学校訪問の準備',                  important: false },
  { title: '10月中学校教員対象説明会：生徒への登壇依頼', important: false },
  { title: '10月中学校教員対象説明会：配布・営業',       important: false },
  { title: '10月中学校教員対象説明会：案内文作成',       important: false },
  { title: 'しょうだみゆさんに振り込み用紙をわたす',     important: false },
  { title: '2027年度パンフレット叩き台の作成（中学・高校別）', important: true },
];
