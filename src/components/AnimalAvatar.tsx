import type { Emotion, ResidentId } from "../game/types";

interface AnimalAvatarProps {
  residentId: ResidentId;
  emotion?: Emotion;
  size?: "small" | "medium" | "large";
  className?: string;
}

export function AnimalAvatar({
  residentId,
  emotion = "neutral",
  size = "medium",
  className = "",
}: AnimalAvatarProps) {
  const face = {
    neutral: { eye: "M 38 49 Q 42 47 46 49", mouth: "M 45 63 Q 50 65 55 63" },
    happy: { eye: "M 38 50 Q 42 54 46 50", mouth: "M 44 62 Q 50 69 56 62" },
    annoyed: { eye: "M 38 48 L 46 50", mouth: "M 45 66 Q 50 62 55 65" },
    worried: { eye: "M 38 51 Q 42 48 46 50", mouth: "M 45 66 Q 50 61 55 66" },
  }[emotion];

  const palette = {
    lulu: { body: "#fff7ee", shade: "#f3d9cf", inner: "#f4aaa9", detail: "#9c5d62" },
    moka: { body: "#80685f", shade: "#5f4a45", inner: "#d99b96", detail: "#392f2d" },
    dubu: { body: "#f0bc62", shade: "#c9823d", inner: "#87502c", detail: "#5c3b29" },
  }[residentId];

  return (
    <svg
      className={`animal-avatar animal-avatar--${size} ${className}`}
      viewBox="0 0 100 118"
      role="img"
      aria-label={`${residentId} ${emotion} 표정`}
    >
      <ellipse cx="50" cy="109" rx="31" ry="7" fill="rgba(71, 61, 44, .12)" />
      {residentId === "lulu" && (
        <>
          <path d="M28 35 C17 12 23 1 31 4 C39 7 40 23 39 38Z" fill={palette.body} stroke={palette.detail} strokeWidth="2.2" />
          <path d="M33 34 C27 16 29 10 32 10 C36 12 37 24 36 35Z" fill={palette.inner} opacity=".8" />
          <path d="M61 38 C59 18 63 4 70 5 C79 8 78 25 71 42Z" fill={palette.body} stroke={palette.detail} strokeWidth="2.2" />
          <path d="M65 37 C65 20 68 12 70 12 C74 14 73 26 69 39Z" fill={palette.inner} opacity=".8" />
        </>
      )}
      {residentId === "moka" && (
        <>
          <path d="M26 43 L27 17 L45 35Z" fill={palette.body} stroke={palette.detail} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M74 43 L73 17 L55 35Z" fill={palette.body} stroke={palette.detail} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M30 32 L31 23 L39 35Z" fill={palette.inner} opacity=".8" />
          <path d="M70 32 L69 23 L61 35Z" fill={palette.inner} opacity=".8" />
        </>
      )}
      {residentId === "dubu" && (
        <>
          <path d="M31 40 C15 33 12 47 19 62 C22 68 29 65 35 57Z" fill={palette.shade} stroke={palette.detail} strokeWidth="2.2" />
          <path d="M69 40 C85 33 88 47 81 62 C78 68 71 65 65 57Z" fill={palette.shade} stroke={palette.detail} strokeWidth="2.2" />
        </>
      )}
      <path d="M25 55 C24 34 38 27 50 27 C65 27 77 37 75 57 C73 74 64 83 50 84 C35 84 26 73 25 55Z" fill={palette.body} stroke={palette.detail} strokeWidth="2.2" />
      {residentId === "moka" && <path d="M41 30 Q50 39 59 30" fill="none" stroke={palette.shade} strokeWidth="5" strokeLinecap="round" />}
      <g fill="none" stroke={palette.detail} strokeWidth="2.6" strokeLinecap="round">
        <path d={face.eye} />
        <path d={face.eye} transform="translate(16 0)" />
        <path d={face.mouth} />
      </g>
      <path d="M47 57 Q50 54 53 57 Q50 61 47 57" fill={residentId === "moka" ? "#d88f8d" : palette.detail} />
      {residentId === "lulu" && <circle cx="34" cy="60" r="4" fill="#f2a2a2" opacity=".45" />}
      {residentId === "lulu" && <circle cx="66" cy="60" r="4" fill="#f2a2a2" opacity=".45" />}
      {residentId === "moka" && (
        <g stroke={palette.detail} strokeWidth="1.2" opacity=".7">
          <path d="M37 59 L20 56" /><path d="M37 63 L18 65" />
          <path d="M63 59 L80 56" /><path d="M63 63 L82 65" />
        </g>
      )}
      <path d="M32 82 Q50 73 68 82 L74 104 Q50 114 26 104Z" fill={palette.shade} stroke={palette.detail} strokeWidth="2.2" />
      <path d="M42 82 L50 92 L58 82" fill="#fff3d5" opacity=".85" />
      {emotion === "happy" && (
        <g fill="#f3c34f">
          <path d="M17 33 l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
          <circle cx="82" cy="36" r="2.4" />
        </g>
      )}
      {emotion === "annoyed" && <path d="M76 34 q9 2 4 10" fill="none" stroke="#a84f4f" strokeWidth="2.5" strokeLinecap="round" />}
      {emotion === "worried" && <path d="M77 38 q5 6 0 10 q-5-4 0-10" fill="#73a8c2" opacity=".8" />}
    </svg>
  );
}
