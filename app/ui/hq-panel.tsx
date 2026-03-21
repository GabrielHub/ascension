import { useState } from "react";

import { WorldCanvasSurface } from "render";
import type { WorldRenderSnapshot } from "render";

import { BodegaFloor } from "./bodega-floor";
import { RoomDetailPanel } from "./room-detail-panel";
import { RosterPanel } from "./roster-panel";
import type { GameCallbacks, HqViewModel } from "./view-models";

interface HqPanelProps {
  hq: HqViewModel;
  callbacks: GameCallbacks;
  worldRenderSnapshot: WorldRenderSnapshot;
}

type HqContextView = "rooms" | "roster";

export function HqPanel({ hq, callbacks, worldRenderSnapshot }: HqPanelProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [contextView, setContextView] = useState<HqContextView>("rooms");

  const selectedRoom = hq.rooms.find((r) => r.id === selectedRoomId) ?? null;

  const selectedRoomUpgrades = selectedRoom
    ? hq.roomUpgrades.filter((u) => u.targetId === selectedRoom.templateId)
    : [];

  return (
    <div className="animate-enter grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-gold/80">
              Floor Plan
            </h2>
            <span className="text-xs tabular-nums text-silver/60">
              {hq.rooms.filter((r) => r.isActive).length}/{hq.rooms.length} rooms active
            </span>
          </div>
          <WorldCanvasSurface snapshot={worldRenderSnapshot} />
        </div>

        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-gold/80">
            Room Management
          </h2>
          <BodegaFloor
            rooms={hq.rooms}
            emptySlots={hq.emptySlots}
            placeableTemplates={hq.placeableRoomTemplates}
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
            onPlaceRoom={callbacks.placeRoom}
          />
        </div>
      </div>

      <aside className="glass-card p-4">
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
            operatorSlots={hq.building.operatorSlots}
            operators={hq.operators}
            staff={hq.staff}
            visitors={hq.visitors}
            relationships={hq.relationships}
            rooms={hq.rooms}
            callbacks={callbacks}
          />
        )}
      </aside>
    </div>
  );
}
