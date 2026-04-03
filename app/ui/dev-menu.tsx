import { useEffect, useRef, useState } from "react";
import type { HqDebugOverlays } from "render";

import type { RuntimeSession } from "app/features/runtime";

import type { EventLogEntry } from "./view-models";
import {
  executeConsoleCommand,
  groupedCommandRegistry,
  publishAgentDebugSnapshot,
  type DevConsoleContext,
  type DevConsoleResult,
} from "./dev-console-commands";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DevConsoleProps {
  session: RuntimeSession;
  onClose: () => void;
  debugOverlays: HqDebugOverlays;
  onDebugOverlaysChange: (overlays: HqDebugOverlays) => void;
  eventLogEntries: readonly EventLogEntry[];
}

interface TranscriptEntry {
  input: string;
  result: DevConsoleResult;
}

// ---------------------------------------------------------------------------
// Status color mapping
// ---------------------------------------------------------------------------

const STATUS_CLASSES: Record<DevConsoleResult["status"], string> = {
  ok: "text-[#6ec87a]",
  error: "text-ember",
  warn: "text-smolder",
  info: "text-silver/80",
};

const STATUS_PREFIX: Record<DevConsoleResult["status"], string> = {
  ok: "",
  error: "error: ",
  warn: "warn: ",
  info: "",
};

// ---------------------------------------------------------------------------
// Empty-state help listing
// ---------------------------------------------------------------------------

function HelpListing() {
  return (
    <div data-testid="dev-console-help" className="space-y-4 px-1 py-2">
      <p className="text-xs text-silver/40 tracking-wide">
        Type a command or browse the reference below. Prefix all commands with{" "}
        <span className="text-gold/70 font-mono">/</span>
      </p>

      {[...groupedCommandRegistry.entries()].map(([family, cmds]) => (
        <div key={family}>
          <h4 className="text-xs font-medium uppercase tracking-[0.2em] text-gold/50 mb-1.5">
            {family}
          </h4>
          <div className="space-y-0.5">
            {cmds.map((cmd) => (
              <div key={cmd.name} className="flex items-baseline gap-2 leading-relaxed">
                <span className="font-mono text-xs text-gold/70 shrink-0">
                  /{cmd.name}
                  {cmd.args ? <span className="text-silver/30"> {cmd.args}</span> : null}
                </span>
                <span className="text-xs text-silver/35 truncate">{cmd.help}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transcript entry row
// ---------------------------------------------------------------------------

function TranscriptRow({ entry }: { entry: TranscriptEntry }) {
  const statusClass = STATUS_CLASSES[entry.result.status];
  const prefix = STATUS_PREFIX[entry.result.status];

  return (
    <div className="py-1.5 border-b border-[rgba(200,168,76,0.04)] last:border-b-0">
      {/* Input echo */}
      <div className="font-mono text-xs text-gold/60">
        <span className="text-gold/30 select-none">{">"} </span>
        {entry.input}
      </div>

      {/* Result message */}
      {entry.result.message && (
        <div className={`font-mono text-xs mt-0.5 ${statusClass}`}>
          {prefix}
          {entry.result.message}
        </div>
      )}

      {/* Detail block */}
      {entry.result.detail && (
        <pre className="font-mono text-xs mt-1 text-silver/40 whitespace-pre-wrap leading-relaxed overflow-x-auto">
          {entry.result.detail}
        </pre>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DevConsole
// ---------------------------------------------------------------------------

// Persist command history across open/close cycles within the same session
const sessionHistory: string[] = [];

export function DevConsole({
  session,
  onClose,
  debugOverlays,
  onDebugOverlaysChange,
  eventLogEntries,
}: DevConsoleProps) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const restoreAutoTickOnCloseRef = useRef(false);
  const autoTickManuallyChangedRef = useRef(false);

  const ctx: DevConsoleContext = {
    session,
    debugOverlays,
    setDebugOverlays: onDebugOverlaysChange,
    eventLogEntries,
  };

  // Publish agent debug snapshot on mount and state changes
  useEffect(() => {
    publishAgentDebugSnapshot(ctx);
  }, [
    session.phase1View.clock.day,
    session.phase1View.clock.minuteOfDay,
    debugOverlays,
    eventLogEntries,
    session.state,
  ]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Freeze auto-ticking while the console is open to keep keyboard interactions responsive.
  useEffect(() => {
    restoreAutoTickOnCloseRef.current = session.isAutoTicking;
    autoTickManuallyChangedRef.current = false;

    if (session.isAutoTicking) {
      session.lifecycle.stopAutoTick();
    }

    return () => {
      if (
        restoreAutoTickOnCloseRef.current &&
        !autoTickManuallyChangedRef.current &&
        !session.isAutoTicking
      ) {
        session.lifecycle.startAutoTick();
      }
    };
  }, [session]);

  // Auto-scroll transcript to bottom when new entries are added
  useEffect(() => {
    if (transcript.length === 0) return;
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  function handleSubmit() {
    const raw = inputValue.trim();
    if (!raw) return;

    // Push to session-level history
    sessionHistory.push(raw);
    setHistoryIndex(-1);
    setInputValue("");

    // Handle special UI-only commands
    const normalized = raw.startsWith("/") ? raw.slice(1).trim() : raw;
    const normalizedLower = normalized.toLowerCase();

    if (normalizedLower === "freeze" || normalizedLower === "resume") {
      autoTickManuallyChangedRef.current = true;
    }

    if (normalizedLower === "clear") {
      setTranscript([]);
      return;
    }

    if (normalizedLower === "history") {
      const detail =
        sessionHistory.length > 0
          ? sessionHistory.map((cmd, i) => `  ${i + 1}. ${cmd}`).join("\n")
          : "  (empty)";
      setTranscript((prev) => [
        ...prev,
        {
          input: raw,
          result: { status: "info", message: `${sessionHistory.length} commands`, detail },
        },
      ]);
      return;
    }

    const result = executeConsoleCommand(raw, ctx);
    setTranscript((prev) => [...prev, { input: raw, result }]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (sessionHistory.length === 0) return;
      const nextIndex =
        historyIndex === -1 ? sessionHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInputValue(sessionHistory[nextIndex]);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= sessionHistory.length) {
        setHistoryIndex(-1);
        setInputValue("");
      } else {
        setHistoryIndex(nextIndex);
        setInputValue(sessionHistory[nextIndex]);
      }
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        role="presentation"
      />

      {/* Console panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
        <div
          data-testid="dev-console"
          className="pointer-events-auto flex flex-col w-full max-w-2xl rounded-xl border border-[rgba(200,168,76,0.08)] bg-[rgba(10,10,14,0.88)] shadow-[0_12px_56px_rgba(0,0,0,0.7)] backdrop-blur-[40px] backdrop-saturate-[1.15]"
          style={{ maxHeight: "min(80vh, 680px)" }}
          role="dialog"
          aria-label="Dev Console"
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[rgba(200,168,76,0.06)]">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-gold/40" />
              <h2 className="font-[family-name:var(--font-display)] text-sm font-light tracking-[0.18em] text-gold/80 uppercase">
                Command Console
              </h2>
            </div>
            <button type="button" className="btn-ghost px-2 py-0.5 text-xs" onClick={onClose}>
              esc
            </button>
          </div>

          {/* ── Transcript / Help ────────────────────────────────────── */}
          <div
            ref={transcriptRef}
            data-testid="dev-console-transcript"
            className="flex-1 overflow-y-auto px-5 py-3 min-h-0"
          >
            {transcript.length === 0 ? (
              <HelpListing />
            ) : (
              transcript.map((entry, i) => <TranscriptRow key={i} entry={entry} />)
            )}
          </div>

          {/* ── Input ────────────────────────────────────────────────── */}
          <div className="relative border-t border-[rgba(200,168,76,0.06)]">
            {/* Glow line */}
            <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />

            <div className="flex items-center px-5 py-3">
              <span className="font-mono text-xs text-gold/40 select-none mr-1.5">/</span>
              <input
                ref={inputRef}
                data-testid="dev-console-input"
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setHistoryIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent font-mono text-xs text-silver-bright placeholder:text-silver/20 outline-none caret-gold/60"
                placeholder="type a command..."
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
