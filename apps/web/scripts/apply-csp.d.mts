export const FRAME_GUARD: string;
export function hashScript(source: string): string;
export function applyCsp(html: string, env?: Record<string, string | undefined>): string;
export function applyCspToExport(outDir: string, env?: Record<string, string | undefined>): number;
