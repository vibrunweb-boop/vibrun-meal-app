# VIBRUN 食事管理アプリ(実装土台)

VIBRUN会員向け食事管理アプリの実装土台です。Claude上のプロトタイプ(アーティファクト)で検証した機能・データ構造を、実際にデプロイできる構成(Vite + React / Vercel サーバーレス関数 / Upstash Redis)に移植する最初のステップとして、バックエンド(API + データ層)を用意しました。

## 今の状態(できていること)

- プロジェクトの雛形(Vite + React + Tailwind)
- Upstash Redisとの接続層(`lib/redis.js`)
- 食材・商品・会員データを読み書きするAPIエンドポイント一式
- 認証は仮実装(`x-user-id` ヘッダーをそのまま信用する状態。LINEログイン導入前の疎通確認用)
- フロントエンドは疎通確認用の最小画面のみ(`src/App.jsx`)。プロトタイプのUIコンポーネントはまだ移植していません

## まだできていないこと(次のステップ)

1. プロトタイプ(アーティファクト)のUIコンポーネントをこのプロジェクトに移植し、`window.storage` の呼び出しを `fetch('/api/...')` に置き換える
2. LINEログイン(LIFF)の導入。`lib/auth.js` の `getUserId()` を、LINEのIDトークンを検証する実装に差し替える
3. トレーナー権限の付与方法の整備(`TRAINER_LINE_USER_IDS` への手動追加、または管理画面での権限管理)

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Upstash Redisの準備

1. https://upstash.com でアカウントを作成し、Redisデータベースを1つ作成
2. データベースの詳細画面にある REST API の `UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` をコピー
3. `.env.example` を `.env` にコピーし、値を貼り付け

```bash
cp .env.example .env
```

### 3. ローカルで起動

サーバーレス関数(`/api`)も含めて動かすには `vercel dev` を使います(`vite` 単体だと `/api` は動きません)。

```bash
npx vercel login   # 初回のみ
npx vercel link     # 初回のみ、Vercelのプロジェクトと紐付け
npm run dev          # vercel dev が起動します
```

ブラウザで表示される画面が「食材データベースを108件読み込みました」と出れば、Vite → Vercel Functions → Upstash Redis の疎通ができています。

### 4. 動作確認(疎通していない場合)

- `.env` の値が正しいか確認
- `vercel dev` のターミナルにエラーが出ていないか確認
- ブラウザの開発者ツールのNetworkタブで `/api/ingredients` のレスポンスを確認

## API一覧

| エンドポイント | メソッド | 認証 | 内容 |
|---|---|---|---|
| `/api/ingredients` | GET | 不要 | 食材データベース取得(初回アクセス時に自動シード) |
| `/api/ingredients` | POST/PUT/DELETE | トレーナー | 食材の追加・編集・削除 |
| `/api/products` | GET | 不要 | 商品データベース取得 |
| `/api/products` | POST | 会員 | 商品の登録・更新(バーコード/名前で重複判定) |
| `/api/products` | PATCH | 会員 | 商品の利用回数カウント |
| `/api/products` | PUT/DELETE | トレーナー | 商品の編集・削除(管理画面用) |
| `/api/meals` | GET/POST/DELETE | 会員 | 自分の食事記録の取得・追加・削除 |
| `/api/targets` | GET/PUT | 会員 | 自分の目標値の取得・更新 |
| `/api/trainer/members` | GET | トレーナー | 全会員の本日のサマリー一覧 |
| `/api/trainer/member-detail?userId=xxx` | GET | トレーナー | 特定会員の詳細(読み取り専用) |

認証が必要なエンドポイントは、リクエストヘッダーに `x-user-id`(と会員登録時は `x-user-name`)を付ける必要があります。現状は仮実装なので、開発中はcurlやPostmanで自由な値を入れて試せます。LINEログイン導入後は、このヘッダーをフロントエンドが自動で付ける形に変更します。

```bash
curl http://localhost:3000/api/meals -H "x-user-id: test-user" -H "x-user-name: テスト太郎"
```
