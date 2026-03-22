import { useEffect, useState } from "react";

import type { FocusPayload } from "render";

import { BodegaFloor } from "./bodega-floor";
import { RoomDetailPanel } from "./room-detail-panel";
import { RosterPanel } from "./roster-panel";
import type { GameCallbacks, HqViewModel } from "./view-models";

interface HqPanelProps {
  hq: HqViewModel;
  callbacks: GameCallbacks;
  focus: FocusPayload | null;
}

type HqContextView = "rooms" | "roster";

export function HqPanel({ hq, callbacks, focus }: HqPanelProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [contextView, setContextView] = useState<HqContextView>("rooms");

  useEffect(() => {
    if (!focus) return;

    if (focus.targetKind === "room") {
      setSelectedRoomId(focus.targetId);
      setContextView("rooms");
      return;
    }

    if (focus.targetKind === "operator" || focus.targetKind === "staff") {
      setContextView("roster");
    }
  }, [focus]);

  // Sync selection from world canvas focus
  const effectiveRoomId = focus?.targetKind === "room" ? focus.targetId : selectedRoomId;

  const selectedRoom = hq.rooms.find((r) => r.id === effectiveRoomId) ?? null;
  const focusedOperatorId =
    focus?.targetKind === "operator" || focus?.targetKind === "staff" ? focus.targetId : null;

  const selectedRoomUpgrades = selectedRoom
    ? hq.roomUpgrades.filter((u) => u.targetId === selectedRoom.templateId)
    : [];

  return (
    <div className="animate-enter pointer-events-none relative h-full">
      {/* Bottom strip: horizontal room management bar */}
      <div className="pointer-events-auto absolute bottom-0 left-0 right-[336px] max-h-[220px] overflow-hidden rounded-tr-xl border-r border-t border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.78)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-[rgba(200,168,76,0.04)] px-5 py-2.5">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-gold/80">Rooms</h2>
          <span className="text-xs tabular-nums text-silver/60">
            {hq.rooms.filter((r) => r.isActive).length}/{hq.rooms.length} active
          </span>
        </div>
        <div className="overflow-x-auto overflow-y-hidden px-4 py-3">
          <BodegaFloor
            rooms={hq.rooms}
            emptySlots={hq.emptySlots}
            placeableTemplates={hq.placeableRoomTemplates}
            selectedRoomId={effectiveRoomId}
            onSelectRoom={setSelectedRoomId}
            onPlaceRoom={callbacks.placeRoom}
          />
        </div>
      </div>

      {/* Right: context panel (inspect / roster) */}
      <aside className="pointer-events-auto absolute right-0 top-0 max-h-full w-[320px] overflow-y-auto rounded-bl-xl border-b border-l border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.78)] p-4 backdrop-blur-xl">
        <div className="mb-4 flex gap-1 border-b border-[rgba(200,168,76,0.06)] pb-2">
          <button
            type="button"
            className="tab-button"
            data-active={contextView === "rooms"}
            onClick={() => setContextView("rooms")}
          >
            Inspect
          </button>
          <button
            type="button"
            className="tab-button"
            data-active={contextView === "roster"}
            onClick={() => setContextView("roster")}
          >
            Roster
          </button>
        </div>

        {contextView === "rooms" && (
          <RoomDetailPanel
            room={selectedRoom}
            buildingUpgrades={hq.upgrades}
            roomUpgrades={selectedRoomUpgrades}
            callbacks={callbacks}
          />
        )}
        {contextView === "roster" && (
          <RosterPanel
            operators={hq.operators}
            staff={hq.staff}
            visitors={hq.visitors}
            relationships={hq.relationships}
            rooms={hq.rooms}
            callbacks={callbacks}
            rosterPressure={hq.rosterPressure}
            focusedOperatorId={focusedOperatorId}
          />
        )}
      </aside>
    </div>
  );
}
