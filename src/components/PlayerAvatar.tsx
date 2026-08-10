import playerRender from "../assets/residents/player-3d.webp";

export function PlayerAvatar() {
  return (
    <span className="player-avatar-3d" role="img" aria-label="마을을 산책하는 3D 플레이어 캐릭터">
      <span className="player-avatar-3d__shadow" aria-hidden="true" />
      <img src={playerRender} alt="" draggable={false} decoding="async" />
    </span>
  );
}
