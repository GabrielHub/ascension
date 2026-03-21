import { type CSSProperties, useState } from "react";
import { Link } from "react-router";

import { buildGameShellHref } from "app/features/runtime";
import { formatSaveSlotTimestamp, type StartScreenSaveSlot } from "app/features/save-slots";
import { useSaveSlots } from "app/features/save-slots/use-save-slots";

const P = {
  void: "#060608",
  starGold: "#c8a84c",
  dimGold: "#8a7040",
  silverBody: "#e0ddd6",
  silverBright: "#f0ece4",
  cardBg: "rgba(15,14,18,0.4)",
  cardBorder: "rgba(200,168,76,0.06)",
  cardBorderHover: "rgba(200,168,76,0.18)",
  shadow: "0 8px 40px rgba(0,0,0,0.6)",
  shadowHover: "0 16px 56px rgba(0,0,0,0.7), 0 0 80px rgba(200,168,76,0.05)",
  deleteRed: "#8a3030",
  deleteRedHover: "#b04040",
} as const;

interface FlowingStar {
  x: number;
  y: number;
  size: number;
  pulseDelay: number;
  pulseDur: number;
  baseBrightness: number;
  driftDur: number;
  driftDelay: number;
  color: string;
  glowColor: string;
}

type FlowingStarStyle = CSSProperties & {
  "--star-base": number;
};

type OccupiedSaveSlotCard = StartScreenSaveSlot & {
  state: "occupied";
  metadata: NonNullable<StartScreenSaveSlot["metadata"]>;
};

function generateFlowingStars(count: number): FlowingStar[] {
  const stars: FlowingStar[] = [];
  let hx = 0.17;
  let hy = 0.63;

  for (let i = 0; i < count; i++) {
    hx = (hx + 0.618033988) % 1;
    hy = (hy + 0.381966012) % 1;

    const size = 1 + (i % 3);
    const baseBrightness = 0.15 + (i % 5) * 0.12;
    const pulseDelay = parseFloat(((i * 0.53) % 10).toFixed(2));
    const pulseDur = 4 + (i % 5) * 1.5;
    const isFast = i % 5 === 0;
    const driftDur = isFast ? 20 + (i % 7) * 2.5 : 40 + (i % 9) * 5;
    const driftDelay = parseFloat(((i * 1.17) % driftDur).toFixed(2));

    let color = P.starGold;
    let glowColor = "rgba(200,168,76,0.3)";
    const colorIndex = i % 10;

    if (colorIndex === 0) {
      color = "#d4541e";
      glowColor = "rgba(212,84,30,0.3)";
    } else if (colorIndex === 3) {
      color = "#ff7b3a";
      glowColor = "rgba(255,123,58,0.3)";
    } else if (colorIndex === 6) {
      color = "#4a6fa5";
      glowColor = "rgba(74,111,165,0.3)";
    } else if (colorIndex === 9) {
      color = "#e0ddd6";
      glowColor = "rgba(224,221,214,0.25)";
    }

    stars.push({
      x: parseFloat((hx * 100).toFixed(2)),
      y: parseFloat((hy * 100).toFixed(2)),
      size,
      pulseDelay,
      pulseDur,
      baseBrightness,
      driftDur,
      driftDelay,
      color,
      glowColor,
    });
  }

  return stars;
}

const STARS = generateFlowingStars(60);

function buildStarStyle(star: FlowingStar, top: string): FlowingStarStyle {
  return {
    left: `${star.x}%`,
    top,
    width: `${star.size}px`,
    height: `${star.size}px`,
    background: star.color,
    "--star-base": star.baseBrightness,
    animation: [
      `ss-drift ${star.driftDur}s linear ${star.driftDelay}s infinite`,
      `ss-pulse ${star.pulseDur}s ease-in-out ${star.pulseDelay}s infinite`,
    ].join(", "),
    boxShadow: star.size >= 2 ? `0 0 ${star.size * 2}px ${star.glowColor}` : "none",
  };
}

function SlotStateBadge({ label }: { label: string }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1"
      style={{
        border: "1px solid rgba(200,168,76,0.16)",
        background: "rgba(200,168,76,0.05)",
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
        fontSize: "0.75rem",
        letterSpacing: "0.12em",
        color: P.starGold,
        textTransform: "uppercase",
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{
          background: P.starGold,
          boxShadow: "0 0 6px rgba(200,168,76,0.5)",
        }}
      />
      {label}
    </div>
  );
}

function OccupiedCard({
  slot,
  isBusy,
  onDelete,
}: {
  slot: OccupiedSaveSlotCard;
  isBusy: boolean;
  onDelete: (slot: OccupiedSaveSlotCard) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [loadHover, setLoadHover] = useState(false);
  const [loadFocus, setLoadFocus] = useState(false);
  const [deleteHover, setDeleteHover] = useState(false);

  const stats = [
    { label: "Created", value: formatSaveSlotTimestamp(slot.metadata.createdAt) },
    { label: "Last Played", value: formatSaveSlotTimestamp(slot.metadata.lastPlayedAt) },
    { label: "Schema", value: `v${slot.schemaVersion ?? 1}` },
  ] as const;

  return (
    <div
      className="card-entrance group relative transition-all duration-500 ease-out"
      style={{
        animationDelay: `${1.2 + (slot.slotNumber - 1) * 0.15}s`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="relative overflow-hidden rounded-xl transition-all duration-500"
        style={{
          background: P.cardBg,
          backdropFilter: "blur(30px) saturate(1.2)",
          WebkitBackdropFilter: "blur(30px) saturate(1.2)",
          border: `1px solid ${hovered ? P.cardBorderHover : P.cardBorder}`,
          boxShadow: hovered ? P.shadowHover : P.shadow,
          padding: "1.5rem 1.75rem",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent 10%, rgba(200,168,76,${hovered ? 0.15 : 0.06}) 50%, transparent 90%)`,
            transition: "background 0.5s ease",
          }}
        />

        <div className="relative mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3
              className="truncate leading-tight"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 400,
                fontSize: "1.35rem",
                color: P.starGold,
                letterSpacing: "0.06em",
              }}
            >
              {slot.metadata.guildName}
            </h3>
            <div
              className="mt-1.5 flex flex-wrap items-center gap-2"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: "0.75rem",
                color: P.dimGold,
                letterSpacing: "0.04em",
                opacity: 0.85,
              }}
            >
              <span>Slot {slot.slotNumber}</span>
              <span style={{ opacity: 0.6 }}>&middot;</span>
              <span>Est. {formatSaveSlotTimestamp(slot.metadata.createdAt)}</span>
            </div>
          </div>
          <SlotStateBadge label="Occupied" />
        </div>

        <div
          className="my-3"
          style={{
            height: "1px",
            background:
              "linear-gradient(90deg, rgba(200,168,76,0.08) 0%, rgba(200,168,76,0.03) 100%)",
          }}
        />

        <div className="mb-4 grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  fontSize: "0.6875rem",
                  color: P.dimGold,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "0.2rem",
                  opacity: 0.85,
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  fontSize: "0.875rem",
                  color: P.silverBody,
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <div className="relative flex items-center gap-3">
          <Link
            to={buildGameShellHref({ mode: "load", slotId: slot.slotId })}
            aria-disabled={isBusy}
            className="flex-1 rounded-lg px-5 py-2 text-center transition-all duration-300"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              fontSize: "0.72rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              textDecoration: "none",
              color: loadHover || loadFocus ? P.void : P.silverBright,
              background: loadHover || loadFocus ? P.starGold : "rgba(200,168,76,0.08)",
              border: `1px solid ${loadHover || loadFocus ? P.starGold : "rgba(200,168,76,0.15)"}`,
              boxShadow: loadHover || loadFocus ? "0 4px 24px rgba(200,168,76,0.25)" : "none",
              outline: loadFocus ? `2px solid ${P.starGold}` : "none",
              outlineOffset: loadFocus ? "2px" : "0",
              pointerEvents: isBusy ? "none" : "auto",
              opacity: isBusy ? 0.55 : 1,
            }}
            onMouseEnter={() => setLoadHover(true)}
            onMouseLeave={() => setLoadHover(false)}
            onFocus={() => setLoadFocus(true)}
            onBlur={() => setLoadFocus(false)}
          >
            {isBusy ? "Working" : "Load"}
          </Link>
          <button
            onClick={() => onDelete(slot)}
            type="button"
            disabled={isBusy}
            className="cursor-pointer px-3 py-2 transition-all duration-300 disabled:cursor-default"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              fontSize: "0.75rem",
              letterSpacing: "0.04em",
              color: deleteHover ? P.deleteRedHover : P.dimGold,
              background: "transparent",
              border: "none",
              opacity: deleteHover ? 1 : 0.85,
              textDecoration: deleteHover ? "underline" : "none",
              textUnderlineOffset: "3px",
            }}
            onMouseEnter={() => setDeleteHover(true)}
            onMouseLeave={() => setDeleteHover(false)}
          >
            {isBusy ? "Deleting" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyCard({ slot }: { slot: StartScreenSaveSlot }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const active = hovered || focused;

  return (
    <div className="card-entrance" style={{ animationDelay: "1.5s" }}>
      <Link
        to={buildGameShellHref({ mode: "new", slotId: slot.slotId })}
        className="group relative block w-full overflow-hidden rounded-xl text-left transition-all duration-500"
        style={{
          background: P.cardBg,
          backdropFilter: "blur(30px) saturate(1.2)",
          WebkitBackdropFilter: "blur(30px) saturate(1.2)",
          border: `1px solid ${active ? P.cardBorderHover : P.cardBorder}`,
          boxShadow: active ? P.shadowHover : P.shadow,
          padding: "1.5rem 1.75rem",
          minHeight: "14rem",
          outline: focused ? `2px solid ${P.starGold}` : "none",
          outlineOffset: focused ? "2px" : "0",
          textDecoration: "none",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent 10%, rgba(200,168,76,${active ? 0.15 : 0.06}) 50%, transparent 90%)`,
            transition: "background 0.5s ease",
          }}
        />

        <div className="relative flex h-full flex-col items-center justify-center py-6">
          <div
            className="star-pulse mb-5 rounded-full transition-all duration-700"
            style={{
              width: active ? "10px" : "6px",
              height: active ? "10px" : "6px",
              background: P.starGold,
              boxShadow: active
                ? "0 0 20px rgba(200,168,76,0.5), 0 0 40px rgba(200,168,76,0.2)"
                : "0 0 10px rgba(200,168,76,0.3)",
            }}
          />

          <span
            className="transition-all duration-500"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 300,
              fontSize: "0.85rem",
              letterSpacing: "0.2em",
              textTransform: "lowercase",
              color: active ? P.starGold : "rgba(200,168,76,0.35)",
              opacity: active ? 1 : 0,
              transform: active ? "translateY(0)" : "translateY(4px)",
            }}
          >
            new
          </span>
          <span
            className="mt-2"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              fontSize: "0.75rem",
              color: P.dimGold,
              letterSpacing: "0.06em",
              opacity: 0.7,
            }}
          >
            Slot {slot.slotNumber}
          </span>
        </div>
      </Link>
    </div>
  );
}

function FooterLink({
  label,
  subtle = false,
  to,
}: {
  label: string;
  subtle?: boolean;
  to?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const active = hovered || focused;
  const sharedStyle = {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 400,
    fontSize: "0.75rem",
    letterSpacing: "0.12em",
    textTransform: "lowercase",
    color: active ? P.silverBody : subtle ? "rgba(200,168,76,0.7)" : "rgba(200,168,76,0.7)",
    background: active ? "rgba(200,168,76,0.04)" : "transparent",
    border: `1px solid ${active ? "rgba(200,168,76,0.1)" : "transparent"}`,
    outline: focused ? "1px solid rgba(200,168,76,0.2)" : "none",
    outlineOffset: focused ? "2px" : "0",
    textDecoration: "none",
  } satisfies CSSProperties;

  if (to) {
    return (
      <Link
        to={to}
        className="rounded-md px-2.5 py-1 transition-all duration-300"
        style={sharedStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="cursor-default rounded-md px-2.5 py-1 transition-all duration-300"
      style={sharedStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {label}
    </button>
  );
}

export function StartScreenShell() {
  const { slots, status, errorMessage, busySlotId, deleteSlot } = useSaveSlots();

  const topRowSlots = slots.slice(0, 2);
  const bottomRowSlots = slots.slice(2);
  const statusLabel =
    status === "loading" ? "Syncing local save slots" : (errorMessage ?? "Local save slots ready");

  const handleDelete = async (slot: OccupiedSaveSlotCard) => {
    const confirmed = window.confirm(
      `Delete ${slot.metadata.guildName} from slot ${slot.slotNumber}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    await deleteSlot(slot.slotId);
  };

  return (
    <>
      <style>{`
        @keyframes ss-drift {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-100vh); }
        }

        @keyframes ss-pulse {
          0%, 100% { opacity: var(--star-base, 0.2); }
          50%      { opacity: calc(var(--star-base, 0.2) + 0.35); }
        }

        @keyframes ss-fade-up {
          0%   { opacity: 0; transform: translateY(24px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes ss-title-in {
          0%   { opacity: 0; letter-spacing: 0.6em; }
          100% { opacity: 1; letter-spacing: 0.4em; }
        }

        @keyframes ss-sub-in {
          0%   { opacity: 0; }
          100% { opacity: 0.35; }
        }

        @keyframes ss-star-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(200,168,76,0.3); }
          50%      { box-shadow: 0 0 20px rgba(200,168,76,0.5), 0 0 40px rgba(200,168,76,0.15); }
        }

        @keyframes ss-breathe {
          0%, 100% { opacity: 0.45; }
          50%      { opacity: 0.55; }
        }

        .card-entrance {
          opacity: 0;
          animation: ss-fade-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .star-pulse {
          animation: ss-star-pulse 3s ease-in-out infinite;
        }

        .flowing-star {
          position: absolute;
          border-radius: 9999px;
          will-change: transform, opacity;
        }
      `}</style>

      <div
        className="relative flex h-dvh flex-col overflow-hidden"
        style={{
          background: P.void,
          fontFamily: "'Inter', sans-serif",
          color: P.silverBody,
        }}
      >
        <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
          {STARS.map((star, index) => (
            <div key={index} className="flowing-star" style={buildStarStyle(star, `${star.y}%`)} />
          ))}
          {STARS.map((star, index) => (
            <div
              key={`dup-${index}`}
              className="flowing-star"
              style={buildStarStyle(star, `calc(${star.y}% + 100vh)`)}
            />
          ))}
        </div>

        <div
          className="pointer-events-none fixed inset-0 z-[1]"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 45%, transparent 0%, rgba(6,6,8,0.7) 100%)",
            animation: "ss-breathe 10s ease-in-out infinite",
          }}
        />

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 sm:px-10 lg:px-16">
          <div className="flex flex-1 flex-col items-center justify-center">
            <header className="flex flex-col items-center text-center">
              <h1
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 200,
                  fontSize: "clamp(3.5rem, 10vw, 7.5rem)",
                  lineHeight: 1,
                  letterSpacing: "0.4em",
                  textTransform: "lowercase",
                  color: P.starGold,
                  animation: "ss-title-in 2s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both",
                  textIndent: "0.4em",
                }}
              >
                ascension
              </h1>

              <p
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 300,
                  fontSize: "clamp(0.65rem, 1.2vw, 0.8rem)",
                  letterSpacing: "0.35em",
                  textTransform: "lowercase",
                  color: P.silverBody,
                  marginTop: "1.5rem",
                  animation: "ss-sub-in 2s ease 0.8s both",
                }}
              >
                manhattan &middot; 2035
              </p>

              <p
                className="mt-4 text-xs uppercase tracking-[0.28em] text-silver/60"
                aria-live="polite"
              >
                {statusLabel}
              </p>
            </header>
          </div>

          <section className="pb-6">
            <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
              {topRowSlots.map((slot) =>
                slot.state === "occupied" && slot.metadata ? (
                  <OccupiedCard
                    key={slot.slotId}
                    slot={slot}
                    isBusy={busySlotId === slot.slotId}
                    onDelete={handleDelete}
                  />
                ) : (
                  <EmptyCard key={slot.slotId} slot={slot} />
                ),
              )}
            </div>

            <div className="mx-auto mt-5 flex max-w-3xl justify-center">
              <div className="w-full sm:w-1/2 sm:max-w-none lg:w-[calc(50%-0.625rem)]">
                {bottomRowSlots.map((slot) =>
                  slot.state === "occupied" && slot.metadata ? (
                    <OccupiedCard
                      key={slot.slotId}
                      slot={slot}
                      isBusy={busySlotId === slot.slotId}
                      onDelete={handleDelete}
                    />
                  ) : (
                    <EmptyCard key={slot.slotId} slot={slot} />
                  ),
                )}
              </div>
            </div>
          </section>

          <footer className="relative mt-auto pb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-5">
                <FooterLink label="Settings" />
                <span
                  className="inline-block h-0.5 w-0.5 rounded-full"
                  style={{ background: P.dimGold, opacity: 0.3 }}
                />
                <FooterLink label="Dev Menu" subtle to={buildGameShellHref({ mode: "preview" })} />
              </div>

              <div className="text-right">
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 400,
                    fontSize: "0.6875rem",
                    letterSpacing: "0.08em",
                    color: P.dimGold,
                    opacity: 0.7,
                  }}
                >
                  {statusLabel}
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 400,
                    fontSize: "0.6875rem",
                    letterSpacing: "0.08em",
                    color: P.dimGold,
                    opacity: 0.6,
                    marginTop: "0.3rem",
                  }}
                >
                  v0.0.1
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
