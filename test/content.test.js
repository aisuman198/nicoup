const { describe, it } = require('node:test');
const assert = require('node:assert');
const helpers = require('../app/js/helpers.js');

describe('extractVideoId', () => {
    it('新URL形式: videos/ の後に数字のみ', () => {
        const url = 'https://garage.nicovideo.jp/niconico-garage/video/videos/46183109';
        assert.strictEqual(helpers.extractVideoId(url), 46183109);
    });

    it('旧URL形式: videos/ の後に sm プレフィックス付き', () => {
        const url = 'https://garage.nicovideo.jp/niconico-garage/video/videos/sm46183109';
        assert.strictEqual(helpers.extractVideoId(url), 46183109);
    });

    it('無効なURL: videos/ を含まない', () => {
        const url = 'https://example.com/';
        assert.strictEqual(helpers.extractVideoId(url), null);
    });

    it('videos/ がパスに含まれない場合', () => {
        const url = 'https://garage.nicovideo.jp/niconico-garage/video/sm46183109';
        assert.strictEqual(helpers.extractVideoId(url), null);
    });

    it('ポート番号など他の数字に誤マッチしない', () => {
        const url = 'https://example.com:8080/path/12345';
        assert.strictEqual(helpers.extractVideoId(url), null);
    });
});

describe('makeDetail', () => {
    it('改行を<br>に変換する', () => {
        assert.strictEqual(helpers.makeDetail('line1\nline2\nline3'), 'line1<br>line2<br>line3');
    });

    it('改行がない場合はそのまま返す', () => {
        assert.strictEqual(helpers.makeDetail('no newlines'), 'no newlines');
    });
});

describe('makeTags', () => {
    it('スペース区切りの文字列を配列にする', () => {
        assert.deepStrictEqual(helpers.makeTags('tag1 tag2 tag3'), ['tag1', 'tag2', 'tag3']);
    });

    it('タグが1つの場合は要素1の配列', () => {
        assert.deepStrictEqual(helpers.makeTags('single'), ['single']);
    });
});

describe('formatDateTime', () => {
    it('hourがundefinedの場合はnullを返す', () => {
        assert.strictEqual(helpers.formatDateTime(undefined), null);
    });

    it('有効な時間を渡すとISO形式の文字列を返す', () => {
        const result = helpers.formatDateTime(15);
        assert.match(result, /^\d{4}-\d{2}-\d{2}T15:00:00\+09:00$/);
    });

    it('0時を渡した場合', () => {
        const result = helpers.formatDateTime(0);
        assert.match(result, /^\d{4}-\d{2}-\d{2}T00:00:00\+09:00$/);
    });
});
