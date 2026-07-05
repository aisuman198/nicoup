# nicoup プロジェクト方針

## このリポジトリって？

ニコニコ動画の投稿ページで、あらかじめ保存しておいた情報（タイトル・詳細・タグ・公開日時など）を
自動入力する Chrome 拡張（Manifest V3）。Chrome Web Store で「niconico Upload helper」として公開している。

## 構成

- `manifest.json` — 拡張のマニフェスト（バージョン管理の起点）
- `app/js/helpers.js` — 純粋関数群（テスト対象）
- `app/js/content.js` — 投稿ページに注入する content script
- `app/js/popup.js` / `app/html/index.html` / `app/css/index.css` — ポップアップ UI
- `test/content.test.js` — `helpers.js` に対するユニットテスト
- `.github/workflows/` — CI/CD（Chrome Web Store 自動アップロード等）

## 開発フロー

- Node.js は `.nvmrc`（v22）に合わせる（`nvm use`）。
- package.json は存在しない。依存パッケージなし、ビルドステップなし。
- テストは Node.js 標準の `node:test` を直接使用。実行コマンド:
  ```sh
  node --test test/
  ```
- 動作確認は Chrome の `chrome://extensions` を開き、デベロッパーモードで
  「パッケージ化されていない拡張機能を読み込む」からリポジトリルートを選択して行う。
  ニコニコ動画の投稿ページ（`garage.nicovideo.jp` の動画編集画面）で挙動を確認する。
- `app/js/helpers.js` に切り出された純粋関数はユニットテストを書く。
  DOM 操作を伴う `content.js` / `popup.js` はブラウザでの手動確認が中心。

## リリースフロー

1. `manifest.json` の `version` を更新し、main にマージする。
2. `.github/scripts/package-extension.sh` が拡張を ZIP にパッケージングする
   （`memo.md` や `.DS_Store` は自動除外）。
3. Chrome Web Store への公開は `.github/workflows/chrome-webstore-upload.yml` で自動化されている。
   - `git tag vX.Y.Z && git push origin vX.Y.Z` でタグを push すると自動でアップロード（公開はしない）。
   - タグのバージョンと `manifest.json` の `version` が一致しない場合はワークフローが失敗する。
   - 手動実行（`workflow_dispatch`）では `dry-run` / `publish` をオプションで指定できる。
   - 詳細な手順・認証情報のセットアップは `.github/docs/chrome-webstore-setup.md` を参照。
4. 公開の最終承認は Chrome Web Store Developer Dashboard での目視確認を経てから行う。

## 出力方針

- ドキュメント・コミットメッセージは日本語で書く。
- コミットメッセージは Conventional Commits の型（`feat:` `fix:` `docs:` `chore:` 等）＋日本語で記述する。
- 変更は必ず feature ブランチを切り、PR 経由で main にマージする（main への直接 push はしない）。
