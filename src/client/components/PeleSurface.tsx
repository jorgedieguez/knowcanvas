import { useEffect, useRef, useState } from "react";

export function PeleSurface({ source }: { source: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("pele/lazy")
      .then(({ renderAsync }) =>
        renderAsync(source, {
          links: false,
          images: false,
          limit: 50_000,
          outputLimit: 1_000_000,
          idPrefix: `knowcanvas-${crypto.randomUUID()}`,
          responsive: true,
        }),
      )
      .then(({ svg }) => {
        if (cancelled || !container.current) return;
        container.current.innerHTML = svg;
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "No se pudo dibujar el diagrama.");
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (error)
    return (
      <p className="pele-error" role="alert">
        {error}
      </p>
    );
  return <div ref={container} className="pele-surface" aria-label="Diagrama Mermaid" />;
}
