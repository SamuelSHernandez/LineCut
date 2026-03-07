"use client";

import { ProfileProvider, type Profile } from "@/lib/profile-context";
import DashboardNav from "@/components/DashboardNav";

export default function DashboardShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  return (
    <ProfileProvider profile={profile}>
      <div className="min-h-screen bg-butcher-paper">
        <DashboardNav />
        <main className="px-6 md:px-12 py-8 max-w-5xl mx-auto">
          {children}
        </main>
      </div>
    </ProfileProvider>
  );
}
