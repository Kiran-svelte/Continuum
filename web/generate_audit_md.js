const fs = require('fs');

const data = JSON.parse(fs.readFileSync('audit_results.json', 'utf8'));

let md = `# EXTREME FORENSIC AUDIT: Continuum Actions\n\n`;
md += `This document contains an extreme forensic audit of every action trigger (UI interactions and API endpoints) found in the codebase. Total Actions Found: ${data.length}\n\n`;

md += `| Source File | Line | Trigger Type | Claimed Action | Actual Action | Status |\n`;
md += `|---|---|---|---|---|---|\n`;

// Group by module/folder to make it somewhat readable, or just output all
// Let's sort them by source file
data.sort((a, b) => a.source.localeCompare(b.source));

for (const item of data) {
  // Escape pipe characters for markdown table
  const cleanClaims = item.claims.replace(/\\|/g, '').replace(/\n/g, ' ').substring(0, 100);
  const cleanActual = item.actual.replace(/\\|/g, '').replace(/\n/g, ' ');
  
  // Format the status
  let statusStr = item.status;
  if (statusStr.includes('FAKE')) statusStr = `🔴 **[${statusStr}]**`;
  else if (statusStr.includes('BROKEN')) statusStr = `🔴 **[${statusStr}]**`;
  else if (statusStr.includes('MISSING')) statusStr = `🟡 **[${statusStr}]**`;
  else statusStr = `🟢 **[${statusStr}]**`;
  
  md += `| \`${item.source}\` | ${item.line} | ${item.trigger} | ${cleanClaims} | ${cleanActual} | ${statusStr} |\n`;
}

fs.writeFileSync('EXTREME_AUDIT.md', md);
console.log('EXTREME_AUDIT.md generated successfully.');
