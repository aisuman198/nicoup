function proccess() {
    chrome.storage.local.get('setting', function (data) {
        request(data.setting);
    });
}

function request(setting) {
    const id = getId()
    if (!id) {
        messageSelector('#errrOutputInvalidPage');
        return;
    }
    const title = makeTitle(setting.title);
    if (!title) {
        messageSelector('#errrOutputMissingParameter');
        return;
    }
    const detail = makeDetail(setting.detail);
    const tags = makeTags(setting.tags);
    const registeredAt = formatDateTime(setting.publishHour);
    const payload = makePayload(
        id,
        title,
        detail,
        tags,
        setting.genre,
        setting.seriesId,
        registeredAt
    );
    requestDraftApi(id, payload);
}

function makePayload(id, title, detail, tags, genreKey, seriesId, registeredAt) {
    const publishTimerUse = registeredAt !== null;

    return {
        "id": id,
        "title": title,
        "detail": detail,
        "signature": {
            "display": false
        },
        "publish": true,
        "publishTimer": {
            "use": publishTimerUse,
            "registeredAt": registeredAt,
        },
        "videoLive": {
            "enable": false
        },
        "series": {
            "id": seriesId,
            "addToHead": false
        },
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
        "notification": {
            "email": false
        },
        "excludeFromUploadList": false,
        "thanksMessage": {
            "isVisible": false,
            "content": ""
        },
        "commonsParentIds": []
    }
}

async function requestDraftApi(videoId, payload) {
    const urlFormat = 'https://www.upload.nicovideo.jp/v2/videos/{{videoId}}/draft';
    const url = urlFormat.replace('{{videoId}}', videoId);
    const frontendId = 23;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Frontend-Id': frontendId,
                'X-Frontend-Version': '0.0.0',
                'X-Request-With': 'nv-garage'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        messageSelector('#successOutput');
        window.location.reload();
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('DraftApi request error:', error.message);
        messageSelector('#errrOutputApiError');
        throw error;
    }
}

function getId() {
    const currentPageUrl = window.location.href;
    const regex = /sm(\d+)/;
    const match = currentPageUrl.match(regex);

    if (match) {
        return parseInt(match[1], 10);
    } else {
        return null;
    }
}

function makeTitle(title) {
    const textPlaceHolder = '{{defaultInput}}';
    const titleElement = document.querySelector('input[name="title"]');
    return title.replace(textPlaceHolder, titleElement.value);
}

function makeDetail(detail) {
    return detail.replace(/\n/g, '<br>');
}

function makeTags(tags) {
    return tags.split(' ');
}

function formatDateTime(hour) {
    console.log("formatDateTime");
    console.log(hour);
    if (typeof hour === 'undefined') {
        return null;
    }
    const now = new Date();
    now.setHours(hour, 0, 0, 0);

    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = "00";
    const seconds = "00";

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
}

function messageSelector(messageId) {
    chrome.runtime.sendMessage({ messageId: messageId }, function (response) {
        console.log(response.messageStatus);
    });
}