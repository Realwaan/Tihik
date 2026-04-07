import { prisma } from "@/lib/prisma";
import { deserializeRecurringNote } from "@/lib/recurring-note";

type Frequency = "DAILY" | "WEEKLY" | "MONTHLY";

export function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addByFrequency(
  date: Date,
  frequency: Frequency,
  interval: number
): Date {
  const result = new Date(date);

  if (frequency === "DAILY") {
    result.setDate(result.getDate() + interval);
    return result;
  }

  if (frequency === "WEEKLY") {
    result.setDate(result.getDate() + 7 * interval);
    return result;
  }

  result.setMonth(result.getMonth() + interval);
  return result;
}

export async function runRecurringGenerationForUser(userId: string) {
  const today = normalizeDate(new Date());

  const templates = await prisma.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      nextRunDate: {
        lte: today,
      },
    },
    orderBy: {
      nextRunDate: "asc",
    },
  });

  for (const template of templates) {
    const parsedTemplateNote = deserializeRecurringNote(template.note);
    let cursor = normalizeDate(template.nextRunDate);
    const maxRuns = 36;
    let runs = 0;

    while (cursor <= today && runs < maxRuns) {
      if (template.endDate && cursor > normalizeDate(template.endDate)) {
        break;
      }

      await prisma.transaction.upsert({
        where: {
          sourceRecurringId_recurrenceOccurrence: {
            sourceRecurringId: template.id,
            recurrenceOccurrence: cursor,
          },
        },
        create: {
          userId: template.userId,
          amount: template.amount,
          currency: template.currency,
          type: template.type,
          category: template.category,
          sourceAccount: parsedTemplateNote.meta.sourceAccount ?? null,
          note: parsedTemplateNote.note,
          date: cursor,
          sourceRecurringId: template.id,
          recurrenceOccurrence: cursor,
        },
        update: {},
      });

      runs += 1;
      cursor = addByFrequency(cursor, template.frequency, template.interval);
    }

    const isPastEndDate = template.endDate
      ? cursor > normalizeDate(template.endDate)
      : false;

    await prisma.recurringTransaction.update({
      where: { id: template.id },
      data: {
        nextRunDate: cursor,
        lastRunAt: today,
        ...(isPastEndDate ? { isActive: false } : {}),
      },
    });
  }
}
