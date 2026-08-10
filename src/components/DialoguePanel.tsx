import { useEffect, useRef, useState, type FormEvent } from "react";
import { NPCS } from "../pixel/data";
import type { NpcId } from "../pixel/types";
import { CharacterSprite } from "./PixelSprite";

export function DialoguePanel({
  npcId,
  line,
  context,
  memory,
  provider,
  onSpeak,
  onClose,
}: {
  npcId: NpcId;
  line: string;
  context?: string;
  memory?: string;
  provider: "luna" | "local";
  onSpeak: (message: string) => Promise<void>;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const npc = NPCS[npcId];

  useEffect(() => {
    inputRef.current?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextMessage = message.trim();
    if (!nextMessage || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onSpeak(nextMessage);
      setMessage("");
    } catch {
      setError("잠시 생각이 엉켰어요. 다시 말해 주세요.");
    } finally {
      setSubmitting(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  return (
    <div className="dialogue-layer" role="dialog" aria-modal="true" aria-labelledby="pixel-speaker">
      <section className="pixel-dialogue ai-dialogue">
        <div className="dialogue-portrait"><CharacterSprite character={npcId} /></div>
        <div className="dialogue-copy">
          <div className="dialogue-heading">
            <div>
              <h2 id="pixel-speaker">{npc.name}</h2>
              <span>{context || npc.role}</span>
            </div>
            <span className={`mind-provider provider-${provider}`} aria-label={provider === "luna" ? "GPT-5.6 Luna 연결" : "로컬 마을 두뇌"}>
              {provider === "luna" ? "Luna low" : "마을 두뇌"}
            </span>
            <button type="button" onClick={onClose} aria-label="대화 닫기">×</button>
          </div>
          <p data-testid="npc-dialogue">“{line}”</p>
          <form className="ai-speak-form" onSubmit={submit}>
            <label htmlFor="npc-free-message" className="sr-only">{npc.name}에게 할 말</label>
            <input
              ref={inputRef}
              id="npc-free-message"
              value={message}
              maxLength={160}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={`${npc.name}에게 하고 싶은 말을 적어보세요`}
              disabled={submitting}
            />
            <button type="submit" disabled={!message.trim() || submitting}>{submitting ? "생각 중…" : "말하기"}</button>
          </form>
          {error ? <small className="ai-dialogue-error" role="alert">{error}</small> : null}
          <div className="npc-memory-line">
            <span aria-hidden="true">♥</span>
            <strong>기억</strong>
            <span>{memory || "아직 함께 만든 기억이 없어요."}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
