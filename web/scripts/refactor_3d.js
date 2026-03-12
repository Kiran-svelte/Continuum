const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Add motion imports if missing
  if (content.includes('framer-motion') && !content.includes('@/components/motion')) {
    content = content.replace(
      /import \{.*\} from 'framer-motion';?/,
      `$&
import { TiltCard, FadeIn, StaggerContainer, AmbientBackground } from '@/components/motion';`
    );
  }

  // Very basic check if we have <AmbientBackground />
  if (!content.includes('<AmbientBackground />')) {
      // Find the main return block. This regex finds the first `<div className="...max-w...` or `<div className="...p-4...` block after `return (`
      const returnDivRegex = /return \(\s*<div className="([^"]*(?:p-4|p-6|p-8|max-w-)[^"]*)"\s*>/;
      const match = content.match(returnDivRegex);
      if (match) {
        content = content.replace(
          returnDivRegex,
          `return (\n    <div className="$1">\n      <AmbientBackground />\n      <StaggerContainer>`
        );
        // Replace the last </div> before );\n} or similar
        content = content.replace(
          /<\/div>\s*\);\s*\}/,
          `      </StaggerContainer>\n    </div>\n  );\n}`
        );
      }
  }

  // Turn classic cards into TiltCards (basic attempt)
  if (content.includes('<Card>')) {
      content = content.replace(/<Card>/g, '<FadeIn>\n<TiltCard>\n<div className="glass-panel border-white/10 rounded-2xl p-6">');
      content = content.replace(/<\/Card>/g, '</div>\n</TiltCard>\n</FadeIn>');
      content = content.replace(/<CardHeader>/g, '<div className="mb-4">');
      content = content.replace(/<\/CardHeader>/g, '</div>');
      content = content.replace(/<CardTitle([^>]*)>/g, '<h2$1 className="text-xl font-bold text-white drop-shadow-md flex items-center gap-2">');
      content = content.replace(/<\/CardTitle>/g, '</h2>');
      content = content.replace(/<CardContent([^>]*)>/g, '<div$1>');
      content = content.replace(/<\/CardContent>/g, '</div>');
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${filePath}`);
  }
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.name === 'page.tsx') {
      processFile(fullPath);
    }
  }
}

// processDirectory('d:/Continuum/web/app/manager/(main)');
// processDirectory('d:/Continuum/web/app/hr/(main)');
// processDirectory('d:/Continuum/web/app/admin/(main)');