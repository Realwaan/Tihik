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

export async function isUserEmailVerified(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });

  return Boolean(user?.emailVerified);
}
