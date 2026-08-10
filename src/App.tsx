import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BuildToolbar, type BuildSelection } from "./components/BuildToolbar";
import { DialoguePanel } from "./components/DialoguePanel";
import { PixelGameWorld } from "./components/PixelGameWorld";
import { BuildableSprite } from "./components/PixelSprite";
import { BUILDABLES, NPCS, QUEST_COPY, WORLD_HEIGHT, WORLD_WIDTH, createInitialSave } from "./pixel/data";
import {
  PIXEL_SAVE_KEY,
  canAfford,
  canPlaceAt,
  loadPixelSave,
  makePlacement,
  movePlayer,
  nearestNpc,
  refundResources,
  savePixelState,
  spendResources,
} from "./pixel/engine";
import type { Direction, NpcId, PixelSave, Point } from "./pixel/types";

const MOVEMENT_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);

function useViewportSize() {
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    function update() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function App() {
  const [game, setGame] = useState<PixelSave>(loadPixelSave);
  const [moving, setMoving] = useState(false);
  const [buildMode, setBuildMode] = useState(false);
  const [buildSelection, setBuildSelection] = useState<BuildSelection>("flower");
  const [dialogue, setDialogue] = useState<{ npcId: NpcId; line: string } | null>(null);
  const [toast, setToast] = useState("마을에 온 걸 환영해요!");
  const [helpOpen, setHelpOpen] = useState(false);
  const keys = useRef(new Set<string>());
  const gameRef = useRef(game);
  const lockedRef = useRef(false);
  const viewport = useViewportSize();

  gameRef.current = game;
  lockedRef.current = Boolean(dialogue) || helpOpen || buildMode;

  const nearbyNpc = useMemo(() => nearestNpc(game.player), [game.player]);

  useEffect(() => {
    const timer = window.setTimeout(() => savePixelState(game), 180);
    return () => window.clearTimeout(timer);
  }, [game]);

  useEffect(() => {
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();

    function tick(now: number) {
      const elapsed = Math.min((now - previous) / 1000, 0.04);
      previous = now;
      const pressed = keys.current;
      let dx = 0;
      let dy = 0;
      if (!lockedRef.current) {
        if (pressed.has("a") || pressed.has("arrowleft")) dx -= 1;
        if (pressed.has("d") || pressed.has("arrowright")) dx += 1;
        if (pressed.has("w") || pressed.has("arrowup")) dy -= 1;
        if (pressed.has("s") || pressed.has("arrowdown")) dy += 1;
      }

      const hasMovement = dx !== 0 || dy !== 0;
      setMoving(hasMovement);
      if (hasMovement) {
        const length = Math.hypot(dx, dy);
        const speed = 235 * elapsed;
        const direction: Direction = Math.abs(dx) > Math.abs(dy)
          ? dx < 0 ? "left" : "right"
          : dy < 0 ? "up" : "down";
        setGame((current) => ({
          ...current,
          direction,
          player: movePlayer(
            current.player,
            { x: (dx / length) * speed, y: (dy / length) * speed },
            current.placements,
          ),
        }));
      }
      frame = window.requestAnimationFrame(tick);
    }
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const closeDialogue = useCallback(() => setDialogue(null), []);

  const openNearbyDialogue = useCallback(() => {
    const current = gameRef.current;
    const npcId = nearestNpc(current.player);
    if (!npcId || lockedRef.current) return;
    const npc = NPCS[npcId];
    const count = current.talkCounts[npcId];
    const line = npc.lines[Math.min(count, npc.lines.length - 1)];
    setDialogue({ npcId, line });
    setGame((previousState) => ({
      ...previousState,
      talkCounts: {
        ...previousState.talkCounts,
        [npcId]: previousState.talkCounts[npcId] + 1,
      },
      questStage:
        previousState.questStage === "talk-lulu" && npcId === "lulu"
          ? "place-flower"
          : previousState.questStage === "talk-moka" && npcId === "moka"
            ? "complete"
            : previousState.questStage,
    }));
  }, []);

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (MOVEMENT_KEYS.has(key)) {
        event.preventDefault();
        keys.current.add(key);
      }
      if (key === "e" && !event.repeat) {
        event.preventDefault();
        openNearbyDialogue();
      }
      if (key === "b" && !event.repeat && !dialogue && !helpOpen) {
        setBuildMode((value) => !value);
      }
      if (key === "escape" && buildMode) setBuildMode(false);
    }
    function keyUp(event: KeyboardEvent) {
      keys.current.delete(event.key.toLowerCase());
    }
    function clearKeys() {
      keys.current.clear();
    }
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clearKeys);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clearKeys);
    };
  }, [buildMode, dialogue, helpOpen, openNearbyDialogue]);

  const camera = useMemo(() => {
    const scale = Math.max(viewport.width / WORLD_WIDTH, viewport.height / WORLD_HEIGHT);
    const scaledWidth = WORLD_WIDTH * scale;
    const scaledHeight = WORLD_HEIGHT * scale;
    return {
      scale,
      x: clamp(viewport.width / 2 - game.player.x * scale, viewport.width - scaledWidth, 0),
      y: clamp(viewport.height / 2 - game.player.y * scale, viewport.height - scaledHeight, 0),
    };
  }, [game.player.x, game.player.y, viewport.height, viewport.width]);

  function selectBuildTool(selection: BuildSelection) {
    setBuildSelection(selection);
    setBuildMode(true);
    setToast(selection === "demolish" ? "철거할 장식을 눌러주세요." : `${BUILDABLES[selection].name}을(를) 놓을 자리를 골라주세요.`);
  }

  function handleWorldPointer(point: Point) {
    if (buildSelection === "demolish") {
      let target = game.placements[0];
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const item of game.placements) {
        const itemDistance = Math.hypot(point.x - item.x, point.y - item.y);
        if (itemDistance < bestDistance) {
          bestDistance = itemDistance;
          target = item;
        }
      }
      if (!target || bestDistance > 90) {
        setToast("철거할 장식 가까이를 눌러주세요.");
        return;
      }
      setGame((current) => ({
        ...current,
        placements: current.placements.filter((item) => item.id !== target.id),
        resources: refundResources(current.resources, target),
      }));
      setToast(`${BUILDABLES[target.type].name}을(를) 정리했어요.`);
      return;
    }

    if (!canAfford(game.resources, buildSelection)) {
      setToast("자원이 부족해요.");
      return;
    }
    if (!canPlaceAt(point, buildSelection, game.placements)) {
      setToast("그곳에는 놓을 수 없어요. 빈 잔디밭을 골라주세요.");
      return;
    }
    const placement = makePlacement(buildSelection, point);
    setGame((current) => ({
      ...current,
      placements: [...current.placements, placement],
      resources: spendResources(current.resources, buildSelection),
      questStage:
        current.questStage === "place-flower" && buildSelection === "flower"
          ? "talk-moka"
          : current.questStage,
    }));
    setToast(`${BUILDABLES[buildSelection].name}을(를) 놓았어요!`);
  }

  function setTouchKey(key: string, active: boolean) {
    if (active) keys.current.add(key);
    else keys.current.delete(key);
  }

  function resetGame() {
    if (!window.confirm("지금까지 꾸민 마을을 모두 지우고 처음부터 시작할까요?")) return;
    window.localStorage.removeItem(PIXEL_SAVE_KEY);
    setGame(createInitialSave());
    setBuildMode(false);
    setToast("새 마을에서 다시 시작해요.");
  }

  const quest = QUEST_COPY[game.questStage];

  return (
    <main className="pixel-game-shell">
      <PixelGameWorld
        camera={camera}
        player={game.player}
        direction={game.direction}
        moving={moving}
        nearbyNpc={nearbyNpc}
        buildMode={buildMode}
        onWorldPointer={handleWorldPointer}
        onInteract={openNearbyDialogue}
      >
        {game.placements.map((item) => (
          <span
            className={`placed-item placed-${item.type}`}
            data-placement={item.type}
            key={item.id}
            style={{
              left: item.x,
              top: item.y,
              zIndex: item.type === "path" || item.type === "flower" ? 20 : Math.round(item.y),
            }}
          >
            <BuildableSprite type={item.type} />
          </span>
        ))}
      </PixelGameWorld>

      <header className="game-hud">
        <div className="pixel-brand"><span className="brand-leaf">♧</span><strong>마을의 목소리</strong></div>
        <div className="day-display"><span aria-hidden="true">☀</span>{game.day}일 차 · 아침</div>
        <div className="resource-display" aria-label="보유 자원">
          <span><i className="resource-wood">▰</i>나무 <strong>{game.resources.wood}</strong></span>
          <span><i className="resource-stone">◆</i>돌 <strong>{game.resources.stone}</strong></span>
          <span><i className="resource-coins">●</i>코인 <strong>{game.resources.coins}</strong></span>
        </div>
        <button className="help-button" type="button" onClick={() => setHelpOpen(true)} aria-label="게임 도움말">?</button>
      </header>

      <aside className={`quest-panel ${game.questStage === "complete" ? "is-complete" : ""}`}>
        <span className="quest-mark">{game.questStage === "complete" ? "✓" : "!"}</span>
        <div><strong>{quest.title}</strong><small>{quest.detail}</small></div>
      </aside>

      {nearbyNpc && !dialogue && !buildMode ? (
        <button className="interaction-prompt" type="button" onClick={openNearbyDialogue}>
          <kbd>E</kbd><span><strong>{NPCS[nearbyNpc].name}</strong>와 대화하기</span>
        </button>
      ) : null}

      <BuildToolbar
        open={buildMode}
        selected={buildSelection}
        resources={game.resources}
        onToggle={() => setBuildMode((value) => !value)}
        onSelect={selectBuildTool}
      />

      <nav className="touch-pad" aria-label="모바일 이동 패드">
        <button
          type="button"
          className="touch-up"
          aria-label="위로 이동"
          onPointerDown={() => setTouchKey("w", true)}
          onPointerUp={() => setTouchKey("w", false)}
          onPointerCancel={() => setTouchKey("w", false)}
        >▲</button>
        <button
          type="button"
          className="touch-left"
          aria-label="왼쪽으로 이동"
          onPointerDown={() => setTouchKey("a", true)}
          onPointerUp={() => setTouchKey("a", false)}
          onPointerCancel={() => setTouchKey("a", false)}
        >◀</button>
        <button
          type="button"
          className="touch-down"
          aria-label="아래로 이동"
          onPointerDown={() => setTouchKey("s", true)}
          onPointerUp={() => setTouchKey("s", false)}
          onPointerCancel={() => setTouchKey("s", false)}
        >▼</button>
        <button
          type="button"
          className="touch-right"
          aria-label="오른쪽으로 이동"
          onPointerDown={() => setTouchKey("d", true)}
          onPointerUp={() => setTouchKey("d", false)}
          onPointerCancel={() => setTouchKey("d", false)}
        >▶</button>
      </nav>

      {toast ? <div className="game-toast" role="status">{toast}</div> : null}

      {dialogue ? <DialoguePanel npcId={dialogue.npcId} line={dialogue.line} onClose={closeDialogue} /> : null}

      {helpOpen ? (
        <div className="help-layer" role="dialog" aria-modal="true" aria-labelledby="help-title">
          <section className="help-card">
            <button className="help-close" type="button" onClick={() => setHelpOpen(false)} aria-label="도움말 닫기">×</button>
            <h2 id="help-title">마을 산책 안내</h2>
            <p>주민과 이야기하고, 원하는 곳에 새로운 풍경을 만들어보세요.</p>
            <dl>
              <div><dt>이동</dt><dd>WASD · 방향키 · 화면 패드</dd></div>
              <div><dt>대화</dt><dd>주민 가까이에서 E</dd></div>
              <div><dt>가꾸기</dt><dd>B 또는 오른쪽 아래 버튼</dd></div>
              <div><dt>저장</dt><dd>모든 변화가 자동 저장</dd></div>
            </dl>
            <button className="help-primary" type="button" onClick={() => setHelpOpen(false)}>산책 계속하기</button>
            <button className="reset-button" type="button" onClick={resetGame}>마을 처음부터 시작</button>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default App;
