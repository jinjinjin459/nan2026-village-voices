import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BuildToolbar, type BuildSelection } from "./components/BuildToolbar";
import { DialoguePanel } from "./components/DialoguePanel";
import { FishingPanel } from "./components/FishingPanel";
import { PixelGameWorld } from "./components/PixelGameWorld";
import { BuildableSprite } from "./components/PixelSprite";
import {
  BED_POINT,
  BUILDABLES,
  FISHING_SPOT,
  FISH_REWARDS,
  HOME_EXIT,
  HOUSE_DOOR,
  NPCS,
  QUEST_COPY,
  SCENE_SIZE,
  TIME_PHASE_MS,
  createInitialSave,
} from "./pixel/data";
import {
  LEGACY_PIXEL_SAVE_KEY,
  PIXEL_SAVE_KEY,
  advanceTime,
  canAfford,
  canPlaceAt,
  distance,
  enterHome,
  loadPixelSave,
  makePlacement,
  movePlayer,
  nearestNpc,
  refundResources,
  resetToWorld,
  savePixelState,
  sleepUntilMorning,
  spendResources,
} from "./pixel/engine";
import { createNpcRuntime, stepNpcSimulation } from "./pixel/npcSimulation";
import type { Direction, FishingReward, NpcId, NpcRuntime, PixelSave, Point } from "./pixel/types";

const MOVEMENT_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);
const ACTION_RADIUS = {
  fish: 150,
  "enter-home": 135,
  "exit-home": 120,
  sleep: 140,
} as const;

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

function formatCountdown(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function App() {
  const [game, setGame] = useState<PixelSave>(loadPixelSave);
  const [npcs, setNpcs] = useState<Record<NpcId, NpcRuntime>>(createNpcRuntime);
  const [moving, setMoving] = useState(false);
  const [buildMode, setBuildMode] = useState(false);
  const [buildSelection, setBuildSelection] = useState<BuildSelection>("flower");
  const [dialogue, setDialogue] = useState<{ npcId: NpcId; line: string; context: string } | null>(null);
  const [fishingOpen, setFishingOpen] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const [toast, setToast] = useState("서쪽 부두에서 낚시하고, 중앙 집 문으로 들어갈 수 있어요!");
  const [helpOpen, setHelpOpen] = useState(false);
  const [now, setNow] = useState(Date.now);
  const keys = useRef(new Set<string>());
  const gameRef = useRef(game);
  const npcRef = useRef(npcs);
  const lockedRef = useRef(false);
  const viewport = useViewportSize();

  gameRef.current = game;
  npcRef.current = npcs;
  lockedRef.current = Boolean(dialogue) || fishingOpen || sleeping || helpOpen || buildMode;

  const npcPositions = useMemo(() => Object.fromEntries(
    (Object.keys(npcs) as NpcId[]).map((id) => [id, { x: npcs[id].x, y: npcs[id].y }]),
  ) as Record<NpcId, Point>, [npcs]);

  const nearbyNpc = useMemo(
    () => game.location === "world" ? nearestNpc(game.player, npcPositions) : null,
    [game.location, game.player, npcPositions],
  );

  const nearbyAction = useMemo(() => {
    if (game.location === "home") {
      if (distance(game.player, BED_POINT) < ACTION_RADIUS.sleep) return "sleep" as const;
      if (distance(game.player, HOME_EXIT) < ACTION_RADIUS["exit-home"]) return "exit-home" as const;
      return null;
    }
    if (distance(game.player, FISHING_SPOT) < ACTION_RADIUS.fish) return "fish" as const;
    if (distance(game.player, HOUSE_DOOR) < ACTION_RADIUS["enter-home"]) return "enter-home" as const;
    return null;
  }, [game.location, game.player]);

  useEffect(() => {
    const timer = window.setTimeout(() => savePixelState(game), 180);
    return () => window.clearTimeout(timer);
  }, [game]);

  useEffect(() => {
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      setGame((current) => advanceTime(current, tick));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!sleeping) return;
    const timer = window.setTimeout(() => {
      const wakeTime = Date.now();
      setGame((current) => sleepUntilMorning(current, wakeTime));
      setNow(wakeTime);
      setSleeping(false);
      setToast("푹 잤어요. 새로운 아침이 밝았습니다!");
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [sleeping]);

  useEffect(() => {
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const tick = performance.now();
      const elapsed = Math.min((tick - previous) / 1000, 0.2);
      previous = tick;
      const currentGame = gameRef.current;
      if (currentGame.location !== "world") return;
      setNpcs((current) => stepNpcSimulation(current, currentGame.phase, currentGame.placements, Date.now(), elapsed));
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    function tick(timestamp: number) {
      const elapsed = Math.min((timestamp - previous) / 1000, 0.04);
      previous = timestamp;
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
        const speed = 245 * elapsed;
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
            current.location,
          ),
          questStage:
            current.questStage === "visit-fishing" && current.location === "world" && current.player.x < 800
              ? "catch-fish"
              : current.questStage,
        }));
      }
      frame = window.requestAnimationFrame(tick);
    }
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const closeDialogue = useCallback(() => setDialogue(null), []);

  const openNpcDialogue = useCallback((npcId: NpcId) => {
    if (lockedRef.current) return;
    const current = gameRef.current;
    const npc = NPCS[npcId];
    const count = current.talkCounts[npcId];
    const runtime = npcRef.current[npcId];
    setDialogue({
      npcId,
      line: npc.lines[Math.min(count, npc.lines.length - 1)],
      context: `${npc.role} · ${runtime.goal}`,
    });
    setGame((previousState) => ({
      ...previousState,
      talkCounts: { ...previousState.talkCounts, [npcId]: previousState.talkCounts[npcId] + 1 },
      questStage:
        previousState.questStage === "talk-lulu" && npcId === "lulu"
          ? "place-flower"
          : previousState.questStage === "talk-moka" && npcId === "moka"
            ? "visit-fishing"
            : previousState.questStage,
    }));
  }, []);

  const handlePrimaryAction = useCallback(() => {
    if (lockedRef.current) return;
    const current = gameRef.current;
    if (current.location === "world") {
      const currentNpcs = npcRef.current;
      const positions: Record<NpcId, Point> = {
        lulu: currentNpcs.lulu,
        moka: currentNpcs.moka,
        dubu: currentNpcs.dubu,
      };
      const npcId = nearestNpc(current.player, positions);
      if (npcId) {
        openNpcDialogue(npcId);
        return;
      }
      if (distance(current.player, FISHING_SPOT) < ACTION_RADIUS.fish) {
        setFishingOpen(true);
        setGame((state) => ({
          ...state,
          questStage: state.questStage === "visit-fishing" ? "catch-fish" : state.questStage,
        }));
        return;
      }
      if (distance(current.player, HOUSE_DOOR) < ACTION_RADIUS["enter-home"]) {
        setGame(enterHome);
        setBuildMode(false);
        setToast("집 안으로 들어왔어요.");
      }
      return;
    }
    if (distance(current.player, BED_POINT) < ACTION_RADIUS.sleep) {
      setSleeping(true);
      return;
    }
    if (distance(current.player, HOME_EXIT) < ACTION_RADIUS["exit-home"]) {
      setGame(resetToWorld);
      setToast("마을로 나왔어요.");
    }
  }, [openNpcDialogue]);

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (MOVEMENT_KEYS.has(key)) {
        event.preventDefault();
        keys.current.add(key);
      }
      if (key === "e" && !event.repeat) {
        event.preventDefault();
        handlePrimaryAction();
      }
      if (key === "b" && !event.repeat && !dialogue && !helpOpen && game.location === "world") {
        setBuildMode((value) => !value);
      }
      if (key === "escape") {
        if (buildMode) setBuildMode(false);
        if (fishingOpen) setFishingOpen(false);
      }
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
  }, [buildMode, dialogue, fishingOpen, game.location, handlePrimaryAction, helpOpen]);

  const scene = SCENE_SIZE[game.location];
  const camera = useMemo(() => {
    const scale = Math.max(viewport.width / scene.width, viewport.height / scene.height);
    const scaledWidth = scene.width * scale;
    const scaledHeight = scene.height * scale;
    return {
      scale,
      x: clamp(viewport.width / 2 - game.player.x * scale, viewport.width - scaledWidth, 0),
      y: clamp(viewport.height / 2 - game.player.y * scale, viewport.height - scaledHeight, 0),
    };
  }, [game.player.x, game.player.y, scene.height, scene.width, viewport.height, viewport.width]);

  function selectBuildTool(selection: BuildSelection) {
    if (game.location !== "world") return;
    setBuildSelection(selection);
    setBuildMode(true);
    setToast(selection === "demolish" ? "철거할 장식을 눌러주세요." : `${BUILDABLES[selection].name}을(를) 놓을 자리를 골라주세요.`);
  }

  function handleWorldPointer(point: Point) {
    if (buildSelection === "demolish") {
      let target = game.placements[0];
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const item of game.placements) {
        const itemDistance = distance(point, item);
        if (itemDistance < bestDistance) {
          bestDistance = itemDistance;
          target = item;
        }
      }
      if (!target || bestDistance > 95) {
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
    if ((Object.keys(npcs) as NpcId[]).some((id) => distance(point, npcs[id]) < 95)) {
      setToast("주민이 지나가는 자리에는 놓을 수 없어요.");
      return;
    }
    const placement = makePlacement(buildSelection, point);
    setGame((current) => ({
      ...current,
      placements: [...current.placements, placement],
      resources: spendResources(current.resources, buildSelection),
      questStage: current.questStage === "place-flower" && buildSelection === "flower" ? "talk-moka" : current.questStage,
    }));
    setToast(`${BUILDABLES[buildSelection].name}을(를) 놓았어요!`);
  }

  function handleFishCatch(reward: FishingReward) {
    const prize = FISH_REWARDS[reward];
    setGame((current) => ({
      ...current,
      fishCaught: current.fishCaught + 1,
      resources: { ...current.resources, coins: current.resources.coins + prize.coins },
      questStage: current.questStage === "catch-fish" || current.questStage === "visit-fishing" ? "complete" : current.questStage,
    }));
    setToast(`${prize.name} 획득 · 코인 +${prize.coins}`);
  }

  function setTouchKey(key: string, active: boolean) {
    if (active) keys.current.add(key);
    else keys.current.delete(key);
  }

  function resetGame() {
    if (!window.confirm("지금까지 꾸민 마을을 모두 지우고 처음부터 시작할까요?")) return;
    window.localStorage.removeItem(PIXEL_SAVE_KEY);
    window.localStorage.removeItem(LEGACY_PIXEL_SAVE_KEY);
    setGame(createInitialSave());
    setNpcs(createNpcRuntime());
    setBuildMode(false);
    setHelpOpen(false);
    setToast("새 마을에서 다시 시작해요.");
  }

  const quest = QUEST_COPY[game.questStage];
  const phaseRemaining = TIME_PHASE_MS - Math.max(0, now - game.phaseStartedAt);
  const promptLabel = nearbyNpc
    ? `${NPCS[nearbyNpc].name}와 대화하기`
    : nearbyAction === "fish"
      ? "낚시하기"
      : nearbyAction === "enter-home"
        ? "집에 들어가기"
        : nearbyAction === "exit-home"
          ? "마을로 나가기"
          : nearbyAction === "sleep"
             ? "침대에서 잠들기"
             : null;
  const promptDetail = nearbyNpc
    ? "E키 또는 버튼을 눌러요"
    : nearbyAction === "fish"
      ? "던지고, 입질이 오면 E키를 다시 눌러요"
      : nearbyAction === "enter-home"
        ? "문 앞에서 E키를 눌러요"
        : nearbyAction === "exit-home"
          ? "현관문 앞에서 E키를 눌러요"
          : nearbyAction === "sleep"
            ? "다음 날 아침까지 푹 쉬어요"
            : null;

  return (
    <main className={`pixel-game-shell phase-${game.phase} location-${game.location}`}>
      <PixelGameWorld
        camera={camera}
        location={game.location}
        player={game.player}
        direction={game.direction}
        moving={moving}
        npcs={npcs}
        nearbyNpc={nearbyNpc}
        buildMode={buildMode}
        night={game.phase === "night"}
        nearbyAction={nearbyAction}
        onWorldPointer={handleWorldPointer}
        onNpcInteract={openNpcDialogue}
        onPrimaryAction={handlePrimaryAction}
      >
        {game.location === "world" ? game.placements.map((item) => (
          <span
            className={`placed-item placed-${item.type}`}
            data-placement={item.type}
            key={item.id}
            style={{ left: item.x, top: item.y, zIndex: item.type === "path" || item.type === "flower" ? 20 : Math.round(item.y) }}
          >
            <BuildableSprite type={item.type} />
          </span>
        )) : null}
      </PixelGameWorld>

      <header className="game-hud">
        <div className="pixel-brand"><span className="brand-leaf">♧</span><strong>마을의 목소리</strong></div>
        <div className="day-display" data-testid="time-phase">
          <span aria-hidden="true">{game.phase === "day" ? "☀" : "☾"}</span>
          {game.day}일 차 · {game.phase === "day" ? "낮" : "밤"}
          <small>{formatCountdown(phaseRemaining)}</small>
        </div>
        <div className="resource-display" aria-label="보유 자원">
          <span><i className="resource-wood">▰</i>나무 <strong>{game.resources.wood}</strong></span>
          <span><i className="resource-stone">◆</i>돌 <strong>{game.resources.stone}</strong></span>
          <span><i className="resource-coins">●</i>코인 <strong>{game.resources.coins}</strong></span>
          <span><i className="resource-fish">≈</i>낚시 <strong>{game.fishCaught}</strong></span>
        </div>
        <button className="help-button" type="button" onClick={() => setHelpOpen(true)} aria-label="게임 도움말">?</button>
      </header>

      <aside className={`quest-panel ${game.questStage === "complete" ? "is-complete" : ""}`}>
        <span className="quest-mark">{game.questStage === "complete" ? "✓" : "!"}</span>
        <div><strong>{quest.title}</strong><small>{quest.detail}</small></div>
      </aside>

      {promptLabel && !dialogue && !buildMode && !fishingOpen ? (
        <button className="interaction-prompt" type="button" onClick={handlePrimaryAction}>
          <kbd>E</kbd><span><strong>{promptLabel}</strong>{promptDetail ? <small>{promptDetail}</small> : null}</span>
        </button>
      ) : null}

      {game.location === "world" ? (
        <BuildToolbar
          open={buildMode}
          selected={buildSelection}
          resources={game.resources}
          onToggle={() => setBuildMode((value) => !value)}
          onSelect={selectBuildTool}
        />
      ) : null}

      <nav className="touch-pad" aria-label="모바일 이동 패드">
        <button type="button" className="touch-up" aria-label="위로 이동" onPointerDown={() => setTouchKey("w", true)} onPointerUp={() => setTouchKey("w", false)} onPointerCancel={() => setTouchKey("w", false)}>▲</button>
        <button type="button" className="touch-left" aria-label="왼쪽으로 이동" onPointerDown={() => setTouchKey("a", true)} onPointerUp={() => setTouchKey("a", false)} onPointerCancel={() => setTouchKey("a", false)}>◀</button>
        <button type="button" className="touch-down" aria-label="아래로 이동" onPointerDown={() => setTouchKey("s", true)} onPointerUp={() => setTouchKey("s", false)} onPointerCancel={() => setTouchKey("s", false)}>▼</button>
        <button type="button" className="touch-right" aria-label="오른쪽으로 이동" onPointerDown={() => setTouchKey("d", true)} onPointerUp={() => setTouchKey("d", false)} onPointerCancel={() => setTouchKey("d", false)}>▶</button>
      </nav>

      {toast ? <div className="game-toast" role="status">{toast}</div> : null}

      {dialogue ? <DialoguePanel npcId={dialogue.npcId} line={dialogue.line} context={dialogue.context} onClose={closeDialogue} /> : null}
      {fishingOpen ? <FishingPanel seed={game.day * 11 + game.fishCaught} onCatch={handleFishCatch} onClose={() => setFishingOpen(false)} /> : null}
      {sleeping ? <div className="sleep-transition" role="status"><span>✦</span><strong>잠드는 중…</strong><small>내일 아침에 만나요</small></div> : null}

      {helpOpen ? (
        <div className="help-layer" role="dialog" aria-modal="true" aria-labelledby="help-title">
          <section className="help-card">
            <button className="help-close" type="button" onClick={() => setHelpOpen(false)} aria-label="도움말 닫기">×</button>
            <h2 id="help-title">새로운 마을 생활</h2>
            <p>다리 너머를 탐험하고, 주민들의 일상을 지켜보고, 집에서 하루를 마무리하세요.</p>
            <dl>
              <div><dt>이동</dt><dd>WASD · 방향키 · 화면 패드</dd></div>
              <div><dt>대화·행동</dt><dd>가까이에서 E</dd></div>
              <div><dt>낚시</dt><dd>서쪽 부두에서 E → 입질 때 다시 E</dd></div>
              <div><dt>집</dt><dd>광장 왼쪽 중앙 집 문 앞에서 E</dd></div>
              <div><dt>수면</dt><dd>집 안 침대 가까이에서 E</dd></div>
              <div><dt>낮과 밤</dt><dd>각각 실제 5분마다 전환</dd></div>
              <div><dt>저장</dt><dd>모든 변화가 자동 저장</dd></div>
            </dl>
            <button className="help-primary" type="button" onClick={() => setHelpOpen(false)}>생활 계속하기</button>
            <button className="reset-button" type="button" onClick={resetGame}>마을 처음부터 시작</button>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default App;
