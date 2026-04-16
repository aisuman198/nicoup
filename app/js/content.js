class VideoUploader {
    constructor() {
        this.frontendId = 23;
        this.urlFormat = 'https://garage.nicovideo.jp/v2/videos/{{videoId}}/draft';
    }

    async exec() {
        chrome.storage.local.get('setting', (data) => {
            this.request(data.setting);
        });
    }

    async request(setting) {
        const id = VideoUploaderHelpers.extractVideoId(window.location.href);
        if (!id) {
            this.messageSelector('#errrOutputInvalidPage');
            return;
        }
        const title = this.makeTitle(setting.title);
        if (!title) {
            this.messageSelector('#errrOutputMissingParameter');
            return;
        }
        const detail = VideoUploaderHelpers.makeDetail(setting.detail);
        const tags = VideoUploaderHelpers.makeTags(setting.tags);
        const registeredAt = VideoUploaderHelpers.formatDateTime(setting.publishHour);
        const payload = this.makePayload(
            id,
            title,
            detail,
            tags,
            setting.genre,
            setting.seriesId,
            registeredAt
        );
        this.requestDraftApi(id, payload);
    }

    makePayload(id, title, detail, tags, genreKey, seriesId, registeredAt) {
        const publishTimerUse = registeredAt !== null;
        const needSeries = typeof seriesId !== 'undefined' && seriesId !== null && seriesId !== '';
        const payload = {
            "id": id,
            "title": title,
            "detail": detail,
            "signature": { "display": false },
            "publish": true,
            "publishTimer": { "use": publishTimerUse, "registeredAt": registeredAt },
            "videoLive": { "enable": false },
            "tags": tags,
            "genreKey": genreKey,
            "thumbnail": {
                "selectThumbnailIndex": "0",
                "aspectBias": "STANDARD",
                "cropMode": 0,
                "position": 0
            },
            "permissionSettings": {
                "allowNgShareFlag": true,
                "allowOutsidePlayerFlag": true,
                "allowUadFlag": true,
                "allowNicoliveFlag": true,
                "allowUserTranslateFlag": true,
                "allowRegularUserTagEditFlag": true,
                "allowCaptureTweet": true,
                "allowClipTweet": true,
                "allowGift": true
            },
            "notification": { "email": false },
            "excludeFromUploadList": false,
            "thanksMessage": { "isVisible": false, "content": "" },
            "commonsParentIds": []
        }

        // シリーズの追加が必要な場合
        if (needSeries) {
            console.log("needSeries");
            console.log(seriesId);
            payload.series = { "id": seriesId, "addToHead": false }
        }

        return payload;
    }

    async requestDraftApi(videoId, payload) {
        const url = this.urlFormat.replace('{{videoId}}', videoId);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Frontend-Id': this.frontendId,
                    'X-Frontend-Version': '0.0.0',
                    'X-Request-With': 'nv-garage'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            this.messageSelector('#successOutput');
            window.location.reload();
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('DraftApi request error:', error.message);
            this.messageSelector('#errrOutputApiError');
            throw error;
        }
    }

    makeTitle(title) {
        const textPlaceHolder = '{{defaultInput}}';
        const titleElement = document.querySelector('input[name="title"]');
        return title.replace(textPlaceHolder, titleElement.value);
    }

    messageSelector(messageId) {
        chrome.runtime.sendMessage({ messageId: messageId }, function (response) {
            console.log(response.messageStatus);
        });
    }
}
