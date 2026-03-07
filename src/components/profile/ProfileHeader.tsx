"use client";

import { useProfile } from "@/lib/profile-context";
import AvatarUpload from "./AvatarUpload";
import VerificationBadges from "./VerificationBadges";

export default function ProfileHeader() {
  const profile = useProfile();

  const memberSince = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-start gap-4">
        <AvatarUpload />

        <div className="flex-1 min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-[32px] tracking-[2px] leading-none mb-1">
            {profile.displayName.toUpperCase()}
          </h1>

          {/* Role badges */}
          <div className="flex gap-2 mb-2">
            {profile.isBuyer && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#FFF3D6] font-[family-name:var(--font-body)] text-[11px] font-semibold uppercase tracking-[0.3px] text-[#8B6914]">
                BUYER
              </span>
            )}
            {profile.isSeller && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#DDEFDD] font-[family-name:var(--font-body)] text-[11px] font-semibold uppercase tracking-[0.3px] text-[#2D6A2D]">
                SELLER
              </span>
            )}
          </div>

          <VerificationBadges />

          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[2px] uppercase text-sidewalk mt-2">
            MEMBER SINCE {memberSince.toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}
