// Stellara "Sweet garden" tokens: single source for light and dark themes.
// Run `node tokens.mjs` to print the contrast table; exits 1 if any text pair fails.
export const THEMES = {
  light: {
    bg: "#FFF8F1", surface: "#FFFFFF", sunk: "#FCEFE6", line: "#F0DCD3",
    text: "#3A2430", muted: "#76606A",
    primary: "#C23A68", "on-primary": "#FFFFFF", "primary-tint": "#FCE1EA", "primary-ink": "#A12E57",
    reward: "#F6C445", "reward-edge": "#D9A22C", "reward-tint": "#FFF2CC", "reward-ink": "#845400",
    success: "#86BF7E", "success-tint": "#E1F2DB", "success-ink": "#2D6537",
    hint: "#FCE1EA", focus: "#C23A68", error: "#B42318",
  },
  dark: {
    bg: "#1E1518", surface: "#291E22", sunk: "#33262B", line: "#47363C",
    text: "#F7ECE7", muted: "#C9B6BB",
    primary: "#F39BB9", "on-primary": "#3A1123", "primary-tint": "#47222F", "primary-ink": "#F7B3CA",
    reward: "#F2C55C", "reward-edge": "#C99A33", "reward-tint": "#3B2F1C", "reward-ink": "#F5D27E",
    success: "#93C98A", "success-tint": "#20352A", "success-ink": "#A8D99F",
    hint: "#47222F", focus: "#F39BB9", error: "#FF8A80",
  },
};
// [foreground, background, minimum ratio, label]
export const PAIRS = [
  ["text", "bg", 4.5, "Body text on background"],
  ["text", "surface", 4.5, "Body text on cards"],
  ["muted", "bg", 4.5, "Secondary text on background"],
  ["muted", "surface", 4.5, "Secondary text on cards"],
  ["on-primary", "primary", 4.5, "Button label on primary"],
  ["primary", "bg", 4.5, "Links on background"],
  ["primary-ink", "primary-tint", 4.5, "Hint text on strawberry milk"],
  ["reward-ink", "bg", 4.5, "Stardust numbers on background"],
  ["reward-ink", "reward-tint", 4.5, "Stardust chip"],
  ["success-ink", "success-tint", 4.5, "Correct answer text"],
  ["success-ink", "bg", 4.5, "Success text on background"],
  ["text", "hint", 4.5, "Body text on hint card"],
  ["error", "surface", 4.5, "Form error on cards"],
  ["focus", "bg", 3, "Focus ring (non-text)"],
  ["reward-edge", "bg", 1.5, "Star outline (decorative)"],
];
const lum = h => { const c = [1,3,5].map(i => parseInt(h.slice(i,i+2),16)/255).map(v => v<=.03928? v/12.92 : ((v+.055)/1.055)**2.4); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
export const ratio = (a,b) => { const [x,y] = [lum(a),lum(b)].sort((p,q)=>q-p); return (x+.05)/(y+.05); };
if (process.argv[1]?.endsWith("tokens.mjs")) {
  let fail = 0;
  for (const [name, t] of Object.entries(THEMES)) {
    console.log(`\n${name}`);
    for (const [f,b,min,label] of PAIRS) { const r = ratio(t[f],t[b]); const ok = r>=min; if(!ok) fail++; console.log(`${ok?"ok  ":"FAIL"} ${r.toFixed(2).padStart(5)} ≥${min}  ${f} on ${b}  (${label})`); }
  }
  process.exit(fail?1:0);
}
