import { Suspense } from "react";
import ProfilePageClient from "./ProfilePageClient";

interface ProfilePageProps {
  searchParams: Promise<{ gate?: string }>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const gate = params.gate === "buyer" || params.gate === "seller" ? params.gate : null;

  return (
    <Suspense>
      <ProfilePageClient gate={gate} />
    </Suspense>
  );
}
