export async function registerServiceWorker(
  basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "",
): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const swUrl = `${basePath}/sw.js`;
  try {
    await navigator.serviceWorker.register(swUrl, {
      scope: basePath ? `${basePath}/` : "/",
    });
  } catch {
    // Registration can fail in unsupported contexts (e.g. file:// or private browsing).
  }
}
