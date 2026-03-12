"use client";

import { getBadges, type Badge } from "@/lib/gamification";

interface DailyGoalCardProps {
  todayCount: number;
  dailyGoal: number;
  currentStreak: number;
  longestStreak: number;
  completedDeliveries: number;
}

export default function DailyGoalCard({
  todayCount,
  dailyGoal,
  currentStreak,
  longestStreak,
  completedDeliveries,
}: DailyGoalCardProps) {
  const progress = Math.min(todayCount / dailyGoal, 1);
  const percentage = Math.round(progress * 100);
  const goalMet = todayCount >= dailyGoal && todayCount > 0;

  const badges = getBadges({ currentStreak, longestStreak, completedDeliveries });
  const earnedBadges = badges.filter((b) => b.earned);

  // SVG circle params
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <section
      aria-label="Daily goal"
      className="bg-ticket rounded-[10px] p-5 border border-card-border shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-center gap-5">
        {/* Progress ring */}
        <div className="relative flex-shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke="var(--color-divider)"
              strokeWidth="6"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke="var(--color-ketchup)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-[stroke-dashoffset] duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] text-chalkboard leading-none">
              {todayCount}
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[9px] tracking-[1px] text-sidewalk">
              /{dailyGoal}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-2">
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[2px] text-sidewalk uppercase">
            TODAY&apos;S GOAL
          </p>
          <p className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard">
            {percentage}% complete
          </p>

          {/* Streak */}
          {currentStreak > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[16px]" aria-hidden="true">&#x1F525;</span>
              <span className="font-[family-name:var(--font-body)] text-[13px] text-chalkboard font-semibold">
                {currentStreak}-day streak
              </span>
            </div>
          )}

          {/* Badges */}
          {earnedBadges.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {earnedBadges.map((badge: Badge) => (
                <span
                  key={badge.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-mustard/20 font-[family-name:var(--font-mono)] text-[10px] tracking-[0.5px] text-mustard font-semibold"
                  title={badge.label}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Celebration */}
      {goalMet && (
        <div className="mt-3 text-center" role="status">
          <p className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] text-ketchup">
            GOAL CRUSHED!
          </p>
        </div>
      )}
    </section>
  );
}
