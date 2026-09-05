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

## ステップ1（Firebase設定）完了 — 2026/9/5 13時ごろ
- プロジェクト: **morning-cockpit-38e47**（Spark無料枠 / daily-report-checker-6f619 とは完全に別）
- Firestore: asia-northeast1（東京）/ Standard / Firestoreネイティブ / リアルタイム更新 有効
- Authentication: **Googleのみ**有効。公開名 morning-cockpit / サポートメール denikin630@gmail.com
- 承認済みドメイン: localhost, *.firebaseapp.com, *.web.app, **shigem630.github.io**
- **UID: BLSiEWp64fWQesZMUd1XRMPQiFg2**（denikin630@gmail.com）
- ルール: firestore.rules に記載。cockpit/** を上記UIDのみ許可。他は全拒否。9/5 12:49公開
- APIキー(Browser key) リファラ制限4件:
  https://shigem630.github.io/* / https://morning-cockpit-38e47.firebaseapp.com/*
  https://morning-cockpit-38e47.web.app/* / http://localhost:5173/*
  ※ APIの制限（25個のAPI）はFirebaseが自動設定。触らない
- 検証: 制限適用後にログアウト→再ログイン→書き込み→読み返し すべて成功
- 設定値は uid/index.html の firebaseConfig にそのまま入っている（webのapiKeyは公開前提の値）
- 確認用ページ: /uid/ （ログイン・UID表示・書き込みテスト。ステップ2完了後に削除してよい）

## 先生の予定はGoogleカレンダー5本に分散している（④が空だった理由）
~/esthel-discord-bot/gcal.mjs の CAL より。すべて denikin630@gmail.com 配下。
  仕事 / 仕事(対人) / 〆切 / 雄太と望美 / primary(=denikin630@gmail.com、ほぼ空)
接続チェックの埋め込み枠はカレンダー未指定だったため primary だけを見ていた。予定は存在する。
→ TodaySchedule はカレンダーIDを指定して複数本を読む必要がある。

# 未解決の論点（ステップ2の前に決める）
- **今日の予定をどう取るか。** 予定の在処は判明済み（上記5本）。取り方が未決。
  A) ブラウザから Calendar API を直接読む。Firebase の GoogleAuthProvider に
     calendar.readonly スコープを追加してアクセストークンを得る。
     欠点: トークンが1時間で切れる（Firebaseはリフレッシュトークンを渡さない）。
     朝開いて使う用途なら実用上は足りる。切れたら「予定を取得できません・再ログイン」を出す。
     未確認: 機密スコープのため OAuth 同意画面に「確認されていません」警告が出る可能性。
  B) エステルが毎朝 Firestore に当日の予定を書き込む。自宅Macが動いていないと出ない。
  C) ステップ2では予定欄を保留し、他を先に作る。

# 次の作業
ステップ1は完了。次はステップ2。
**先生の手作業が1つ残っている: リポジトリ設定 Pages → Source を「GitHub Actions」に切り替え。**
ただし切り替えるのは deploy ワークフローを push した直後にする。先に切り替えると
/uid/ /mockup/ が消えて公開URLが404になる。Vite の public/ に mockup と uid を移し、
dist に含めてから切り替えること。/check/ は役目を終えたので削除してよい。
→ ステップ2（骨格公開＋やることリスト10件の投入＋ブラウザ起動ページとStream Deck設定を同日に）
→ ステップ2と同時：エステルの SKILL.md 手順7から「番号振り直し＋書き戻し」を削除

# 決定事項（2026-09-05）
- **オープンスクールの数字はダッシュボードに載せない。先生の判断で取りやめ。**
  → publish.js への summary.json 追加（旧ステップ4）は不要になった。
  → data.json には一切触らない。個人情報の通り道を増やさない設計が確定。
- 見出しは「誰が見ても分かる」言い回しに変更：
  今日の最優先 / 頼んだ仕事の返事待ち / 今日のルーティンワーク / 今日の予定 /
  急ぎではないが重要な仕事 / やること一覧
- 土曜は休み扱い。出勤した日は画面の「今日は出勤」で切り替える（logs.worked）
- 今日の予定は毎朝ボタンで取得（Calendar API を GoogleAuthProvider の追加スコープで読む）
  Google Calendar API はプロジェクトで有効化済み

# 絶対に間違えない
- **push忘れに注意。** 9/5にコミット済み未pushのまま職場PCで確認させ、古い版を見せる事故が発生。
  公開ページを人に見せる前に必ず git status -sb で ahead が無いことを確認する。
- Desktop の umeko-open-school/data.json は古い。申込数は必ず公開版を見る（ローカル=7/26、公開=9/3）
- data.json は申込者254名分の生データ。ダッシュボードから直接読まない。個人情報を除いた summary.json を publish.js に足す
- Firebaseは日報ツール(daily-report-checker-6f619)と別プロジェクトにする
- セキュリティルールはメールではなくUIDで書く
- 日報チェックツールは認証コードが1行も無いので、ルールを変えても直らない（別件）
- 通知は一切増やさない。放置日数で浮上させる。赤は同時3件まで
