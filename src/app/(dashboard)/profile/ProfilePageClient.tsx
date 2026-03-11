"use client";

import ProfileHeader from "@/components/profile/ProfileHeader";
import PersonalInfoForm from "@/components/profile/PersonalInfoForm";
import RoleManager from "@/components/profile/RoleManager";
import SellerPreferencesSection from "@/components/profile/SellerPreferencesSection";
import BuyerBillingSection from "@/components/profile/BuyerBillingSection";
import SellerPayoutSection from "@/components/profile/SellerPayoutSection";
import BillingGateBanner from "@/components/profile/BillingGateBanner";
import KycVerificationSection from "@/components/profile/KycVerificationSection";
import { useProfile } from "@/lib/profile-context";

interface ProfilePageClientProps {
  gate: "buyer" | "seller" | null;
}

export default function ProfilePageClient({ gate }: ProfilePageClientProps) {
  const profile = useProfile();

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <BillingGateBanner gate={gate} />
      <ProfileHeader />
      <PersonalInfoForm />
      <RoleManager />
      {profile.isSeller && (
        <KycVerificationSection kycStatus={profile.kycStatus} />
      )}
      <SellerPreferencesSection />
      <BuyerBillingSection />
      <SellerPayoutSection />
    </div>
  );
}
