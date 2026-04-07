export type RecurringNoteMeta = {
  sourceAccount?: string;
};

const RECURRING_META_PREFIX = "[[trackit-recurring-meta]]";

export function serializeRecurringNote(
  note: string | null | undefined,
  meta?: RecurringNoteMeta
) {
  const cleanNote = note?.trim() || "";
  const sourceAccount = meta?.sourceAccount?.trim();

  if (!sourceAccount) {
    return cleanNote || null;
  }

  const payload = JSON.stringify({ sourceAccount });
  return cleanNote
    ? `${RECURRING_META_PREFIX}${payload}\n${cleanNote}`
    : `${RECURRING_META_PREFIX}${payload}`;
}

export function deserializeRecurringNote(rawNote: string | null | undefined) {
  if (!rawNote || !rawNote.startsWith(RECURRING_META_PREFIX)) {
    return {
      note: rawNote ?? null,
      meta: {} as RecurringNoteMeta,
    };
  }

  const content = rawNote.slice(RECURRING_META_PREFIX.length);
  const separatorIndex = content.indexOf("\n");
  const metaRaw = separatorIndex >= 0 ? content.slice(0, separatorIndex) : content;
  const noteRaw = separatorIndex >= 0 ? content.slice(separatorIndex + 1) : "";

  try {
    const parsed = JSON.parse(metaRaw) as RecurringNoteMeta;
    return {
      note: noteRaw.trim() || null,
      meta: {
        sourceAccount: parsed.sourceAccount?.trim(),
      },
    };
  } catch {
    return {
      note: rawNote,
      meta: {} as RecurringNoteMeta,
    };
  }
}
