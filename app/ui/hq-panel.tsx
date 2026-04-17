import { useCallback, useMemo } from "react";

import { buildFocusHighlight, type FocusPayload } from "render";

import { BodegaFloor } from "./bodega-floor";
import type { GameCallbacks, HqViewModel, RoomCultureViewModel } from "./view-models";

/** Build a lookup from roomId → culture for efficient access in the floor strip. */
function buildCultureMap(
  cultures: readonly RoomCultureViewModel[],
): ReadonlyMap<string, RoomCultureViewModel> {
  const map = new Map<string, RoomCultureViewModel>();
  for (const c of cultures) map.set(c.roomId, c);
  return map;
}

const FLOOR_BADGES: Record<string, Record<number, string>> = {
  "building/porters": { 0: "Public", 1: "Private", 2: "Waterfront" },
  "building/skyscraper": {
    0: "Public",
    1: "Ops",
    2: "Recovery",
    3: "Logistics",
    5: "Nightlife",
    6: "Training",
    7: "Executive",
    8: "Penthouse",
    4: "Rooftop",
  },
};

const FLOOR_DESCRIPTIONS: Record<string, Record<number, string>> = {
  "building/porters": {
    0: "Ground floor — worn hardwood and loud conversation. The bar and dining room keep regulars coming through while operators eat alongside them.",
    1: "Upstairs — converted apartments turned real operational rooms. Admin, recovery, training, and prep behind doors that actually close.",
    2: "Waterfront — concrete dock and weathered deck over harbor water. Staging and decompression where the salt air does half the work.",
  },
  "building/skyscraper": {
    0: "Lobby — polished stone, tall glass, and the reception desk that says the guild finally has an address worth printing.",
    1: "Operations — open bullpen, glass-walled situation room, and a corkboard that takes up half a corridor. Contracts live here now.",
    2: "Recovery and training — a proper clinic, a full dojo, and a crew lounge with a skyline view. The floor that stops turning operators into attrition.",
    3: "Logistics — supply hall, secure cage, and the fabrication bay that took over where the dockside workshop left off.",
    5: "Nightlife — club floor, backstage green room, and enough marquee glow to make prospects feel like they arrived somewhere the city already knows.",
    6: "Specialist training — role-specific drill space for field leads, scouts, and medics whose ceilings are now too high for the general dojo.",
    7: "Executive — office, compliance desk, and war room. The floor where the guild stops improvising and starts reading like an institution.",
    8: "Penthouse — private lounge, cellar, skyline glass, and the quiet top-floor rooms used to close the kind of recruitment conversation that does not happen in public.",
    4: "Rooftop — helipad, sky garden, and quiet sky. Fast departures one direction, decompression the other.",
  },
};

const DEFAULT_FLOOR_DESCRIPTION =
  "The whole operation runs out of one floor. Every room doubles as something else.";

interface HqPanelProps {
  hq: HqViewModel;
  callbacks: GameCallbacks;
  focus: FocusPayload | null;
  onFocusChange?: (focus: FocusPayload | null) => void;
  roomCultures?: readonly RoomCultureViewModel[];
}

export function HqPanel({ hq, callbacks, focus, onFocusChange, roomCultures = [] }: HqPanelProps) {
  const cultureMap = useMemo(() => buildCultureMap(roomCultures), [roomCultures]);
  const selectedRoomId = focus?.targetKind === "room" ? focus.targetId : null;
  const { currentFloorRooms, currentFloorExpansionSlots } = useMemo(() => {
    return {
      currentFloorRooms: hq.rooms.filter(
        (room) => room.floorIndex === hq.building.activeFloorIndex,
      ),
      currentFloorExpansionSlots: hq.expansionSlots.filter(
        (slot) => slot.floorIndex === hq.building.activeFloorIndex,
      ),
    };
  }, [hq.rooms, hq.expansionSlots, hq.building.activeFloorIndex]);
  const currentFloorTotalSlots = currentFloorRooms.length + currentFloorExpansionSlots.length;
  const handleSelectRoom = useCallback(
    (roomId: string) => {
      if (!onFocusChange) return;
      onFocusChange(selectedRoomId === roomId ? null : buildFocusHighlight("room", roomId, null));
    },
    [onFocusChange, selectedRoomId],
  );
  const handlePlaceRoom = useCallback(
    (templateId: string, floorIndex: number, slotId: string) => {
      onFocusChange?.(null);
      callbacks.placeRoom(templateId, floorIndex, slotId);
    },
    [callbacks, onFocusChange],
  );

  const floorBadge = FLOOR_BADGES[hq.building.id]?.[hq.building.activeFloorIndex];
  const floorDescription =
    FLOOR_DESCRIPTIONS[hq.building.id]?.[hq.building.activeFloorIndex] ?? DEFAULT_FLOOR_DESCRIPTION;

  return (
    <div className="animate-enter space-y-4">
      {/* Room strip — full width */}
      <div>
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-gold/80">
              {hq.building.name}
            </h2>
            <span className="text-xs tabular-nums text-silver/60">
              Floor {hq.building.activeFloorDisplayNumber ?? hq.building.activeFloorIndex + 1}/
              {hq.building.floorCount}
            </span>
            {floorBadge && <span className="badge badge-slate">{floorBadge}</span>}
          </div>
          <span className="text-xs tabular-nums text-silver/60">
            {currentFloorRooms.length} rooms / {currentFloorTotalSlots} slots
          </span>
        </div>
        <p className="pb-2 text-xs leading-relaxed text-silver/45">{floorDescription}</p>
        <BodegaFloor
          rooms={currentFloorRooms}
          expansionSlots={currentFloorExpansionSlots}
          placeableTemplates={hq.placeableRoomTemplates}
          selectedRoomId={selectedRoomId}
          onSelectRoom={handleSelectRoom}
          onPlaceRoom={handlePlaceRoom}
          cultureMap={cultureMap}
        />
      </div>
    </div>
  );
}
