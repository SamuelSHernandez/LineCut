"use client";

import { ProfileProvider, type Profile } from "@/lib/profile-context";
import { OrderProvider } from "@/lib/order-context";
import { SellerPresenceProvider } from "@/lib/seller-presence-context";
import DashboardNav from "@/components/DashboardNav";

export default function DashboardShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const role = profile.isSeller ? "seller" : "buyer";

  return (
    <ProfileProvider profile={profile}>
      <OrderProvider userId={profile.id} role={role}>
        <SellerPresenceProvider>
          <div className="min-h-screen bg-butcher-paper">
            <DashboardNav />
            <main className="px-6 md:px-12 py-8 max-w-5xl mx-auto">
              {children}
            </main>
          </div>
        </SellerPresenceProvider>
      </OrderProvider>
    </ProfileProvider>
  );
}
