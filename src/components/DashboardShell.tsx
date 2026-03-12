"use client";

import { ProfileProvider, type Profile } from "@/lib/profile-context";
import { OrderProvider } from "@/lib/order-context";
import { SellerPresenceProvider } from "@/lib/seller-presence-context";
import DashboardNav from "@/components/DashboardNav";
import BottomNav from "@/components/shared/BottomNav";
import NotificationPrompt from "@/components/NotificationPrompt";
import InstallPrompt from "@/components/shared/InstallPrompt";

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
            <main className="px-6 md:px-12 py-8 pb-20 sm:pb-8 max-w-5xl mx-auto">
              <NotificationPrompt />
              {children}
            </main>
            <InstallPrompt />
            <BottomNav isSeller={profile.isSeller} isBuyer={profile.isBuyer} />
          </div>
        </SellerPresenceProvider>
      </OrderProvider>
    </ProfileProvider>
  );
}
