const fs = require('fs');
const path = require('path');

function findFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.next') && !fullPath.includes('.git')) {
        results = results.concat(findFiles(fullPath));
      }
    } else {
      if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const allFiles = findFiles('d:/projects/Continuum-main-deploy/web');
const foundEnvs = new Set();
const regex = /process\.env\.([A-Z0-9_]+)/g;

allFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    foundEnvs.add(match[1]);
  }
});

let envProdKeys = [];
try {
  const envContent = fs.readFileSync('d:/projects/Continuum-main-deploy/web/.env.prod', 'utf8');
  envProdKeys = envContent.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('=')[0]);
} catch(e) {}

const missing = Array.from(foundEnvs).filter(env => !envProdKeys.includes(env) && env !== 'NODE_ENV');
console.log('MISSING ENVS:', missing.join(', '));
