/** The two Deno host APIs used by our thin entrypoints; shared code is checked in Node too. */
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): unknown;
};
