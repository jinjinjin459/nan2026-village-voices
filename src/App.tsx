import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimalAvatar } from "./components/AnimalAvatar";
import { GameIcon } from "./components/GameIcon";
import { PlayerAvatar } from "./components/PlayerAvatar";
import { BEFORE_CLUES, FACILITIES, RESIDENTS, RESULT_COPY, createInitialState, getFallbackDialogue } from "./game/data";
import { applyFacility, canDevelop, canSeeResult, countTalked, markTalked, startNextDay } from "./game/engine";
import type { DialogueResult, FacilityId, ResidentId, VillageState, VillageStateSnapshot } from "./game/types";
import { getAiHealth, requestDialogue } from "./services/dialogueApi";

const residentOrder: ResidentId[] = ["lulu", "dubu", "moka"];
const facilityOrder: FacilityId[] = ["park", "arcade", "shop"];
const SAVE_KEY = "village-voices-save-v2";
const LEGACY_SAVE_KEY = "village-voices-save-v1";
const PLAYER_KEY = "village-voices-player-v1";

type PlayerPosition = { x: number; y: number };

const focusableSelector = [
  "button:not([disabled]):not([tabindex='-1'])",
  "input:not([disabled]):not([tabindex='-1'])",
  "select:not([disabled]):not([tabindex='-1'])",
  "textarea:not([disabled]):not([tabindex='-1'])",
  "a[href]:not([tabindex='-1'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function useModalAccessibility(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const modal: HTMLDivElement = dialog;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const getFocusable = () =>
      Array.from(modal.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.getClientRects().length > 0,
      );
    const focusFrame = window.requestAnimationFrame(() => {
      const initialFocus = modal.querySelector<HTMLElement>("[data-modal-initial-focus]");
      (initialFocus ?? getFocusable()[0] ?? modal).focus();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        modal.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !modal.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !modal.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) {
        window.requestAnimationFrame(() => previouslyFocused.focus());
      }
    };
  }, [open]);

  return dialogRef;
}

function loadVillage(): VillageState {
  const fresh = createInitialState();
  try {
    const raw = window.localStorage.getItem(SAVE_KEY) ?? window.localStorage.getItem(LEGACY_SAVE_KEY);
    if (!raw) return fresh;
    const migrated = createInitialState(JSON.parse(raw) as VillageStateSnapshot);
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(migrated));
    window.localStorage.removeItem(LEGACY_SAVE_KEY);
    return migrated;
  } catch {
    return fresh;
  }
}

function loadPlayer(): PlayerPosition {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PLAYER_KEY) || "null") as PlayerPosition | null;
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved;
  } catch {
    // A malformed optional position should never prevent the game from loading.
  }
  return { x: 34, y: 82 };
}

function FacilityScene({ facilityId }: { facilityId: FacilityId | null }) {
  if (!facilityId) return null;
  if (facilityId === "park") {
    return (
      <div className="facility-scene facility-scene--park" data-facility-id="park" aria-label="느티나무 공원">
        <div className="tree-crown"><span /><span /><span /><i /></div>
        <div className="tree-trunk" />
        <div className="park-bench"><span /><i /></div>
        <div className="facility-label">느티나무 공원</div>
      </div>
    );
  }
  if (facilityId === "arcade") {
    return (
      <div className="facility-scene facility-scene--arcade" data-facility-id="arcade" aria-label="별빛 오락실">
        <div className="arcade-roof">★ PLAY ★</div>
        <div className="arcade-body"><span className="arcade-door" /><i /><b /></div>
        <div className="facility-label">별빛 오락실</div>
      </div>
    );
  }
  return (
    <div className="facility-scene facility-scene--shop" data-facility-id="shop" aria-label="마을 잡화점">
      <div className="shop-awning"><span /><span /><span /><span /><span /></div>
      <div className="shop-body"><b>소소상점</b><i /><em /></div>
      <div className="facility-label">마을 잡화점</div>
    </div>
  );
}

function App() {
  const [village, setVillage] = useState(loadVillage);
  const [player, setPlayer] = useState(loadPlayer);
  const [introOpen, setIntroOpen] = useState(() => !window.localStorage.getItem(SAVE_KEY));
  const [selectedResident, setSelectedResident] = useState<ResidentId | null>(null);
  const [dialogue, setDialogue] = useState<DialogueResult | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [developmentOpen, setDevelopmentOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [building, setBuilding] = useState<FacilityId | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [aiOnline, setAiOnline] = useState(false);
  const dialogueRequestSequence = useRef(0);
  const selectedResidentRef = useRef<ResidentId | null>(selectedResident);
  const villagePhaseRef = useRef(village.phase);
  const villageDayRef = useRef(village.day);

  selectedResidentRef.current = selectedResident;
  villagePhaseRef.current = village.phase;
  villageDayRef.current = village.day;

  const introDialogRef = useModalAccessibility(introOpen, () => setIntroOpen(false));
  const dialogueDialogRef = useModalAccessibility(Boolean(selectedResident), closeDialogue);
  const notebookDialogRef = useModalAccessibility(notebookOpen, () => setNotebookOpen(false));
  const developmentDialogRef = useModalAccessibility(
    developmentOpen,
    () => setDevelopmentOpen(false),
  );
  const resultDialogRef = useModalAccessibility(resultOpen, () => setResultOpen(false));

  const talkedCount = countTalked(village);
  const unlockedDevelopment = canDevelop(village);
  const unlockedResult = canSeeResult(village);
  const activeTalked = village.phase === "before" ? village.talkedBefore : village.talkedAfter;
  const currentProfile = selectedResident ? RESIDENTS[selectedResident] : null;
  const availableFacilities = facilityOrder.filter((id) => !village.facilities[id]);

  useEffect(() => {
    void getAiHealth().then(setAiOnline);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(village));
  }, [village]);

  useEffect(() => {
    window.localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
  }, [player]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (introOpen || selectedResident || notebookOpen || developmentOpen || resultOpen || building) return;
      if (event.target instanceof HTMLInputElement) return;
      const key = event.key.toLowerCase();
      const moves: Record<string, [number, number]> = {
        arrowup: [0, -3], w: [0, -3], arrowdown: [0, 3], s: [0, 3],
        arrowleft: [-3, 0], a: [-3, 0], arrowright: [3, 0], d: [3, 0],
      };
      const move = moves[key];
      if (!move) return;
      event.preventDefault();
      setPlayer((current) => ({
        x: Math.max(7, Math.min(92, current.x + move[0])),
        y: Math.max(34, Math.min(86, current.y + move[1])),
      }));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [building, developmentOpen, introOpen, notebookOpen, resultOpen, selectedResident]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const collectedClues = useMemo(
    () => residentOrder.filter((id) => activeTalked[id]).map((id) => BEFORE_CLUES[id]),
    [activeTalked],
  );

  function invalidateDialogueRequest() {
    dialogueRequestSequence.current += 1;
    setLoading(false);
  }

  function closeDialogue() {
    invalidateDialogueRequest();
    selectedResidentRef.current = null;
    setSelectedResident(null);
    setDialogue(null);
    setQuestion("");
  }

  async function fetchResidentDialogue(residentId: ResidentId, nextQuestion: string) {
    const requestId = dialogueRequestSequence.current + 1;
    dialogueRequestSequence.current = requestId;
    const requestPhase = village.phase;
    const requestDay = village.day;
    setLoading(true);
    setDialogue(null);
    const result = await requestDialogue({ residentId, question: nextQuestion, state: village });

    if (
      dialogueRequestSequence.current !== requestId ||
      selectedResidentRef.current !== residentId ||
      villagePhaseRef.current !== requestPhase ||
      villageDayRef.current !== requestDay
    ) return;

    setDialogue(result);
    setVillage((current) => {
      if (
        dialogueRequestSequence.current !== requestId ||
        selectedResidentRef.current !== residentId ||
        current.phase !== requestPhase ||
        current.day !== requestDay
      ) return current;
      return markTalked(current, residentId);
    });
    setLoading(false);
    if (result.source === "ai") setAiOnline(true);
  }

  function openResident(residentId: ResidentId) {
    invalidateDialogueRequest();
    selectedResidentRef.current = residentId;
    setSelectedResident(residentId);
    setQuestion("");
    void fetchResidentDialogue(residentId, RESIDENTS[residentId].questions[0]);
  }

  function askSuggested(nextQuestion: string) {
    if (!selectedResident || loading) return;
    setQuestion("");
    void fetchResidentDialogue(selectedResident, nextQuestion);
  }

  function submitQuestion(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!selectedResident || !trimmed || loading) return;
    void fetchResidentDialogue(selectedResident, trimmed);
  }

  function chooseFacility(facilityId: FacilityId) {
    if (!unlockedDevelopment) return;
    invalidateDialogueRequest();
    selectedResidentRef.current = null;
    setDevelopmentOpen(false);
    setSelectedResident(null);
    setBuilding(facilityId);
    window.setTimeout(() => {
      setVillage((current) => applyFacility(current, facilityId));
    }, 700);
    window.setTimeout(() => {
      setBuilding(null);
      setToast(`${FACILITIES[facilityId].name}이 완성되었습니다. 주민들의 이야기를 다시 들어보세요.`);
    }, 1850);
  }

  function movePlayer(dx: number, dy: number) {
    setPlayer((current) => ({
      x: Math.max(7, Math.min(92, current.x + dx)),
      y: Math.max(34, Math.min(86, current.y + dy)),
    }));
  }

  function walkToPoint(event: React.PointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    setPlayer({ x: Math.max(7, Math.min(92, x)), y: Math.max(34, Math.min(86, y)) });
  }

  function continueToNextDay() {
    invalidateDialogueRequest();
    selectedResidentRef.current = null;
    setVillage((current) => startNextDay(current));
    setResultOpen(false);
    setDevelopmentOpen(false);
    setSelectedResident(null);
    setDialogue(null);
    setToast("새로운 아침이 밝았습니다. 오늘도 원하는 방식으로 마을을 둘러보세요.");
  }

  function resetGame() {
    invalidateDialogueRequest();
    selectedResidentRef.current = null;
    setVillage(createInitialState());
    setPlayer({ x: 34, y: 82 });
    window.localStorage.removeItem(SAVE_KEY);
    window.localStorage.removeItem(LEGACY_SAVE_KEY);
    window.localStorage.removeItem(PLAYER_KEY);
    setIntroOpen(true);
    setSelectedResident(null);
    setDialogue(null);
    setQuestion("");
    setNotebookOpen(false);
    setDevelopmentOpen(false);
    setResultOpen(false);
    setBuilding(null);
    setToast(null);
  }

  return (
    <main className={`app-shell phase-${village.phase}`}>
      <div className="paper-noise" aria-hidden="true" />
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><GameIcon name="leaf" size={20} /></div>
          <div>
            <h1>마을의 목소리</h1>
            <p>VILLAGE VOICES</p>
          </div>
        </div>
        <div className="topbar-status">
          <span className={`ai-status ${aiOnline ? "ai-status--online" : ""}`} title={aiOnline ? "Gemma 4 26B 연결됨" : "API 실패에도 플레이 가능한 안전 데모"}>
            <i /> {aiOnline ? "AI 연결" : "안전 데모"}
          </span>
          <span className="day-chip" data-testid="day-label">{village.day}일 차 · {village.phase === "before" ? "오전" : "저녁"}</span>
          <button className="icon-button" type="button" onClick={resetGame} aria-label="게임 처음부터"><GameIcon name="reset" size={19} /></button>
        </div>
      </header>

      <section className="game-layout">
        <aside className="mission-card">
          <span className="mission-eyebrow">{village.day}일 차 · 선택적 부탁</span>
          <h2>{village.phase === "before" ? "오늘은 누구의 이야기를\n들어볼까요?" : "새 풍경 속 마음을\n살펴보세요"}</h2>
          <p>{village.phase === "before" ? "정해진 순서는 없습니다. 산책하고, 대화하고, 원할 때 마을을 가꿔보세요." : "건설은 끝났지만 하루는 아직 남아 있어요. 주민들과 더 이야기해도 됩니다."}</p>
          <div className="mission-progress" aria-label={`주민 대화 ${talkedCount}명`}>
            {residentOrder.map((id) => <span key={id} className={activeTalked[id] ? "is-done" : ""}>{activeTalked[id] ? "✓" : ""}</span>)}
            <b>{talkedCount}<small>/3</small></b>
          </div>
          <button className="notebook-button" type="button" onClick={() => setNotebookOpen(true)}>
            <GameIcon name="book" size={20} /> 오늘의 수첩 <em>{talkedCount}</em>
          </button>
        </aside>

        <section className="village-stage" data-testid="village-stage" aria-label="마을 전경" onPointerDown={walkToPoint}>
          <div className="village-ground">
            {facilityOrder.filter((id) => village.facilities[id]).map((id) => <FacilityScene key={id} facilityId={id} />)}
            <div className="player-character" data-testid="player" data-player="true" style={{ left: `${player.x}%`, top: `${player.y}%` }} aria-label="플레이어">
              <PlayerAvatar />
            </div>
            {residentOrder.map((id) => {
              const profile = RESIDENTS[id];
              const position = village.facilities.park && (id === "lulu" || id === "moka")
                ? `${id} resident--park-${id}` : id;
              return (
                <button
                  key={id}
                  type="button"
                  className={`resident resident--${position} ${activeTalked[id] ? "resident--talked" : ""}`}
                  onClick={() => openResident(id)}
                  aria-label={`${profile.name}에게 말 걸기`}
                >
                  <span className="resident-bubble">{activeTalked[id] ? "다시 듣기" : "말 걸기"}</span>
                  <AnimalAvatar residentId={id} emotion={village.facilities.park ? "happy" : "neutral"} />
                  <span className="resident-name"><b>{profile.name}</b><small>{profile.species}</small></span>
                </button>
              );
            })}
          </div>
          <div className="stage-caption">
            <span><i className="pulse-dot" /> WASD·방향키로 산책 · 주민을 눌러 대화</span>
            <strong>자유롭게 머무는 AI 마을</strong>
          </div>
          <div className="move-pad" aria-label="터치 이동 조작">
            <button type="button" data-move="up" aria-label="위로 이동" onClick={() => movePlayer(0, -4)}>▲</button>
            <button type="button" data-move="left" aria-label="왼쪽으로 이동" onClick={() => movePlayer(-4, 0)}>◀</button>
            <button type="button" data-move="down" aria-label="아래로 이동" onClick={() => movePlayer(0, 4)}>▼</button>
            <button type="button" data-testid="touch-right" data-move="right" aria-label="오른쪽 이동" onClick={() => movePlayer(4, 0)}>▶</button>
          </div>
        </section>

        <aside className="village-note">
          <span className="note-pin" />
          <span className="note-eyebrow">마을 관찰 기록</span>
          {village.phase === "before" ? (
            <>
              <h3>우리 마을 풍경</h3>
              <ul><li><span>✓</span> 멜로우 카페</li>{facilityOrder.filter((id) => village.facilities[id]).map((id) => <li key={id}><span>✓</span> {FACILITIES[id].name}</li>)}<li><span>·</span> 남은 공터 {availableFacilities.length}곳</li></ul>
              <p>오늘 무엇을 할지는 자유예요.<br />주민들의 이야기는 작은 힌트가 됩니다.</p>
            </>
          ) : (
            <>
              <h3>오늘 만든 풍경</h3>
              <ul><li><span>✓</span> {village.selectedFacility && FACILITIES[village.selectedFacility].name}</li><li><span>↗</span> 새롭게 모이는 주민들</li><li><span>?</span> 달라진 마음의 거리</li></ul>
              <p>원한다면 더 이야기한 뒤<br />새로운 하루를 시작하세요.</p>
            </>
          )}
        </aside>
      </section>

      <footer className="action-dock">
        {village.phase === "before" ? (
          <>
            <div><span>자유 산책 · 대화 {talkedCount}명</span><p>{availableFacilities.length ? "원할 때 오늘의 시설 하나를 지을 수 있어요." : "모든 시설이 완성됐어요. 대화하며 하루를 이어가세요."}</p></div>
            {availableFacilities.length ? <button className="primary-action" type="button" disabled={!unlockedDevelopment} onClick={() => setDevelopmentOpen(true)}>시설 건설 · 오늘의 건설 <GameIcon name="arrow" size={20} /></button> : <button className="primary-action" type="button" onClick={continueToNextDay}>다음 날 <GameIcon name="arrow" size={20} /></button>}
          </>
        ) : (
          <>
            <div><span>{village.day}일 차 저녁 · 대화 {talkedCount}명</span><p>더 둘러보거나 오늘의 기록을 확인하고 다음 날로 넘어가세요.</p></div>
            <div className="action-buttons"><button className="secondary-action" type="button" disabled={!unlockedResult} onClick={() => setResultOpen(true)}>하루 기록</button><button className="primary-action" type="button" disabled={!unlockedResult} onClick={continueToNextDay}>하루 마치기 · 다음 날 <GameIcon name="arrow" size={20} /></button></div>
          </>
        )}
      </footer>

      {introOpen && (
        <div ref={introDialogRef} className="overlay intro-overlay" role="dialog" aria-modal="true" aria-labelledby="intro-title" tabIndex={-1}>
          <div className="intro-card">
            <span className="intro-kicker">NAN 2026 · GAME × AI</span>
            <div className="intro-illustration"><AnimalAvatar residentId="lulu" emotion="happy" /><AnimalAvatar residentId="dubu" emotion="happy" /><AnimalAvatar residentId="moka" emotion="neutral" /></div>
            <h2 id="intro-title">이 마을에는<br /><em>상태창이 없습니다.</em></h2>
            <p>정답도 정해진 순서도 없습니다.<br />산책하고 대화하며 원하는 모습으로 마을을 가꿔보세요.</p>
            <div className="intro-loop"><span>산책</span><i>·</i><span>대화</span><i>·</i><span>건설</span><i>·</i><span>새 하루</span></div>
            <button type="button" className="intro-start" data-modal-initial-focus onClick={() => setIntroOpen(false)}>게임 시작 · 마을로 이사 오기 <GameIcon name="arrow" size={20} /></button>
            <small>WASD·방향키·터치 이동 · 자동 저장</small>
          </div>
        </div>
      )}

      {selectedResident && currentProfile && (
        <div ref={dialogueDialogRef} className="overlay dialogue-overlay" role="dialog" aria-modal="true" aria-labelledby="resident-name" tabIndex={-1}>
          <button className="overlay-dismiss" type="button" tabIndex={-1} aria-label="대화 닫기" onClick={closeDialogue} />
          <section className="dialogue-card" style={{ "--resident-accent": currentProfile.accent, "--resident-soft": currentProfile.accentSoft } as React.CSSProperties}>
            <button className="dialogue-close" type="button" data-modal-initial-focus onClick={closeDialogue} aria-label="닫기"><GameIcon name="close" size={20} /></button>
            <div className="portrait-panel">
              <span className="portrait-role">{currentProfile.role}</span>
              <AnimalAvatar residentId={selectedResident} emotion={dialogue?.emotion || "neutral"} size="large" />
              <div><h2 id="resident-name">{currentProfile.name}</h2><p>{currentProfile.personality.join(" · ")}</p></div>
            </div>
            <div className="conversation-panel">
              <div className="speaker-row"><div><span>{currentProfile.name}</span><small>{dialogue?.source === "ai" ? "Gemma 4 26B가 현재 상태로 생성" : "검증된 안전 대사"}</small></div><span className={`source-badge ${dialogue?.source === "ai" ? "source-badge--ai" : ""}`}>{dialogue?.source === "ai" ? "AI" : "SAFE"}</span></div>
              <div className={`dialogue-bubble ${loading ? "is-loading" : ""}`} aria-live="polite">
                {loading ? <><span className="thinking-dots"><i /><i /><i /></span><p>{currentProfile.name}가 말을 고르는 중…</p></> : <p>“{dialogue?.dialogue || getFallbackDialogue(village, selectedResident).dialogue}”</p>}
              </div>
              <span className="question-label">이어서 물어보기</span>
              <div className="question-chips">
                {currentProfile.questions.slice(1).map((item) => <button key={item} type="button" disabled={loading} onClick={() => askSuggested(item)}>{item}</button>)}
              </div>
              <form className="question-form" onSubmit={submitQuestion}>
                <input value={question} onChange={(event) => setQuestion(event.target.value.slice(0, 40))} disabled={loading} placeholder="직접 짧게 물어보세요" aria-label="주민에게 직접 질문" />
                <span>{question.length}/40</span>
                <button type="submit" disabled={loading || !question.trim()} aria-label="질문 보내기"><GameIcon name="arrow" size={18} /></button>
              </form>
              <button className="finish-talk" type="button" onClick={closeDialogue}>대화 마치기</button>
            </div>
          </section>
        </div>
      )}

      {notebookOpen && (
        <div ref={notebookDialogRef} className="overlay notebook-overlay" role="dialog" aria-modal="true" aria-labelledby="notebook-title" tabIndex={-1}>
          <button className="overlay-dismiss" type="button" tabIndex={-1} aria-label="수첩 닫기" onClick={() => setNotebookOpen(false)} />
          <section className="notebook-card">
            <button className="dialogue-close" type="button" data-modal-initial-focus onClick={() => setNotebookOpen(false)} aria-label="닫기"><GameIcon name="close" size={20} /></button>
            <div className="notebook-binding" />
            <span className="notebook-kicker"><GameIcon name="book" size={20} /> 오늘 들은 이야기</span>
            <h2 id="notebook-title">대화 수첩</h2>
            <p className="notebook-subtitle">주민들의 말에서 알아낸 단서예요. 정답은 아직 적혀 있지 않아요.</p>
            <div className="clue-list">
              {residentOrder.map((id) => {
                const clue = BEFORE_CLUES[id];
                const found = activeTalked[id];
                const note = village.phase === "before" ? clue.text : getFallbackDialogue(village, id).dialogue;
                return <article key={id} className={found ? "is-found" : ""}><AnimalAvatar residentId={id} size="small" /><div><span>{RESIDENTS[id].name}의 이야기</span><p>{found ? note : "오늘은 아직 이야기를 듣지 않았습니다."}</p></div><GameIcon name={found ? clue.icon : "unknown"} size={24} /></article>;
              })}
            </div>
            <div className="notebook-thought"><GameIcon name="spark" size={22} /><p>{collectedClues.length >= 2 ? "서로 원하는 건 달라도, 모두에게 필요한 공간은 하나일지도 몰라." : "조금 더 들어보면 말 사이의 공통점이 보일 거야."}</p></div>
            <button className="intro-start" type="button" onClick={() => setNotebookOpen(false)}>마을로 돌아가기</button>
          </section>
        </div>
      )}

      {developmentOpen && (
        <div ref={developmentDialogRef} className="overlay development-overlay" role="dialog" aria-modal="true" aria-labelledby="development-title" tabIndex={-1}>
          <button className="overlay-dismiss" type="button" tabIndex={-1} aria-label="개발 회의 닫기" onClick={() => setDevelopmentOpen(false)} />
          <section className="development-card">
            <button className="dialogue-close" type="button" data-modal-initial-focus onClick={() => setDevelopmentOpen(false)} aria-label="닫기"><GameIcon name="close" size={20} /></button>
            <span className="development-kicker">{village.day}일 차 마을 가꾸기</span>
            <h2 id="development-title">오늘은 어떤 장소를 만들까요?</h2>
            <p>하루에 하나를 지을 수 있습니다. 내일이 되면 다시 자유롭게 선택할 수 있어요.</p>
            <div className="facility-grid">
              {availableFacilities.map((id) => {
                const facility = FACILITIES[id];
                return <button key={id} type="button" className={`facility-card facility-card--${id}`} onClick={() => chooseFacility(id)}><span className="facility-icon"><GameIcon name={facility.icon} size={38} /></span><small>{facility.eyebrow}</small><h3>{facility.name}</h3><p>{facility.description}</p><em>{facility.flavor}</em><b>이곳 만들기 <GameIcon name="arrow" size={18} /></b></button>;
              })}
            </div>
            <span className="decision-note">이미 지은 장소는 마을에 계속 남고 주민들의 다음 대화에 반영됩니다.</span>
          </section>
        </div>
      )}

      {building && (
        <div className="overlay building-overlay" role="status" aria-live="assertive">
          <div className="build-animation"><span className="build-spark spark-1">✦</span><span className="build-spark spark-2">✦</span><span className="build-spark spark-3">✧</span><div className="build-icon"><GameIcon name={FACILITIES[building].icon} size={52} /></div><h2>{FACILITIES[building].name}</h2><p>주민들의 이야기가 마을의 풍경이 되는 중…</p><div className="build-progress"><i /></div></div>
        </div>
      )}

      {resultOpen && village.selectedFacility && (
        <div ref={resultDialogRef} className="overlay result-overlay" role="dialog" aria-modal="true" aria-labelledby="result-title" tabIndex={-1}>
          <section className="result-card">
            <span className="result-kicker">{village.day}일 차의 기록</span>
            <h2 id="result-title">{RESULT_COPY[village.selectedFacility].title}</h2>
            <p>{RESULT_COPY[village.selectedFacility].summary}</p>
            <div className="before-after">
              <article><span>BEFORE</span><AnimalAvatar residentId="moka" emotion="annoyed" size="small" /><blockquote>“루루랑 마주치면 또 시끄러워질 것 같아.”</blockquote></article>
              <i><GameIcon name="arrow" size={26} /></i>
              <article className="after-quote"><span>AFTER</span><AnimalAvatar residentId="moka" emotion={village.selectedFacility === "park" ? "happy" : village.selectedFacility === "arcade" ? "annoyed" : "neutral"} size="small" /><blockquote>“{getFallbackDialogue(village, "moka").dialogue}”</blockquote></article>
            </div>
            <div className="result-verdict"><GameIcon name={village.selectedFacility === "park" ? "heart" : "spark"} size={25} /><span>{RESULT_COPY[village.selectedFacility].verdict}</span></div>
            <strong>오늘의 선택은 남고, 내일의 이야기는 다시 이어집니다.</strong>
            <div className="result-actions"><button type="button" data-modal-initial-focus onClick={() => setResultOpen(false)}>조금 더 둘러보기</button><button type="button" className="intro-start" onClick={continueToNextDay}>다음 날 시작하기</button></div>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}

export default App;
