import { useEffect, useRef, type ReactNode, type RefObject } from "react";

export function Popover({
  children,
  className,
  id,
  label,
  onDismiss,
  returnFocusRef,
}: {
  children: ReactNode;
  className: string;
  id?: string;
  label: string;
  onDismiss: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const popover = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      popover.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={popover}
      id={id}
      className={className}
      role="dialog"
      aria-modal="false"
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
        requestAnimationFrame(() => returnFocusRef?.current?.focus());
      }}
    >
      {children}
    </div>
  );
}
