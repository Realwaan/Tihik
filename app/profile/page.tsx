import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProfilePage } from "@/components/profile-page";

export default async function Profile() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return <ProfilePage />;
}
