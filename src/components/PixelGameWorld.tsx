import { memo, type PointerEvent, type ReactNode } from "react";
import villageMap from "../assets/pixel/village-map.png";
import { NPCS, WORLD_HEIGHT, WORLD_WIDTH } from "../pixel/data";
import type { Direction, NpcId, Point } from "../pixel/types";
import { CharacterSprite } from "./PixelSprite";

interface Camera {
  x: number;
  y: number;
  scale: number;
}

interface Props {
  camera: Camera;
  player: Point;
  direction: Direction;
  moving: boolean;
  nearbyNpc: NpcId | null;
  buildMode: boolean;
  children: ReactNode;
  onWorldPointer: (point: Point) => void;
  onInteract: () => void;
}

export const PixelGameWorld = memo(function PixelGameWorld({
  camera,
  player,
  direction,
  moving,
  nearbyNpc,
  buildMode,
  children,
  onWorldPointer,
  onInteract,
}: Props) {
  function handlePointer(event: PointerEvent<HTMLDivElement>) {
    if (!buildMode) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    onWorldPointer({
      x: ((event.clientX - bounds.left) / bounds.width) * WORLD_WIDTH,
      y: ((event.clientY - bounds.top) / bounds.height) * WORLD_HEIGHT,
    });
  }

  return (
    <div className={`world-viewport ${buildMode ? "is-building" : ""}`}>
      <div
        className="pixel-world"
        data-testid="pixel-world"
        onPointerDown={handlePointer}
        style={{
          width: WORLD_WIDTH,
          height: WORLD_HEIGHT,
          backgroundImage: `url(${villageMap})`,
          transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,
        }}
      >
        {children}

        {(Object.keys(NPCS) as NpcId[]).map((id) => {
          const npc = NPCS[id];
          const isNearby = nearbyNpc === id;
          return (
            <button
              className={`world-character npc npc-${id} ${isNearby ? "is-nearby" : ""}`}
              key={id}
              style={{ left: npc.x, top: npc.y, zIndex: Math.round(npc.y) }}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (isNearby) onInteract();
              }}
              aria-label={`${npc.name}와 대화`}
            >
              <span className="npc-name">{npc.name}</span>
              {isNearby ? <span className="npc-prompt">E</span> : null}
              <CharacterSprite character={id} />
            </button>
          );
        })}

        <div
          className="world-character player-character"
          data-testid="player"
          style={{ left: player.x, top: player.y, zIndex: Math.round(player.y) }}
          aria-label="플레이어"
        >
          <CharacterSprite character="player" moving={moving} facing={direction} />
        </div>
      </div>
      {buildMode ? <div className="build-grid" aria-hidden="true" /> : null}
    </div>
  );
});
