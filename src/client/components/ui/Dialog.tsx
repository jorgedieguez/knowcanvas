import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

const focusableSelector = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function Dialog({
  children,
  className,
  ariaLabel,
  labelledBy,
  onDismiss,
  variant = "modal",
}: {
  children: ReactNode;
  className: string;
  ariaLabel?: string;
  labelledBy?: string;
  onDismiss: () => void;
  variant?: "modal" | "fullscreen";
}) {
  const surface = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const appRoot = document.getElementById("root");
    document.body.style.overflow = "hidden";
    if (appRoot) appRoot.inert = true;

    const frame = requestAnimationFrame(() => {
      const preferred = surface.current?.querySelector<HTMLElement>("[data-autofocus]");
      const firstControl = surface.current?.querySelector<HTMLElement>(focusableSelector);
      (preferred ?? firstControl ?? surface.current)?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      if (appRoot) appRoot.inert = false;
      previousFocus?.focus();
    };
  }, []);

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onDismiss();
      return;
    }
    if (event.key !== "Tab") return;

    const controls = Array.from(
      surface.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    ).filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
    if (controls.length === 0) {
      event.preventDefault();
      surface.current?.focus();
      return;
    }

    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return createPortal(
    <div
      className={`ui-dialog-layer ${variant === "fullscreen" ? "fullscreen" : ""}`}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && variant === "modal") onDismiss();
      }}
    >
      <section
        ref={surface}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {children}
      </section>
    </div>,
    document.body,
  );
}
