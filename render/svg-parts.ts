import type {
  SvgCompositionLayer,
  SvgCompositionRecipe,
  SvgPartDefinition,
  SvgPartMatch,
  SvgPartQuery,
} from "./types";

export function validateSvgPartCatalog(parts: readonly SvgPartDefinition[]): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();

  parts.forEach((part) => {
    if (ids.has(part.id)) {
      issues.push(`Duplicate SVG part id "${part.id}".`);
    }

    ids.add(part.id);

    if (part.tags.length === 0) {
      issues.push(`SVG part "${part.id}" is missing searchable tags.`);
    }

    if (part.bodyCompatibility.length === 0 || part.poseCompatibility.length === 0) {
      issues.push(`SVG part "${part.id}" is missing body or pose compatibility.`);
    }

    const duplicateTags = part.tags.filter((tag, index) => part.tags.indexOf(tag) !== index);
    if (duplicateTags.length > 0) {
      issues.push(`SVG part "${part.id}" contains duplicate tags: ${duplicateTags.join(", ")}.`);
    }
  });

  return issues;
}

export function searchSvgParts(
  parts: readonly SvgPartDefinition[],
  query: SvgPartQuery,
): SvgPartMatch[] {
  return parts
    .filter((part) => {
      if (query.category && part.category !== query.category) {
        return false;
      }

      if (query.bodyCompatibility && !part.bodyCompatibility.includes(query.bodyCompatibility)) {
        return false;
      }

      if (query.poseCompatibility && !part.poseCompatibility.includes(query.poseCompatibility)) {
        return false;
      }

      return true;
    })
    .map((part) => {
      let score = 0;

      query.tags?.forEach((tag) => {
        if (part.tags.includes(tag)) {
          score += 2;
        }
      });

      query.roleTags?.forEach((tag) => {
        if (part.roleTags.includes(tag)) {
          score += 2;
        }
      });

      if (query.paletteTag && part.paletteTags.includes(query.paletteTag)) {
        score += 1;
      }

      return { part, score };
    })
    .sort((left, right) => right.score - left.score || left.part.id.localeCompare(right.part.id));
}

export function composeSvgRecipe(
  parts: readonly SvgPartDefinition[],
  layerIds: readonly string[],
): SvgCompositionRecipe {
  const layers: SvgCompositionLayer[] = layerIds.map((partId, index) => {
    const part = parts.find((candidate) => candidate.id === partId);

    if (!part) {
      throw new Error(`Unknown SVG part "${partId}".`);
    }

    return {
      partId: part.id,
      markup: part.markup,
      zIndex: index,
    };
  });

  return {
    viewBox: "0 0 160 160",
    layers,
  };
}
