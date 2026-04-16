# Chrome Web Store 自動アップロード セットアップガイド

## 概要

GitHub Actions から Chrome Web Store API を使って拡張機能のアップロード・公開を自動化する仕組みです。

## 1. Google Cloud プロジェクトの設定

### 1-1. プロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存プロジェクトを使用）

### 1-2. Chrome Web Store API の有効化

1. [APIライブラリ](https://console.cloud.google.com/apis/library) を開く
2. 「Chrome Web Store API」を検索して有効化

### 1-3. OAuth2 認証情報の作成

1. [認証情報](https://console.cloud.google.com/apis/credentials) を開く
2. 「認証情報を作成」→「OAuth クライアント ID」
3. アプリケーションの種類: 「デスクトップアプリ」
4. 作成後、**クライアントID** と **クライアントシークレット** をメモ

### 1-4. リフレッシュトークンの取得

ブラウザで以下のURLにアクセス（`{CLIENT_ID}` を置換）:

```
https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id={CLIENT_ID}&redirect_uri=urn:ietf:wg:oauth:2.0:oob
```

承認後に表示される認可コードを使って、トークンを取得:

```bash
curl -s -X POST "https://oauth2.googleapis.com/token" \
  -d "client_id={CLIENT_ID}" \
  -d "client_secret={CLIENT_SECRET}" \
  -d "code={AUTH_CODE}" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=urn:ietf:wg:oauth:2.0:oob"
```

レスポンスの `refresh_token` をメモする。

> **注意**: `redirect_uri=urn:ietf:wg:oauth:2.0:oob` は Google が廃止予定としています。
> 動作しない場合は、ローカルサーバーを使ったフロー（localhost redirect）に切り替えてください。
> 参考: https://developers.google.com/identity/protocols/oauth2/native-app

## 2. GitHub Secrets の設定

リポジトリの **Settings > Secrets and variables > Actions** で以下を登録:

| Secret 名 | 値 | 説明 |
|---|---|---|
| `CHROME_EXTENSION_ID` | 拡張機能のID | Chrome Web Store の URL から取得（`https://chrome.google.com/webstore/detail/{ID}`） |
| `CHROME_CLIENT_ID` | OAuth2 クライアントID | 手順 1-3 で取得 |
| `CHROME_CLIENT_SECRET` | OAuth2 クライアントシークレット | 手順 1-3 で取得 |
| `CHROME_REFRESH_TOKEN` | OAuth2 リフレッシュトークン | 手順 1-4 で取得 |

## 3. 使い方

### 手動実行（推奨）

1. GitHub リポジトリの **Actions** タブを開く
2. 左メニューから **Chrome Web Store Upload** を選択
3. **Run workflow** をクリック
4. オプションを選択:
   - **dry-run**: チェックするとアップロードせずバリデーションのみ実行
   - **publish**: チェックするとアップロード後に公開リクエストも送信

**初回は必ず dry-run で実行し、問題がないことを確認してください。**

### タグプッシュによる自動実行

```bash
git tag v0.1.2
git push origin v0.1.2
```

タグプッシュ時は**アップロードのみ**（公開はしない）で実行されます。
公開は手動で Developer Dashboard から、または workflow_dispatch で `--publish` を指定して行います。

## 4. 操作リスク低減の措置

### 4-1. 段階的な安全機構

| 層 | 措置 | 説明 |
|---|---|---|
| **トリガー** | workflow_dispatch が主トリガー | 意図しない自動実行を防止 |
| **タグ検証** | タグ ↔ manifest.json バージョン一致チェック | バージョン不整合によるアップロードを防止 |
| **dry-run** | `--dry-run` オプション | 実際のAPIコールなしで全バリデーションを実行 |
| **upload/publish 分離** | デフォルトはアップロードのみ | 公開は明示的なオプション指定が必要 |
| **アーティファクト保存** | ZIPを90日間保存 | アップロード内容の事後確認が可能 |
| **Secrets** | GitHub Secrets で認証情報を管理 | コードに認証情報を含めない |

### 4-2. トークン失効時の対応

リフレッシュトークンが失効した場合:

1. ワークフローの「アクセストークン取得」ステップでエラーが出る
2. 手順 1-4 を再実行して新しいリフレッシュトークンを取得
3. GitHub Secrets の `CHROME_REFRESH_TOKEN` を更新

> Google OAuth2 のリフレッシュトークンは、以下の場合に失効します:
> - 6ヶ月間使用しなかった場合
> - ユーザーがアクセスを取り消した場合
> - Google Cloud プロジェクトが「テスト」ステータスのまま（7日間で失効）
>
> **重要**: Google Cloud プロジェクトを「本番」に昇格させると、トークンの有効期間制限がなくなります。

### 4-3. 公開の取り消し

Chrome Web Store に公開した場合:

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) にアクセス
2. 該当の拡張機能を選択
3. 「非公開」に変更することでストアから取り下げ可能

ただし、審査が完了して公開済みのバージョンは即座に取り下げても、既にインストール済みのユーザーには影響しません。

### 4-4. 推奨運用フロー

```
1. コードを修正・テスト
2. manifest.json のバージョンを更新
3. main にマージ
4. workflow_dispatch で dry-run 実行 → 問題ないことを確認
5. workflow_dispatch で publish=false 実行 → アップロード確認
6. Developer Dashboard で内容を目視確認
7. workflow_dispatch で publish=true 実行 → 公開
```
