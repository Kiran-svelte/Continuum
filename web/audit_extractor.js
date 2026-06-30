const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetDir = 'd:/projects/Continuum-main-deploy/web';

function findFiles(dir, extFilter) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('test-results')) {
        results = results.concat(findFiles(file, extFilter));
      }
    } else {
      if (extFilter(file)) results.push(file);
    }
  });
  return results;
}

const uiFiles = findFiles(targetDir, f => f.endsWith('.tsx') || f.endsWith('.jsx'));
const apiFiles = findFiles(path.join(targetDir, 'app/api'), f => f.endsWith('route.ts') || f.endsWith('route.js'));

const actions = [];

// 1. Scan UI Files for onClick, onSubmit, href
for (const file of uiFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const shortPath = file.replace(targetDir, '').replace(/\\/g, '/');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('onClick=') || line.includes('onSubmit=')) {
      const type = line.includes('onClick=') ? 'Button click' : 'Form submit';
      
      let implStatus = 'REAL';
      if (line.includes('console.log')) implStatus = 'FAKE - console.log';
      else if (line.includes('() => {}') || line.includes('undefined')) implStatus = 'FAKE - empty';
      
      // Try to find if it calls an API
      let claimsToDo = 'Unknown Action';
      // Look around for button text or function name
      const snippet = lines.slice(Math.max(0, i-2), Math.min(lines.length, i+5)).join('\n');
      
      const textMatch = snippet.match(/>([^<]+)<\/button>/);
      if (textMatch && textMatch[1].trim()) {
         claimsToDo = textMatch[1].trim();
      } else {
         const fnMatch = line.match(/(onClick|onSubmit)=\{([^}]+)\}/);
         if (fnMatch) claimsToDo = fnMatch[2].trim();
      }
      
      let actualDo = 'Executes local function';
      if (snippet.includes('fetch') || snippet.includes('api.') || snippet.includes('axios')) {
         actualDo = 'Calls backend API';
      }
      
      if (implStatus === 'REAL' && claimsToDo.includes('TODO')) implStatus = 'FAKE - TODO';

      actions.push({
        source: shortPath,
        line: i + 1,
        trigger: type,
        claims: claimsToDo,
        actual: actualDo,
        status: implStatus
      });
    }
  }
}

// 2. Scan API Files for endpoints
for (const file of apiFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const shortPath = file.replace(targetDir, '').replace(/\\/g, '/');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('export async function GET') || 
        line.includes('export async function POST') || 
        line.includes('export async function PUT') || 
        line.includes('export async function DELETE') ||
        line.includes('export async function PATCH')) {
        
        const method = line.match(/export async function (GET|POST|PUT|DELETE|PATCH)/)[1];
        
        let status = 'REAL';
        // Look for throw new Error or TODO
        const snippet = lines.slice(i, Math.min(lines.length, i+30)).join('\n');
        if (snippet.includes('Not implemented') || snippet.includes('throw new Error')) {
            status = 'BROKEN - throws error';
        }
        if (snippet.includes('TODO')) {
            if (snippet.includes('// TODO')) {
               // might still be real but has a todo
            } else {
               status = 'FAKE - commented out';
            }
        }
        
        let actual = 'API endpoint implementation';
        if (snippet.includes('prisma.')) actual += ' -> Database Query';
        if (snippet.includes('sendEmail') || snippet.includes('sendVia')) actual += ' -> External Service (Email)';
        if (snippet.includes('stripe') || snippet.includes('payment')) actual += ' -> External Service (Payments)';
        
        actions.push({
          source: shortPath,
          line: i + 1,
          trigger: `API Endpoint (${method})`,
          claims: `Handle ${method} request for ${shortPath}`,
          actual: actual,
          status: status
        });
    }
  }
}

fs.writeFileSync('audit_results.json', JSON.stringify(actions, null, 2));
console.log(`Found ${actions.length} actions.`);
