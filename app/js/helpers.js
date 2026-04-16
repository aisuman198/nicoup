const VideoUploaderHelpers = {
    extractVideoId(url) {
        const regex = /videos\/(?:sm)?(\d+)/;
        const match = url.match(regex);
        return match ? parseInt(match[1], 10) : null;
    },

    makeDetail(detail) {
        return detail.replace(/\n/g, '<br>');
    },

    makeTags(tags) {
        return tags.split(' ');
    },

    formatDateTime(hour) {
        if (typeof hour === 'undefined') {
            return null;
        }
        const now = new Date();
        now.setHours(hour, 0, 0, 0);
        return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}T${now.getHours().toString().padStart(2, '0')}:00:00+09:00`;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoUploaderHelpers;
}
