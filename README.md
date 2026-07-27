# VIBRUN 食事管理アプリ

VIBRUN会員向け食事管理アプリです。Claude上のプロトタイプ(アーティファクト)で検証した機能・データ構造を、実際にデプロイできる構成(Vite + React / Vercel サーバーレス関数 / Upstash Redis)に移植したものです。

## 今の状態(できていること)

- プロジェクトの雛形(Vite + React + Tailwind)
- Upstash Redisとの接続層(`lib/redis.js`)
- 食材・商品・会員データを読み書きするAPIエンドポイント一式
- 会員モード・トレーナーモードのUI一式(`src/App.jsx` 以下)を移植済み。`window.storage` の呼び出しは `src/lib/api.js` 経由の `fetch('/api/...')` に置き換え済み
- 認証は仮実装(`x-user-id` ヘッダーをそのまま信用する状態。LINEログイン導入前の暫定運用)

### 仮の認証・トレーナー権限について

LINEログインがまだないため、画面で入力した名前がそのまま `x-user-id` として送られます(`src/App.jsx`)。一度入力すると、その端末にブラウザの`localStorage`で保存され、次回以降は自動的に同じ名前でログインした状態になります。

トレーナー権限を持たせたい人は、その人が入力した名前を **半角スペース等が `_` に置き換わった状態**で `.env` の `TRAINER_LINE_USER_IDS` に追加してください(本番環境では Vercel の Environment Variables に追加)。例えば「立川 歩」と入力した場合のキーは `立川_歩` になります。

```
TRAINER_LINE_USER_IDS=立川_歩,別のトレーナー名
```

## まだできていないこと(次のステップ)

1. LINEログイン(LIFF)の導入。`lib/auth.js` の `getUserId()` を、LINEのIDトークンを検証する実装に差し替える。あわせて `src/App.jsx` の「名前を入力」画面をLIFFログインに置き換える
2. トレーナー権限の付与方法の整備(管理画面からの権限管理など、`TRAINER_LINE_USER_IDS` の手動編集以外の方法)

## フロントエンドの構成

```
src/
  App.jsx                     # 起点。名前入力(仮ログイン)・会員/トレーナー切り替え
  lib/
    api.js                    # バックエンドAPI呼び出し(旧 window.storage の置き換え)
    helpers.js                # 定数・日付処理などのユーティリティ
  components/
    NameGate.jsx               # 名前入力画面(仮ログイン)
    MemberDashboard.jsx        # 会員ダッシュボード + 商品登録セクション
    TrainerView.jsx            # トレーナー画面(会員一覧・食材/商品管理)
    Widgets.jsx                 # 共通UI部品(ゲージ・お皿ビジュアル・食事記録フォームなど)
```

## ローカルでの動作確認

`/api` を含めてフロント・バックエンドをまとめて動かすには、`npm run dev` ではなく **直接** 以下を実行してください(`npm run dev` は `vite` のみを起動するため、`/api` エンドポイントは動きません)。

```bash
npx vercel dev
```

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

サーバーレス関数(`/api`)も含めて動かすには `vercel dev` を使います(`npm run dev` は `vite` のみを起動するので `/api` は動きません)。

```bash
npx vercel login   # 初回のみ
npx vercel link     # 初回のみ、Vercelのプロジェクトと紐付け
npx vercel dev       # フロント + /api をまとめて起動
```

会員として名前を入力し、記録画面が表示されれば疎通できています。

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
