import { describe, expect, it } from "vitest";

import { clampCamera, createCameraBounds } from "./camera";

describe("camera bounds", () => {
  it("caps minZoom so it never exceeds maxZoom", () => {
    const bounds = createCameraBounds(400, 300, 1200, 900);

    expect(bounds.minZoom).toBeLessThanOrEqual(bounds.maxZoom);
    expect(bounds.maxZoom).toBe(2);
  });

  it("centers the camera when the viewport is larger than the world", () => {
    const bounds = createCameraBounds(400, 300, 1200, 900);

    expect(clampCamera({ x: 0, y: 0, zoom: 1 }, bounds, 1200, 900)).toEqual({
      x: 200,
      y: 150,
      zoom: 2,
    });
  });
});
