# lambda-hello

AWS Lambda + API Gateway を使った Hello World API のサンプルプロジェクトです。
Node.js と PHP の 2 種類の Lambda 関数を AWS CDK (TypeScript) で構築します。

## エンドポイント

| メソッド | パス | 実装 | レスポンス例 |
|---|---|---|---|
| GET | `/hello` | Node.js 22 | `{"message":"Hello, Taro!"}` |
| GET | `/hello_php` | PHP 8.4 (Bref v3) | `{"message":"Hello, Taro from PHP!"}` |

クエリパラメータ `name` を渡すと名前入りのメッセージが返ります。省略した場合は `World` になります。

```
GET /hello?name=Taro
→ {"message":"Hello, Taro!"}

GET /hello_php?name=Taro
→ {"message":"Hello, Taro from PHP!"}
```

## アーキテクチャ

```
クライアント
    │
    ▼
API Gateway (HTTP API v2)
    ├── GET /hello      → Lambda (Node.js 22)
    └── GET /hello_php  → Lambda (PHP 8.4 / Bref v3 Layer)
```

## ディレクトリ構成

```
lambda_hello/
├── lambda/
│   └── src/
│       ├── hello.js              # Node.js ハンドラ
│       └── hello_php/
│           ├── index.php         # PHP ハンドラ
│           └── composer.json     # bref/bref 依存定義
└── cdk/
    ├── bin/app.ts                # CDK アプリ エントリポイント
    ├── lib/hello-stack.ts        # スタック定義
    ├── cdk.json
    ├── tsconfig.json
    └── package.json
```

## 前提条件

- AWS アカウント（IAM ユーザーのアクセスキー設定済み）
- Node.js 18 以上
- Docker（PHP Lambda のビルドに使用）

## セットアップ

### 1. 依存パッケージのインストール

```bash
cd cdk
npm install
```

### 2. CDK ブートストラップ（初回のみ）

```bash
npx cdk bootstrap
```

### 3. デプロイ

```bash
npx cdk deploy
```

デプロイ完了後、以下のように各エンドポイントの URL とロググループ名が出力されます。

```
Outputs:
HelloStack.HelloUrl        = https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/hello
HelloStack.HelloPhpUrl     = https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/hello_php
HelloStack.HelloLogGroupName    = HelloStack-HelloLogGroup...
HelloStack.PhpLogGroupName      = HelloStack-HelloPhpLogGroup...
HelloStack.ApiLogGroupName      = HelloStack-HelloApiLogGroup...
```

## 動作確認

```bash
curl "https://<api-id>.execute-api.ap-northeast-1.amazonaws.com/hello?name=Taro"
# → {"message":"Hello, Taro!"}

curl "https://<api-id>.execute-api.ap-northeast-1.amazonaws.com/hello_php?name=Taro"
# → {"message":"Hello, Taro from PHP!"}
```

## ログの確認

デプロイ後に出力されるロググループ名を使って CloudWatch Logs でログを確認できます。

```bash
# PHP Lambda ログ
aws logs tail <PhpLogGroupName> --region ap-northeast-1 --follow

# Node.js Lambda ログ
aws logs tail <HelloLogGroupName> --region ap-northeast-1 --follow

# API Gateway アクセスログ
aws logs tail <ApiLogGroupName> --region ap-northeast-1 --follow
```

## 削除

```bash
npx cdk destroy
```

## 技術スタック

| 項目 | 採用技術 |
|---|---|
| IaC | AWS CDK v2 (TypeScript) |
| API Gateway | HTTP API (API Gateway v2) |
| Node.js ランタイム | Node.js 22.x |
| PHP ランタイム | Bref v3 / PHP 8.4 |
| PHP パッケージ管理 | Composer（デプロイ時に Docker で自動実行）|
| ログ | CloudWatch Logs（保持期間: 1 週間）|
