朝の司令塔（morning-cockpit）の続きをやります。日本語で、非エンジニア向けに手順は1つずつ示してください。

# 最初に読むもの
/Users/Yuta/.claude/plans/cuddly-enchanting-cloud.md （設計計画。UI/UXデザイナーとシニアエンジニアのレビュー反映済み）

# 場所
ローカル: /Users/Yuta/Desktop/morning-cockpit
GitHub: shigem630/morning-cockpit （Pages公開済み・Deploy from a branch / main / root）
公開URL: https://shigem630.github.io/morning-cockpit/
 - /check/ 接続チェック（使い捨て）
 - /mockup/preview.html 見た目の見本。mockup/tokens.css は本番でも使う資産

# 済んだこと
- エステル(Discord bot)の不具合修理: ~/esthel-discord-bot/register.mjs に旧OneDriveパスが残っていた→Documents配下に修正・再起動・動作確認済み
- 見た目の見本（失敗時の画面4種を含む）
- 接続チェックページ公開
- 家のWi-Fiでは自動チェック7項目すべて○

# 未確認（ここから始める）
1. 接続チェックの②文字の見え方 ③カレンダー枠の表示 ④職場PCで個人Googleアカウント(denikin630@gmail.com)が使えるか ← ④が最重要。×なら保存の仕組みから設計やり直し
2. 学校のネットワークで①7項目を再確認（家では通っても学校で止まる可能性がある。日報ツールにCDN遮断対策が入っていた実績あり）

# 次の作業
結果が問題なければ ステップ1（Firebase新規プロジェクト作成・先生の手作業10分）→ ステップ2（骨格公開＋やることリスト10件の投入＋ブラウザ起動ページとStream Deck設定を同日に）

# 絶対に間違えない
- Desktop の umeko-open-school/data.json は古い。申込数は必ず公開版を見る（ローカル=7/26、公開=9/3）
- data.json は申込者254名分の生データ。ダッシュボードから直接読まない。個人情報を除いた summary.json を publish.js に足す
- Firebaseは日報ツール(daily-report-checker-6f619)と別プロジェクトにする
- セキュリティルールはメールではなくUIDで書く
- 日報チェックツールは認証コードが1行も無いので、ルールを変えても直らない（別件）
- 通知は一切増やさない。放置日数で浮上させる。赤は同時3件まで
