export type CspDirectives = Record<string, string[]>;
export type CspEnv = Record<string, string | undefined>;

export function cspDirectives(options?: {
  env?: CspEnv;
  scriptHashes?: string[];
  meta?: boolean;
}): CspDirectives;
export function serializeCsp(directives: CspDirectives): string;
export function securityHeaders(env?: CspEnv): { key: string; value: string }[];
