const fs = require('fs');
const path = require('path');

const targetDir = 'd:/projects/Continuum-main-deploy/web';

function findFiles(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        if (!fullPath.includes('node_modules') && !fullPath.includes('.next') && !fullPath.includes('.git')) {
          results = results.concat(findFiles(fullPath));
        }
      } else {
        if (fullPath.endsWith('page.tsx') || fullPath.endsWith('page.jsx')) {
          results.push(fullPath);
        }
      }
    });
  } catch(e) {}
  return results;
}

const pageFiles = findFiles(targetDir);
const brokenRoutes = [];

pageFiles.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const route = f.replace(targetDir, '').replace(/\\/g, '/');
    if (content.includes('TODO') || content.trim().length < 50 || !content.includes('export default function')) {
        brokenRoutes.push(route);
    }
});

console.log(`Found ${brokenRoutes.length} broken routes:`);
brokenRoutes.slice(0, 10).forEach(r => console.log(r));
if (brokenRoutes.length > 10) console.log('...and more');
