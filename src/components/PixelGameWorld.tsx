import { memo, type PointerEvent, type ReactNode } from "react";
import expandedVillageMap from "../assets/pixel/expanded-village-map.png";
import houseInterior from "../assets/pixel/house-interior.png";
import { BED_POINT, FISHING_SPOT, HOME_EXIT, HOUSE_DOOR, NPCS, SCENE_SIZE } from "../pixel/data";
import type { Direction, LocationId, NpcId, NpcRuntime, Point } from "../pixel/types";
import { CharacterSprite } from "./PixelSprite";

interface Camera {
  x: number;
  y: number;
  scale: number;
}

interface Props {
  camera: Camera;
  location: LocationId;
  player: Point;
  direction: Direction;
  moving: boolean;
  npcs: Record<NpcId, NpcRuntime>;
  nearbyNpc: NpcId | null;
  buildMode: boolean;
  night: boolean;
  nearbyAction: LandmarkAction | null;
  children: ReactNode;
  onWorldPointer: (point: Point) => void;
  onNpcInteract: (npcId: NpcId) => void;
  onPrimaryAction: () => void;
}

export type LandmarkAction = "fish" | "enter-home" | "exit-home" | "sleep";

const WORLD_LANDMARKS = [
  { action: "fish", point: FISHING_SPOT, icon: "♒", label: "낚시터" },
  { action: "enter-home", point: HOUSE_DOOR, icon: "⌂", label: "우리 집" },
] satisfies Array<{ action: LandmarkAction; point: Point; icon: string; label: string }>;

const HOME_LANDMARKS = [
  { action: "sleep", point: BED_POINT, icon: "☾", label: "침대" },
  { action: "exit-home", point: HOME_EXIT, icon: "↡", label: "마을로" },
] satisfies Array<{ action: LandmarkAction; point: Point; icon: string; label: string }>;

const CAUSEWAY_PLANKS = Array.from({ length: 14 }, (_, index) => index);

const WORLD_LIGHTS: Point[] = [
  { x: 885, y: 575 },
  { x: 1245, y: 575 },
  { x: 1490, y: 220 },
  { x: 1705, y: 220 },
  { x: 1295, y: 340 },
];

export const PixelGameWorld = memo(function PixelGameWorld({
  camera,
  location,
  player,
  direction,
  moving,
  npcs,
  nearbyNpc,
  buildMode,
  night,
  nearbyAction,
  children,
  onWorldPointer,
  onNpcInteract,
  onPrimaryAction,
}: Props) {
  const scene = SCENE_SIZE[location];

  function handlePointer(event: PointerEvent<HTMLDivElement>) {
    if (!buildMode || location !== "world") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    onWorldPointer({
      x: ((event.clientX - bounds.left) / bounds.width) * scene.width,
      y: ((event.clientY - bounds.top) / bounds.height) * scene.height,
    });
  }

  return (
    <div className={`world-viewport scene-${location} ${buildMode ? "is-building" : ""} ${night ? "is-night" : "is-day"}`}>
      <div
        className="pixel-world"
        data-testid="pixel-world"
        data-location={location}
        onPointerDown={handlePointer}
        style={{
          width: scene.width,
          height: scene.height,
          backgroundImage: `url(${location === "world" ? expandedVillageMap : houseInterior})`,
          transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,
        }}
      >
        {children}

        {location === "world" ? (
          <span className="fishing-causeway" aria-hidden="true">
            {CAUSEWAY_PLANKS.map((plank) => <i key={plank} />)}
          </span>
        ) : null}

        {(location === "world" ? WORLD_LANDMARKS : HOME_LANDMARKS).map((landmark) => {
          const isNearby = nearbyAction === landmark.action;
          return (
            <button
              className={`world-landmark landmark-${landmark.action} ${isNearby ? "is-nearby" : ""}`}
              data-landmark={landmark.action}
              key={landmark.action}
              style={{ left: landmark.point.x, top: landmark.point.y, zIndex: Math.round(landmark.point.y) + 4 }}
              type="button"
              disabled={!isNearby}
              onClick={(event) => {
                event.stopPropagation();
                onPrimaryAction();
              }}
              aria-label={`${landmark.label}${isNearby ? " 이용하기" : " 위치"}`}
            >
              <span aria-hidden="true">{landmark.icon}</span>
              <strong>{landmark.label}</strong>
              {isNearby ? <kbd>E</kbd> : null}
            </button>
          );
        })}

        {location === "world" ? (Object.keys(NPCS) as NpcId[]).map((id) => {
          const npc = NPCS[id];
          const runtime = npcs[id];
          const isNearby = nearbyNpc === id;
          return (
            <button
              className={`world-character npc npc-${id} ${isNearby ? "is-nearby" : ""} is-${runtime.activity}`}
              data-npc={id}
              key={id}
              style={{ left: runtime.x, top: runtime.y, zIndex: Math.round(runtime.y) }}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (isNearby) onNpcInteract(id);
              }}
              aria-label={`${npc.name}와 대화`}
            >
              {runtime.bubble ? <span className="npc-social-bubble">{runtime.bubble}</span> : null}
              <span className="npc-name"><strong>{npc.name}</strong><small>{runtime.goal}</small></span>
              {isNearby ? <span className="npc-prompt">E</span> : null}
              <CharacterSprite character={id} moving={runtime.activity === "walking"} facing={runtime.direction} />
            </button>
          );
        }) : null}

        <div
          className="world-character player-character"
          data-testid="player"
          style={{ left: player.x, top: player.y, zIndex: Math.round(player.y) }}
          aria-label="플레이어"
        >
          <CharacterSprite character="player" moving={moving} facing={direction} />
        </div>

        {night ? (
          <div className="night-effects" aria-hidden="true">
            {(location === "world" ? WORLD_LIGHTS : [{ x: 345, y: 190 }, { x: 600, y: 205 }]).map((light, index) => (
              <i key={`${light.x}-${light.y}`} style={{ left: light.x, top: light.y, animationDelay: `${index * -0.4}s` }} />
            ))}
          </div>
        ) : null}
      </div>
      {night ? <div className="night-tint" aria-hidden="true" /> : null}
      {buildMode ? <div className="build-grid" aria-hidden="true" /> : null}
    </div>
  );
});
