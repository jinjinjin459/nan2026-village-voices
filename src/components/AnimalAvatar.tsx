import luluRender from "../assets/residents/lulu-3d.webp";
import mokaRender from "../assets/residents/moka-3d.webp";
import dubuRender from "../assets/residents/dubu-3d.webp";
import type { Emotion, ResidentId } from "../game/types";

interface AnimalAvatarProps {
  residentId: ResidentId;
  emotion?: Emotion;
  size?: "small" | "medium" | "large";
  className?: string;
}

const residentRenders: Record<ResidentId, string> = {
  lulu: luluRender,
  moka: mokaRender,
  dubu: dubuRender,
};

const residentNames: Record<ResidentId, string> = {
  lulu: "루루",
  moka: "모카",
  dubu: "두부",
};

const emotionNames: Record<Emotion, string> = {
  neutral: "차분한",
  happy: "기쁜",
  annoyed: "못마땅한",
  worried: "걱정스러운",
};

export function AnimalAvatar({
  residentId,
  emotion = "neutral",
  size = "medium",
  className = "",
}: AnimalAvatarProps) {
  return (
    <span
      className={`animal-avatar animal-avatar--${residentId} animal-avatar--${emotion} animal-avatar--${size} ${className}`}
      role="img"
      aria-label={`${emotionNames[emotion]} 표정의 ${residentNames[residentId]} 3D 캐릭터`}
    >
      <span className="animal-avatar__shadow" aria-hidden="true" />
      <img
        className="animal-avatar__render"
        src={residentRenders[residentId]}
        alt=""
        draggable={false}
        decoding="async"
      />
      <span className="animal-avatar__emotion" aria-hidden="true" />
    </span>
  );
}
