import { prisma } from "@/lib/prisma";

export type UserEmailVerificationStatus = "MISSING" | "UNVERIFIED" | "VERIFIED";

function shouldTreatUnverifiedAsVerifiedForLocalDev() {
  const isNonProduction = process.env.NODE_ENV !== "production";
  const hasSmtpConfig = Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );

  return isNonProduction && !hasSmtpConfig;
}

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
  const status = await getUserEmailVerificationStatus(userId);
  return status === "VERIFIED";
}

export async function getUserEmailVerificationStatus(
  userId: string
): Promise<UserEmailVerificationStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });

  if (!user) {
    return "MISSING";
  }

  if (!user.emailVerified && shouldTreatUnverifiedAsVerifiedForLocalDev()) {
    return "VERIFIED";
  }

  return user.emailVerified ? "VERIFIED" : "UNVERIFIED";
}
