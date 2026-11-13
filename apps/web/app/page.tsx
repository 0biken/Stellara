import { getCatalogue } from "@stellara/i18n";

export default function Home() {
  const copy = getCatalogue("en-NG");
  return (
    <main>
      <p className="brand">{copy.brand}</p>
      <h1>{copy.homeTitle}</h1>
      <p>{copy.homeDescription}</p>
      <p className="note">{copy.foundationNote}</p>
    </main>
  );
}
