export type AdultRole = "guardian";

export interface Session {
  userId: string;
  email?: string;
  displayName?: string;
  roles: AdultRole[];
}

export type GoogleSignInResult =
  { status: "redirecting" } | { status: "signed-in"; session: Session } | { status: "error" };

export type EmailSignInResult = { status: "email-sent" } | { status: "error" };

/**
 * Adult sign-in for the parent portal. The app is a static export, so every
 * implementation runs in the browser; real access control is RLS (TASKLIST 2.3).
 */
export interface AuthAdapter {
  readonly mode: "supabase" | "preview";
  getSession(): Promise<Session | null>;
  onChange(listener: (session: Session | null) => void): () => void;
  signInWithGoogle(options: { next: string }): Promise<GoogleSignInResult>;
  signInWithEmail(options: { email: string; next: string }): Promise<EmailSignInResult>;
  signOut(): Promise<void>;
}
