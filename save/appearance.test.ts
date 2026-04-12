import { describe, expect, it } from "vitest";

import { selectPromotedRecruitIdentity } from "./appearance";

describe("promoted recruit identities", () => {
  it("filters the promoted pool by the requested role when provided", () => {
    const stableKey = "visitor/test-seed";

    expect(selectPromotedRecruitIdentity(stableKey, "role:field_lead")?.roleTag).toBe(
      "role:field_lead",
    );
    expect(selectPromotedRecruitIdentity(stableKey, "role:scout")?.roleTag).toBe("role:scout");
    expect(selectPromotedRecruitIdentity(stableKey, "role:medic")?.roleTag).toBe("role:medic");
  });
});
