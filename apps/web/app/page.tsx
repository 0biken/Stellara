import { getCatalogue } from "@stellara/i18n";
import Link from "next/link";
import { ViewTransition, type CSSProperties } from "react";

import { LandingStar, type StarStage } from "./landing-stars";
import { Reveal } from "./reveal";
import { ThemeToggle } from "./theme-toggle";

/** A progress fill that slides in when its <Reveal> region scrolls into view. */
function Bar({
  fill,
  index = 0,
  height = "h-3",
}: {
  fill: number;
  index?: number;
  height?: string;
}) {
  return (
    <div className={`${height} overflow-hidden rounded-full bg-sunk`}>
      <div
        className="st-bar h-full rounded-full bg-success"
        style={{ "--fill": fill, "--i": index } as CSSProperties}
      />
    </div>
  );
}

// Stars live in the top ~55% of the card so Auntie Stella and her caption own the bottom strip.
// Points are in the 440 viewBox and match each star's left/top below.
const HERO_PATH = "88,242 160,136 250,180 322,79 378,163";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export default function Home() {
  const copy = getCatalogue("en-NG");
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  // `delay` is when the drawn path reaches each star (100 ms start + share of a 720 ms draw).
  const heroStars: Array<{
    left: string;
    top: string;
    label: string;
    stage: StarStage;
    delay: number;
  }> = [
    { left: "20%", top: "55%", label: copy["landing.hero.star1"], stage: 3, delay: 40 },
    { left: "36%", top: "31%", label: copy["landing.hero.star2"], stage: 4, delay: 245 },
    { left: "57%", top: "41%", label: copy["landing.hero.star3"], stage: 2, delay: 400 },
    { left: "73%", top: "18%", label: copy["landing.hero.star4"], stage: 1, delay: 600 },
    { left: "86%", top: "37%", label: copy["landing.hero.star5"], stage: 0, delay: 760 },
  ];

  const growSteps: Array<{ stage: StarStage; label: string; text: string; connector: boolean }> = [
    {
      stage: 0,
      label: copy["landing.grow.step1Title"],
      text: copy["landing.grow.step1Body"],
      connector: true,
    },
    {
      stage: 1,
      label: copy["landing.grow.step2Title"],
      text: copy["landing.grow.step2Body"],
      connector: true,
    },
    {
      stage: 2,
      label: copy["landing.grow.step3Title"],
      text: copy["landing.grow.step3Body"],
      connector: true,
    },
    {
      stage: 3,
      label: copy["landing.grow.step4Title"],
      text: copy["landing.grow.step4Body"],
      connector: true,
    },
    {
      stage: 4,
      label: copy["landing.grow.step5Title"],
      text: copy["landing.grow.step5Body"],
      connector: false,
    },
  ];

  const coverageRows = [
    { subject: copy["landing.report.maths"], fill: 0.62, label: copy["landing.ce.mathsLabel"] },
    { subject: copy["landing.report.english"], fill: 0.41, label: copy["landing.ce.englishLabel"] },
    { subject: copy["landing.ce.quantTitle"], fill: 0.35, label: copy["landing.ce.quantLabel"] },
    { subject: copy["landing.ce.verbalTitle"], fill: 0.2, label: copy["landing.ce.verbalLabel"] },
  ];

  const startSteps = [
    { n: "1", title: copy["landing.start.step1Title"], text: copy["landing.start.step1Body"] },
    { n: "2", title: copy["landing.start.step2Title"], text: copy["landing.start.step2Body"] },
    { n: "3", title: copy["landing.start.step3Title"], text: copy["landing.start.step3Body"] },
    { n: "4", title: copy["landing.start.step4Title"], text: copy["landing.start.step4Body"] },
  ];

  const privacyItems = [
    copy["landing.privacy.item1"],
    copy["landing.privacy.item2"],
    copy["landing.privacy.item3"],
    copy["landing.privacy.item4"],
    copy["landing.privacy.item5"],
  ];

  return (
    <div className="min-h-screen bg-bg text-text text-base leading-[26px]">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <ViewTransition name="brand">
            <a
              href="#"
              aria-label={copy["landing.nav.homeAriaLabel"]}
              className="flex min-h-11 items-center gap-2.5 no-underline"
            >
              <img
                src={`${basePath}/assets/logo/stellara-mark.svg`}
                alt=""
                width={40}
                height={40}
                className="st-illustration size-10"
              />
              <span className="font-heading text-[26px] font-extrabold tracking-[-0.02em] text-primary-ink">
                {copy["landing.wordmark"]}
              </span>
            </a>
          </ViewTransition>
          <nav
            aria-label={copy["landing.nav.label"]}
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] font-medium"
          >
            <a
              href="#parents"
              className="st-link inline-flex min-h-11 items-center text-text no-underline hover:text-primary-ink"
            >
              {copy["landing.nav.parents"]}
            </a>
            <a
              href="#start"
              className="st-link inline-flex min-h-11 items-center text-text no-underline hover:text-primary-ink"
            >
              {copy["landing.nav.start"]}
            </a>
            <a
              href="#privacy"
              className="st-link inline-flex min-h-11 items-center text-text no-underline hover:text-primary-ink"
            >
              {copy["landing.nav.privacy"]}
            </a>
            <ThemeToggle
              lightLabel={copy["landing.theme.toLight"]}
              darkLabel={copy["landing.theme.toDark"]}
              switchToLightLabel={copy["landing.theme.switchToLight"]}
              switchToDarkLabel={copy["landing.theme.switchToDark"]}
            />
            <Link
              href="/sign-in"
              className="st-press inline-flex h-11 items-center rounded-full border-[1.5px] border-line-strong px-5 font-semibold text-text no-underline hover:border-primary"
            >
              {copy["landing.nav.signIn"]}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-14 px-6 pt-[72px] pb-14">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-6">
            <span className="self-start rounded-full bg-primary-tint px-3.5 py-1.5 text-sm font-semibold text-primary-ink">
              {copy["landing.hero.badge"]}
            </span>
            <h1 className="m-0 font-heading text-[clamp(38px,5vw,58px)] leading-[1.08] font-extrabold tracking-[-0.015em]">
              {copy.homeTitle}
            </h1>
            <p className="m-0 max-w-[520px] text-lg leading-[30px] text-muted">
              {copy.homeDescription}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/sign-in"
                className="st-press inline-flex h-[52px] items-center rounded-full bg-primary px-7 font-heading text-[17px] font-bold text-on-primary no-underline"
              >
                {copy["landing.hero.ctaPrimary"]}
              </Link>
              <a
                href="#parents"
                className="st-press inline-flex h-[52px] items-center rounded-full border-[1.5px] border-line-strong px-6 font-heading text-[17px] font-bold text-text no-underline hover:border-primary"
              >
                {copy["landing.hero.ctaSecondary"]}
              </a>
            </div>
            <p className="m-0 text-sm text-muted">{copy["landing.hero.note"]}</p>
          </div>

          {/* On phones the constellation starts below the fold; <Reveal> holds its sequence until it's seen. */}
          <Reveal className="flex min-w-0 flex-[1_1_400px] justify-center">
            <div className="relative aspect-square w-full max-w-[440px] overflow-hidden rounded-3xl border border-line bg-sunk/60">
              <svg
                viewBox="0 0 440 440"
                width="100%"
                height="100%"
                className="absolute inset-0"
                aria-hidden="true"
              >
                <defs>
                  {/* A solid stroke draws along the path and uncovers the dotted line beneath. */}
                  <mask id="hero-path-mask">
                    <polyline
                      points={HERO_PATH}
                      pathLength={1}
                      fill="none"
                      stroke="white"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="st-hero-draw"
                    />
                  </mask>
                </defs>
                <polyline
                  points={HERO_PATH}
                  fill="none"
                  stroke="var(--line-strong)"
                  strokeWidth="2"
                  strokeDasharray="1 7"
                  strokeLinecap="round"
                  mask="url(#hero-path-mask)"
                />
                <circle cx="60" cy="70" r="2" fill="var(--line-strong)" />
                <circle cx="210" cy="60" r="1.6" fill="var(--line-strong)" />
                <circle cx="400" cy="330" r="2" fill="var(--line-strong)" />
                <circle cx="140" cy="380" r="1.6" fill="var(--line-strong)" />
              </svg>
              {heroStars.map((star) => (
                <div
                  key={star.label}
                  style={
                    {
                      left: star.left,
                      top: star.top,
                      "--delay": `${star.delay}ms`,
                    } as CSSProperties
                  }
                  className="st-hero-star absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
                >
                  <LandingStar stage={star.stage} size="hero" />
                  <span className="text-[13px] font-semibold whitespace-nowrap text-text">
                    {star.label}
                  </span>
                </div>
              ))}
              <img
                src={`${basePath}/assets/auntie-stella/auntie-stella-smiling.svg`}
                alt={copy["landing.hero.auntieAlt"]}
                width={104}
                height={104}
                className="st-illustration st-hero-late absolute bottom-6 left-6 size-[72px] sm:size-[104px]"
              />
              <div className="st-hero-late absolute right-5 bottom-6 max-w-[min(220px,calc(100%-128px))] rounded-2xl border border-line bg-surface px-3.5 py-3 text-[15px] leading-[22px]">
                {copy["landing.hero.caption"]}
              </div>
            </div>
          </Reveal>
        </section>

        {/* How a star grows */}
        <section aria-labelledby="grow" className="border-y border-line bg-surface">
          <div className="mx-auto flex max-w-[1120px] flex-col gap-10 px-6 py-[72px]">
            <div className="flex max-w-[640px] flex-col gap-3">
              <h2
                id="grow"
                className="m-0 font-heading text-[clamp(28px,3.4vw,38px)] leading-[1.15] font-extrabold"
              >
                {copy["landing.grow.title"]}
              </h2>
              <p className="m-0 text-[17px] leading-7 text-muted">{copy["landing.grow.lead"]}</p>
            </div>
            <Reveal>
              {/* Where supported, the reader's scroll paces the growth (styles.css, "scroll-scrubbed"). */}
              <ol className="st-grow m-0 flex list-none flex-wrap p-0">
                {growSteps.map((step, i) => (
                  <li
                    key={step.label}
                    style={{ "--i": i } as CSSProperties}
                    className="st-grow-step flex min-w-0 flex-[1_1_180px] flex-col gap-2.5 pr-5 pb-6"
                  >
                    <div className="flex items-center gap-2">
                      <LandingStar stage={step.stage} size="step" index={i} />
                      {step.connector && (
                        <div className="relative h-0 flex-1 border-t-2 border-dotted border-line-strong">
                          <span
                            aria-hidden="true"
                            className="st-grow-path absolute -top-0.5 left-0 h-0.5 w-full rounded-full bg-reward"
                          />
                        </div>
                      )}
                    </div>
                    <h3 className="m-0 font-heading text-[19px] font-extrabold">{step.label}</h3>
                    <p className="m-0 text-[15px] leading-6 text-muted">{step.text}</p>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </section>

        {/* What parents see */}
        <section
          id="parents"
          aria-labelledby="parents-h"
          className="mx-auto flex max-w-[1120px] flex-wrap items-start gap-14 px-6 py-[72px]"
        >
          <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
            <span className="text-sm font-semibold text-muted">
              {copy["landing.parents.eyebrow"]}
            </span>
            <h2
              id="parents-h"
              className="m-0 font-heading text-[clamp(28px,3.4vw,38px)] leading-[1.15] font-extrabold"
            >
              {copy["landing.parents.title"]}
            </h2>
            <p className="m-0 text-[17px] leading-7 text-muted">{copy["landing.parents.lead"]}</p>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-base">
              {[
                copy["landing.parents.bullet1"],
                copy["landing.parents.bullet2"],
                copy["landing.parents.bullet3"],
              ].map((bullet) => (
                <li key={bullet} className="flex gap-2.5">
                  <CheckIcon className="mt-0.5 shrink-0 text-success-ink" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <Reveal className="min-w-0 flex-[1_1_460px]">
            <article
              aria-label={copy["landing.report.ariaLabel"]}
              className="st-reveal overflow-hidden rounded-3xl border border-line bg-surface"
            >
              <div className="flex items-center gap-3.5 bg-primary-tint px-6 py-5">
                <img
                  src={`${basePath}/assets/auntie-stella/auntie-stella-avatar-round.svg`}
                  alt=""
                  width={48}
                  height={48}
                  className="st-illustration size-12 rounded-full"
                />
                <div className="flex flex-col">
                  <span className="font-heading text-xl font-extrabold text-primary-ink">
                    {copy["landing.report.headerTitle"]}
                  </span>
                  <span className="text-sm text-primary-ink">
                    {copy["landing.report.headerMeta"]}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-5 p-6">
                <div className="flex flex-col gap-1">
                  <h3 className="m-0 text-[13px] font-semibold text-muted">
                    {copy["report.statTitle"]}
                  </h3>
                  <p className="m-0 text-base">{copy["landing.report.statBody"]}</p>
                </div>

                <div className="flex gap-3 rounded-2xl bg-success-tint p-4 text-success-ink">
                  <CheckIcon className="mt-0.5 size-[22px] shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <h3 className="m-0 text-[13px] font-semibold">
                      {copy["report.celebrateTitle"]}
                    </h3>
                    <p className="m-0 text-base leading-[25px]">
                      {copy["landing.report.celebrateBody"]}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <h3 className="m-0 text-[13px] font-semibold text-muted">
                    {copy["report.nextTitle"]}
                  </h3>
                  <p className="m-0 text-base leading-[25px]">{copy["landing.report.nextBody"]}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className="m-0 text-[13px] font-semibold text-muted">
                    {copy["landing.report.coverageHeading"]}
                  </h3>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-24">{copy["landing.report.maths"]}</span>
                    <div className="flex-1">
                      <Bar fill={0.62} height="h-2.5" />
                    </div>
                    <span className="w-10 text-right tabular-nums">62%</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-24">{copy["landing.report.english"]}</span>
                    <div className="flex-1">
                      <Bar fill={0.41} index={1} height="h-2.5" />
                    </div>
                    <span className="w-10 text-right tabular-nums">41%</span>
                  </div>
                </div>
              </div>
            </article>
          </Reveal>
        </section>

        {/* Self-paced, with a goal */}
        <section aria-labelledby="goal-h" className="border-y border-line bg-surface">
          <div className="mx-auto flex max-w-[1120px] flex-wrap-reverse items-center gap-14 px-6 py-[72px]">
            <Reveal className="min-w-0 flex-[1_1_460px]">
              <article
                aria-label={copy["landing.goal.ariaLabel"]}
                className="st-reveal flex flex-col gap-5 rounded-3xl border border-line bg-bg p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-heading text-xl font-extrabold">
                    {copy["landing.goal.cardTitle"]}
                  </span>
                  <span className="rounded-full bg-sunk px-2.5 py-1 text-[13px] font-semibold text-muted">
                    {copy["landing.goal.exampleBadge"]}
                  </span>
                </div>

                <div className="flex items-center gap-3.5">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-primary-ink">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
                    </svg>
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[17px] font-semibold">{copy["landing.goal.name"]}</span>
                    <span className="text-[15px] text-muted">{copy["landing.goal.target"]}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-[15px]">
                    <span>{copy["landing.goal.topicsMastered"]}</span>
                    <span className="text-muted tabular-nums">
                      {copy["landing.goal.topicsCount"]}
                    </span>
                  </div>
                  <Bar fill={0.35} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-surface p-3.5">
                    <span className="text-[13px] text-muted">{copy["landing.goal.paceLabel"]}</span>
                    <span className="font-semibold">{copy["landing.goal.paceValue"]}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-surface p-3.5">
                    <span className="text-[13px] text-muted">
                      {copy["landing.goal.projectionLabel"]}
                    </span>
                    <span className="font-semibold">{copy["landing.goal.projectionValue"]}</span>
                  </div>
                </div>

                <p className="m-0 text-[13px] text-muted">{copy["landing.goal.disclaimer"]}</p>
              </article>
            </Reveal>

            <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
              <span className="text-sm font-semibold text-muted">
                {copy["landing.goal.eyebrow"]}
              </span>
              <h2
                id="goal-h"
                className="m-0 font-heading text-[clamp(28px,3.4vw,38px)] leading-[1.15] font-extrabold"
              >
                {copy["landing.goal.title"]}
              </h2>
              <p className="m-0 text-[17px] leading-7 text-muted">{copy["landing.goal.body1"]}</p>
              <p className="m-0 text-[17px] leading-7 text-muted">{copy["landing.goal.body2"]}</p>
            </div>
          </div>
        </section>

        {/* Common Entrance coverage */}
        <section
          aria-labelledby="ce-h"
          className="mx-auto flex max-w-[1120px] flex-wrap gap-14 px-6 py-[72px]"
        >
          <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
            <span className="text-sm font-semibold text-muted">{copy["landing.ce.eyebrow"]}</span>
            <h2
              id="ce-h"
              className="m-0 font-heading text-[clamp(28px,3.4vw,38px)] leading-[1.15] font-extrabold"
            >
              {copy["landing.ce.title"]}
            </h2>
            <p className="m-0 text-[17px] leading-7 text-muted">{copy["landing.ce.lead"]}</p>
          </div>

          <Reveal className="min-w-0 flex-[1_1_460px]">
            <div className="st-reveal flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-heading text-lg font-extrabold">
                  {copy["landing.ce.cardTitle"]}
                </span>
                <span className="rounded-full bg-sunk px-2.5 py-1 text-[13px] font-semibold text-muted">
                  {copy["landing.ce.badge"]}
                </span>
              </div>
              {coverageRows.map((row, i) => (
                <div key={row.subject} className="flex flex-col gap-1.5">
                  <div className="flex justify-between gap-2 text-[15px]">
                    <span>{row.subject}</span>
                    <span className="text-muted tabular-nums">{row.label}</span>
                  </div>
                  <Bar fill={row.fill} index={i} />
                </div>
              ))}
              <p className="m-0 text-[13px] text-muted">{copy["landing.ce.footnote"]}</p>
            </div>
          </Reveal>
        </section>

        {/* How to start */}
        <section id="start" aria-labelledby="pilot-h" className="border-y border-line bg-surface">
          <div className="mx-auto flex max-w-[1120px] flex-col gap-8 px-6 py-[72px]">
            <h2
              id="pilot-h"
              className="m-0 font-heading text-[clamp(28px,3.4vw,38px)] leading-[1.15] font-extrabold"
            >
              {copy["landing.start.title"]}
            </h2>
            <ol className="m-0 flex list-none flex-col p-0">
              {startSteps.map((step) => (
                <li
                  key={step.n}
                  className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line py-5"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-tint font-heading text-lg font-extrabold text-primary-ink">
                    {step.n}
                  </span>
                  <h3 className="mt-1.5 mb-0 flex-[0_1_260px] font-heading text-[19px] font-extrabold">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 mb-0 flex-[1_1_360px] text-base text-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Privacy */}
        <section
          id="privacy"
          aria-labelledby="privacy-h"
          className="mx-auto flex max-w-[1120px] flex-wrap gap-14 px-6 py-[72px]"
        >
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--primary-ink)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <h2
              id="privacy-h"
              className="m-0 font-heading text-[clamp(28px,3.4vw,38px)] leading-[1.15] font-extrabold"
            >
              {copy["landing.privacy.title"]}
            </h2>
            <p className="m-0 text-[17px] leading-7 text-muted">{copy["landing.privacy.lead"]}</p>
          </div>

          <ul className="m-0 flex min-w-0 flex-[1_1_520px] list-none flex-col p-0">
            {privacyItems.map((item) => (
              <li key={item} className="flex gap-3 border-t border-line py-4 text-base">
                <CheckIcon className="mt-0.5 shrink-0 text-success-ink" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA Banner */}
        <section id="cta" aria-labelledby="cta-h" className="mx-auto max-w-[1120px] px-6 pb-[72px]">
          <div className="flex flex-wrap items-center gap-8 rounded-3xl bg-primary-tint px-10 py-12">
            <img
              src={`${basePath}/assets/auntie-stella/auntie-stella-listening.svg`}
              alt=""
              width={120}
              height={120}
              className="st-illustration size-[120px]"
            />
            <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-2">
              <h2
                id="cta-h"
                className="m-0 font-heading text-[clamp(26px,3vw,34px)] leading-[1.15] font-extrabold text-primary-ink"
              >
                {copy["landing.cta.title"]}
              </h2>
              <p className="m-0 text-[17px] leading-7 text-primary-ink">
                {copy["landing.cta.body"]}
              </p>
            </div>
            <Link
              href="/sign-in"
              className="st-press inline-flex h-[52px] items-center rounded-full bg-primary px-7 font-heading text-[17px] font-bold text-on-primary no-underline"
            >
              {copy["landing.hero.ctaPrimary"]}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1120px] flex-wrap justify-between gap-6 px-6 py-10 text-sm leading-[22px] text-muted">
          <div className="flex flex-[1_1_360px] flex-col gap-2">
            <span className="font-heading text-xl font-extrabold tracking-[-0.02em] text-primary-ink">
              {copy["landing.wordmark"]}
            </span>
            <span>{copy["landing.footer.disclaimer"]}</span>
          </div>
          <nav
            aria-label={copy["landing.footer.navLabel"]}
            className="flex flex-wrap items-start gap-x-6 gap-y-2"
          >
            <a href="#privacy" className="st-link text-muted underline hover:text-primary-ink">
              {copy["landing.footer.privacy"]}
            </a>
            <a href="#privacy" className="st-link text-muted underline hover:text-primary-ink">
              {copy["landing.footer.terms"]}
            </a>
            <a href="#start" className="st-link text-muted underline hover:text-primary-ink">
              {copy["landing.footer.contact"]}
            </a>
            <span>{copy["landing.footer.copyright"]}</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
