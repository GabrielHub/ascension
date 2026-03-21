import { describe, expect, it } from "vitest";

import { parseRuntimeRouteRequest } from "./session";

describe("runtime route request parsing", () => {
  it("defaults to preview mode for empty search params", () => {
    expect(parseRuntimeRouteRequest("")).toEqual({
      mode: "preview",
      slotId: undefined,
    });
  });

  it("parses valid slot-backed requests", () => {
    expect(parseRuntimeRouteRequest("?mode=load&slot=slot/2")).toEqual({
      mode: "load",
      slotId: "slot/2",
    });
  });
});
