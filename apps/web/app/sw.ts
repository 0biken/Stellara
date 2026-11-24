import {
  CacheFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
  type PrecacheEntry,
} from "serwist";

declare global {
  interface ServiceWorkerGlobalScope {
    __SW_MANIFEST?: (PrecacheEntry | string)[];
  }
}

declare const self: ServiceWorkerGlobalScope &
  typeof globalThis & {
    clients: {
      matchAll(options?: { type?: string }): Promise<Array<{ postMessage(msg: unknown): void }>>;
    };
    addEventListener(type: string, listener: (event: unknown) => void): void;
  };

const SHELL_PATHS = new Set([
  "/",
  "/sky",
  "/sky/",
  "/learn",
  "/learn/",
  "/practice",
  "/practice/",
  "/placement",
  "/placement/",
]);

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, request }) =>
        request.headers.has("authorization") ||
        url.pathname.startsWith("/functions/v1/") ||
        url.pathname.startsWith("/rest/v1/") ||
        url.pathname.startsWith("/auth/"),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/_next/static/") ||
        url.pathname.startsWith("/images/") ||
        url.pathname.startsWith("/fonts/") ||
        url.pathname.startsWith("/icons/"),
      handler: new CacheFirst({
        cacheName: "stellara-static-assets-v1",
      }),
    },
    {
      matcher: ({ url, request }) => request.mode === "navigate" && SHELL_PATHS.has(url.pathname),
      handler: new StaleWhileRevalidate({
        cacheName: "stellara-app-shell-v1",
      }),
    },
  ],
});

serwist.addEventListeners();

self.addEventListener("sync", (rawEvent: unknown) => {
  const event = rawEvent as { tag?: string; waitUntil?: (p: Promise<unknown>) => void };
  if (event.tag === "stellara-outbox-sync" && event.waitUntil) {
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: "STELLARA_SYNC_OUTBOX" });
        }
      }),
    );
  }
});
