import { soa } from "bitecs";

export const VisitorState = soa({
  id: [] as string[],
  name: [] as string[],
  desiredRoleTag: [] as string[],
  patience: [] as number[],
  quality: [] as number[],
  expectedLoyalty: [] as number[],
});
