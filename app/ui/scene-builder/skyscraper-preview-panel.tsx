import { useMemo } from "react";

import { getBuildingFloors } from "content/building-layouts";
import { templateRegistry } from "content/templates";
import { getRoomActiveFootprint, getRoomStateId } from "lib/hq-room-state";
import type { HqTimeOfDayPhase } from "lib/hq-time-phase";
import { composeHqWorldGeometry, createHqWorldSnapshot } from "render/hq-world";
import { HqWorldCanvas } from "render/world-canvas";

const PHASE_TO_MINUTE_OF_DAY: Readonly<Record<HqTimeOfDayPhase, number>> = {
  sunrise: 390,
  day: 780,
  sunset: 1140,
  night: 1260,
};

interface SkyscraperPreviewPanelProps {
  buildingId: string;
  floorIndex: number;
  buildingTier: number;
  phase: HqTimeOfDayPhase;
}

export function SkyscraperPreviewPanel({
  buildingId,
  floorIndex,
  buildingTier,
  phase,
}: SkyscraperPreviewPanelProps) {
  const snapshot = useMemo(() => {
    const floors = getBuildingFloors(buildingId, buildingTier);
    const rooms = floors.flatMap((floor) =>
      floor.slots.flatMap((slot) => {
        const templateId = slot.startingTemplateId;
        if (!templateId) return [];
        const template = templateRegistry.roomById.get(templateId);
        if (!template) return [];

        const functionTag =
          template.tags.find((tag) => tag.startsWith("room:")) ?? "room:operations";
        const reservedFootprint = {
          col: slot.col,
          row: slot.row,
          cols: slot.cols,
          rows: slot.rows,
        };
        return [
          {
            id: `preview/${floor.floorIndex}/${slot.slotId}`,
            templateId: template.id,
            roomStateId: getRoomStateId(template.id, []),
            slotId: slot.slotId,
            floorIndex: floor.floorIndex,
            name: template.name,
            tier: template.tier,
            isOperational: true,
            functionTag,
            reservedFootprint,
            activeFootprint: getRoomActiveFootprint(template.id, reservedFootprint, []),
          },
        ];
      }),
    );

    const geometry = composeHqWorldGeometry(rooms, {
      buildingId,
      buildingTier,
      floorIndex,
    });

    const buildingName = templateRegistry.buildingById.get(buildingId)?.name ?? "Skyscraper";
    return createHqWorldSnapshot(
      buildingName,
      geometry,
      [],
      PHASE_TO_MINUTE_OF_DAY[phase],
      buildingId,
    );
  }, [buildingId, buildingTier, floorIndex, phase]);

  return (
    <div className="relative h-full w-full">
      <HqWorldCanvas snapshot={snapshot} cameraMode="locked" />
    </div>
  );
}
