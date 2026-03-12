
const fs = require("fs");

const path = "d:/Continuum/web/components/tutorial/welcome-modal.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  /className="flex items-center gap-3 text-sm text-muted-foreground"/g,
  `className="flex items-center gap-3 text-sm text-white/70 font-medium bg-black/20 p-3 rounded-xl border border-white/5"`
);

content = content.replace(
  /<CheckCircle className="w-4 h-4 text-green-500 shrink-0" \/>/g,
  `<CheckCircle className="w-5 h-5 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)] shrink-0" />`
);

content = content.replace(
  /className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary\/90 transition-all shadow-lg shadow-primary\/25 btn-press"/g,
  `className="w-full relative flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-bold text-lg hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all dropdown-shadow overflow-hidden group"\n                  ><div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />`
);

content = content.replace(
  /className="w-full px-6 py-3 rounded-xl border border-border text-muted-foreground font-medium hover:bg-muted\/50 transition-colors"/g,
  `className="w-full px-6 py-4 rounded-xl glass-panel border border-white/10 text-white/60 font-semibold hover:bg-white/10 hover:text-white transition-colors"`
);

// update modal container classes
content = content.replace(
  /className="w-full max-w-lg rounded-2xl bg-card shadow-2xl border border-border overflow-hidden pointer-events-auto"/g,
  `className="w-full max-w-lg glass-panel-interactive border border-white/10 shadow-[0_0_40px_rgba(var(--primary-rgb),0.3)] rounded-3xl overflow-hidden pointer-events-auto relative"\n            >\n              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />`
).replace(
    /className="w-full max-w-lg rounded-2xl bg-card shadow-2xl border border-border overflow-hidden pointer-events-auto"/g,
    ""
);

content = content.replace(
  /className="relative bg-gradient-to-br from-primary\/10 via-accent\/5 to-primary\/10 px-8 pt-10 pb-6 overflow-hidden"/g,
  `className="relative bg-black/30 backdrop-blur-md border-b border-white/5 px-8 pt-10 pb-6 overflow-hidden"`
);

content = content.replace(
  /className="w-20 h-20 bg-primary\/10 rounded-2xl flex items-center justify-center"/g,
  `className="w-20 h-20 bg-black/40 backdrop-blur-md shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] border border-primary/30 rounded-2xl flex items-center justify-center"\n                    >\n                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />\n                      <Sparkles className="w-10 h-10 text-primary drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)]" />\n                    `
);

content = content.replace(
    /<Sparkles className="w-10 h-10 text-primary" \/>\s*<\/div>/,
    "</div>"
);

content = content.replace(
    /className="absolute -inset-2 rounded-3xl bg-primary\/5 animate-ping"/g,
    `className="absolute -inset-2 rounded-3xl bg-primary/20 animate-ping"`
);

fs.writeFileSync(path, content);

