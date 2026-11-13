// Builds Stellara's email templates (Daytime + Starlight) from one layout.
//   docs/emails/templates/<id>.html  provider-ready, with {{variables}}
//   docs/emails/templates/<id>.txt   plain-text version
//   docs/emails/preview/<id>.html    filled with sample data (add #starlight to force the dark theme)
//   docs/emails/index.html           gallery of every preview in both themes
// Copy rules: docs/md/16-ux-writing.md §9. Variables ending in _phrase or _label are pluralised
// by the sender with ICU MessageFormat before filling (e.g. "1 new star" / "2 new stars"). Run: node docs/tools/emails.mjs
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "emails");
for (const d of ["templates", "preview"]) mkdirSync(join(OUT, d), { recursive: true });

const icon = readFileSync(join(ROOT, "assets", "logo", "stellara-app-icon.svg"), "utf8");
const avatar = readFileSync(join(ROOT, "assets", "auntie-stella", "auntie-stella-avatar-round.svg"), "utf8");
const dataUri = (svg) => "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");

/* Daytime and Starlight values (see tokens.mjs). Email clients need hex inline, so Daytime is inline
   and Starlight is a stylesheet that overrides via classes. */
const D = { bg: "#FFF8F1", card: "#FFFFFF", sunk: "#FCEFE6", line: "#F0DCD3", text: "#3A2430", muted: "#76606A", primary: "#C23A68", onPrimary: "#FFFFFF", tint: "#FCE1EA", ink: "#A12E57", honeyInk: "#845400", honeyTint: "#FFF2CC", matchaTint: "#E1F2DB", matchaInk: "#2D6537" };
const N = { bg: "#1E1518", card: "#291E22", sunk: "#33262B", line: "#47363C", text: "#F7ECE7", muted: "#C9B6BB", primary: "#F39BB9", onPrimary: "#3A1123", tint: "#47222F", ink: "#F7B3CA", honeyInk: "#F5D27E", honeyTint: "#3B2F1C", matchaTint: "#20352A", matchaInk: "#A8D99F" };
const DISPLAY = `Nunito,'Trebuchet MS',Arial,sans-serif`, BODY = `Inter,'Segoe UI',Roboto,Arial,sans-serif`;

const starlightRules = (sel) => `
${sel} .e-bg{background:${N.bg}!important}
${sel} .e-card{background:${N.card}!important;border-color:${N.line}!important}
${sel} .e-text{color:${N.text}!important}
${sel} .e-muted{color:${N.muted}!important}
${sel} .e-ink{color:${N.ink}!important}
${sel} .e-btn{background:${N.primary}!important;color:${N.onPrimary}!important}
${sel} .e-btn a{color:${N.onPrimary}!important}
${sel} .e-note{background:${N.tint}!important}
${sel} .e-stat{background:${N.sunk}!important}
${sel} .e-honey{color:${N.honeyInk}!important}
${sel} .e-matcha{background:${N.matchaTint}!important;color:${N.matchaInk}!important}
${sel} .e-line{border-color:${N.line}!important}
${sel} a.e-link{color:${N.ink}!important}`;

/* ---------- blocks ---------- */
const h = (t) => `<h1 class="e-text" style="margin:0 0 12px;font:800 26px/1.2 ${DISPLAY};color:${D.text};letter-spacing:-.01em">${t}</h1>`;
const p = (t, muted) => `<p class="${muted ? "e-muted" : "e-text"}" style="margin:0 0 16px;font:400 16px/1.6 ${BODY};color:${muted ? D.muted : D.text}">${t}</p>`;
const small = (t) => `<p class="e-muted" style="margin:0 0 10px;font:400 13px/1.55 ${BODY};color:${D.muted}">${t}</p>`;
const btn = (label, url) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td class="e-btn" style="background:${D.primary};border-radius:999px"><a href="${url}" style="display:inline-block;padding:14px 26px;font:700 16px ${BODY};color:${D.onPrimary};text-decoration:none;border-radius:999px">${label}</a></td></tr></table>`;
const stats = (items) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px"><tr>${items.map(([n, l], i) => `<td class="e-stat" width="${Math.floor(100 / items.length)}%" style="background:${D.sunk};border-radius:14px;padding:14px 12px;${i ? "border-left:6px solid transparent;" : ""}vertical-align:top"><div class="e-text" style="font:800 24px/1.1 ${DISPLAY};color:${D.text}">${n}</div><div class="e-muted" style="font:400 13px/1.4 ${BODY};color:${D.muted};margin-top:4px">${l}</div></td>`).join(`<td width="8" style="width:8px"></td>`)}</tr></table>`;
const section = (title) => `<h2 class="e-text e-line" style="margin:24px 0 10px;padding-top:18px;border-top:1px solid ${D.line};font:800 18px/1.3 ${DISPLAY};color:${D.text}">${title}</h2>`;
const pill = (t) => `<span class="e-matcha" style="display:inline-block;background:${D.matchaTint};color:${D.matchaInk};font:600 12px ${BODY};padding:3px 10px;border-radius:999px">${t}</span>`;
const note = (t, av) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr><td class="e-note" style="background:${D.tint};border-radius:16px;padding:16px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:top;padding-right:12px"><img src="${av}" width="40" height="40" alt="Auntie Stella" style="display:block;border-radius:50%"></td><td class="e-text" style="font:400 15px/1.55 ${BODY};color:${D.text}"><strong>A note from Auntie Stella</strong><br>${t}</td></tr></table></td></tr></table>`;
const list = (items) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px">${items.map((t) => `<tr><td class="e-text" style="vertical-align:top;padding:0 10px 8px 0;font:700 16px/1.5 ${BODY};color:${D.matchaInk}">•</td><td class="e-text" style="padding:0 0 8px;font:400 15px/1.55 ${BODY};color:${D.text}">${t}</td></tr>`).join("")}</table>`;
const row = (a, b) => `<tr><td class="e-text e-line" style="padding:8px 0;border-bottom:1px solid ${D.line};font:400 15px ${BODY};color:${D.text}">${a}</td><td class="e-muted e-line" style="padding:8px 0;border-bottom:1px solid ${D.line};font:400 14px ${BODY};color:${D.muted};text-align:right">${b}</td></tr>`;
const rows = (r) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">${r.map(([a, b]) => row(a, b)).join("")}</table>`;
const link = (t, url) => `<a class="e-link" href="${url}" style="color:${D.ink}">${t}</a>`;

/* ---------- layout ---------- */
function layout({ subject, preheader, body, reason, exam }) {
  return `<!doctype html>
<html lang="en-NG" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>${subject}</title>
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark}
body{margin:0;padding:0;-webkit-text-size-adjust:100%}
img{border:0;outline:none}
@media (max-width:620px){.e-pad{padding:24px 20px!important}}
/* Starlight: clients that honour prefers-color-scheme */
@media (prefers-color-scheme: dark){${starlightRules("")}}
/* Outlook.com / Office dark mode */
${starlightRules("[data-ogsc]")}
/* Preview only: #starlight forces the dark theme */
${starlightRules(".starlight")}
</style>
</head>
<body class="e-bg" style="margin:0;background:${D.bg}">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="e-bg" style="background:${D.bg}">
<tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td style="padding:0 4px 18px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding-right:10px"><img src="{{logo_url}}" width="40" height="40" alt="Stellara" style="display:block;border-radius:10px"></td><td class="e-ink" style="font:800 22px ${DISPLAY};color:${D.ink};letter-spacing:-.02em">stellara</td></tr></table></td></tr>
    <tr><td class="e-card e-pad" style="background:${D.card};border:1px solid ${D.line};border-radius:24px;padding:32px 32px 16px">
${body}
    </td></tr>
    <tr><td style="padding:18px 8px 0">
      ${small(reason)}
      ${small(`${link("Change which emails you get", "{{settings_url}}")} · Questions? Just reply to this email; a person reads every reply.`)}
      ${exam ? small("Stellara is not affiliated with NECO or any exam body.") : ""}
      ${small("Stellara Learning Ltd · {{postal_address}}")}
    </td></tr>
  </table>
</td></tr>
</table>
<script>if(location.hash==="#starlight")document.documentElement.className="starlight";</script>
</body>
</html>
`;
}

/* ---------- templates (copy: 16-ux-writing.md §9.2) ---------- */
const T = [
  { id: "sign-in", subject: "Your Stellara sign-in link", preheader: "The link works once and expires in 15 minutes.",
    reason: "You're getting this because someone asked to sign in to Stellara with this email address.",
    body: () => h("Sign in to Stellara") + p("Hello {{parent_name}}. Use the button below to sign in. It works once and expires in 15 minutes.") + btn("Sign in to Stellara", "{{signin_url}}") + p("If you didn't ask for this, you can ignore this email. Nobody can sign in without the link.", true),
    text: "Hello {{parent_name}}.\n\nSign in to Stellara with this link. It works once and expires in 15 minutes:\n{{signin_url}}\n\nIf you didn't ask for this, you can ignore this email. Nobody can sign in without the link." },

  { id: "consent-confirmed", subject: "You've given consent for {{child_name}}", preheader: "Here's what you agreed to, and how to change it.",
    reason: "You're getting this because you gave consent for {{child_name}} to use Stellara. We send it so you have a record.",
    body: () => h("You've given consent for {{child_name}}") + p("Thank you, {{parent_name}}. {{child_name}} can now start learning with Stellara. Here is a record of what you agreed to on {{consent_date}}.") + section("What you agreed to") + list(["<strong>Core learning:</strong> {{child_name}}'s answers and progress are used to choose practice and show you how they're doing.", "<strong>Sharing with {{school_name}}:</strong> {{child_name}}'s teachers see progress for their class.", "<strong>Progress messages:</strong> {{progress_messages}}", "<strong>Product research:</strong> {{product_research}}"]) + section("Changing your mind") + p("You can change any of these, download a copy of {{child_name}}'s data, or withdraw consent at any time in Settings. If you withdraw, we stop using {{child_name}}'s data straight away and delete it within 30 days.") + btn("View consent settings", "{{consent_url}}"),
    text: "Thank you, {{parent_name}}. {{child_name}} can now start learning with Stellara.\n\nWhat you agreed to on {{consent_date}}:\n- Core learning: answers and progress are used to choose practice and show you how {{child_name}} is doing.\n- Sharing with {{school_name}}: teachers see progress for their class.\n- Progress messages: {{progress_messages}}\n- Product research: {{product_research}}\n\nYou can change any of these, download a copy of the data, or withdraw consent at any time in Settings. If you withdraw, we stop using the data straight away and delete it within 30 days.\n\nView consent settings: {{consent_url}}" },

  { id: "weekly-report", subject: "{{child_name}}'s week: {{days_phrase}}, {{stars_phrase}}", preheader: "{{celebrate_topic}} sprouted. Next: 10 minutes on {{next_topic}}.", exam: true,
    reason: "You're getting this weekly report because you're {{child_name}}'s parent or guardian on Stellara.",
    body: (av) => `<p class="e-ink" style="margin:0 0 6px;font:600 12px ${BODY};letter-spacing:.08em;text-transform:uppercase;color:${D.ink}">Weekly report · {{week_range}}</p>` + h("{{child_name}}'s week") + p("Hello {{parent_name}}. Here's how {{child_name}}'s week went.") + stats([["{{days}}", "{{days_label}}"], ["{{mastered_new}}", "{{mastered_label}}"], ["{{stardust}}", "Stardust earned"]]) + section("Something to celebrate") + p(`${pill("Mastered")}&nbsp; <strong>{{celebrate_topic}}</strong>`) + p("{{celebrate_evidence}}", true) + section("What to practise next") + rows([["{{next_topic}}", "10 minutes, twice this week"], ["{{review_topic}}", "Review due"]]) + section("Common Entrance coverage") + rows([["Mathematics", "{{cov_maths}}"], ["English", "{{cov_english}}"], ["Quantitative reasoning", "{{cov_quant}}"], ["Verbal reasoning", "{{cov_verbal}}"]]) + small("Share of the syllabus practised, not a predicted score.") + note("{{stella_note}}", av) + btn("Read {{child_name}}'s report", "{{report_url}}"),
    text: "Hello {{parent_name}}. Here's how {{child_name}}'s week went ({{week_range}}).\n\n{{days}} {{days_label}} · {{mastered_new}} {{mastered_label}} · {{stardust}} Stardust\n\nSomething to celebrate: {{celebrate_topic}} mastered. {{celebrate_evidence}}\n\nWhat to practise next: {{next_topic}} (10 minutes, twice this week); {{review_topic}} (review due).\n\nCommon Entrance coverage (share of the syllabus practised, not a predicted score):\nMathematics {{cov_maths}} · English {{cov_english}} · Quantitative {{cov_quant}} · Verbal {{cov_verbal}}\n\nA note from Auntie Stella: {{stella_note}}\n\nRead the full report: {{report_url}}\n\nStellara is not affiliated with NECO or any exam body." },

  { id: "star-sprouted", subject: "{{child_name}} has mastered {{topic}}", preheader: "{{evidence}}",
    reason: "You're getting this because you asked to hear when {{child_name}} masters a topic.",
    body: (av) => h("{{child_name}} has mastered {{topic}}") + p("{{child_name}}'s {{topic}} star has sprouted. {{evidence}}") + p("It's the {{ordinal}} topic {{child_name}} has mastered this term. A word of praise at dinner tonight goes a long way.", true) + note("{{stella_note}}", av) + btn("See {{child_name}}'s sky", "{{sky_url}}"),
    text: "{{child_name}} has mastered {{topic}}. {{evidence}}\n\nIt's the {{ordinal}} topic {{child_name}} has mastered this term.\n\nA note from Auntie Stella: {{stella_note}}\n\nSee {{child_name}}'s sky: {{sky_url}}" },

  { id: "teacher-invite", subject: "Join {{class_name}} on Stellara", preheader: "{{inviter}} from {{school_name}} invited you.",
    reason: "You're getting this because {{inviter}} at {{school_name}} invited this email address to Stellara.",
    body: () => h("You're invited to {{class_name}}") + p("Hello {{teacher_name}}. {{inviter}} has invited you to teach {{class_name}} at {{school_name}} on Stellara.") + p("Once you join, you can see which topics your pupils have mastered, assign short practice sets, and spot who needs a hand, in about 10 minutes a week.") + btn("Accept invite", "{{invite_url}}") + p("This invite expires on {{expires}}. If you weren't expecting it, ask {{inviter}} or ignore this email.", true),
    text: "Hello {{teacher_name}}. {{inviter}} has invited you to teach {{class_name}} at {{school_name}} on Stellara.\n\nAccept the invite: {{invite_url}}\n\nThis invite expires on {{expires}}." },

  { id: "school-term-summary", subject: "{{school_name}}'s term on Stellara", preheader: "{{pupils_active}} pupils practised; {{topics_mastered}} topics mastered.", exam: true,
    reason: "You're getting this because you're an administrator for {{school_name}} on Stellara.",
    body: () => h("{{school_name}}'s term") + p("Hello {{admin_name}}. Here's a summary of {{term_name}}.") + stats([["{{pupils_active}}", "pupils practised"], ["{{topics_mastered}}", "topics mastered"], ["{{active_days}}", "average active days"]]) + section("By class") + rows([["Primary 5 Gold", "92% practised · 31 topics each"], ["Primary 5 Blue", "88% practised · 27 topics each"], ["Primary 6 Gold", "95% practised · 40 topics each"]]) + section("Licences") + p("{{licences_used}} of {{licences_total}} licences in use. Renewal date: {{renewal_date}}.") + btn("Open the school summary", "{{summary_url}}"),
    text: "Hello {{admin_name}}. {{school_name}}'s {{term_name}} on Stellara:\n{{pupils_active}} pupils practised · {{topics_mastered}} topics mastered · {{active_days}} average active days\n\nLicences: {{licences_used}} of {{licences_total}} in use. Renewal date: {{renewal_date}}.\n\nOpen the school summary: {{summary_url}}" },

  { id: "data-export-ready", subject: "Your copy of {{child_name}}'s data is ready", preheader: "The download link works for 7 days.",
    reason: "You're getting this because you asked for a copy of {{child_name}}'s data on {{request_date}}.",
    body: () => h("Your copy of {{child_name}}'s data is ready") + p("Hello {{parent_name}}. As you asked on {{request_date}}, here is everything Stellara holds about {{child_name}}: a readable PDF and a JSON file for other services.") + btn("Download {{child_name}}'s data", "{{download_url}}") + p("The link works for 7 days and only after you sign in. If you didn't ask for this, reply to this email straight away.", true),
    text: "Hello {{parent_name}}. As you asked on {{request_date}}, here is everything Stellara holds about {{child_name}} (PDF and JSON):\n{{download_url}}\n\nThe link works for 7 days and only after you sign in. If you didn't ask for this, reply to this email straight away." },

  { id: "account-deleted", subject: "{{child_name}}'s Stellara account has been deleted", preheader: "We've removed {{child_name}}'s data. Here's what we keep and why.",
    reason: "You're getting this as a record that the deletion you asked for is finished.",
    body: () => h("{{child_name}}'s account has been deleted") + p("Hello {{parent_name}}. As you asked, we have deleted {{child_name}}'s profile, answers and progress. This can't be undone.") + section("What we keep, and why") + list(["A record that you gave and later withdrew consent, for 6 years, because the law asks us to be able to show it.", "Anonymous totals (for example, \"1,348 topics mastered this term\") that can't be linked back to {{child_name}}."]) + p("Thank you for learning with us. If {{child_name}} ever comes back, you'll start with a fresh sky.", true),
    text: "Hello {{parent_name}}. As you asked, we have deleted {{child_name}}'s profile, answers and progress. This can't be undone.\n\nWhat we keep: a record of consent for 6 years (required by law), and anonymous totals that can't be linked to {{child_name}}.\n\nThank you for learning with us." },

  { id: "security-notice", subject: "Important: a security issue with your account", preheader: "What happened, what it means for you, and what we're doing.",
    reason: "You're getting this because the law requires us to tell you about a security issue that affects your family's data.",
    body: () => h("A security issue affecting your account") + p("Hello {{parent_name}}. We are writing to tell you about a security issue that affected some of {{child_name}}'s data.") + section("What happened") + p("{{what_happened}}") + section("What data was involved") + p("{{data_involved}}") + section("What we have done") + p("{{actions_taken}}") + section("What you should do") + p("{{parent_actions}}") + section("Who to contact") + p("{{dpo_name}}, our Data Protection Officer: {{dpo_phone}} or reply to this email. You can also contact the Nigeria Data Protection Commission.") + btn("Read the full notice", "{{notice_url}}"),
    text: "Hello {{parent_name}}. We are writing to tell you about a security issue that affected some of {{child_name}}'s data.\n\nWhat happened: {{what_happened}}\nWhat data was involved: {{data_involved}}\nWhat we have done: {{actions_taken}}\nWhat you should do: {{parent_actions}}\nWho to contact: {{dpo_name}}, Data Protection Officer, {{dpo_phone}}, or reply to this email. You can also contact the Nigeria Data Protection Commission.\n\nFull notice: {{notice_url}}" },
];

const SAMPLE = {
  parent_name: "Mummy Tolu", days_phrase: "5 days", stars_phrase: "1 new star", days_label: "days practised", mastered_label: "new topic mastered", child_name: "Tolu", days: "5", mastered_new: "1", stardust: "320", celebrate_topic: "Fractions", next_topic: "Ratios", review_topic: "Place value",
  celebrate_evidence: "Tolu got 9 of the last 10 Fractions questions right, including a check two weeks later.", week_range: "Mon 6 – Sun 12 Jan",
  cov_maths: "64%", cov_english: "48%", cov_quant: "55%", cov_verbal: "31%",
  stella_note: "Tolu worked hard on Fractions and it shows. Ten minutes on Ratios on Tuesday and Thursday will help the next star grow.",
  topic: "Fractions", evidence: "9 of the last 10 right, including a check 2 weeks later.", ordinal: "7th",
  consent_date: "Thu 9 Jan", school_name: "Greenfield School", progress_messages: "Yes, a weekly report by email and a monthly summary on WhatsApp.", product_research: "No.",
  teacher_name: "Mrs Okafor", inviter: "Mrs Bello", class_name: "Primary 5 Gold", expires: "Sun 19 Jan",
  admin_name: "Mr Adewale", term_name: "First term 2026/27", pupils_active: "212", topics_mastered: "1,348", active_days: "41", licences_used: "212", licences_total: "250", renewal_date: "Mon 1 Sep",
  request_date: "Mon 13 Jan",
  what_happened: "On Tue 14 Jan a staff account was used by someone outside Stellara for 40 minutes before we stopped it.", data_involved: "Tolu's first name, class and topic progress. No phone numbers, passwords or payment details were involved.",
  actions_taken: "We closed the account, reset all staff sign-ins, and reported the issue to the Nigeria Data Protection Commission within 72 hours.", parent_actions: "You don't need to do anything. Be careful of messages that claim to be from Stellara and ask for a code: we never ask for one.",
  dpo_name: "Ada Nwosu", dpo_phone: "0700 000 0000",
  postal_address: "12 Example Street, Lagos", settings_url: "#", report_url: "#", sky_url: "#", signin_url: "#", consent_url: "#", invite_url: "#", summary_url: "#", download_url: "#", notice_url: "#",
};
const fill = (s, data) => s.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in data ? data[k] : m));

const footerText = (t) => `\n\n--\n${t.reason}\nChange which emails you get: {{settings_url}}\nStellara Learning Ltd · {{postal_address}}\n`;
for (const t of T) {
  const tpl = layout({ subject: t.subject, preheader: t.preheader, reason: t.reason, exam: t.exam, body: t.body("{{avatar_url}}") });
  writeFileSync(join(OUT, "templates", `${t.id}.html`), tpl);
  writeFileSync(join(OUT, "templates", `${t.id}.txt`), `Subject: ${t.subject}\n\n${t.text}${footerText(t)}`);
  const sample = { ...SAMPLE, logo_url: dataUri(icon), avatar_url: dataUri(avatar) };
  writeFileSync(join(OUT, "preview", `${t.id}.html`), fill(fill(tpl, sample), sample));
}

/* gallery */
const gallery = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stellara emails</title>
<style>body{margin:0;background:#FFF8F1;color:#3A2430;font:15px/1.6 Inter,system-ui,sans-serif}.wrap{max-width:1240px;margin:0 auto;padding:24px 16px}
h1{font:800 30px Nunito,system-ui,sans-serif;margin:0 0 6px}p{margin:0 0 18px;color:#76606A;max-width:70ch}
.item{margin:0 0 40px}.item h2{font:800 19px Nunito,system-ui,sans-serif;margin:0}.meta{font-size:13px;color:#76606A;margin:2px 0 12px}
.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:16px}.pair figure{margin:0}.pair figcaption{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#A12E57;margin-bottom:6px}
iframe{width:100%;height:720px;border:1px solid #F0DCD3;border-radius:16px;background:#fff}</style></head><body><div class="wrap">
<h1>Stellara emails</h1><p>Every template in Daytime and Starlight, with sample data. Provider-ready versions with <code>{{variables}}</code> and plain-text versions are in <code>docs/emails/templates/</code>. Copy rules: docs 16 §9.</p>
${T.map((t) => `<div class="item"><h2>${fill(t.subject, SAMPLE)}</h2><div class="meta">${t.id} · preheader: ${fill(t.preheader, SAMPLE)}</div><div class="pair"><figure><figcaption>Daytime</figcaption><iframe loading="lazy" src="preview/${t.id}.html" title="${t.id} in Daytime"></iframe></figure><figure><figcaption>Starlight</figcaption><iframe loading="lazy" src="preview/${t.id}.html#starlight" title="${t.id} in Starlight"></iframe></figure></div></div>`).join("")}
</div></body></html>`;
writeFileSync(join(OUT, "index.html"), gallery);

/* checks: subject ≤ 45 chars and preheader ≤ 90 chars with sample data */
let bad = 0;
for (const t of T) {
  const s = fill(t.subject, SAMPLE), ph = fill(t.preheader, SAMPLE);
  if (s.length > 45) { bad++; console.log(`Subject too long (${s.length}): ${s}`); }
  if (ph.length > 90) { bad++; console.log(`Preheader too long (${ph.length}): ${ph}`); }
}
console.log(`Built ${T.length} email templates (HTML + text) and previews${bad ? `, ${bad} length warnings` : ""}`);
export { T, SAMPLE };
