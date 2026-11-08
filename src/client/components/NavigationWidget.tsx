import { ArrowLeft, ArrowRight, ExternalLink, ListTree } from "lucide-react";

import type { NavigationWidget as NavigationWidgetData } from "../../shared/contracts";

type NavigationItem = NonNullable<NavigationWidgetData["data"]["items"]>[number];

export function NavigationWidget({
  value,
  interactive,
  currentCanvasId,
}: {
  value: NavigationWidgetData["data"];
  interactive: boolean;
  currentCanvasId: string | undefined;
}) {
  const variant = value.variant ?? "button";
  const items = value.items ?? [];

  if (variant === "index") {
    return (
      <nav className="navigation-widget navigation-index" aria-label={value.title || "Índice"}>
        <header>
          <ListTree size={18} aria-hidden="true" />
          <strong>{value.title?.trim() || "Índice"}</strong>
        </header>
        <ol>
          {items.map((item, index) => (
            <li key={item.id}>
              <NavigationLink
                item={item}
                interactive={interactive}
                current={value.showCurrent !== false && item.canvasId === currentCanvasId}
                prefix={String(index + 1).padStart(2, "0")}
              />
            </li>
          ))}
        </ol>
        {items.length === 0 ? <small>No hay páginas incluidas.</small> : null}
      </nav>
    );
  }

  if (variant === "bar") {
    const foundIndex = items.findIndex((item) => item.canvasId === currentCanvasId);
    const currentIndex = foundIndex >= 0 ? foundIndex : 0;
    const previous = items[currentIndex - 1];
    const next = items[currentIndex + 1];
    const current = items[currentIndex];
    return (
      <nav className="navigation-widget navigation-bar" aria-label={value.title || "Navegación"}>
        <NavigationDirection item={previous} direction="previous" interactive={interactive} />
        <div className="navigation-bar-position" aria-live="polite">
          <strong>{current?.label ?? value.title?.trim() ?? "Navegación"}</strong>
          <span>{items.length ? `${currentIndex + 1} de ${items.length}` : "Sin páginas"}</span>
        </div>
        <NavigationDirection item={next} direction="next" interactive={interactive} />
      </nav>
    );
  }

  const destination = value.destination;
  const href =
    destination.kind === "canvas"
      ? `#canvas=${destination.canvasId}`
      : safeExternalUrl(destination.url);
  const unavailable = !interactive || !href;

  return (
    <div className="navigation-widget">
      <a
        className={`learning-navigation-button ${value.style}`}
        href={href || undefined}
        aria-disabled={unavailable}
        tabIndex={unavailable ? -1 : 0}
        target={destination.kind === "external" && value.openInNewTab ? "_blank" : undefined}
        rel={
          destination.kind === "external" && value.openInNewTab ? "noopener noreferrer" : undefined
        }
        onClick={(event) => {
          if (unavailable) event.preventDefault();
        }}
      >
        <span>{value.label.trim() || "Continuar"}</span>
        {destination.kind === "external" ? (
          <ExternalLink size={17} aria-hidden="true" />
        ) : (
          <ArrowRight size={17} aria-hidden="true" />
        )}
      </a>
      {!interactive ? (
        <small>Disponible en modo Estudiar</small>
      ) : !href ? (
        <small role="alert">Configura una URL válida.</small>
      ) : null}
    </div>
  );
}

function NavigationLink({
  item,
  interactive,
  current,
  prefix,
}: {
  item: NavigationItem;
  interactive: boolean;
  current: boolean;
  prefix: string;
}) {
  return (
    <a
      href={`#canvas=${item.canvasId}`}
      aria-current={current ? "page" : undefined}
      aria-disabled={!interactive}
      tabIndex={interactive ? 0 : -1}
      onClick={(event) => {
        if (!interactive) event.preventDefault();
      }}
    >
      <span aria-hidden="true">{prefix}</span>
      <strong>{item.label}</strong>
      <ArrowRight size={15} aria-hidden="true" />
    </a>
  );
}

function NavigationDirection({
  item,
  direction,
  interactive,
}: {
  item: NavigationItem | undefined;
  direction: "previous" | "next";
  interactive: boolean;
}) {
  const enabled = interactive && !!item;
  const label = direction === "previous" ? "Anterior" : "Siguiente";
  return (
    <a
      className={`navigation-direction ${direction}`}
      href={item ? `#canvas=${item.canvasId}` : undefined}
      aria-disabled={!enabled}
      tabIndex={enabled ? 0 : -1}
      onClick={(event) => {
        if (!enabled) event.preventDefault();
      }}
    >
      {direction === "previous" ? <ArrowLeft size={17} aria-hidden="true" /> : null}
      <span>
        <small>{label}</small>
        <strong>{item?.label ?? "—"}</strong>
      </span>
      {direction === "next" ? <ArrowRight size={17} aria-hidden="true" /> : null}
    </a>
  );
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}
