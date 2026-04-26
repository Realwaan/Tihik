import type { PiiEntity } from "./types";

function normalizeEntity(
  value: unknown,
  sourceText: string
): PiiEntity | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const start =
    typeof item.start === "number"
      ? item.start
      : typeof item.begin === "number"
        ? item.begin
        : null;
  const end =
    typeof item.end === "number"
      ? item.end
      : typeof item.stop === "number"
        ? item.stop
        : null;

  if (
    start === null ||
    end === null ||
    start < 0 ||
    end <= start ||
    end > sourceText.length
  ) {
    return null;
  }

  const labelSource =
    typeof item.label === "string"
      ? item.label
      : typeof item.entity_group === "string"
        ? item.entity_group
        : typeof item.type === "string"
          ? item.type
          : "PII";

  const score = typeof item.score === "number" ? item.score : null;
  const text = sourceText.slice(start, end);

  if (!text.trim()) {
    return null;
  }

  return {
    start,
    end,
    label: labelSource.trim() || "PII",
    text,
    score,
  };
}

export function extractEntities(payload: unknown, sourceText: string): PiiEntity[] {
  const flat: PiiEntity[] = [];

  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => walk(entry));
      return;
    }

    const parsed = normalizeEntity(value, sourceText);
    if (parsed) {
      flat.push(parsed);
      return;
    }

    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (Array.isArray(record.entities)) {
        record.entities.forEach((entry) => walk(entry));
      }
      if (Array.isArray(record.data)) {
        record.data.forEach((entry) => walk(entry));
      }
    }
  };

  walk(payload);

  const deduped = new Map<string, PiiEntity>();
  for (const entity of flat) {
    const key = `${entity.start}:${entity.end}:${entity.label.toLowerCase()}`;
    const existing = deduped.get(key);
    if (!existing || (entity.score ?? 0) > (existing.score ?? 0)) {
      deduped.set(key, entity);
    }
  }

  return [...deduped.values()].sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start;
    }
    return a.end - b.end;
  });
}
