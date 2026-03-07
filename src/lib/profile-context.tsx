"use client";

import { createContext, useContext } from "react";

export type Profile = {
  id: string;
  displayName: string;
  isBuyer: boolean;
  isSeller: boolean;
  avatarUrl: string | null;
  trustScore: number;
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
