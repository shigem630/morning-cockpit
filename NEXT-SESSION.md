朝の司令塔（morning-cockpit）の続きをやります。日本語で、非エンジニア向けに手順は1つずつ示してください。

# 最初に読むもの
/Users/Yuta/.claude/plans/cuddly-enchanting-cloud.md （設計計画。UI/UXデザイナーとシニアエンジニアのレビュー反映済み）

# 場所
ローカル: /Users/Yuta/Desktop/morning-cockpit
GitHub: shigem630/morning-cockpit （Pages公開済み・Deploy from a branch / main / root）
公開URL: https://shigem630.github.io/morning-cockpit/
 - /check/ 接続チェック（役目を終えた。ステップ2で削除してよい）
 - /mockup/preview.html 見た目の見本。mockup/tokens.css は本番でも使う資産

# 済んだこと
- エステル(Discord bot)の不具合修理: register.mjs の旧OneDriveパス→Documents配下に修正・動作確認済み
- 見た目の見本（失敗時の画面4種を含む）
- 接続チェックページ公開

## ステップ0（疎通確認）完了 — 2026/9/5 12:26 職場PCで実施
Chrome 152 / Windows 10・学校ネットワーク。**全項目クリア。設計変更なし。**
- ① 通信先11項目：すべて○（本番用9＋確認用1）
- ② 保存のしくみ：**○ 標準のつなぎ方で通った**
  内訳 標準=permission-denied / ポーリング=permission-denied
  → permission-denied はサーバーまで到達した証拠。WebChannel（つなぎっぱなし）が
    学校のプロキシを通過した。experimentalForceLongPolling は不要。
- ③ 文字の見え方：○ きれい（システムフォントでOK。Webフォント不要を再確認）
- ④ カレンダー枠：枠は描画された＝到達○。ただし中身は空だった
- ⑤ **職場PCのChromeは denikin630@gmail.com でログイン済み ← 最重要項目が○**
  学校のWorkspaceアカウントは出てこなかった（学校はGoogle Workspaceではない可能性）

# 未解決の論点（ステップ2の前に決める）
- **今日の予定をどこから取るか。** ④で個人カレンダーが空だった。先生の実際の予定
  （職員朝礼・教頭会・面談）が denikin630@gmail.com のGoogleカレンダーに
  入っていないなら、TodaySchedule は常に空になる。予定の実際の置き場所を先生に確認する。

# 次の作業
ステップ1（Firebase新規プロジェクト作成・先生の手作業10分）
 1a 新規プロジェクト作成（denikin630@gmail.com で）
 1b Googleログインのみ有効化
 1c 承認済みドメインに shigem630.github.io を追加 ← 忘れると auth/unauthorized-domain
 1d ウェブアプリ登録 → 設定値(apiKey/authDomain/projectId/appId)を取得
 1e 初回ログインでUIDを確認（そのための最小ログインページを /uid/ に作る）
 1f そのUIDでセキュリティルールを記述
 1g APIキーにHTTPリファラ制限（shigem630.github.io/* と localhost:*）
 1h リポジトリ設定 Pages → Source を「GitHub Actions」に切り替え
→ ステップ2（骨格公開＋やることリスト10件の投入＋ブラウザ起動ページとStream Deck設定を同日に）
→ ステップ2と同時：エステルの SKILL.md 手順7から「番号振り直し＋書き戻し」を削除

# 絶対に間違えない
- **push忘れに注意。** 9/5にコミット済み未pushのまま職場PCで確認させ、古い版を見せる事故が発生。
  公開ページを人に見せる前に必ず git status -sb で ahead が無いことを確認する。
- Desktop の umeko-open-school/data.json は古い。申込数は必ず公開版を見る（ローカル=7/26、公開=9/3）
- data.json は申込者254名分の生データ。ダッシュボードから直接読まない。個人情報を除いた summary.json を publish.js に足す
- Firebaseは日報ツール(daily-report-checker-6f619)と別プロジェクトにする
- セキュリティルールはメールではなくUIDで書く
- 日報チェックツールは認証コードが1行も無いので、ルールを変えても直らない（別件）
- 通知は一切増やさない。放置日数で浮上させる。赤は同時3件まで
