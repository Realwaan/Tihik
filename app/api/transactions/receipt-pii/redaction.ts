import type { ParsedPiiEntity, PiiEntity } from "./types";

function sanitizeLabel(label: string): string {
  const normalized = label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "PII";
}

export function redactText(sourceText: string, entities: PiiEntity[]): string {
  if (entities.length === 0) {
    return sourceText;
  }

  let redacted = sourceText;
  const byReverseOrder = [...entities].sort((a, b) => b.start - a.start);

  for (const entity of byReverseOrder) {
    const marker = `[REDACTED_${sanitizeLabel(entity.label)}]`;
    redacted =
      redacted.slice(0, entity.start) + marker + redacted.slice(entity.end);
  }

  return redacted;
}

export function toPublicEntities(entities: PiiEntity[]): ParsedPiiEntity[] {
  return entities.map((entity) => ({
    label: entity.label,
    text: entity.text,
    score: entity.score,
  }));
}
