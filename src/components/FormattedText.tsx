import { Fragment, type ReactNode } from "react";

/**
 * Minimaler, sicherer Markdown-Renderer (fett, kursiv, Inline-Code, Zeilenumbrüche).
 * Erzeugt React-Elemente statt HTML – dadurch kein XSS-Risiko.
 */
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g;

function renderInline(line: string): ReactNode[] {
  return line.split(INLINE).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function FormattedText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {renderInline(line)}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  );
}
