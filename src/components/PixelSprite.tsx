import { memo } from "react";
import characterAtlas from "../assets/pixel/characters.png";
import buildableAtlas from "../assets/pixel/buildables-v2.png";
import fishingAtlas from "../assets/pixel/fishing.png";
import { BUILDABLES, FISH_REWARDS } from "../pixel/data";
import type { BuildableId, FishingReward, NpcId } from "../pixel/types";

type CharacterId = "player" | NpcId;

const CHARACTER_POSITION: Record<CharacterId, string> = {
  player: "0% 0%",
  lulu: "100% 0%",
  moka: "0% 100%",
  dubu: "100% 100%",
};

export const CharacterSprite = memo(function CharacterSprite({
  character,
  moving = false,
  facing = "down",
}: {
  character: CharacterId;
  moving?: boolean;
  facing?: "up" | "down" | "left" | "right";
}) {
  return (
    <span
      className={`character-sprite ${moving ? "is-walking" : ""} facing-${facing}`}
      style={{
        backgroundImage: `url(${characterAtlas})`,
        backgroundPosition: CHARACTER_POSITION[character],
      }}
      aria-hidden="true"
    />
  );
});

export const BuildableSprite = memo(function BuildableSprite({
  type,
}: {
  type: BuildableId;
}) {
  const definition = BUILDABLES[type];
  const x = definition.atlasColumn === 0 ? "0%" : definition.atlasColumn === 1 ? "50%" : "100%";
  const y = definition.atlasRow === 0 ? "0%" : "100%";
  return (
    <span
      className={`buildable-sprite buildable-${type}`}
      style={{
        width: definition.width,
        height: definition.height,
        backgroundImage: `url(${buildableAtlas})`,
        backgroundPosition: `${x} ${y}`,
      }}
      aria-hidden="true"
    />
  );
});

export const FishingSprite = memo(function FishingSprite({
  type,
}: {
  type: "rod" | "bobber" | FishingReward;
}) {
  const atlas = type === "rod"
    ? { atlasColumn: 0, atlasRow: 0 }
    : type === "bobber"
      ? { atlasColumn: 1, atlasRow: 0 }
      : FISH_REWARDS[type];
  const x = atlas.atlasColumn === 0 ? "0%" : atlas.atlasColumn === 1 ? "50%" : "100%";
  const y = atlas.atlasRow === 0 ? "0%" : "100%";
  return (
    <span
      className={`fishing-sprite fishing-${type}`}
      style={{
        backgroundImage: `url(${fishingAtlas})`,
        backgroundPosition: `${x} ${y}`,
      }}
      aria-hidden="true"
    />
  );
});
