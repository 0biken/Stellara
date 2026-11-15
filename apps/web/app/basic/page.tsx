import { formatMessage } from "@stellara/i18n";

export default function BasicHome() {
  return (
    <main className="mx-auto max-w-[780px] p-[var(--space-page)]">
      <h1 className="font-heading text-[clamp(2.5rem,7vw,4.5rem)] leading-[1.08] font-extrabold tracking-[-0.045em]">
        {formatMessage("shell.basicTitle")}
      </h1>
      <p className="mt-4 text-lg leading-relaxed">{formatMessage("shell.basicDescription")}</p>
    </main>
  );
}
