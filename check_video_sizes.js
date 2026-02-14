import https from 'https';
import fs from 'fs';

const urls = [
    "https://del1.vultrobjects.com/qms-images/Safar/70796-538877060_medium.mp4",
    "https://del1.vultrobjects.com/qms-images/Safar/216134_medium.mp4",
    "https://del1.vultrobjects.com/qms-images/Safar/244839_medium.mp4",
    "https://del1.vultrobjects.com/qms-images/Safar/11898793_3840_2160_60fps.mp4"
];

const checkUrl = (url) => {
    return new Promise((resolve, reject) => {
        const req = https.request(url, { method: 'HEAD' }, (res) => {
            const size = res.headers['content-length'];
            const mb = (size / (1024 * 1024)).toFixed(2);
            const result = `${url}: ${size} bytes (~${mb} MB)\n`;
            console.log(result.trim());
            fs.appendFileSync('video_sizes_report.txt', result);
            resolve();
        });
        req.on('error', (e) => {
            const error = `${url}: Error ${e.message}\n`;
            console.error(error.trim());
            fs.appendFileSync('video_sizes_report.txt', error);
            resolve();
        });
        req.end();
    });
};

if (fs.existsSync('video_sizes_report.txt')) {
    fs.unlinkSync('video_sizes_report.txt');
}

(async () => {
    for (const url of urls) {
        await checkUrl(url);
    }
})();
