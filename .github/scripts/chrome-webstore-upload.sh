#!/usr/bin/env bash
#
# Chrome Web Store API を使って拡張機能をアップロード・公開する
#
# 必要な環境変数:
#   CHROME_EXTENSION_ID  - Chrome Web Store の拡張機能ID
#   CHROME_CLIENT_ID     - Google OAuth2 クライアントID
#   CHROME_CLIENT_SECRET - Google OAuth2 クライアントシークレット
#   CHROME_REFRESH_TOKEN - Google OAuth2 リフレッシュトークン
#
# 使い方:
#   chrome-webstore-upload.sh <ZIPファイル> [--publish] [--dry-run]
#
set -euo pipefail

# --- 引数パース ---
ZIP_FILE=""
PUBLISH=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --publish)  PUBLISH=true; shift ;;
    --dry-run)  DRY_RUN=true; shift ;;
    *)          ZIP_FILE="$1"; shift ;;
  esac
done

if [ -z "$ZIP_FILE" ]; then
  echo "Error: ZIPファイルを指定してください" >&2
  echo "使い方: $0 <ZIPファイル> [--publish] [--dry-run]" >&2
  exit 1
fi

if [ ! -f "$ZIP_FILE" ]; then
  echo "Error: ファイルが見つかりません: $ZIP_FILE" >&2
  exit 1
fi

# --- 環境変数チェック ---
MISSING_VARS=()
for VAR in CHROME_EXTENSION_ID CHROME_CLIENT_ID CHROME_CLIENT_SECRET CHROME_REFRESH_TOKEN; do
  if [ -z "${!VAR:-}" ]; then
    MISSING_VARS+=("$VAR")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "Error: 以下の環境変数が設定されていません:" >&2
  printf '  - %s\n' "${MISSING_VARS[@]}" >&2
  echo "" >&2
  echo "GitHub リポジトリの Settings > Secrets and variables > Actions で設定してください。" >&2
  echo "詳細は .github/docs/chrome-webstore-setup.md を参照してください。" >&2
  exit 1
fi

# --- dry-run モード ---
if [ "$DRY_RUN" = true ]; then
  echo "=== DRY-RUN モード ==="
  echo "ZIPファイル: $ZIP_FILE ($(du -h "$ZIP_FILE" | cut -f1))"
  echo "拡張機能ID: $CHROME_EXTENSION_ID"
  echo "公開: $([ "$PUBLISH" = true ] && echo 'する' || echo 'しない（アップロードのみ）')"
  echo ""
  echo "ZIPの内容:"
  unzip -l "$ZIP_FILE" | tail -n +4 | head -n -2
  echo ""

  # manifest.json のバージョン確認
  MANIFEST_VERSION=$(unzip -p "$ZIP_FILE" manifest.json | grep -o '"version": *"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')
  echo "manifest.json バージョン: $MANIFEST_VERSION"
  echo ""
  echo "=== dry-run 完了（実際のアップロードは行いません）==="
  exit 0
fi

# --- アクセストークン取得 ---
echo "=== アクセストークン取得 ==="
TOKEN_RESPONSE=$(curl -s -X POST "https://oauth2.googleapis.com/token" \
  -d "client_id=${CHROME_CLIENT_ID}" \
  -d "client_secret=${CHROME_CLIENT_SECRET}" \
  -d "refresh_token=${CHROME_REFRESH_TOKEN}" \
  -d "grant_type=refresh_token")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token": *"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "Error: アクセストークンの取得に失敗しました" >&2
  echo "レスポンス: $TOKEN_RESPONSE" >&2
  echo "" >&2
  echo "考えられる原因:" >&2
  echo "  - CHROME_CLIENT_ID / CHROME_CLIENT_SECRET が正しくない" >&2
  echo "  - CHROME_REFRESH_TOKEN の有効期限が切れている" >&2
  echo "  - Google Cloud Console でChrome Web Store APIが有効化されていない" >&2
  exit 1
fi
echo "アクセストークン取得成功"

# --- アップロード ---
echo "=== 拡張機能アップロード ==="
echo "ファイル: $ZIP_FILE"
echo "拡張機能ID: $CHROME_EXTENSION_ID"

UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X PUT \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "x-goog-api-version: 2" \
  -T "$ZIP_FILE" \
  "https://www.googleapis.com/upload/chromewebstore/v1.1/items/${CHROME_EXTENSION_ID}")

UPLOAD_HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -1)
UPLOAD_BODY=$(echo "$UPLOAD_RESPONSE" | sed '$d')

if [ "$UPLOAD_HTTP_CODE" -ne 200 ]; then
  echo "Error: アップロードに失敗しました (HTTP $UPLOAD_HTTP_CODE)" >&2
  echo "$UPLOAD_BODY" >&2
  echo "" >&2
  echo "考えられる原因:" >&2
  echo "  - CHROME_EXTENSION_ID が正しくない" >&2
  echo "  - manifest.json のバージョンが既存と同じ" >&2
  echo "  - ZIPファイルのフォーマットが不正" >&2
  exit 1
fi

# uploadState を確認
UPLOAD_STATE=$(echo "$UPLOAD_BODY" | grep -o '"uploadState": *"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')
if [ "$UPLOAD_STATE" != "SUCCESS" ]; then
  echo "Error: アップロードは完了しましたが、状態が SUCCESS ではありません: $UPLOAD_STATE" >&2
  echo "$UPLOAD_BODY" >&2
  exit 1
fi

echo "アップロード成功"

# --- 公開 ---
if [ "$PUBLISH" = true ]; then
  echo "=== 拡張機能を公開 ==="
  PUBLISH_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "x-goog-api-version: 2" \
    -H "Content-Length: 0" \
    "https://www.googleapis.com/chromewebstore/v1.1/items/${CHROME_EXTENSION_ID}/publish")

  PUBLISH_HTTP_CODE=$(echo "$PUBLISH_RESPONSE" | tail -1)
  PUBLISH_BODY=$(echo "$PUBLISH_RESPONSE" | sed '$d')

  if [ "$PUBLISH_HTTP_CODE" -ne 200 ]; then
    echo "Error: 公開に失敗しました (HTTP $PUBLISH_HTTP_CODE)" >&2
    echo "$PUBLISH_BODY" >&2
    echo "" >&2
    echo "アップロードは成功しています。手動でChrome Web Store Developer Dashboardから公開できます。" >&2
    exit 1
  fi

  PUBLISH_STATUS=$(echo "$PUBLISH_BODY" | grep -o '"status"\s*:\s*\[\s*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')
  echo "公開リクエスト完了 (status: ${PUBLISH_STATUS:-確認中})"
  echo "注意: Chrome Web Store の審査が完了するまで公開は反映されません"
else
  echo ""
  echo "アップロードのみ完了しました（公開はしていません）"
  echo "公開するには --publish オプションを付けて再実行するか、"
  echo "Chrome Web Store Developer Dashboard から手動で公開してください。"
fi

echo "=== 完了 ==="
