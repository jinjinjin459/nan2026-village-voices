import { useEffect, useState } from "react";
import { FISH_REWARDS } from "../pixel/data";
import type { FishingReward } from "../pixel/types";
import { FishingSprite } from "./PixelSprite";

type FishingStatus = "ready" | "waiting" | "bite" | "caught" | "escaped";

const REWARD_ORDER: FishingReward[] = ["silver", "carp", "silver", "bass", "silver", "carp", "treasure"];

export function FishingPanel({
  seed,
  onCatch,
  onClose,
}: {
  seed: number;
  onCatch: (reward: FishingReward) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<FishingStatus>("ready");
  const [reward, setReward] = useState<FishingReward | null>(null);

  useEffect(() => {
    if (status !== "waiting") return;
    const timer = window.setTimeout(() => setStatus("bite"), 900 + (seed % 4) * 180);
    return () => window.clearTimeout(timer);
  }, [seed, status]);

  useEffect(() => {
    if (status !== "bite") return;
    const timer = window.setTimeout(() => setStatus("escaped"), 1800);
    return () => window.clearTimeout(timer);
  }, [status]);

  function cast() {
    setReward(null);
    setStatus("waiting");
  }

  function pull() {
    if (status !== "bite") return;
    const caught = REWARD_ORDER[seed % REWARD_ORDER.length];
    setReward(caught);
    setStatus("caught");
    onCatch(caught);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (key !== "e" && key !== " ") return;
      event.preventDefault();
      if (event.repeat) return;
      if (status === "ready" || status === "escaped") cast();
      if (status === "bite") pull();
      if (status === "caught") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCatch, onClose, seed, status]);

  return (
    <div className="fishing-layer" role="dialog" aria-modal="true" aria-labelledby="fishing-title">
      <section className={`fishing-panel fishing-status-${status}`}>
        <button className="fishing-close" type="button" onClick={onClose} aria-label="낚시 닫기">×</button>
        <div className="fishing-scene">
          {reward ? <FishingSprite type={reward} /> : <FishingSprite type={status === "ready" ? "rod" : "bobber"} />}
          <span className="fishing-water-line" aria-hidden="true" />
        </div>
        <div className="fishing-copy">
          <h2 id="fishing-title">
            {status === "ready" && "고요한 호숫가"}
            {status === "waiting" && "찌를 바라보는 중…"}
            {status === "bite" && "입질이다!"}
            {status === "caught" && `${FISH_REWARDS[reward!].name}을(를) 잡았다!`}
            {status === "escaped" && "물고기가 도망갔다"}
          </h2>
          <p>
            {status === "ready" && "부두 끝에는 다양한 물고기와 가끔 보물상자가 올라와요."}
            {status === "waiting" && "물결이 크게 흔들릴 때까지 기다리세요."}
            {status === "bite" && "지금 바로 낚싯줄을 당기세요!"}
            {status === "caught" && `마을 장터에서 코인 ${FISH_REWARDS[reward!].coins}의 가치가 있어요.`}
            {status === "escaped" && "조금 더 빨리 당기면 잡을 수 있어요."}
          </p>
          {status === "ready" || status === "escaped" ? (
            <button className="fishing-action" type="button" onClick={cast}>낚싯줄 던지기</button>
          ) : null}
          {status === "waiting" ? <div className="fishing-wait"><i /><i /><i /></div> : null}
          {status === "bite" ? <button className="fishing-action is-biting" type="button" onClick={pull}>지금 당기기!</button> : null}
          {status === "caught" ? <button className="fishing-action" type="button" onClick={onClose}>낚시 마치기</button> : null}
          <small className="fishing-key-hint"><kbd>E</kbd> 또는 <kbd>Space</kbd>로 조작</small>
        </div>
      </section>
    </div>
  );
}
