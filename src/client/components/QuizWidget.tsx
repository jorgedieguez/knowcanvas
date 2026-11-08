import { CheckCircle2, Circle, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import type { QuizWidget as QuizWidgetData } from "../../shared/contracts";

export function QuizWidget({
  value,
  interactive,
}: {
  value: QuizWidgetData["data"];
  interactive: boolean;
}) {
  const [answerIds, setAnswerIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const correctIds = value.options
    .filter((option) => option.correct)
    .map((option) => option.id)
    .sort();
  const correct =
    submitted &&
    answerIds.length === correctIds.length &&
    [...answerIds].sort().every((answerId, index) => answerId === correctIds[index]);

  useEffect(() => {
    setAnswerIds([]);
    setSubmitted(false);
  }, [value.question, value.options, value.selectionMode]);

  function selectAnswer(optionId: string) {
    setAnswerIds((current) =>
      value.selectionMode === "multiple"
        ? current.includes(optionId)
          ? current.filter((answerId) => answerId !== optionId)
          : [...current, optionId]
        : [optionId],
    );
  }

  return (
    <section className="quiz-widget" aria-label="Ejercicio tipo test">
      <div className="quiz-heading">
        <span>Comprueba lo aprendido</span>
        <h3>{value.question.trim() || "Pregunta sin título"}</h3>
      </div>
      <fieldset disabled={!interactive || submitted}>
        <legend className="sr-only">
          {value.selectionMode === "multiple"
            ? "Elige todas las respuestas correctas"
            : "Elige una respuesta"}
        </legend>
        {value.options.map((option) => (
          <label
            className={`quiz-option ${answerIds.includes(option.id) ? "selected" : ""}`}
            key={option.id}
          >
            <input
              type={value.selectionMode === "multiple" ? "checkbox" : "radio"}
              name={`quiz-${value.question}`}
              checked={answerIds.includes(option.id)}
              onChange={() => selectAnswer(option.id)}
            />
            {answerIds.includes(option.id) ? (
              <CheckCircle2 size={19} aria-hidden="true" />
            ) : (
              <Circle size={19} aria-hidden="true" />
            )}
            <span>{option.label || "Respuesta sin texto"}</span>
          </label>
        ))}
      </fieldset>
      {interactive ? (
        submitted ? (
          <div
            className={`quiz-feedback ${correct ? "correct" : "incorrect"}`}
            role="status"
            aria-live="polite"
          >
            {correct ? (
              <CheckCircle2 size={20} aria-hidden="true" />
            ) : (
              <XCircle size={20} aria-hidden="true" />
            )}
            <div>
              <strong>{correct ? "¡Correcto!" : "Todavía no"}</strong>
              {value.showExplanation && value.explanation ? <p>{value.explanation}</p> : null}
            </div>
            {value.allowRetry ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setAnswerIds([]);
                  setSubmitted(false);
                }}
              >
                <RotateCcw size={15} aria-hidden="true" /> Reintentar
              </button>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            className="primary-button quiz-submit"
            disabled={answerIds.length === 0}
            onClick={() => setSubmitted(true)}
          >
            Comprobar respuesta
          </button>
        )
      ) : (
        <p className="quiz-author-hint">Vista previa · responde en modo Estudiar</p>
      )}
    </section>
  );
}
