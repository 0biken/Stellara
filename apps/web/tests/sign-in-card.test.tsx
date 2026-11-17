import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SignInCard, isValidEmail, type SignInCopy } from "../app/sign-in/sign-in-card";
import { SessionProvider } from "../lib/auth/session-provider";

import type { AuthAdapter } from "../lib/auth";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

const copy: SignInCopy = {
  title: "Sign in",
  subtitle: "subtitle",
  ageRule: "rule",
  ageConfirm: "I am over 18",
  ageError: "Confirm your age",
  googleButton: "Continue with Google",
  or: "or",
  emailLabel: "Email address",
  emailButton: "Send link",
  emailInvalid: "Bad email",
  emailSent: "Check your email",
  previewNotice: "Preview notice",
  error: "Something went wrong",
};

function fakeAdapter(): AuthAdapter {
  return {
    mode: "supabase",
    getSession: vi.fn(async () => null),
    onChange: vi.fn(() => () => {}),
    signInWithGoogle: vi.fn(async () => ({ status: "redirecting" as const })),
    signInWithEmail: vi.fn(async () => ({ status: "email-sent" as const })),
    signOut: vi.fn(async () => {}),
  };
}

async function renderCard(adapter: AuthAdapter) {
  render(
    <SessionProvider adapter={adapter}>
      <SignInCard copy={copy} />
    </SessionProvider>,
  );
  await waitFor(() => expect(adapter.getSession).toHaveBeenCalled());
  await act(async () => {});
}

describe("isValidEmail", () => {
  it("accepts ordinary addresses and rejects partial ones", () => {
    expect(isValidEmail(" ada@example.com ")).toBe(true);
    expect(isValidEmail("ada@example")).toBe(false);
    expect(isValidEmail("ada example.com")).toBe(false);
  });
});

describe("SignInCard", () => {
  beforeEach(() => {
    replace.mockReset();
    search = "";
  });

  it("blocks Google sign-in until the 18+ box is ticked", async () => {
    const adapter = fakeAdapter();
    await renderCard(adapter);

    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Confirm your age");
    expect(adapter.signInWithGoogle).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox", { name: "I am over 18" }));
    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/ }));
    await waitFor(() =>
      expect(adapter.signInWithGoogle).toHaveBeenCalledWith({ next: "/family/" }),
    );
  });

  it("passes a safe next path and drops an unsafe one", async () => {
    search = "next=https%3A%2F%2Fevil.example";
    const adapter = fakeAdapter();
    await renderCard(adapter);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/ }));
    await waitFor(() =>
      expect(adapter.signInWithGoogle).toHaveBeenCalledWith({ next: "/family/" }),
    );
  });

  it("validates the email before sending a link", async () => {
    const adapter = fakeAdapter();
    await renderCard(adapter);
    fireEvent.click(screen.getByRole("checkbox"));

    const input = screen.getByLabelText("Email address");
    fireEvent.change(input, { target: { value: "ada@" } });
    fireEvent.click(screen.getByRole("button", { name: "Send link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Bad email");
    expect(adapter.signInWithEmail).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "ada@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send link" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Check your email");
    expect(adapter.signInWithEmail).toHaveBeenCalledWith({
      email: "ada@example.com",
      next: "/family/",
    });
  });

  it("goes straight to the portal when already signed in", async () => {
    const adapter = fakeAdapter();
    adapter.getSession = vi.fn(async () => ({ userId: "u1", roles: ["guardian" as const] }));
    await renderCard(adapter);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/family/"));
  });
});
