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
3. アプリケーションの種類: **「ウェブアプリケーション」**
   - OAuth Playground を使うため、redirect_uri を登録できるタイプを選ぶ
4. 「承認済みのリダイレクト URI」に以下を追加:
   ```
   https://developers.google.com/oauthplayground
   ```
5. 作成後、**クライアントID** と **クライアントシークレット** をメモ

> **注意**: 以前は「デスクトップアプリ」＋ `redirect_uri=urn:ietf:wg:oauth:2.0:oob` の OOB フローが使えましたが、
> 2022 年以降 Google が段階的に停止しており、現在は多くのアカウントでブロックされます。
> このガイドは OAuth 2.0 Playground を使う手順を採用しています。

### 1-4. OAuth 同意画面の Publishing status を確認

1. [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) を開く
2. **Publishing status** を確認
   - **Testing**: refresh token が **7 日で失効** するため実運用に向かない
   - **In production**: 失効は「6 ヶ月間未使用」のときのみ
3. Testing のままなら **「PUBLISH APP」** で In production に昇格させる
   - Chrome Web Store scope は sensitive scope 扱いのため verification 画面が出るが、
     個人利用アプリなら unverified のまま Production 化して警告付きで運用可能

### 1-5. リフレッシュトークンの取得（OAuth Playground 経由）

1. https://developers.google.com/oauthplayground/ を開く
2. 右上の **歯車アイコン** をクリック
3. **Use your own OAuth credentials** にチェックを入れ、
   1-3 で取得した **OAuth Client ID / Client Secret** を入力して閉じる
4. 左サイドの **Step 1** の下、「Input your own scopes」欄に以下を貼り付け:
   ```
   https://www.googleapis.com/auth/chromewebstore
   ```
5. **Authorize APIs** をクリック → Google のログイン & 同意画面で許可
   - 「このアプリは Google で確認されていません」と出た場合は Advanced → 続行
6. Playground の **Step 2** で **Exchange authorization code for tokens** をクリック
7. 右側レスポンスに表示される `refresh_token` をコピー

> **refresh_token が空で返る場合**:
> 同一ユーザー × 同一クライアントで再認可すると、Google は refresh_token を返さないことがあります。
> [Google アカウント > サードパーティのアクセス](https://myaccount.google.com/permissions) で該当アプリのアクセスを一度削除してから、
> 手順 5 からやり直してください。

## 2. GitHub Secrets の設定

リポジトリの **Settings > Secrets and variables > Actions** で以下を登録:

| Secret 名 | 値 | 説明 |
|---|---|---|
| `CHROME_EXTENSION_ID` | 拡張機能のID | Chrome Web Store の URL から取得（`https://chrome.google.com/webstore/detail/{ID}`） |
| `CHROME_CLIENT_ID` | OAuth2 クライアントID | 手順 1-3 で取得 |
| `CHROME_CLIENT_SECRET` | OAuth2 クライアントシークレット | 手順 1-3 で取得 |
| `CHROME_REFRESH_TOKEN` | OAuth2 リフレッシュトークン | 手順 1-5 で取得 |

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
   - 「レスポンス: {"error": "invalid_grant", ...}」が出ていれば refresh token 失効
2. 手順 1-4 の Publishing status を再確認（Testing に戻っていないか）
3. 手順 1-5 を再実行して新しいリフレッシュトークンを取得
4. GitHub Secrets の `CHROME_REFRESH_TOKEN` を更新

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
