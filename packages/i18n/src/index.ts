import english from "./en-NG.json" with { type: "json" };
import hausa from "./ha.json" with { type: "json" };
import igbo from "./ig.json" with { type: "json" };
import yoruba from "./yo.json" with { type: "json" };

export type Locale = "en-NG" | "yo" | "ha" | "ig";
export type Catalogue = typeof english;
const translations: Record<Locale, Partial<Catalogue>> = {
  "en-NG": english,
  yo: yoruba,
  ha: hausa,
  ig: igbo,
};
/** Messages use ICU-compatible text; untranslated catalogues fall back to en-NG. */
export function getCatalogue(locale: Locale = "en-NG"): Catalogue {
  return { ...english, ...translations[locale] };
}
