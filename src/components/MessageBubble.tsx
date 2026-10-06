import { FormattedText } from "./FormattedText";

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

export function MessageBubble({ message, streaming }: { message: UiMessage; streaming?: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={`message ${isUser ? "message--user" : "message--assistant"}`}>
      {!isUser && <span className="message__label">J.A.V.I.S.</span>}
      <div className={`bubble ${message.error ? "bubble--error" : ""}`}>
        {message.content ? (
          <FormattedText text={message.content} />
        ) : (
          <span className="typing" aria-label="J.A.V.I.S. denkt nach">
            <i />
            <i />
            <i />
          </span>
        )}
        {streaming && message.content && <span className="caret" aria-hidden="true" />}
      </div>
    </div>
  );
}
