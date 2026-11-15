import { formatMessage } from "@stellara/i18n";

export default function BasicHome() {
  return (
    <main>
      <h1>{formatMessage("shell.basicTitle")}</h1>
      <p>{formatMessage("shell.basicDescription")}</p>
    </main>
  );
}
