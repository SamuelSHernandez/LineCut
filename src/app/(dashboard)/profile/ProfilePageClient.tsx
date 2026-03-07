"use client";

import ProfileHeader from "@/components/profile/ProfileHeader";
import PersonalInfoForm from "@/components/profile/PersonalInfoForm";
import RoleManager from "@/components/profile/RoleManager";
import BuyerBillingSection from "@/components/profile/BuyerBillingSection";
import SellerPayoutSection from "@/components/profile/SellerPayoutSection";
import BillingGateBanner from "@/components/profile/BillingGateBanner";

interface ProfilePageClientProps {
  gate: "buyer" | "seller" | null;
}

export default function ProfilePageClient({ gate }: ProfilePageClientProps) {
  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <BillingGateBanner gate={gate} />
      <ProfileHeader />
      <PersonalInfoForm />
      <RoleManager />
      <BuyerBillingSection />
      <SellerPayoutSection />
    </div>
  );
}
