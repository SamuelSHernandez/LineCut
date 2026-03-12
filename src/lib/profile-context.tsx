"use client";

import { createContext, useContext } from "react";

export type Profile = {
  id: string;
  displayName: string;
  isBuyer: boolean;
  isSeller: boolean;
  avatarUrl: string | null;
  trustScore: number;
  email: string | null;
  phone: string | null;
  bio: string | null;
  neighborhood: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  stripeCustomerId: string | null;
  stripeConnectAccountId: string | null;
  stripeConnectStatus: "not_connected" | "pending" | "active" | "restricted";
  maxOrderCap: number;
  pickupTimeoutMinutes: number;
  avgRating: number | null;
  ratingCount: number;
  paymentMethodLast4: string | null;
  paymentMethodBrand: string | null;
  paymentMethodExpMonth: number | null;
  paymentMethodExpYear: number | null;
  kycStatus: "none" | "pending" | "approved" | "declined";
  createdAt: string;
};

const ProfileContext = createContext<Profile | null>(null);

export function ProfileProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  return (
    <ProfileContext.Provider value={profile}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): Profile {
  const profile = useContext(ProfileContext);
  if (!profile) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return profile;
}
