import { useEffect, useRef, type KeyboardEvent } from "react";

import type { InterruptionInstance, RivalMoveFamily, RivalMovePayload } from "sim";

const FAMILY_HEADLINES: Record<RivalMoveFamily, { lead: string; tail: string }> = {
  recruitment_market_loss: { lead: "Talent", tail: "Outbid" },
  sponsor_interference: { lead: "Sponsor", tail: "Pulled" },
  public_comparison: { lead: "Better", tail: "Headlines" },
  contract_challenge: { lead: "Contract", tail: "Stolen" },
  site_arrival: { lead: "Site", tail: "Overtaken" },
  press_gravity: { lead: "Press", tail: "Gravity" },
};

const LANE_LABELS: Record<string, string> = {
  prestige: "Prestige Track",
  "labor-market": "Labor Market",
  "sponsor-network": "Sponsor Network",
  hybrid: "Hybrid Pressure",
};

const TREND_GLYPHS: Record<RivalMovePayload["trend"], { glyph: string; word: string }> = {
  rising: { glyph: "▲", word: "Rising" },
  stable: { glyph: "—", word: "Holding" },
  slipping: { glyph: "▼", word: "Slipping" },
};

function formatDelta(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return String(value);
  return "±0";
}

const STAT_CARD_BASE =
  "relative rounded-lg border border-[rgba(200,168,76,0.14)] bg-[rgba(8,6,10,0.62)] px-3.5 py-2.5 backdrop-blur-md before:absolute before:top-0 before:h-px before:w-3.5 before:bg-gold before:opacity-70 before:content-['']";
const STAT_LABEL =
  "font-[family-name:var(--font-display)] text-xs font-light uppercase tracking-[0.28em] text-silver/55";
const STAT_VALUE =
  "mt-1 font-[family-name:var(--font-display)] text-sm font-normal text-silver-bright";

export function RivalMoveModal({
  instance,
  payload,
  onResolve,
}: {
  instance: InterruptionInstance;
  payload: RivalMovePayload;
  onResolve: (instanceId: string, choiceId?: string) => void;
}) {
  const headline = FAMILY_HEADLINES[payload.family];
  const laneLabel = LANE_LABELS[payload.pressureLane] ?? payload.pressureLane;
  const trend = TREND_GLYPHS[payload.trend];
  const titleId = `rival-move-${instance.instanceId}-title`;
  const briefingId = `rival-move-${instance.instanceId}-briefing`;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstChoiceRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    firstChoiceRef.current?.focus();
  }, [instance.instanceId]);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((element) => element.offsetParent !== null);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/[0.72] px-3 py-4 opacity-0 backdrop-blur-md animate-rival-modal-backdrop motion-reduce:animate-none motion-reduce:opacity-100 sm:px-8 sm:py-16"
      data-testid="rival-move-modal"
    >
      <div
        ref={dialogRef}
        className="pointer-events-auto relative h-[min(41.25rem,88dvh)] w-[min(67.5rem,94vw)] translate-y-5 scale-[0.97] overflow-visible rounded-[1.125rem] border border-[rgba(200,168,76,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.022)_0%,rgba(0,0,0,0)_60%),rgba(15,14,18,0.78)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_60px_100px_-40px_rgba(0,0,0,0.85),0_0_0_1px_rgba(0,0,0,0.4),0_0_80px_-20px_rgba(212,84,30,0.28)] backdrop-blur-[14px] animate-rival-modal-in motion-reduce:animate-none motion-reduce:translate-y-0 motion-reduce:scale-100 max-[760px]:h-[calc(100dvh-2rem)] max-[760px]:w-[calc(100vw-1.5rem)] max-[760px]:overflow-y-auto max-[760px]:overflow-x-hidden max-[760px]:px-4 max-[760px]:py-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={briefingId}
        onKeyDown={handleDialogKeyDown}
        data-rival-id={payload.rivalId}
        data-move-template-id={payload.moveTemplateId}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-20 right-20 top-0 z-[6] h-px rounded-[1px] bg-[linear-gradient(90deg,transparent,var(--color-ember)_35%,var(--color-smolder)_50%,var(--color-ember)_65%,transparent)] shadow-[0_0_18px_rgba(212,84,30,0.55)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-[8%] left-1/2 z-0 h-[130%] w-[60%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_50%_35%,rgba(212,84,30,0.22)_0%,rgba(212,84,30,0.05)_38%,transparent_65%)]"
        />

        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-px -top-px z-[5] h-3 w-3 border border-b-0 border-r-0 border-[rgba(138,112,64,0.7)] opacity-45"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-px -top-px z-[5] h-3 w-3 border border-b-0 border-l-0 border-[rgba(138,112,64,0.7)] opacity-45"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-px -left-px z-[5] h-3 w-3 border border-r-0 border-t-0 border-[rgba(138,112,64,0.7)] opacity-45"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-px -right-px z-[5] h-3 w-3 border border-l-0 border-t-0 border-[rgba(138,112,64,0.7)] opacity-45"
        />

        <div className="absolute left-6 right-6 top-[1.2rem] z-[5] flex items-start gap-4 max-[760px]:relative max-[760px]:left-auto max-[760px]:right-auto max-[760px]:top-auto">
          <span className="inline-block h-16 w-16 shrink-0 overflow-hidden rounded-[0.875rem] bg-[#0a0810] shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_0_0_2px_rgba(200,168,76,0.18),0_12px_24px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)]">
            <img src={payload.insignia} alt="" className="block h-full w-full object-cover" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-[family-name:var(--font-display)] text-xs font-light uppercase tracking-[0.32em] text-gold">
              <span
                aria-hidden="true"
                className="mr-2 inline-block h-[7px] w-[7px] rounded-full bg-ember align-middle shadow-[0_0_10px_var(--color-ember)] animate-rival-modal-blip motion-reduce:animate-none"
              />
              Active Play · Day {payload.dayNumber}
            </p>
            <p className="mt-1.5 font-[family-name:var(--font-display)] text-sm font-normal leading-tight text-silver-bright">
              {payload.guildName}
            </p>
            <p className="mt-0.5 font-[family-name:var(--font-display)] text-xs font-light uppercase tracking-[0.18em] text-silver/55">
              {payload.leaderName} · {payload.shortDisplayName}
            </p>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[14%] z-0 h-[23.75rem] w-[23.75rem] -translate-x-1/2 scale-[0.92] opacity-0 animate-rival-modal-watermark motion-reduce:animate-none motion-reduce:scale-100 motion-reduce:opacity-[0.05] max-[760px]:hidden"
        >
          <img
            src={payload.insignia}
            alt=""
            className="block h-full w-full object-contain [filter:blur(0.5px)]"
          />
        </div>

        <h2
          id={titleId}
          className="pointer-events-none absolute left-0 right-0 top-[22%] z-[1] m-0 text-center font-[family-name:var(--font-display)] font-extralight uppercase leading-[0.84] tracking-[-0.012em] text-[rgba(240,236,228,0.96)] [font-size:clamp(3rem,7.5vw,5.5rem)] [text-shadow:0_6px_32px_rgba(0,0,0,0.85)] max-[760px]:relative max-[760px]:left-auto max-[760px]:right-auto max-[760px]:top-auto max-[760px]:mt-7 max-[760px]:text-left max-[760px]:[font-size:clamp(2.5rem,16vw,4rem)]"
        >
          {headline.lead}
          <em className="mt-[0.04em] block font-light not-italic tracking-[-0.005em] text-smolder">
            {headline.tail}
          </em>
        </h2>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[5.625rem] left-1/2 z-[3] h-[130%] w-[23.75rem] -translate-x-1/2 translate-y-10 scale-[0.97] opacity-0 [filter:drop-shadow(-20px_24px_40px_rgba(0,0,0,0.78))_drop-shadow(0_0_60px_rgba(212,84,30,0.3))] animate-rival-modal-figure motion-reduce:animate-none motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:opacity-100 max-[760px]:hidden"
        >
          <img
            src={payload.leaderPortrait}
            alt=""
            className="block h-full w-full object-contain object-[bottom_center]"
          />
        </div>

        <div className="absolute left-6 top-[44%] z-[4] flex w-[12.5rem] translate-y-2 flex-col gap-2.5 opacity-0 animate-rival-modal-stats motion-reduce:animate-none motion-reduce:translate-y-0 motion-reduce:opacity-100 max-[760px]:relative max-[760px]:left-auto max-[760px]:top-auto max-[760px]:mt-6 max-[760px]:w-full max-[760px]:translate-y-0 max-[760px]:opacity-100">
          <div className={`${STAT_CARD_BASE} before:left-0`}>
            <p className={STAT_LABEL}>Pressure Lane</p>
            <p className={STAT_VALUE}>{laneLabel}</p>
          </div>
          <div className={`${STAT_CARD_BASE} before:left-0`}>
            <p className={STAT_LABEL}>Trend</p>
            <p className={`${STAT_VALUE} inline-flex items-center gap-1.5`}>
              <span aria-hidden="true" className="text-smolder">
                {trend.glyph}
              </span>
              {trend.word}
            </p>
          </div>
          <div className={`${STAT_CARD_BASE} before:left-0`}>
            <p className={STAT_LABEL}>Aggression</p>
            <p className={`${STAT_VALUE} tabular-nums`}>{Math.round(payload.aggression)}</p>
          </div>
        </div>

        <div className="absolute right-6 top-[44%] z-[4] flex w-[12.5rem] translate-y-2 flex-col gap-2.5 text-right opacity-0 animate-rival-modal-stats motion-reduce:animate-none motion-reduce:translate-y-0 motion-reduce:opacity-100 max-[760px]:relative max-[760px]:right-auto max-[760px]:top-auto max-[760px]:mt-2.5 max-[760px]:w-full max-[760px]:translate-y-0 max-[760px]:text-left max-[760px]:opacity-100">
          <div className={`${STAT_CARD_BASE} before:right-0`}>
            <p className={STAT_LABEL}>Intensity</p>
            <p className={`${STAT_VALUE} tabular-nums`}>
              {Math.round(payload.intensity)}{" "}
              <span className="text-xs font-light text-smolder tabular-nums">
                {formatDelta(payload.intensityDelta)}
              </span>
            </p>
          </div>
          <div className={`${STAT_CARD_BASE} before:right-0`}>
            <p className={STAT_LABEL}>Public Pressure</p>
            <p className={`${STAT_VALUE} tabular-nums`}>
              {formatDelta(payload.publicPressureDelta)}
            </p>
          </div>
          <div className={`${STAT_CARD_BASE} before:right-0`}>
            <p className={STAT_LABEL}>War Room</p>
            <p className={STAT_VALUE}>{payload.warRoomMitigated ? "Blunted" : "Standby"}</p>
          </div>
        </div>

        <div
          id={briefingId}
          data-testid="rival-move-briefing"
          className="absolute bottom-[11rem] left-1/2 z-[4] w-[min(36.25rem,70%)] -translate-x-1/2 rounded-[0.625rem] border border-[rgba(212,84,30,0.2)] bg-[rgba(6,4,8,0.7)] px-[1.15rem] pb-[0.95rem] pt-[0.85rem] text-center opacity-0 backdrop-blur-md animate-rival-modal-caption motion-reduce:animate-none motion-reduce:opacity-100 max-[760px]:relative max-[760px]:bottom-auto max-[760px]:left-auto max-[760px]:mt-5 max-[760px]:w-full max-[760px]:translate-x-0 max-[760px]:text-left max-[760px]:opacity-100"
        >
          <p className="text-sm leading-relaxed text-silver/85">{payload.briefing}</p>
        </div>

        <div
          data-testid="rival-move-choices"
          className="absolute bottom-0 left-0 right-0 z-[5] flex flex-wrap items-stretch justify-center gap-3 rounded-b-[1.125rem] border-t border-dashed border-[rgba(200,168,76,0.12)] bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.55))] px-6 py-[0.95rem] backdrop-blur-sm max-[760px]:relative max-[760px]:bottom-auto max-[760px]:left-auto max-[760px]:right-auto max-[760px]:mt-4 max-[760px]:px-0 max-[760px]:pb-0"
        >
          {payload.choices.map((choice, index) => (
            <button
              key={choice.choiceId}
              ref={index === 0 ? firstChoiceRef : undefined}
              type="button"
              data-choice-id={choice.choiceId}
              className="flex min-w-[13rem] max-w-[20rem] flex-1 flex-col items-start gap-1 rounded-md border border-[rgba(212,84,30,0.35)] bg-[linear-gradient(180deg,rgba(212,84,30,0.18),rgba(212,84,30,0.04))] px-[0.95rem] py-[0.7rem] text-left transition-all duration-200 hover:border-[rgba(212,84,30,0.65)] hover:bg-[linear-gradient(180deg,rgba(212,84,30,0.28),rgba(212,84,30,0.08))] hover:shadow-[0_0_0_1px_rgba(212,84,30,0.5)] focus-visible:outline-none focus-visible:border-[rgba(212,84,30,0.75)] focus-visible:shadow-[0_0_0_2px_rgba(212,84,30,0.5)] max-[760px]:min-w-0 max-[760px]:max-w-none max-[760px]:basis-full"
              onClick={() => onResolve(instance.instanceId, choice.choiceId)}
            >
              <span className="font-[family-name:var(--font-display)] text-xs uppercase tracking-[0.22em] text-silver-bright">
                {choice.label}
              </span>
              <span className="text-xs font-light leading-snug text-silver/75">
                {choice.description}
              </span>
              <span className="text-xs font-light uppercase tracking-[0.16em] text-smolder/90">
                {choice.consequenceSummary}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
