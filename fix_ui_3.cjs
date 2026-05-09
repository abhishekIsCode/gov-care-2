const fs = require('fs');
const path = require('path');

const replacements = [
  // HealthPortal Image
  { 
    regex: /https:\/\/images\.unsplash\.com\/photo-1470770841072-f978cf4d019e\?auto=format&fit=crop&q=80&w=2000/g, 
    replace: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=2600' 
  },
  { 
    regex: /text-zinc-50/g, 
    replace: 'text-zinc-900' 
  },
  {
    regex: /bg-emerald-50 text-zinc-900/g,
    replace: 'bg-emerald-50 text-emerald-950'
  },
  {
    regex: /filter: 'brightness\(0\.9\) contrast\(1\.1\) saturate\(0\.8\)'/g,
    replace: "filter: 'opacity(0.3) saturate(0.5)'"
  },
  {
    regex: /filter: 'grayscale\(1\) brightness\(0\.3\) contrast\(1\.2\)'/g,
    replace: "filter: 'opacity(0.15) saturate(0.5)'"
  },
  // In case grayscale is string
  {
    regex: /filter: "grayscale\(1\) brightness\(0\.3\) contrast\(1\.2\)"/g,
    replace: "filter: \"opacity(0.15) saturate(0.5)\""
  }
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let newContent = content;
      
      for (const { regex, replace } of replacements) {
        newContent = newContent.replace(regex, replace);
      }
      
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
