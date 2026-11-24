import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StaffWorkspace } from "../components/admin/staff-workspace";
import { createDemoAdminApi } from "../lib/admin/demo";
import { AdminError } from "../lib/admin/types";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));

describe("staff workspace states", () => {
  it("denies a forbidden direct route without mounting its content", async () => {
    render(
      <StaffWorkspace api={createDemoAdminApi("author")} path="/admin/team">
        <p>Private team records</p>
      </StaffWorkspace>,
    );
    expect(await screen.findByRole("heading", { name: "Access restricted" })).toBeVisible();
    expect(screen.queryByText("Private team records")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Staff team" })).not.toBeInTheDocument();
  });
  it("requires a session and active membership", async () => {
    const api = createDemoAdminApi();
    api.getSession = vi.fn().mockResolvedValue(null);
    const view = render(
      <StaffWorkspace api={api}>
        <p>Protected data</p>
      </StaffWorkspace>,
    );
    expect(await screen.findByText("Sign in with your staff account to continue.")).toBeVisible();
    expect(screen.queryByText("Protected data")).not.toBeInTheDocument();
    const inactive = createDemoAdminApi();
    inactive.getSession = vi
      .fn()
      .mockResolvedValue({ userId: "staff", role: "admin", active: false, assurance: "aal2" });
    view.rerender(
      <StaffWorkspace api={inactive}>
        <p>Protected data</p>
      </StaffWorkspace>,
    );
    expect(
      await screen.findByText("This account does not have active staff access."),
    ).toBeVisible();
  }, 15_000);
  it("offers an authenticator challenge for MFA_REQUIRED", async () => {
    const api = createDemoAdminApi();
    const live = {
      ...api,
      mode: "live" as const,
      getSession: vi.fn().mockRejectedValue(new AdminError("MFA_REQUIRED")),
    };
    render(
      <StaffWorkspace api={live}>
        <p>Protected data</p>
      </StaffWorkspace>,
    );
    expect(await screen.findByLabelText("Six-digit code")).toBeVisible();
    expect(screen.queryByText("Protected data")).not.toBeInTheDocument();
  });
  it("removes protected children after an auth event revokes access", async () => {
    const api = createDemoAdminApi();
    let notify = () => {};
    api.onAuthChange = (listener) => {
      notify = listener;
      return () => {};
    };
    render(
      <StaffWorkspace api={api}>
        <p>Protected data</p>
      </StaffWorkspace>,
    );
    expect(await screen.findByText("Protected data")).toBeVisible();
    api.getSession = vi.fn().mockRejectedValue(new AdminError("FORBIDDEN"));
    act(() => {
      notify();
    });
    expect(screen.queryByText("Protected data")).not.toBeInTheDocument();
    expect(
      await screen.findByText("This account does not have active staff access."),
    ).toBeVisible();
  });
  it("ignores a late access response after sign-out", async () => {
    const api = createDemoAdminApi();
    let resolve: (value: Awaited<ReturnType<typeof api.getSession>>) => void = () => {};
    api.getSession = () =>
      new Promise((done) => {
        resolve = done;
      });
    const view = render(
      <StaffWorkspace api={api}>
        <p>Protected data</p>
      </StaffWorkspace>,
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Checking staff access"),
    );
    view.unmount();
    await act(async () => {
      resolve({ userId: "old", role: "super_admin", active: true, assurance: "aal2" });
    });
    expect(screen.queryByText("Protected data")).not.toBeInTheDocument();
  });
});
