import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src/components', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Convert extreme roundings to 3xl directly (softer standard)
    content = content.replace(/https:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9-]+\?auto=format&fit=crop&q=80&w=2600/g, 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=2600');

    fs.writeFileSync(filePath, content, 'utf8');
  }
});
console.log('Images updated to Amazon Forest');
