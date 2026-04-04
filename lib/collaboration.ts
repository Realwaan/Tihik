import { prisma } from "@/lib/prisma";

export async function userHasHouseholdAccess(
  userId: string,
  householdId: string
) {
  const membership = await prisma.householdMember.findFirst({
    where: {
      householdId,
      userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  return membership;
}
