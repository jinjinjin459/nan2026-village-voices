import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimalAvatar } from "./components/AnimalAvatar";
import { GameIcon } from "./components/GameIcon";
import { BEFORE_CLUES, FACILITIES, RESIDENTS, RESULT_COPY, createInitialState, getFallbackDialogue } from "./game/data";
import { applyFacility, canDevelop, canSeeResult, countTalked, markTalked } from "./game/engine";
import type { DialogueResult, FacilityId, ResidentId } from "./game/types";
import { getAiHealth, requestDialogue } from "./services/dialogueApi";

const residentOrder: ResidentId[] = ["lulu", "dubu", "moka"];
const facilityOrder: FacilityId[] = ["park", "arcade", "shop"];

function CafeBuilding() {
  return (
    <div className="building building--cafe" aria-label="마을 카페">
      <div className="cafe-sign">MELLOW</div>
      <div className="cafe-roof" />
      <div className="cafe-wall">
        <div className="cafe-window"><span>☕</span></div>
        <div className="cafe-door" />
      </div>
      <div className="building-label">멜로우 카페</div>
    </div>
  );
}

function FacilityScene({ facilityId }: { facilityId: FacilityId | null }) {
  if (!facilityId) {
    return (
      <div className="vacant-lot" aria-label="비어 있는 공터">
        <span className="vacant-stone vacant-stone--one" />
        <span className="vacant-stone vacant-stone--two" />
        <span className="vacant-flower">✣</span>
        <span className="vacant-label">바람만 머무는 공터</span>
      </div>
    );
  }
  if (facilityId === "park") {
    return (
      <div className="facility-scene facility-scene--park" aria-label="느티나무 공원">
        <div className="tree-crown"><span /><span /><span /><i /></div>
        <div className="tree-trunk" />
        <div className="park-bench"><span /><i /></div>
        <div className="facility-label">느티나무 공원</div>
      </div>
    );
  }
  if (facilityId === "arcade") {
    return (
      <div className="facility-scene facility-scene--arcade" aria-label="별빛 오락실">
        <div className="arcade-roof">★ PLAY ★</div>
        <div className="arcade-body"><span className="arcade-door" /><i /><b /></div>
        <div className="facility-label">별빛 오락실</div>
      </div>
    );
  }
  return (
    <div className="facility-scene facility-scene--shop" aria-label="마을 잡화점">
      <div className="shop-awning"><span /><span /><span /><span /><span /></div>
      <div className="shop-body"><b>소소상점</b><i /><em /></div>
      <div className="facility-label">마을 잡화점</div>
    </div>
  );
}

function App() {
  const [village, setVillage] = useState(createInitialState);
  const [introOpen, setIntroOpen] = useState(true);
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

  const talkedCount = countTalked(village);
  const unlockedDevelopment = canDevelop(village);
  const unlockedResult = canSeeResult(village);
  const activeTalked = village.phase === "before" ? village.talkedBefore : village.talkedAfter;
  const currentProfile = selectedResident ? RESIDENTS[selectedResident] : null;

  useEffect(() => {
    void getAiHealth().then(setAiOnline);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const collectedClues = useMemo(
    () => residentOrder.filter((id) => village.talkedBefore[id]).map((id) => BEFORE_CLUES[id]),
    [village.talkedBefore],
  );

  async function fetchResidentDialogue(residentId: ResidentId, nextQuestion: string) {
    setLoading(true);
    setDialogue(null);
    const result = await requestDialogue({ residentId, question: nextQuestion, state: village });
    setDialogue(result);
    setVillage((current) => markTalked(current, residentId));
    setLoading(false);
    if (result.source === "ai") setAiOnline(true);
  }

  function openResident(residentId: ResidentId) {
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

  function resetGame() {
    setVillage(createInitialState());
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
          <span className={`ai-status ${aiOnline ? "ai-status--online" : ""}`} title={aiOnline ? "Gemini 3.6 Flash 연결됨" : "API 실패에도 플레이 가능한 안전 데모"}>
            <i /> {aiOnline ? "AI 연결" : "안전 데모"}
          </span>
          <span className="day-chip">{village.phase === "before" ? "첫째 날 · 오전" : "둘째 날 · 오후"}</span>
          <button className="icon-button" type="button" onClick={resetGame} aria-label="게임 처음부터"><GameIcon name="reset" size={19} /></button>
        </div>
      </header>

      <section className="game-layout">
        <aside className="mission-card">
          <span className="mission-eyebrow">오늘의 부탁</span>
          <h2>{village.phase === "before" ? "말 사이의 마음을\n들어주세요" : "당신의 선택은\n무엇을 바꿨을까요?"}</h2>
          <p>{village.phase === "before" ? "상태창은 없습니다. 주민의 말에 귀 기울이고 마을에 필요한 것을 찾아보세요." : "달라진 마을을 둘러보고 주민 두 명의 반응을 들어보세요."}</p>
          <div className="mission-progress" aria-label={`주민 대화 ${talkedCount}명`}>
            {residentOrder.map((id) => <span key={id} className={activeTalked[id] ? "is-done" : ""}>{activeTalked[id] ? "✓" : ""}</span>)}
            <b>{talkedCount}<small>/3</small></b>
          </div>
          {village.phase === "before" && (
            <button className="notebook-button" type="button" onClick={() => setNotebookOpen(true)}>
              <GameIcon name="book" size={20} /> 대화 수첩 <em>{collectedClues.length}</em>
            </button>
          )}
        </aside>

        <section className="village-stage" aria-label="마을 전경">
          <div className="sky-cloud cloud-one" /><div className="sky-cloud cloud-two" />
          <div className="far-hills"><span /><span /><span /></div>
          <div className="village-ground">
            <div className="path path--one" /><div className="path path--two" />
            <span className="tiny-flower flower-a">✿</span><span className="tiny-flower flower-b">✤</span><span className="tiny-flower flower-c">✿</span>
            <CafeBuilding />
            <FacilityScene facilityId={village.selectedFacility} />
            {residentOrder.map((id) => {
              const profile = RESIDENTS[id];
              const position = village.phase === "after" && village.selectedFacility === "park" && (id === "lulu" || id === "moka")
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
                  <AnimalAvatar residentId={id} emotion={village.phase === "after" && village.selectedFacility === "park" ? "happy" : "neutral"} />
                  <span className="resident-name"><b>{profile.name}</b><small>{profile.species}</small></span>
                </button>
              );
            })}
          </div>
          <div className="stage-caption">
            <span><i className="pulse-dot" /> 주민을 눌러 이야기를 들어보세요</span>
            <strong>숫자 대신, 목소리로 읽는 마을</strong>
          </div>
        </section>

        <aside className="village-note">
          <span className="note-pin" />
          <span className="note-eyebrow">마을 관찰 기록</span>
          {village.phase === "before" ? (
            <>
              <h3>지금 보이는 것</h3>
              <ul><li><span>✓</span> 작은 카페 하나</li><li><span>·</span> 비어 있는 공터</li><li><span>?</span> 어딘가 어색한 분위기</li></ul>
              <p>하지만 진짜 문제는<br />주민에게 물어봐야 알 수 있어요.</p>
            </>
          ) : (
            <>
              <h3>달라진 풍경</h3>
              <ul><li><span>✓</span> {village.selectedFacility && FACILITIES[village.selectedFacility].name}</li><li><span>↗</span> 새롭게 모이는 주민들</li><li><span>?</span> 달라진 마음의 거리</li></ul>
              <p>같은 주민에게 다시 말을 걸어<br />선택의 결과를 확인하세요.</p>
            </>
          )}
        </aside>
      </section>

      <footer className="action-dock">
        {village.phase === "before" ? (
          <>
            <div><span>대화 {talkedCount}/3</span><p>{unlockedDevelopment ? "이제 주민들의 말을 바탕으로 결정할 수 있어요." : "두 주민 이상과 이야기하면 개발 회의가 열려요."}</p></div>
            <button className="primary-action" type="button" disabled={!unlockedDevelopment} onClick={() => setDevelopmentOpen(true)}>
              마을 개발 회의 <GameIcon name="arrow" size={20} />
            </button>
          </>
        ) : (
          <>
            <div><span>변화 확인 {talkedCount}/3</span><p>{unlockedResult ? "주민들의 반응에서 선택의 결과가 드러났어요." : "달라진 반응을 두 명 이상에게 들어보세요."}</p></div>
            <button className="primary-action" type="button" disabled={!unlockedResult} onClick={() => setResultOpen(true)}>
              변화 돌아보기 <GameIcon name="arrow" size={20} />
            </button>
          </>
        )}
      </footer>

      {introOpen && (
        <div className="overlay intro-overlay" role="dialog" aria-modal="true" aria-labelledby="intro-title">
          <div className="intro-card">
            <span className="intro-kicker">NAN 2026 · GAME × AI</span>
            <div className="intro-illustration"><AnimalAvatar residentId="lulu" emotion="happy" /><AnimalAvatar residentId="dubu" emotion="happy" /><AnimalAvatar residentId="moka" emotion="neutral" /></div>
            <h2 id="intro-title">이 마을에는<br /><em>상태창이 없습니다.</em></h2>
            <p>주민들의 말 속에서 필요한 것과 마음의 거리를 발견하고,<br />단 한 번의 결정으로 마을을 바꿔보세요.</p>
            <div className="intro-loop"><span>대화</span><i>→</i><span>추론</span><i>→</i><span>결정</span><i>→</i><span>변화</span></div>
            <button type="button" className="intro-start" onClick={() => setIntroOpen(false)}>마을의 이야기 듣기 <GameIcon name="arrow" size={20} /></button>
            <small>예상 플레이 시간 3분 · 마우스/터치</small>
          </div>
        </div>
      )}

      {selectedResident && currentProfile && (
        <div className="overlay dialogue-overlay" role="dialog" aria-modal="true" aria-labelledby="resident-name">
          <button className="overlay-dismiss" type="button" aria-label="대화 닫기" onClick={() => setSelectedResident(null)} />
          <section className="dialogue-card" style={{ "--resident-accent": currentProfile.accent, "--resident-soft": currentProfile.accentSoft } as React.CSSProperties}>
            <button className="dialogue-close" type="button" onClick={() => setSelectedResident(null)} aria-label="닫기"><GameIcon name="close" size={20} /></button>
            <div className="portrait-panel">
              <span className="portrait-role">{currentProfile.role}</span>
              <AnimalAvatar residentId={selectedResident} emotion={dialogue?.emotion || "neutral"} size="large" />
              <div><h2 id="resident-name">{currentProfile.name}</h2><p>{currentProfile.personality.join(" · ")}</p></div>
            </div>
            <div className="conversation-panel">
              <div className="speaker-row"><div><span>{currentProfile.name}</span><small>{dialogue?.source === "ai" ? "Gemini 3.6 Flash가 현재 상태로 생성" : "검증된 안전 대사"}</small></div><span className={`source-badge ${dialogue?.source === "ai" ? "source-badge--ai" : ""}`}>{dialogue?.source === "ai" ? "AI" : "SAFE"}</span></div>
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
              <button className="finish-talk" type="button" onClick={() => setSelectedResident(null)}>대화 마치기</button>
            </div>
          </section>
        </div>
      )}

      {notebookOpen && (
        <div className="overlay notebook-overlay" role="dialog" aria-modal="true" aria-labelledby="notebook-title">
          <button className="overlay-dismiss" type="button" aria-label="수첩 닫기" onClick={() => setNotebookOpen(false)} />
          <section className="notebook-card">
            <button className="dialogue-close" type="button" onClick={() => setNotebookOpen(false)} aria-label="닫기"><GameIcon name="close" size={20} /></button>
            <div className="notebook-binding" />
            <span className="notebook-kicker"><GameIcon name="book" size={20} /> 오늘 들은 이야기</span>
            <h2 id="notebook-title">대화 수첩</h2>
            <p className="notebook-subtitle">주민들의 말에서 알아낸 단서예요. 정답은 아직 적혀 있지 않아요.</p>
            <div className="clue-list">
              {residentOrder.map((id) => {
                const clue = BEFORE_CLUES[id];
                const found = village.talkedBefore[id];
                return <article key={id} className={found ? "is-found" : ""}><AnimalAvatar residentId={id} size="small" /><div><span>{RESIDENTS[id].name}의 이야기</span><p>{found ? clue.text : "아직 이야기를 듣지 않았습니다."}</p></div><GameIcon name={found ? clue.icon : "unknown"} size={24} /></article>;
              })}
            </div>
            <div className="notebook-thought"><GameIcon name="spark" size={22} /><p>{collectedClues.length >= 2 ? "서로 원하는 건 달라도, 모두에게 필요한 공간은 하나일지도 몰라." : "조금 더 들어보면 말 사이의 공통점이 보일 거야."}</p></div>
            <button className="intro-start" type="button" onClick={() => setNotebookOpen(false)}>마을로 돌아가기</button>
          </section>
        </div>
      )}

      {developmentOpen && (
        <div className="overlay development-overlay" role="dialog" aria-modal="true" aria-labelledby="development-title">
          <button className="overlay-dismiss" type="button" aria-label="개발 회의 닫기" onClick={() => setDevelopmentOpen(false)} />
          <section className="development-card">
            <button className="dialogue-close" type="button" onClick={() => setDevelopmentOpen(false)} aria-label="닫기"><GameIcon name="close" size={20} /></button>
            <span className="development-kicker">한 번뿐인 마을 결정</span>
            <h2 id="development-title">어떤 장소를 만들까요?</h2>
            <p>효과 수치는 보이지 않습니다. 주민들의 이야기를 떠올려 하나를 선택하세요.</p>
            <div className="facility-grid">
              {facilityOrder.map((id) => {
                const facility = FACILITIES[id];
                return <button key={id} type="button" className={`facility-card facility-card--${id}`} onClick={() => chooseFacility(id)}><span className="facility-icon"><GameIcon name={facility.icon} size={38} /></span><small>{facility.eyebrow}</small><h3>{facility.name}</h3><p>{facility.description}</p><em>{facility.flavor}</em><b>이곳 만들기 <GameIcon name="arrow" size={18} /></b></button>;
              })}
            </div>
            <span className="decision-note">선택은 되돌릴 수 없지만, 어떤 결과든 주민들의 솔직한 반응을 들을 수 있어요.</span>
          </section>
        </div>
      )}

      {building && (
        <div className="overlay building-overlay" role="status" aria-live="assertive">
          <div className="build-animation"><span className="build-spark spark-1">✦</span><span className="build-spark spark-2">✦</span><span className="build-spark spark-3">✧</span><div className="build-icon"><GameIcon name={FACILITIES[building].icon} size={52} /></div><h2>{FACILITIES[building].name}</h2><p>주민들의 이야기가 마을의 풍경이 되는 중…</p><div className="build-progress"><i /></div></div>
        </div>
      )}

      {resultOpen && village.selectedFacility && (
        <div className="overlay result-overlay" role="dialog" aria-modal="true" aria-labelledby="result-title">
          <section className="result-card">
            <span className="result-kicker">당신의 선택 이후</span>
            <h2 id="result-title">{RESULT_COPY[village.selectedFacility].title}</h2>
            <p>{RESULT_COPY[village.selectedFacility].summary}</p>
            <div className="before-after">
              <article><span>BEFORE</span><AnimalAvatar residentId="moka" emotion="annoyed" size="small" /><blockquote>“루루랑 마주치면 또 시끄러워질 것 같아.”</blockquote></article>
              <i><GameIcon name="arrow" size={26} /></i>
              <article className="after-quote"><span>AFTER</span><AnimalAvatar residentId="moka" emotion={village.selectedFacility === "park" ? "happy" : village.selectedFacility === "arcade" ? "annoyed" : "neutral"} size="small" /><blockquote>“{getFallbackDialogue(village, "moka").dialogue}”</blockquote></article>
            </div>
            <div className="result-verdict"><GameIcon name={village.selectedFacility === "park" ? "heart" : "spark"} size={25} /><span>{RESULT_COPY[village.selectedFacility].verdict}</span></div>
            <strong>숫자가 아니라, 주민의 이야기를 듣고 운영하는 마을.</strong>
            <div className="result-actions"><button type="button" onClick={() => setResultOpen(false)}>마을 더 둘러보기</button><button type="button" className="intro-start" onClick={resetGame}>다른 선택 해보기</button></div>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}

export default App;
