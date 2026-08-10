import { BUILDABLE_ORDER, BUILDABLES } from "../pixel/data";
import type { BuildableId, Resources } from "../pixel/types";
import { BuildableSprite } from "./PixelSprite";

export type BuildSelection = BuildableId | "demolish";

function Cost({ cost }: { cost: Partial<Resources> }) {
  const parts = [
    cost.wood ? `나무 ${cost.wood}` : "",
    cost.stone ? `돌 ${cost.stone}` : "",
    cost.coins ? `코인 ${cost.coins}` : "",
  ].filter(Boolean);
  return <small>{parts.join(" · ")}</small>;
}

export function BuildToolbar({
  open,
  selected,
  resources,
  onToggle,
  onSelect,
}: {
  open: boolean;
  selected: BuildSelection;
  resources: Resources;
  onToggle: () => void;
  onSelect: (selection: BuildSelection) => void;
}) {
  return (
    <section className={`build-toolbar ${open ? "is-open" : ""}`} aria-label="마을 가꾸기 도구">
      <div className="build-options">
        {BUILDABLE_ORDER.map((id) => {
          const item = BUILDABLES[id];
          const affordable =
            resources.wood >= (item.cost.wood || 0) &&
            resources.stone >= (item.cost.stone || 0) &&
            resources.coins >= (item.cost.coins || 0);
          return (
            <button
              type="button"
              className={selected === id ? "is-selected" : ""}
              key={id}
              onClick={() => onSelect(id)}
              disabled={!affordable}
              aria-pressed={selected === id}
              title={item.description}
            >
              <span className="toolbar-sprite"><BuildableSprite type={id} /></span>
              <strong>{item.name}</strong>
              <Cost cost={item.cost} />
            </button>
          );
        })}
        <button
          type="button"
          className={`demolish-tool ${selected === "demolish" ? "is-selected" : ""}`}
          onClick={() => onSelect("demolish")}
          aria-pressed={selected === "demolish"}
        >
          <span className="hammer-icon">⌁</span>
          <strong>철거</strong>
          <small>비용 일부 회수</small>
        </button>
      </div>
      <button className="build-toggle" type="button" onClick={onToggle} aria-expanded={open}>
        <span aria-hidden="true">{open ? "×" : "⌂"}</span>
        {open ? "가꾸기 끝내기" : "마을 가꾸기"}
      </button>
    </section>
  );
}
