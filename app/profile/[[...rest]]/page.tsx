import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ProfilePage } from "@/components/profile-page";

export default async function ProfileRoute() {
  const session = await auth();

  if (!session) {
    redirect("/signin?callbackUrl=/profile");
  }

  return <ProfilePage name={session.user?.name} email={session.user?.email} />;
}
