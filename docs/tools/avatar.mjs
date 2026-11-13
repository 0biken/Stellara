// Generates the Auntie Stella avatar SVGs into docs/assets/auntie-stella/.
// Run: node docs/tools/avatar.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = process.env.STELLARA_AVATAR_OUT || join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "auntie-stella");
mkdirSync(OUT, { recursive: true });

// "Sweet garden" palette (see tokens.mjs). Soft cocoa outlines give a calm sticker feel.
const C = {
  sky: "#E1F2DB", blush: "#F4A9C2", clay: "#C23A68", butter: "#F6C445", butterEdge: "#D9A22C",
  ink: "#3A2430", collar: "#FCE1EA", leaf: "#86BF7E", skin: "#8D5A3B", skinShade: "#76492F", hair: "#2A1E1B", braid: "#4A362F",
  lip: "#7A3B33", cheek: "#C8705A", nose: "#5E3824",
};

function star(cx, cy, R, r = R * 0.56, t1 = 0.28, t2 = 0.18) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = ((-90 + i * 36) * Math.PI) / 180, rad = i % 2 ? r : R;
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  let d = "";
  for (let i = 0; i < 10; i++) {
    const p = pts[(i + 9) % 10], c = pts[i], n = pts[(i + 1) % 10], t = i % 2 ? t2 : t1;
    const a = [c[0] + (p[0] - c[0]) * t, c[1] + (p[1] - c[1]) * t];
    const b = [c[0] + (n[0] - c[0]) * t, c[1] + (n[1] - c[1]) * t];
    d += `${i ? "L" : "M"}${a[0].toFixed(2)} ${a[1].toFixed(2)}Q${c[0].toFixed(2)} ${c[1].toFixed(2)} ${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
  }
  return d + "Z";
}

const O = `stroke="${C.ink}" stroke-width="2.2" stroke-linejoin="round"`;
const eyesOpen = (dx = 0, dy = 0) =>
  `<ellipse cx="${103 + dx}" cy="${113 + dy}" rx="3.3" ry="4.2" fill="#1E1512"/><ellipse cx="${137 + dx}" cy="${113 + dy}" rx="3.3" ry="4.2" fill="#1E1512"/>` +
  `<circle cx="${104.2 + dx}" cy="${111.6 + dy}" r="1.1" fill="#fff"/><circle cx="${138.2 + dx}" cy="${111.6 + dy}" r="1.1" fill="#fff"/>`;
const eyesHappy = `<path d="M97 115 Q103 108.5 109 115" stroke="#1E1512" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M131 115 Q137 108.5 143 115" stroke="#1E1512" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
const browsSoft = `<path d="M94 97 Q103 92.5 112 96.5" stroke="${C.hair}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M128 96.5 Q137 92.5 146 97" stroke="${C.hair}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
const browsThink = `<path d="M94 98 Q103 95 112 97.5" stroke="${C.hair}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M128 94.5 Q137 88.5 146 94" stroke="${C.hair}" stroke-width="3" fill="none" stroke-linecap="round"/>`;

const EXPR = {
  smiling: { tilt: 0, lift: 0, label: "Auntie Stella smiling",
    eyes: eyesOpen(), brows: browsSoft,
    mouth: `<path d="M107.5 135 Q120 149 132.5 135 Q120 140 107.5 135Z" fill="${C.lip}"/><path d="M110.5 136.4 Q120 139.6 129.5 136.4 L128.6 138.4 Q120 141 111.4 138.4Z" fill="#fff"/>` },
  listening: { tilt: 4, lift: 0, label: "Auntie Stella listening",
    eyes: eyesOpen(), brows: browsSoft,
    mouth: `<path d="M110 137 Q120 143.5 130 137" stroke="${C.lip}" stroke-width="3.2" fill="none" stroke-linecap="round"/>` },
  thinking: { tilt: -4, lift: 0, label: "Auntie Stella thinking",
    eyes: eyesOpen(2.4, -2.2), brows: browsThink,
    mouth: `<path d="M111 139.5 Q119 136.5 129 139" stroke="${C.lip}" stroke-width="3.2" fill="none" stroke-linecap="round"/>` },
  proud: { tilt: -2, lift: -2, label: "Auntie Stella looking proud",
    eyes: eyesHappy, brows: browsSoft,
    mouth: `<path d="M106 135.5 Q120 149 134 135.5" stroke="${C.lip}" stroke-width="3.4" fill="none" stroke-linecap="round"/>` },
};

function figure(e, animated = false) {
  const braids = [
    "M86 100 Q90 76 112 62", "M92 92 Q100 72 116 61", "M100 84 Q108 70 119 60",
    "M154 100 Q150 76 128 62", "M148 92 Q140 72 124 61", "M140 84 Q132 70 121 60",
  ].map((d) => `<path d="${d}" stroke="${C.braid}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`).join("");
  const bunWrap = [
    "M99 45 Q120 35 141 45", "M97 53 Q120 43 143 53", "M100 61 Q120 52 140 61",
  ].map((d) => `<path d="${d}" stroke="${C.braid}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`).join("");
  return `${animated ? `
  <g class="as-figure">
  <g class="as-reduced-pulse">` : ""}
  <path d="M38 242 C42 198 76 179 120 179 C164 179 198 198 202 242Z" fill="${C.blush}" ${O}/>
  <path d="M60 240 C64 214 80 202 96 198" stroke="${C.collar}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <rect x="104" y="146" width="32" height="44" rx="13" fill="${C.skin}" ${O}/>
  <path d="M102 181 Q120 207 138 181 Q120 190 102 181Z" fill="${C.skin}" ${O}/>
  <path d="M104 156 Q120 168 136 156 L136 162 Q120 172 104 162Z" fill="${C.skinShade}" opacity=".7"/>
  <path d="M100 182 Q120 210 140 182" stroke="${C.collar}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  ${animated ? `<g class="as-head-motion">` : ""}<g transform="translate(0 ${e.lift}) rotate(${e.tilt} 120 150)">
    <circle cx="120" cy="49" r="25" fill="${C.hair}" ${O}/>${bunWrap}
    <ellipse cx="80" cy="117" rx="7" ry="10" fill="${C.skinShade}" ${O}/>
    <ellipse cx="160" cy="117" rx="7" ry="10" fill="${C.skinShade}" ${O}/>
    <circle cx="80.5" cy="127" r="2.2" fill="${C.butter}"/>
    <ellipse cx="120" cy="112" rx="40" ry="48" fill="${C.skin}" ${O}/>
    <path d="M79 112 C76 72 96 59 120 59 C144 59 164 72 161 112 C156 93 147 82 120 81 C93 82 84 93 79 112Z" fill="${C.hair}"/>
    ${braids}
    <ellipse cx="93" cy="128" rx="8.5" ry="5" fill="${C.cheek}" opacity=".42"/>
    <ellipse cx="147" cy="128" rx="8.5" ry="5" fill="${C.cheek}" opacity=".42"/>
    ${e.brows}${animated ? `<g class="as-eyes">${e.eyes}</g>` : e.eyes}
    <path d="M118.5 119 Q120 128 124.5 127.5" stroke="${C.nose}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    ${e.mouth}
    <circle cx="103" cy="112" r="13.5" fill="#fff" fill-opacity=".14" stroke="${C.ink}" stroke-width="2.6"/>
    <circle cx="137" cy="112" r="13.5" fill="#fff" fill-opacity=".14" stroke="${C.ink}" stroke-width="2.6"/>
    <path d="M116.5 111 Q120 107.5 123.5 111" stroke="${C.ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M89.5 109 L81 107" stroke="${C.ink}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M150.5 109 L159 107" stroke="${C.ink}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M161 126 L161.5 132" stroke="${C.butterEdge}" stroke-width="1.6" stroke-linecap="round"/>
    ${animated ? `<g class="as-star">` : ""}<path d="${star(161.5, 139, 7.2)}" fill="${C.butter}" stroke="${C.butterEdge}" stroke-width="1.2"/>${animated ? `</g>` : ""}
  </g>${animated ? `</g>
  </g>
  </g>` : ""}`;
}

function motionCss(expr) {
  const rules = {
    smiling: `
.as-motion-smiling .as-figure{animation:as-breathe 6s var(--ease-in-out) infinite}
.as-motion-smiling .as-eyes{animation:as-blink 6s var(--ease-in-out) infinite}
@keyframes as-breathe{0%,18%,100%{transform:none}9%{transform:translateY(-1px) scale(1.006)}}
@keyframes as-blink{0%,48%,52%,100%{transform:none}50%{transform:scaleY(.12)}}`,
    listening: `
.as-motion-listening .as-head-motion{animation:as-listen 6s var(--ease-in-out) infinite}
@keyframes as-listen{0%,12%,100%{transform:none}6%{transform:translateY(1px) rotate(1.5deg)}}`,
    thinking: `
.as-motion-thinking .as-head-motion{animation:as-think 6s var(--ease-in-out) infinite}
.as-motion-thinking .as-eyes{animation:as-look 6s var(--ease-in-out) infinite}
@keyframes as-think{0%,16%,100%{transform:none}8%{transform:translate(1px,-1px) rotate(1deg)}}
@keyframes as-look{0%,16%,100%{transform:none}8%{transform:translateX(2px)}}`,
    proud: `
.as-motion-proud .as-head-motion{animation:as-proud-lift 6s var(--ease-out) infinite}
.as-motion-proud .as-star{animation:as-star-twinkle 6s var(--ease-in-out) infinite}
@keyframes as-proud-lift{0%,18%,100%{transform:none}9%{transform:translateY(-3px)}}
@keyframes as-star-twinkle{0%,7%,13%,100%{opacity:1;transform:none}9%{opacity:.82;transform:scale(.94)}11%{opacity:1;transform:scale(1.18)}}`,
  };
  return `<style>
:root{--ease-out:cubic-bezier(0.23,1,0.32,1);--ease-in-out:cubic-bezier(0.77,0,0.175,1)}
.as-figure,.as-head-motion,.as-eyes,.as-star{transform-box:fill-box;transform-origin:center}
${rules[expr]}
@keyframes as-soft-pulse{0%,100%{opacity:1}50%{opacity:.92}}
@media (prefers-reduced-motion: reduce){
  .as-figure,.as-head-motion,.as-eyes,.as-star{animation:none;transform:none}
  .as-reduced-pulse{animation:as-soft-pulse 6s var(--ease-in-out) infinite}
}
</style>`;
}

function svg(expr, shape, animated = false) {
  const e = EXPR[expr];
  const id = `as-${expr}-${shape}`;
  const bg = shape === "round"
    ? `<clipPath id="${id}"><circle cx="120" cy="120" r="120"/></clipPath><circle cx="120" cy="120" r="120" fill="${C.sky}"/>`
    : `<clipPath id="${id}"><rect width="240" height="240" rx="28"/></clipPath><rect width="240" height="240" rx="28" fill="${C.sky}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="${e.label}">
  <title>${e.label}</title>
  ${animated ? `${motionCss(expr)}
  ` : ""}${bg}
  <g opacity=".9"><circle cx="40" cy="52" r="4" fill="${C.butter}"/><circle cx="202" cy="70" r="3" fill="${C.blush}"/><circle cx="196" cy="40" r="2.2" fill="${C.leaf}"/><circle cx="30" cy="96" r="2.4" fill="${C.blush}"/></g>
  <g${animated ? ` class="as-motion as-motion-${expr}"` : ""} clip-path="url(#${id})">${figure(e, animated)}</g>
</svg>
`;
}

function preview() {
  const cards = [
    ["Smiling", "auntie-stella-smiling.svg", "auntie-stella-smiling-animated.svg"],
    ["Listening", "auntie-stella-listening.svg", "auntie-stella-listening-animated.svg"],
    ["Thinking", "auntie-stella-thinking.svg", "auntie-stella-thinking-animated.svg"],
    ["Proud", "auntie-stella-proud.svg", "auntie-stella-proud-animated.svg"],
    ["Round", "auntie-stella-avatar-round.svg", "auntie-stella-avatar-round-animated.svg"],
  ].map(([label, staticName, animatedName]) => `<article>
      <h2>${label}</h2>
      <div class="pair">
        <figure><img src="${staticName}" alt="Auntie Stella ${label.toLowerCase()}, static"><figcaption>Static</figcaption></figure>
        <figure><img src="${animatedName}" alt="Auntie Stella ${label.toLowerCase()}, animated"><figcaption>Animated</figcaption></figure>
      </div>
    </article>`).join("\n");
  return `<!doctype html>
<html lang="en-NG">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Auntie Stella avatar motion</title>
<style>
:root{color-scheme:light;--bg:#FFF8F1;--surface:#FFFFFF;--ink:#3A2430;--muted:#76606A;--line:#F0DCD3;--accent:#C23A68;--tint:#FCE1EA;--honey:#F6C445}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:var(--bg);color:var(--ink);font-family:Inter,"Segoe UI",system-ui,sans-serif}
body{min-height:100vh;display:grid;place-items:center;padding:24px}
main{width:min(1232px,100%)}
header{display:flex;align-items:end;justify-content:space-between;gap:24px;margin:0 0 18px}
h1,h2,p{margin:0}
h1{font-family:Nunito,Inter,system-ui,sans-serif;font-size:34px;line-height:1.05;letter-spacing:-.03em}
header p{max-width:50ch;color:var(--muted);font-size:14px;line-height:1.45;text-align:right}
.gallery{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
article{min-width:0;padding:14px;border:1px solid var(--line);border-radius:22px;background:var(--surface)}
h2{margin:0 0 10px;color:var(--accent);font-size:15px;letter-spacing:.02em;text-align:center}
.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
figure{min-width:0;margin:0;padding:8px 6px 7px;border-radius:16px;background:var(--tint);text-align:center}
img{display:block;width:100%;height:auto;aspect-ratio:1;object-fit:contain}
figcaption{margin-top:6px;color:var(--muted);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.key{display:inline-flex;align-items:center;gap:8px;color:var(--accent);font-size:12px;font-weight:700}
.key::before{content:"";width:9px;height:9px;border-radius:50%;background:var(--honey);box-shadow:0 0 0 4px var(--tint)}
@media (max-width:900px){body{display:block}.gallery{grid-template-columns:repeat(2,minmax(0,1fr))}header{align-items:start;flex-direction:column}header p{text-align:left}}
</style>
</head>
<body>
<main>
  <header><div><div class="key">Six-second motion cycle</div><h1>Auntie Stella, brought gently to life</h1></div><p>Static originals stay available for email and quiet contexts. Your reduced-motion setting removes positional movement.</p></header>
  <section class="gallery" aria-label="Static and animated avatar comparisons">
    ${cards}
  </section>
</main>
</body>
</html>
`;
}

const files = [];
for (const expr of Object.keys(EXPR)) {
  const name = `auntie-stella-${expr}.svg`;
  writeFileSync(join(OUT, name), svg(expr, "square"));
  files.push(name);
  const animatedName = `auntie-stella-${expr}-animated.svg`;
  writeFileSync(join(OUT, animatedName), svg(expr, "square", true));
  files.push(animatedName);
}
writeFileSync(join(OUT, "auntie-stella-avatar-round.svg"), svg("smiling", "round"));
files.push("auntie-stella-avatar-round.svg");
writeFileSync(join(OUT, "auntie-stella-avatar-round-animated.svg"), svg("smiling", "round", true));
files.push("auntie-stella-avatar-round-animated.svg");
writeFileSync(join(OUT, "preview.html"), preview());
console.log("Wrote", files.join(", "));
console.log("Wrote preview.html");

// The star-sprout logo mark (same colours in light and dark; only the wordmark colour changes by theme).
const LOGO_DIR = join(OUT, "..", "logo");
mkdirSync(LOGO_DIR, { recursive: true });
const o = `stroke="${C.ink}" stroke-width="2.4" stroke-linejoin="round"`;
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Stellara">
  <title>Stellara</title>
  <path d="M50 27.5 Q49 22 50 17" stroke="#2D6537" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M50 18.5 C44 9 35 8.5 30.5 12.5 C34.5 19.5 43.5 21.5 50 18.5Z" fill="${C.leaf}" ${o}/>
  <path d="M50 16.5 C55 6 65.5 3.5 70.5 7.5 C67.5 15.5 57.5 19.5 50 16.5Z" fill="${C.leaf}" ${o}/>
  <circle cx="50" cy="17" r="3.6" fill="${C.clay}" ${o}/>
  <path d="${star(50, 59, 32, 32 * 0.6, 0.36, 0.22)}" fill="${C.butter}" stroke="${C.ink}" stroke-width="2.6" stroke-linejoin="round"/>
  <ellipse cx="35.5" cy="64" rx="4.2" ry="2.6" fill="${C.blush}" opacity=".8"/><ellipse cx="64.5" cy="64" rx="4.2" ry="2.6" fill="${C.blush}" opacity=".8"/>
  <ellipse cx="41.5" cy="58" rx="2.5" ry="3.1" fill="${C.ink}"/><ellipse cx="58.5" cy="58" rx="2.5" ry="3.1" fill="${C.ink}"/>
  <path d="M44.5 65 Q50 70 55.5 65" stroke="${C.ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
</svg>
`;
writeFileSync(join(LOGO_DIR, "stellara-mark.svg"), mark);
const icon = mark.replace('viewBox="0 0 100 100"', 'viewBox="-17 -17 134 134"').replace("<title>Stellara</title>", `<title>Stellara</title>
  <rect x="-17" y="-17" width="134" height="134" rx="30" fill="#FCE1EA"/>`);
writeFileSync(join(LOGO_DIR, "stellara-app-icon.svg"), icon);
console.log("Wrote logo/stellara-mark.svg, logo/stellara-app-icon.svg");
