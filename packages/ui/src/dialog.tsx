"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Button } from "./button.js";
import { cx } from "./cx.js";
import { Icon } from "./icons.js";

export interface TypedConfirmation {
  /** Exact, case-sensitive text. No trimming or case folding is performed. */
  confirmationText: string;
  label: string;
  actionLabel: string;
  onConfirm: () => void;
}
export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  closeLabel: string;
  children?: ReactNode;
  variant?: "info" | "confirm";
  /** Required for destructive actions; caller owns the resulting operation. */
  confirmation?: TypedConfirmation;
  closeOnBackdrop?: boolean;
  className?: string;
}

function Modal({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  children,
  confirmation,
  closeOnBackdrop = true,
  className,
  sheet = false,
}: DialogProps & { sheet?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const [text, setText] = useState("");
  const confirmed = useRef(false);
  const pointerTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) return;
    // WebKit does not necessarily focus a button when it is clicked.
    const rememberTrigger = (event: PointerEvent) => {
      pointerTrigger.current =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(
              "button, a[href], input, select, textarea, [tabindex]",
            )
          : null;
    };
    const clearPointerTrigger = () => {
      pointerTrigger.current = null;
    };
    document.addEventListener("pointerdown", rememberTrigger, true);
    document.addEventListener("keydown", clearPointerTrigger, true);
    return () => {
      document.removeEventListener("pointerdown", rememberTrigger, true);
      document.removeEventListener("keydown", clearPointerTrigger, true);
    };
  }, [open]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const trigger =
      pointerTrigger.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    pointerTrigger.current = null;
    setText("");
    confirmed.current = false;
    dialog.showModal();
    titleRef.current?.focus();
    return () => {
      dialog.close();
      trigger?.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={cx(
        "st-dialog w-full max-w-lg rounded-lg border border-line bg-surface p-6 text-text",
        className,
      )}
      data-variant={sheet ? "sheet" : "dialog"}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClose={() => {
        if (open && !ref.current?.open) onOpenChange(false);
      }}
      onPointerDown={(event) => {
        // Pointer dismissal is only for the backdrop; native Escape and the close
        // button provide the keyboard equivalents without intercepting content.
        if (!closeOnBackdrop || event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onOpenChange(false);
      }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2
          id={titleId}
          ref={titleRef}
          tabIndex={-1}
          className="font-heading text-[28px] font-bold leading-[34px]"
        >
          {title}
        </h2>
        <Button
          variant="text"
          size="child"
          aria-label={closeLabel}
          onClick={() => onOpenChange(false)}
        >
          <Icon name="close" />
        </Button>
      </div>
      {description && (
        <p id={descriptionId} className="mb-4 text-[15px] leading-6">
          {description}
        </p>
      )}
      {children}
      {confirmation && (
        <form
          className="mt-5 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              text === confirmation.confirmationText &&
              confirmation.confirmationText.length > 0 &&
              !confirmed.current
            ) {
              confirmed.current = true;
              confirmation.onConfirm();
            }
          }}
        >
          <label htmlFor={inputId} className="text-[15px] font-semibold">
            {confirmation.label}
          </label>
          <input
            id={inputId}
            value={text}
            onChange={(event) => setText(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="min-h-12 rounded-sm border border-line-strong bg-surface px-3 text-text"
          />
          <Button
            type="submit"
            disabled={!confirmation.confirmationText || text !== confirmation.confirmationText}
          >
            {confirmation.actionLabel}
          </Button>
        </form>
      )}
    </dialog>
  );
}

/** Native showModal supplies background inertness and the keyboard focus trap. */
export function Dialog(props: DialogProps) {
  return <Modal {...props} />;
}
export function Sheet(props: DialogProps) {
  return <Modal {...props} sheet />;
}

export interface ExplanationSheetProps extends Omit<DialogProps, "children" | "confirmation"> {
  steps: readonly ReactNode[];
  nextLabel: string;
  completeLabel: string;
}
export function ExplanationSheet({
  steps,
  nextLabel,
  completeLabel,
  ...props
}: ExplanationSheetProps) {
  const [shown, setShown] = useState(1);
  useEffect(() => {
    if (!props.open) setShown(1);
  }, [props.open]);
  return (
    <Sheet {...props}>
      <ol className="list-decimal space-y-4 pl-6" aria-live="polite" aria-relevant="additions">
        {steps.slice(0, shown).map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>
      <div className="mt-5">
        <Button
          size="child"
          onClick={() => {
            if (shown < steps.length) setShown((value) => value + 1);
            else props.onOpenChange(false);
          }}
        >
          {shown < steps.length ? nextLabel : completeLabel}
        </Button>
      </div>
    </Sheet>
  );
}
