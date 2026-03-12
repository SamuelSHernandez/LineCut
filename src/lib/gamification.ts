export interface Badge {
  id: string;
  label: string;
  icon: string;
  earned: boolean;
}

export function calculateStreak(
  lastActiveDate: string | null,
  currentStreak: number
): { streak: number; isNewDay: boolean } {
  const today = new Date().toISOString().slice(0, 10);

  if (!lastActiveDate) {
    return { streak: 1, isNewDay: true };
  }

  if (lastActiveDate === today) {
    return { streak: currentStreak, isNewDay: false };
  }

  const lastDate = new Date(lastActiveDate);
  const todayDate = new Date(today);
  const diffMs = todayDate.getTime() - lastDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    // Consecutive day
    return { streak: currentStreak + 1, isNewDay: true };
  }

  // Streak broken
  return { streak: 1, isNewDay: true };
}

export function getBadges(profile: {
  currentStreak: number;
  longestStreak: number;
  completedDeliveries: number;
}): Badge[] {
  return [
    {
      id: "week-warrior",
      label: "Week Warrior",
      icon: "7",
      earned: profile.longestStreak >= 7 || profile.currentStreak >= 7,
    },
    {
      id: "month-master",
      label: "Month Master",
      icon: "30",
      earned: profile.longestStreak >= 30 || profile.currentStreak >= 30,
    },
    {
      id: "century-seller",
      label: "Century Seller",
      icon: "100",
      earned: profile.completedDeliveries >= 100,
    },
  ];
}
