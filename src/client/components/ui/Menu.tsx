import { useEffect, useRef, type ReactNode, type RefObject } from "react";

export function Menu({
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
  label?: string;
  onDismiss: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      menu.current?.querySelector<HTMLElement>("[role='menuitem']:not([disabled])")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function items() {
    return Array.from(
      menu.current?.querySelectorAll<HTMLElement>("[role='menuitem']:not([disabled])") ?? [],
    );
  }

  return (
    <div
      ref={menu}
      id={id}
      className={className}
      role="menu"
      aria-label={label}
      onKeyDown={(event) => {
        const menuItems = items();
        const currentIndex = menuItems.findIndex((item) => item === document.activeElement);
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onDismiss();
          requestAnimationFrame(() => returnFocusRef?.current?.focus());
          return;
        }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        if (event.key === "Home") menuItems[0]?.focus();
        else if (event.key === "End") menuItems.at(-1)?.focus();
        else {
          const offset = event.key === "ArrowDown" ? 1 : -1;
          const nextIndex = (currentIndex + offset + menuItems.length) % menuItems.length;
          menuItems[nextIndex]?.focus();
        }
      }}
    >
      {children}
    </div>
  );
}
