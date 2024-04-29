document.addEventListener('DOMContentLoaded', () => {
    const loadButton = document.getElementById('loadButton');
    const saveButton = document.getElementById('saveButton');
    loadButton.addEventListener('click', async () => {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log(tab);
        if (!tab) {
            return;
        }
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0].url.includes("https://www.upload.nicovideo.jp/niconico-garage/video/videos/")) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['./app/js/content.js']
                }, () => {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        function: function () {
                            const uploader = new VideoUploader();
                            uploader.exec();
                        }
                    });
                });
            } else {
                messageSelector('#errrOutputInvalidPage');
            }
        });
    });
    saveButton.addEventListener('click', async () => {
        save();
    });
    chrome.storage.local.get('setting', function (data) {
        console.info(data);
        loadSetting(data.setting);
    });
});

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        messageSelector(request.messageId);
        sendResponse({ messageStatus: request.messageId });
    }
);

function messageSelector(messageId) {
    document.querySelectorAll('#info-text p').forEach(function (p) {
        p.classList.add('hide');
        p.classList.remove('visible');
    });

    const element = document.querySelector(messageId)
    if (element === null) {
        return;
    }
    element.classList.add('visible');
    element.classList.remove('hide');
}

function loadSetting(setting) {
    if (!setting) {
        console.log('No settings found');
        messageSelector('#defaultMessage');
        return;
    }
    if (setting.title !== undefined) {
        document.querySelector('#title').value = setting.title;
    }
    if (setting.detail !== undefined) {
        document.querySelector('#detail').value = setting.detail;
    }
    if (setting.genre !== undefined) {
        document.querySelector('#genre').value = setting.genre;
    }
    if (setting.seriesId !== undefined) {
        document.querySelector('#seriesId').value = setting.seriesId;
    }
    if (setting.tags !== undefined) {
        document.querySelector('#tags').value = setting.tags;
    }
    if (setting.publishHour !== undefined) {
        document.querySelector('#publishHour').value = setting.publishHour;
    }
    messageSelector('#ready');
}


function save() {
    const title = document.querySelector('#title').value;
    const detail = document.querySelector('#detail').value;
    const genre = document.querySelector('#genre').value;
    const seriesId = parseInt(document.querySelector('#seriesId').value, 10);
    const tags = document.querySelector('#tags').value;
    const publishHour = parseInt(document.querySelector('#publishHour').value, 10);

    if (!title) {
        messageSelector('#errorSave');
        return;
    }

    const setting = {
        title,
        detail,
        genre,
        seriesId,
        tags,
        publishHour,
    };

    chrome.storage.local.set({ setting }, function () {
        messageSelector('#successSave');
    });
}