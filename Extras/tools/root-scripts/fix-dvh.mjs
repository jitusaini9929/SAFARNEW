import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ?
            walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('./client', function (filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let hasChanges = false;

        // Replace h-screen with h-[100dvh]
        if (content.match(/\bh-screen\b/g)) {
            content = content.replace(/\bh-screen\b/g, 'h-[100dvh]');
            hasChanges = true;
        }

        // Replace min-h-screen with min-h-[100dvh]
        if (content.match(/\bmin-h-screen\b/g)) {
            content = content.replace(/\bmin-h-screen\b/g, 'min-h-[100dvh]');
            hasChanges = true;
        }

        if (hasChanges) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Updated ' + filePath);
        }
    }
});
console.log('Done replacing viewport units!');
