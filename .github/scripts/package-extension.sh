#!/usr/bin/env bash
#
# Chrome拡張機能のZIPパッケージを作成する
#
# 使い方:
#   .github/scripts/package-extension.sh [出力ファイル名]
#
# 出力ファイル名を省略した場合、manifest.jsonのバージョンからファイル名を生成する
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

# manifest.json からバージョン取得
VERSION=$(grep -o '"version": *"[^"]*"' manifest.json | grep -o '"[^"]*"$' | tr -d '"')
if [ -z "$VERSION" ]; then
  echo "Error: manifest.json からバージョンを読み取れませんでした" >&2
  exit 1
fi

OUTPUT="${1:-nicoup-v${VERSION}.zip}"

echo "=== nicoup v${VERSION} パッケージ作成 ==="

# 一時ディレクトリで作業
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# パッケージに含めるファイルをコピー
cp manifest.json "$TMPDIR/"
cp -r app "$TMPDIR/"
cp -r resource "$TMPDIR/"

# 不要ファイルを除外
find "$TMPDIR" -name "memo.md" -delete
find "$TMPDIR" -name ".DS_Store" -delete

# ZIP作成
(cd "$TMPDIR" && zip -r -q "$REPO_ROOT/$OUTPUT" .)

echo "パッケージ作成完了: $OUTPUT"
echo "含まれるファイル:"
unzip -l "$OUTPUT" | grep -E "^\s+[0-9]" | grep -v "files$"

# バリデーション: manifest.json が含まれているか
if ! unzip -l "$OUTPUT" | grep -q "manifest.json"; then
  echo "Error: ZIPにmanifest.jsonが含まれていません" >&2
  exit 1
fi

echo "=== 完了 ==="
