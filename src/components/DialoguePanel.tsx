import { useEffect, useRef } from "react";
import { NPCS } from "../pixel/data";
import type { NpcId } from "../pixel/types";
import { CharacterSprite } from "./PixelSprite";

export function DialoguePanel({
  npcId,
  line,
  onClose,
}: {
  npcId: NpcId;
  line: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const npc = NPCS[npcId];

  useEffect(() => {
    closeRef.current?.focus();
    function handleKey(event: KeyboardEvent) {
      if (["e", "Enter", " ", "Escape"].includes(event.key)) {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="dialogue-layer" role="dialog" aria-modal="true" aria-labelledby="pixel-speaker">
      <section className="pixel-dialogue">
        <div className="dialogue-portrait"><CharacterSprite character={npcId} /></div>
        <div className="dialogue-copy">
          <div className="dialogue-heading">
            <div><h2 id="pixel-speaker">{npc.name}</h2><span>{npc.role}</span></div>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="대화 닫기">×</button>
          </div>
          <p>“{line}”</p>
          <button className="dialogue-continue" type="button" onClick={onClose}>대화 마치기 <kbd>E</kbd></button>
        </div>
      </section>
    </div>
  );
}
