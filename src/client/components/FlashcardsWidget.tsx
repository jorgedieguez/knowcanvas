import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import type { FlashcardsWidget as FlashcardsWidgetData } from "../../shared/contracts";
import { RichTextPreview } from "./RichTextEditor";

export function FlashcardsWidget({
  value,
  interactive,
}: {
  value: FlashcardsWidgetData["data"];
  interactive: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [side, setSide] = useState<"front" | "back">("front");
  const card = value.cards[index] ?? value.cards[0];

  useEffect(() => {
    if (index >= value.cards.length) setIndex(Math.max(0, value.cards.length - 1));
  }, [index, value.cards.length]);

  function navigate(next: number) {
    setIndex(Math.max(0, Math.min(value.cards.length - 1, next)));
    setSide("front");
  }

  if (!card) return null;
  return (
    <section
      className="flashcards-widget"
      aria-label={value.title || "Tarjetas de estudio"}
      data-interactive={interactive}
    >
      <header>
        <h3>{value.title}</h3>
        <span>
          {index + 1} de {value.cards.length}
        </span>
      </header>
      <div className={`flashcard-surface is-${side}`} aria-live="polite">
        <span className="flashcard-side-label">{side === "front" ? "Pregunta" : "Respuesta"}</span>
        <RichTextPreview value={side === "front" ? card.front : card.back} />
      </div>
      <div className="flashcard-actions">
        <button
          type="button"
          aria-label="Tarjeta anterior"
          disabled={index === 0}
          onClick={() => navigate(index - 1)}
        >
          <ArrowLeft size={16} />
        </button>
        <button
          className="flashcard-flip"
          type="button"
          onClick={() => setSide((current) => (current === "front" ? "back" : "front"))}
        >
          <RefreshCw size={16} />
          {side === "front" ? "Mostrar respuesta" : "Volver a la pregunta"}
        </button>
        <button
          type="button"
          aria-label="Tarjeta siguiente"
          disabled={index === value.cards.length - 1}
          onClick={() => navigate(index + 1)}
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}
