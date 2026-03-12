
const fs = require("fs");

const path = "d:/Continuum/web/components/tutorial/tutorial-provider.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  /bg-card text-card-foreground border border-border shadow-2xl overflow-hidden/g,
  `glass-panel-interactive border border-white/10 shadow-[0_0_40px_rgba(var(--primary-rgb),0.3)]`
);

content = content.replace(
  /h-1 bg-muted/g,
  `h-1.5 bg-black/40 shadow-inner`
);

content = content.replace(
  /h-full bg-primary/g,
  `h-full bg-gradient-to-r from-primary to-blue-500 shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]`
);

content = content.replace(
  /border-b border-border/g,
  `border-b border-white/10`
);

content = content.replace(
  /bg-primary text-primary-foreground text-sm font-medium/g,
  `bg-primary text-white text-sm font-bold shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] border border-white/20`
);

content = content.replace(
  /text-muted-foreground/g,
  `text-white/70`
);

content = content.replace(
  /<h3 className="text-xl font-semibold mb-2">{step.title}<\/h3>/g,
  `<h3 className="text-xl font-bold text-white drop-shadow-md mb-2">{step.title}</h3>`
);

content = content.replace(
  /<div className="px-6 py-6 font-medium text-foreground">/g,
  `<div className="px-6 py-6 font-medium text-white/90">`
);

content = content.replace(
  /border-t border-border bg-muted\/30/g,
  `border-t border-white/10 bg-black/20 backdrop-blur-sm`
);

content = content.replace(
  /className="text-muted-foreground hover:bg-muted hover:text-foreground"/g,
  `className="text-white/60 hover:bg-white/10 hover:text-white"`
);

content = content.replace(
  /className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"/g,
  `className="p-1 rounded-md text-white/50 hover:bg-white/10 hover:text-white transition-colors"`
);

fs.writeFileSync(path, content);

