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
    content = content.replace(/rounded-\[([0-9\.]+)rem\]/g, 'rounded-3xl');
    
    // Decrease border widths
    content = content.replace(/border-4/g, 'border-2');
    content = content.replace(/border-2/g, 'border');

    // Make text normal instead of black
    content = content.replace(/font-black/g, 'font-medium');
    
    // Remove heavy shadows
    content = content.replace(/shadow-2xl/g, 'shadow-lg');
    content = content.replace(/shadow-xl/g, 'shadow-md');

    // Improve tracking
    content = content.replace(/tracking-widest/g, 'tracking-wide');

    // Reduce font sizes that are extremely large if any (just keeping as is for now)

    fs.writeFileSync(filePath, content, 'utf8');
  }
});
console.log('UI refined for geometry and shadows');
