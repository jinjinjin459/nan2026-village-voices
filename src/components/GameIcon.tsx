interface GameIconProps {
  name: string;
  size?: number;
}

export function GameIcon({ name, size = 22 }: GameIconProps) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name) {
    case "book": return <svg {...common}><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22Z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22Z"/></svg>;
    case "tree": return <svg {...common}><path d="M12 22v-7"/><path d="M8 20h8"/><path d="M12 2 5 13h14Z"/><path d="m12 6-5 9h10Z"/></svg>;
    case "joystick": return <svg {...common}><rect x="3" y="8" width="18" height="11" rx="5"/><path d="M8 12v4M6 14h4"/><circle cx="16.5" cy="12.5" r=".8" fill="currentColor" stroke="none"/><circle cx="18.5" cy="15" r=".8" fill="currentColor" stroke="none"/></svg>;
    case "bag": return <svg {...common}><path d="M5 8h14l1 13H4Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>;
    case "spark": return <svg {...common}><path d="m12 2 1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7Z"/></svg>;
    case "heart": return <svg {...common}><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/></svg>;
    case "leaf": return <svg {...common}><path d="M20 4C10 4 4 9 4 16c0 2 1 4 4 4 7 0 12-6 12-16Z"/><path d="M4 20c2-5 6-8 12-11"/></svg>;
    case "sound": return <svg {...common}><path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>;
    case "reset": return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>;
    case "arrow": return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case "close": return <svg {...common}><path d="m5 5 14 14M19 5 5 19"/></svg>;
    default: return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 17h.01"/></svg>;
  }
}
