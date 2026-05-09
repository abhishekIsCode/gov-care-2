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
    
    // Convert emerald backgrounds
    content = content.replace(/bg-emerald-500/g, 'bg-teal-500');
    content = content.replace(/bg-emerald-400/g, 'bg-teal-400');
    content = content.replace(/bg-emerald-600/g, 'bg-teal-600');
    content = content.replace(/bg-emerald-50/g, 'bg-stone-50');
    content = content.replace(/bg-emerald-100/g, 'bg-stone-100');
    content = content.replace(/emerald-50\/80/g, 'stone-50/80');
    content = content.replace(/emerald-50\/20/g, 'stone-50/20');
    content = content.replace(/bg-emerald-500\/10/g, 'bg-teal-500/10');
    content = content.replace(/emerald-200/g, 'stone-200');
    content = content.replace(/emerald-300/g, 'teal-300');

    // Convert emerald text
    content = content.replace(/text-emerald-950/g, 'text-stone-800');
    content = content.replace(/text-emerald-900/g, 'text-stone-700');
    content = content.replace(/text-emerald-800/g, 'text-stone-700');
    content = content.replace(/text-emerald-700/g, 'text-teal-700');
    content = content.replace(/text-emerald-600/g, 'text-teal-600');
    content = content.replace(/text-emerald-500/g, 'text-teal-500');
    content = content.replace(/text-emerald-400/g, 'text-teal-400');

    // Convert borders
    content = content.replace(/border-emerald-/g, 'border-teal-');

    // Convert shadows
    content = content.replace(/shadow-emerald-/g, 'shadow-teal-');

    // Soften fonts
    content = content.replace(/font-black/g, 'font-medium');
    content = content.replace(/font-bold/g, 'font-medium');
    
    // Soften text that looks harsh
    content = content.replace(/tracking-\[.*?\]/g, 'tracking-wide');
    content = content.replace(/tracking-widest/g, 'tracking-wide');
    content = content.replace(/tracking-tighter/g, 'tracking-tight');
    content = content.replace(/uppercase/g, ''); // just remove uppercase

    // Generic fallback for any remaining emerald references
    content = content.replace(/emerald-/g, 'teal-');

    fs.writeFileSync(filePath, content, 'utf8');
  }
});
console.log('UI modified for a calmer aesthetic');
