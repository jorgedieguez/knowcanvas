import { ArrowDown, ArrowUp, CheckCircle2, Circle, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { SortingWidget as SortingWidgetData } from "../../shared/contracts";

export function SortingWidget({
  value,
  interactive,
}: {
  value: SortingWidgetData["data"];
  interactive: boolean;
}) {
  const correctOrder = useMemo(() => value.items.map((item) => item.id), [value.items]);
  const [order, setOrder] = useState<string[]>(correctOrder);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setOrder(interactive ? [...correctOrder].reverse() : correctOrder);
    setAssignments({});
    setActiveItemId(null);
    setSubmitted(false);
  }, [correctOrder, interactive, value.mode]);

  const correct =
    value.mode === "order"
      ? order.every((itemId, index) => itemId === correctOrder[index])
      : value.items.every((item) => assignments[item.id] === item.targetId);
  const complete =
    value.mode === "order" || value.items.every((item) => Boolean(assignments[item.id]));

  function reset() {
    setOrder(interactive ? [...correctOrder].reverse() : correctOrder);
    setAssignments({});
    setActiveItemId(null);
    setSubmitted(false);
  }

  function move(itemId: string, offset: -1 | 1) {
    setOrder((current) => {
      const index = current.indexOf(itemId);
      const nextIndex = Math.max(0, Math.min(current.length - 1, index + offset));
      if (index === nextIndex) return current;
      const next = [...current];
      next.splice(index, 1);
      next.splice(nextIndex, 0, itemId);
      return next;
    });
  }

  function assign(targetId: string) {
    if (!activeItemId) return;
    setAssignments((current) => {
      const next =
        value.mode === "match"
          ? Object.fromEntries(
              Object.entries(current).filter(
                ([, assignedTargetId]) => assignedTargetId !== targetId,
              ),
            )
          : { ...current };
      next[activeItemId] = targetId;
      return next;
    });
    setActiveItemId(null);
  }

  return (
    <section className="sorting-widget" aria-label={value.title || "Actividad interactiva"}>
      <header>
        <span>
          {value.mode === "classify"
            ? "Clasifica"
            : value.mode === "order"
              ? "Ordena"
              : "Relaciona"}
        </span>
        <h3>{value.title || "Actividad sin título"}</h3>
        <p>{value.prompt}</p>
      </header>

      {value.mode === "order" ? (
        <ol className="sorting-order-list">
          {order.map((itemId, index) => {
            const item = value.items.find((candidate) => candidate.id === itemId);
            if (!item) return null;
            return (
              <li key={item.id}>
                <span className="sorting-position">{index + 1}</span>
                <span>{item.label}</span>
                <span className="sorting-move-actions">
                  <button
                    type="button"
                    aria-label={`Subir ${item.label}`}
                    disabled={!interactive || submitted || index === 0}
                    onClick={() => move(item.id, -1)}
                  >
                    <ArrowUp size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Bajar ${item.label}`}
                    disabled={!interactive || submitted || index === order.length - 1}
                    onClick={() => move(item.id, 1)}
                  >
                    <ArrowDown size={15} aria-hidden="true" />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="sorting-assignment">
          <div className="sorting-items" aria-label="Elementos para colocar">
            {value.items.map((item) => {
              const target = value.targets.find(
                (candidate) => candidate.id === assignments[item.id],
              );
              return (
                <button
                  key={item.id}
                  type="button"
                  className={activeItemId === item.id ? "active" : ""}
                  aria-pressed={activeItemId === item.id}
                  disabled={!interactive || submitted}
                  onClick={() => setActiveItemId(item.id)}
                >
                  {activeItemId === item.id ? (
                    <CheckCircle2 size={16} aria-hidden="true" />
                  ) : (
                    <Circle size={16} aria-hidden="true" />
                  )}
                  <span>{item.label}</span>
                  {target ? <small>{target.label}</small> : null}
                </button>
              );
            })}
          </div>
          <div className="sorting-targets" aria-label="Destinos">
            {value.targets.map((target) => (
              <button
                key={target.id}
                type="button"
                disabled={!interactive || submitted || !activeItemId}
                onClick={() => assign(target.id)}
              >
                <strong>{target.label}</strong>
                <small>
                  {Object.values(assignments).filter((targetId) => targetId === target.id).length}
                  colocados
                </small>
              </button>
            ))}
          </div>
        </div>
      )}

      {interactive ? (
        submitted ? (
          <div
            className={`sorting-feedback ${correct ? "correct" : "incorrect"}`}
            role="status"
            aria-live="polite"
          >
            {correct ? (
              <CheckCircle2 size={20} aria-hidden="true" />
            ) : (
              <XCircle size={20} aria-hidden="true" />
            )}
            <strong>{correct ? "¡Actividad completada!" : "Revisa la colocación"}</strong>
            {!correct && value.allowRetry ? (
              <button className="secondary-button" type="button" onClick={reset}>
                <RotateCcw size={15} aria-hidden="true" /> Reintentar
              </button>
            ) : null}
          </div>
        ) : (
          <button
            className="primary-button sorting-submit"
            type="button"
            disabled={!complete}
            onClick={() => setSubmitted(true)}
          >
            Comprobar actividad
          </button>
        )
      ) : (
        <p className="quiz-author-hint">Vista previa · completa la actividad en modo Estudiar</p>
      )}
    </section>
  );
}
