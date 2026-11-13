// Builds the HTML versions of the Stellara docs from docs/md/*.md.
//   docs/stellara-docs.html  one self-contained page (published as an Artifact)
//   docs/html/*.html         one static page per document, for offline reading
// Run: node docs/tools/build.mjs
import { readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MD = join(ROOT, "md"), HTML = join(ROOT, "html"), AV = join(ROOT, "assets", "auntie-stella");
mkdirSync(HTML, { recursive: true });

const files = readdirSync(MD).filter((f) => f.endsWith(".md")).sort();
const docs = files.map((f) => {
  const src = readFileSync(join(MD, f), "utf8");
  const title = (src.match(/^#\s+(.+)$/m) || [, f])[1].replace(/^\d+\s*·\s*/, "");
  return { file: f, slug: f.replace(/\.md$/, ""), id: "d" + f.slice(0, 2), src, title };
});
const avatars = ["smiling", "listening", "thinking", "proud"].map((e) => ({
  e, svg: readFileSync(join(AV, `auntie-stella-${e}.svg`), "utf8"),
}));
const roundAvatar = readFileSync(join(AV, "auntie-stella-avatar-round.svg"), "utf8");
const logoMark = readFileSync(join(ROOT, "assets", "logo", "stellara-mark.svg"), "utf8").replace(/<title>[^<]*<\/title>/, "").replace('role="img" aria-label="Stellara"', 'aria-hidden="true"');
const BRAND = `<div class="brand">${logoMark}<span class="wordmark">stellara</span><small>docs</small></div>`;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slugify = (t) => t.toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "").replace(/[^\w\- ]/g, "").trim().replace(/ /g, "-");

function makeMarked(mode, docId) {
  const m = new Marked({ gfm: true });
  m.use({
    renderer: {
      heading(text, level, raw) {
        const id = slugify(raw);
        const full = mode === "site" ? `${docId}-${id}` : id;
        return `<h${level} id="${full}">${text}</h${level}>\n`;
      },
      code(code, info) {
        if ((info || "").trim() === "mermaid") return `<pre class="mermaid">${esc(code)}</pre>\n`;
        return `<pre class="code"><code>${esc(code)}</code></pre>\n`;
      },
      table(header, body) {
        return `<div class="table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>\n`;
      },
      link(href, title, text) {
        const mdLink = href && href.match(/^(\d\d)-[\w-]+\.md(?:#(.*))?$/);
        if (mdLink) {
          const [, n, anchor] = mdLink;
          const target = docs.find((d) => d.file.startsWith(n));
          if (target) {
            href = mode === "site"
              ? `#${anchor ? `d${n}-${anchor}` : `d${n}`}`
              : `${target.slug}.html${anchor ? "#" + anchor : ""}`;
          }
        } else if (mode === "site" && href && href.startsWith("../emails/")) {
          href = href.slice(3);
        } else if (mode === "site" && href && href.startsWith("#")) {
          href = `#${docId}-${href.slice(1)}`;
        }
        const ext = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : "";
        return `<a href="${href}"${title ? ` title="${esc(title)}"` : ""}${ext}>${text}</a>`;
      },
    },
  });
  return m;
}

const LIGHT = "--bg:#FFF8F1;--surface:#FFFFFF;--surface-2:#FCEFE6;--fg:#3A2430;--muted:#76606A;--line:#F0DCD3;--accent:#C23A68;--accent-ink:#A12E57;--accent-soft:#FCE1EA;--code:#FCEFE6;--honey:#F6C445;--matcha:#86BF7E;--matcha-soft:#E1F2DB;--wordmark:#A12E57;color-scheme:light";
const DARK = "--bg:#1E1518;--surface:#291E22;--surface-2:#33262B;--fg:#F7ECE7;--muted:#C9B6BB;--line:#47363C;--accent:#F39BB9;--accent-ink:#F7B3CA;--accent-soft:#47222F;--code:#33262B;--honey:#F2C55C;--matcha:#93C98A;--matcha-soft:#20352A;--wordmark:#F7B3CA;color-scheme:dark";
const THEME_HEAD = `<script>try{var t=localStorage.getItem("stellara-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}</script><meta name="color-scheme" content="light dark">`;
const THEME_UI = `<div class="theme" role="group" aria-label="Appearance"><button type="button" data-set="auto" title="Match my phone">Auto</button><button type="button" data-set="light">Daytime</button><button type="button" data-set="dark">Starlight</button></div>`;
const THEME_JS = `(function(){var r=document.documentElement,b=[].slice.call(document.querySelectorAll(".theme button"));function cur(){try{return localStorage.getItem("stellara-theme")||"auto"}catch(e){return r.getAttribute("data-theme")||"auto"}}function set(p){if(p==="light"||p==="dark")r.setAttribute("data-theme",p);else r.removeAttribute("data-theme");try{if(p==="auto")localStorage.removeItem("stellara-theme");else localStorage.setItem("stellara-theme",p)}catch(e){}b.forEach(function(x){x.setAttribute("aria-pressed",String(x.dataset.set===p))})}b.forEach(function(x){x.addEventListener("click",function(){set(x.dataset.set)})});set(r.getAttribute("data-theme")||cur())})();`;
const CSS = `
:root{${LIGHT};--font-display:"Nunito","Inter",system-ui,sans-serif;--font-body:"Inter",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--mono:ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${DARK}}}
:root[data-theme="dark"]{${DARK}}
*{box-sizing:border-box}
html{background:var(--bg)}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.65 var(--font-body);-webkit-font-smoothing:antialiased}
a{color:var(--accent-ink)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:6px}
h1,h2,h3,h4{font-family:var(--font-display);font-weight:800;line-height:1.2;letter-spacing:-.01em;text-wrap:balance;scroll-margin-top:72px}
h1{font-size:36px;margin:0 0 18px} h2{font-size:24px;margin:44px 0 12px;padding-top:20px;border-top:1px solid var(--line)} h3{font-size:18px;font-weight:700;margin:28px 0 8px} h4{font-size:16px;font-weight:700}
p,ul,ol{margin:0 0 14px;max-width:72ch}
li{margin:4px 0}
blockquote{margin:0 0 16px;padding:12px 16px;border-left:4px solid var(--matcha);background:var(--matcha-soft);border-radius:0 12px 12px 0}
blockquote p{margin:0}
code{font-family:var(--mono);font-size:.88em;background:var(--code);padding:1px 5px;border-radius:6px}
pre.code{background:var(--code);padding:14px 16px;border-radius:14px;overflow-x:auto;font-size:13px;line-height:1.5;max-width:100%}
pre.code code{background:none;padding:0}
pre.mermaid{background:#FFFFFF;color:#3A2430;border:1px solid var(--line);border-radius:14px;padding:16px;overflow-x:auto;text-align:center}
.table-wrap{overflow-x:auto;margin:0 0 18px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);font-weight:600;background:var(--surface-2)}
tr:last-child td{border-bottom:0}
input[type=checkbox]{margin-right:6px}
.theme{display:inline-flex;background:var(--surface-2);border-radius:999px;padding:3px;gap:2px}
.theme button{font:500 12px var(--font-body);border:0;background:transparent;color:var(--muted);padding:6px 10px;border-radius:999px;cursor:pointer;min-height:30px}
.theme button[aria-pressed="true"]{background:var(--surface);color:var(--fg);box-shadow:0 1px 2px rgba(58,36,48,.2)}
.wordmark{font-family:var(--font-display);font-weight:800;letter-spacing:-.02em;color:var(--wordmark);font-size:21px;line-height:1}
.brand{display:flex;gap:8px;align-items:center}
.brand svg{width:30px;height:30px;flex:none}
.brand small{font:500 13px var(--font-body);color:var(--muted);margin-left:2px}
.dimmable svg{transition:filter .2s ease}
:root[data-theme="dark"] .dimmable svg{filter:brightness(.9)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .dimmable svg{filter:brightness(.9)}}
`;

/* ---------- single-page site ---------- */
function buildSite() {
  const sections = docs.map((d) => {
    const html = makeMarked("site", d.id).parse(d.src);
    const plain = d.src.replace(/```[\s\S]*?```/g, " ").replace(/[#*|`>\[\]()_-]+/g, " ").replace(/\s+/g, " ");
    return { ...d, html, plain };
  });
  const gallery = `<div class="gallery dimmable">${avatars.map((a) => `<figure>${a.svg}<figcaption>${a.e[0].toUpperCase() + a.e.slice(1)}</figcaption></figure>`).join("")}</div>`;
  const nav = sections.map((s) => `<a href="#${s.id}" data-nav="${s.id}"><span>${s.file.slice(0, 2)}</span>${esc(s.title)}</a>`).join("");
  const body = sections.map((s) => `<section class="doc" id="${s.id}" data-doc="${s.id}">${s.id === "d00" ? `<div class="hero"><div class="hero-av dimmable">${roundAvatar}</div><div><p class="eyebrow">Build documentation · v1.1 draft · Sweet garden</p><p class="hero-line">Everything the team needs to build Stellara for Kids.</p></div></div>` : ""}${s.html}${s.id === "d00" ? `<h2 id="d00-auntie-stella">Auntie Stella</h2><p>Placeholder avatar v2 in the sweet palette (braided bun, round glasses, honey star earring). Files in <code>docs/assets/auntie-stella/</code>; the logo is in <code>docs/assets/logo/</code>.</p>${gallery}` : ""}</section>`).join("");
  const index = JSON.stringify(sections.map((s) => ({ id: s.id, title: s.title, text: s.plain })));
  const page = `<title>Stellara Build Docs</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${THEME_HEAD}
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Nunito:wght@700;800&display=swap">
<style>
/* Layout: sticky sidebar of 16 docs beside one long reading column; everything rendered at rest so diagrams draw. */
${CSS}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:10;background:var(--bg)}
.shell{display:grid;grid-template-columns:270px minmax(0,1fr);gap:40px;max-width:1240px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
aside{position:sticky;top:env(safe-area-inset-top,0px);height:100vh;overflow-y:auto;padding-block:24px;display:grid;align-content:start;gap:14px}
.top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.search{width:100%;font:inherit;padding:10px 14px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--fg)}
nav{display:grid;gap:1px}
nav a{display:grid;grid-template-columns:26px 1fr;gap:6px;padding:6px 12px;border-radius:999px;text-decoration:none;color:var(--muted);font-size:14px}
nav a span{font-variant-numeric:tabular-nums;font-size:12px;padding-top:2px}
nav a.on{background:var(--accent-soft);color:var(--accent-ink)}
@media (hover:hover) and (pointer:fine){nav a:hover{color:var(--fg)}}
nav a.hide{display:none}
.results{display:grid;gap:6px;font-size:13px}
.results a{display:block;padding:8px 12px;border:1px solid var(--line);border-radius:12px;text-decoration:none;color:var(--fg);background:var(--surface)}
.results small{display:block;color:var(--muted)}
main{padding-block:28px 96px;min-width:0}
.doc{padding-bottom:40px;margin-bottom:48px;border-bottom:2px solid var(--line)}
.hero{display:flex;gap:18px;align-items:center;margin-bottom:28px;padding:20px;border-radius:24px;background:var(--accent-soft);color:var(--fg)}
.hero-av{width:84px;flex:none}.hero-av svg{width:100%;height:auto;display:block}
.eyebrow{font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 4px;color:var(--accent-ink);font-weight:600}
.hero-line{font-family:var(--font-display);font-weight:800;font-size:24px;line-height:1.2;margin:0}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;max-width:720px}
.gallery figure{margin:0;display:grid;gap:6px;font-size:13px;color:var(--muted);text-align:center}
.gallery svg{width:100%;height:auto;display:block}
.topbtn{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));background:var(--accent);color:var(--bg);border:0;border-radius:999px;padding:10px 16px;font:600 13px var(--font-body);cursor:pointer;transition:transform 120ms cubic-bezier(.23,1,.32,1)}
.topbtn:active{transform:scale(.97)}
@media (max-width:860px){.shell{grid-template-columns:1fr;gap:0}aside{position:static;height:auto;padding-bottom:0}nav{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}}
</style>
<div class="shell">
<aside>
  <div class="top">${BRAND}${THEME_UI}</div>
  <input class="search" id="q" type="search" placeholder="Search the docs" aria-label="Search the docs">
  <div class="results" id="results" hidden></div>
  <nav aria-label="Documents">${nav}</nav>
</aside>
<main>${body}</main>
</div>
<button class="topbtn" type="button" id="top">Top</button>
<script>
(function(){
  const IDX=${index.replace(/</g, "\\u003c")};
  const q=document.getElementById("q"),res=document.getElementById("results"),links=[...document.querySelectorAll("nav a")];
  q.addEventListener("input",()=>{
    const t=q.value.trim().toLowerCase();
    if(t.length<2){res.hidden=true;links.forEach(a=>a.classList.remove("hide"));return;}
    const hits=IDX.filter(d=>d.text.toLowerCase().includes(t)||d.title.toLowerCase().includes(t));
    links.forEach(a=>a.classList.toggle("hide",!hits.some(h=>h.id===a.dataset.nav)));
    res.hidden=false;
    res.innerHTML=hits.length?hits.slice(0,8).map(h=>{const i=h.text.toLowerCase().indexOf(t);const s=i<0?"":h.text.slice(Math.max(0,i-50),i+70);return '<a href="#'+h.id+'"><b>'+h.title+'</b><small>…'+s.replace(/[<>&]/g,"")+'…</small></a>';}).join(""):'<span>No matches</span>';
  });
  const secs=[...document.querySelectorAll(".doc")];
  if("IntersectionObserver" in window){
    const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.toggle("on",a.dataset.nav===e.target.id));}});},{rootMargin:"-30% 0px -60% 0px"});
    secs.forEach(s=>io.observe(s));
  }
  function go(){const h=decodeURIComponent(location.hash.slice(1));if(!h)return;const el=document.getElementById(h);if(el)el.scrollIntoView();}
  window.addEventListener("hashchange",go);setTimeout(go,50);
  document.getElementById("top").addEventListener("click",()=>window.scrollTo({top:0}));
})();
${THEME_JS}
</script>
`;
  writeFileSync(join(ROOT, "stellara-docs.html"), page);
}

/* ---------- static per-doc pages ---------- */
function buildStatic() {
  for (const d of docs) {
    const html = makeMarked("static").parse(d.src);
    const nav = docs.map((o) => `<a href="${o.slug}.html"${o.slug === d.slug ? ' aria-current="page"' : ""}>${o.file.slice(0, 2)} ${esc(o.title)}</a>`).join("");
    const extra = d.id === "d00"
      ? `<h2 id="auntie-stella">Auntie Stella</h2><div class="gallery dimmable">${avatars.map((a) => `<figure><img src="../assets/auntie-stella/auntie-stella-${a.e}.svg" alt="Auntie Stella ${a.e}"><figcaption>${a.e}</figcaption></figure>`).join("")}</div>`
      : "";
    const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.title)} · Stellara docs</title>
${THEME_HEAD}
<style>${CSS}
.shell{display:grid;grid-template-columns:250px minmax(0,1fr);gap:36px;max-width:1200px;margin:0 auto;padding:0 16px}
aside{position:sticky;top:0;height:100vh;overflow-y:auto;padding:24px 0;display:grid;align-content:start;gap:2px}
aside .top{display:grid;gap:10px;margin-bottom:12px}
aside a{padding:6px 12px;border-radius:999px;text-decoration:none;color:var(--muted);font-size:14px}
aside a[aria-current]{background:var(--accent-soft);color:var(--accent-ink)}
main{padding:28px 0 80px;min-width:0}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;max-width:720px}
.gallery figure{margin:0;text-align:center;font-size:13px;color:var(--muted)}.gallery img{width:100%}
:root[data-theme="dark"] .gallery img{filter:brightness(.9)}
@media (max-width:820px){.shell{grid-template-columns:1fr}aside{position:static;height:auto}}
</style></head>
<body><div class="shell"><aside><div class="top">${BRAND}${THEME_UI}</div>${nav}</aside><main>${html}${extra}</main></div>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"></script>
<script>${THEME_JS}if(window.mermaid){mermaid.initialize({startOnLoad:true,theme:"base",themeVariables:{primaryColor:"#FCE1EA",primaryBorderColor:"#C23A68",primaryTextColor:"#3A2430",lineColor:"#A12E57",secondaryColor:"#E1F2DB",tertiaryColor:"#FFF2CC",fontFamily:"Inter, sans-serif"}});}</script>
</body></html>
`;
    writeFileSync(join(HTML, `${d.slug}.html`), page);
  }
  writeFileSync(join(HTML, "index.html"), `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=00-index.html"><a href="00-index.html">Open the docs</a>\n`);
  const expected = new Set(["index.html", ...docs.map((d) => `${d.slug}.html`)]);
  for (const entry of readdirSync(HTML, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".html") && !expected.has(entry.name)) {
      unlinkSync(join(HTML, entry.name));
    }
  }
}

buildSite();
buildStatic();
console.log(`Built ${docs.length} docs → stellara-docs.html and html/*.html`);
