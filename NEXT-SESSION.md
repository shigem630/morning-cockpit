朝の司令塔（morning-cockpit）の続きをやります。日本語で、非エンジニア向けに手順は1つずつ示してください。

# 最初に読むもの
/Users/Yuta/.claude/plans/cuddly-enchanting-cloud.md （設計計画）
※ 計画から意図的に外した点があるので、下の「計画から変えたこと」を必ず読むこと。

# 場所
ローカル: /Users/Yuta/Desktop/morning-cockpit
GitHub:   shigem630/morning-cockpit
公開URL:  https://shigem630.github.io/morning-cockpit/
  /uid/                 UID確認・書き込みテスト（保守用。残してある）
  /mockup/preview.html  見た目の見本（失敗時の画面4種を含む）

# 公開のしかた（重要）
GitHub Actions は使わない。npm run build の出力を docs/ に置き、Pages は main/docs を配信する。
理由: 保存されているアクセストークンに workflow 権限が無い。加えて CI が静かに壊れると
「更新したのに反映されない」という、このプロジェクトが無くそうとしている壊れ方になる。
→ 変更したら必ず `npm run build` してから commit / push する。docs/ もコミットする。
→ 人に見せる前に `git status -sb` で ahead が無いことを確認する（9/5に未pushのまま
   職場PCで古い版を見せる事故を起こした）。

# 2026-09-05 に完了したこと
## ステップ0 疎通確認（職場PC・学校ネットワーク・Chrome 152/Windows）
全項目クリア。通信11項目○／WebChannel（つなぎっぱなし）も標準のつなぎ方で通過／
**職場PCのChromeは denikin630@gmail.com でログイン済み**（最重要項目が○）。

## ステップ1 Firebase
- プロジェクト morning-cockpit-38e47（Spark。日報ツール 6f619 とは完全に別）
- Firestore asia-northeast1 / Standard / 本番モード
- Authentication は Google のみ。承認済みドメインに shigem630.github.io
- **UID: BLSiEWp64fWQesZMUd1XRMPQiFg2**。firestore.rules はこのUIDのみ許可
- APIキー(Browser key) リファラ制限4件（github.io / firebaseapp.com / web.app / localhost:5173）
- **Google Calendar API を有効化済み**（Firebaseは自動で有効にしないので必須だった）

## ステップ2 ダッシュボード本体
Vite6 + React19 + TS + 素のCSS + Firebase v11。ルータ無し。Tailwind無し。Webフォント無し。
画面: 今日の最優先 / 返事待ち / 今日のルーティン / 今日の予定 / 重要・急ぎでない / やること
やることリスト.md の10件を投入済み。

## 追加でやったこと（先生が選択）
1. 〆切カレンダーの通知を 5回 → **3回**（1週間前・前日・15分前）
   gcal.mjs の DEADLINE_REMINDERS。既存の4件は本人の判断で直していない（10/31の内規案だけ
   10月に「1ヶ月前」「2週間前」が余計に鳴る）。
2. **やることの置き場所を Firestore ひとつに統合**（下記「エステル側の改修」）
3. 昨日「手はつけた」で終わった仕事を、今朝の最優先の第一候補にする
4. TopBar に「書き出す」（バックアップ）ボタン

# エステル側の改修（2026-09-05・重要）
やることリストが Firestore と md の2か所にあると、ダッシュボードで終わらせた仕事が
翌朝のブリーフにまた出てくる。運用ルールでは防げないので、置き場所を1つにした。

- 新規 `~/esthel-discord-bot/cockpit-store.mjs` … Firestore への出入り口（共通部品）
- 新規 `~/esthel-discord-bot/cockpit.mjs` … CLI（brief / add / done / remove / stalled）
- `register.mjs` … 表示・追加・完了・削除をすべて Firestore へ付け替え。
  md への書き込みは1か所も残っていない。「整理して」は並び順が自動になったので一覧表示に変更。
- `~/Documents/ObsidianVault/やることリスト.md` … 冒頭に注記を足し、読み取り専用の記録にした。
  中身は消していない。やることリスト_完了.md への書き出しは廃止（論理削除で戻せるため）。
- 鍵: `~/esthel-discord-bot/firebase-service-account.json`（chmod 600・git管理外・中身は見ない）
- 朝のブリーフ SKILL.md … 手順7の「番号ふり直し＋書き戻し」を廃止し `cockpit.mjs brief` に。
  手順8の先頭に**「昨日の最優先どうなりましたか」を予定より前に置く**を追加。
  通知の登録も3件に変更。**もとに戻す手順は SKILL.md の末尾に3点セットで記載。**
- バックアップ: gcal.mjs.bak-* / register.mjs.bak-* / SKILL.md.bak-20260905-cockpit

# 計画から変えたこと（理由つき）
- **オープンスクールの数字は載せない**（先生の判断）。publish.js への summary.json 追加は不要。
  data.json（申込者254名分の生データ）には一切触らない。
- **GitHub Actions を使わない**（上記）。
- **見出しは平易な言い回しにする**（先生の指摘）。「今日の一点」「そろそろ」は通じなかった。
  見出しは短く強く（15px/600/本文色）、説明は12pxで横に小さく添える。
- 土曜は休み扱い。出勤した日は画面のトグルで切り替える（logs.worked）。
- 今日の予定は毎朝ボタンで取得（トークンは約1時間で切れる。切れたら明示して再ログイン）。
- 祝日テーブルは内閣府CSVから生成。**2027-11-23 まで**しか公表が無いので、期限が近づくと
  画面に警告を出す（黙って平日扱いにしない）。2028年分は公表され次第つくり直すこと。

# 残っていること
1. **1週間の運用テスト（9/8の週）。これが本番。**
   判定基準は2つ。①毎朝開く習慣がついたか ②7日のうち、今日の最優先を
   「終わった」か「手はつけた」で閉じた日が何日あったか。
   **3日未満なら、機能を足す前にこの仕掛けそのものを捨てる判断をする。**
2. 職場PC（Windows）の起動ページ設定（月曜の朝に本人が実施）。Macは設定済み。
3. Stream Deck に1ボタン（本人が乗り気でなければ不要）
4. 学校独自の休業日（創立記念日・入試日など）→ src/lib/holidays.ts の SCHOOL_CLOSED /
   SCHOOL_WORKDAYS に追記する。まだ伺えていない。

# 別件として残っているもの（このダッシュボードでは扱わない）
1. 日報チェックツールの修理。認証コードが1行も無いのでルールを変えても直らない。
   画面の「Firebaseに保存されています」という記述が現在いつわり。
2. umeko-open-school の公開範囲（申込者254名分の生データが公開状態）。
3. umeko-open-school/index.html の jsdelivr 3本に integrity を付ける（作業10分）。

# 絶対に間違えない
- Desktop の umeko-open-school/data.json は古い。申込数は必ず公開版を見る
- data.json は申込者254名分の生データ。ダッシュボードから読まない（載せない決定済み）
- セキュリティルールはメールではなくUIDで書く
- 通知は一切増やさない。放置日数で浮上させる。赤は同時3件まで
- 責める言い方をしない。「12日放置」ではなく「12日目」
