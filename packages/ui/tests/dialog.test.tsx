import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
afterEach(cleanup);

it("restores a pointer trigger when the browser does not focus clicked buttons", async () => {
  const { Dialog } = await import("../src/dialog.js");
  const props = { onOpenChange: vi.fn(), title: "Details", closeLabel: "Close" };
  const content = (open: boolean) => (
    <>
      <button>Open details</button>
      <Dialog {...props} open={open} />
    </>
  );
  const view = render(content(false));
  const trigger = screen.getByRole("button", { name: "Open details" });
  fireEvent.pointerDown(trigger);
  expect(trigger).not.toHaveFocus();
  view.rerender(content(true));
  view.rerender(content(false));
  expect(trigger).toHaveFocus();
});
// jsdom lacks native dialog methods. Only model the open attribute here;
// browser tests must verify the real focus trap, inertness and Escape behavior.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
it("requires exact confirmation and resets after closing", async () => {
  const { Dialog } = await import("../src/dialog.js");
  const confirm = vi.fn();
  const change = vi.fn();
  const props = {
    open: true,
    onOpenChange: change,
    title: "Delete account",
    closeLabel: "Close",
    confirmation: {
      confirmationText: "DELETE",
      label: "Type DELETE",
      actionLabel: "Delete",
      onConfirm: confirm,
    },
  };
  const view = render(<Dialog {...props} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "delete" } });
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(confirm).not.toHaveBeenCalled();
  for (const value of [" DELETE", "DELETE "]) {
    fireEvent.change(screen.getByRole("textbox"), { target: { value } });
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(confirm).not.toHaveBeenCalled();
  }
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "DELETE" } });
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(confirm).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(change).toHaveBeenCalledWith(false);
  view.rerender(<Dialog {...props} open={false} />);
  view.rerender(<Dialog {...props} />);
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("");
});
it("reveals explanation steps one at a time", async () => {
  const { ExplanationSheet } = await import("../src/dialog.js");
  render(
    <ExplanationSheet
      open
      onOpenChange={() => {}}
      title="Explanation"
      closeLabel="Close"
      nextLabel="Next step"
      completeLabel="Got it"
      steps={["First step", "Second step"]}
    />,
  );
  expect(screen.getByText("First step")).toBeTruthy();
  expect(screen.queryByText("Second step")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Next step" }));
  expect(screen.getByText("Second step")).toBeTruthy();
});

it("resets explanation steps on reopening and closes on completion", async () => {
  const { ExplanationSheet } = await import("../src/dialog.js");
  const change = vi.fn();
  const props = {
    open: true,
    onOpenChange: change,
    title: "Explanation",
    closeLabel: "Close",
    nextLabel: "Next step",
    completeLabel: "Got it",
    steps: ["First step", "Second step"],
  };
  const view = render(<ExplanationSheet {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Next step" }));
  fireEvent.click(screen.getByRole("button", { name: "Got it" }));
  expect(change).toHaveBeenCalledWith(false);
  view.rerender(<ExplanationSheet {...props} open={false} />);
  view.rerender(<ExplanationSheet {...props} />);
  expect(screen.getByText("First step")).toBeVisible();
  expect(screen.queryByText("Second step")).toBeNull();
});
