import { soa } from "bitecs";

export const RelationshipState = soa({
  operatorAId: [] as string[],
  operatorBId: [] as string[],
  trust: [] as number[],
  friction: [] as number[],
  familiarity: [] as number[],
  recentSharedOutcome: [] as number[],
  historyTags: [] as string[][],
});
