const { describe, it } = require('node:test');
const assert = require('node:assert');

/**
 * getId() の正規表現ロジックを抽出したヘルパー関数。
 * VideoUploader クラスは window.location や chrome API に依存しているため、
 * 正規表現マッチ部分だけを独立してテストする。
 */
function extractVideoId(url) {
    const regex = /videos\/(?:sm)?(\d+)/;
    const match = url.match(regex);
    return match ? parseInt(match[1], 10) : null;
}

describe('getId() の正規表現ロジック', () => {
    it('新URL形式: videos/ の後に数字のみ', () => {
        const url = 'https://garage.nicovideo.jp/niconico-garage/video/videos/46183109';
        assert.strictEqual(extractVideoId(url), 46183109);
    });

    it('旧URL形式: videos/ の後に sm プレフィックス付き', () => {
        const url = 'https://garage.nicovideo.jp/niconico-garage/video/videos/sm46183109';
        assert.strictEqual(extractVideoId(url), 46183109);
    });

    it('無効なURL: videos/ を含まない', () => {
        const url = 'https://example.com/';
        assert.strictEqual(extractVideoId(url), null);
    });

    it('エッジケース: URLに videos/ が含まれない場合', () => {
        const url = 'https://garage.nicovideo.jp/niconico-garage/video/sm46183109';
        assert.strictEqual(extractVideoId(url), null);
    });

    it('エッジケース: ポート番号など他の数字に誤マッチしない', () => {
        const url = 'https://example.com:8080/path/12345';
        assert.strictEqual(extractVideoId(url), null);
    });
});
