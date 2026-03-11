"use client";

import { useState } from "react";
import { unblockUser } from "./actions";

interface BlockedUser {
  blockedId: string;
  displayName: string;
  createdAt: string;
}

interface SafetyPageClientProps {
  initialBlockedUsers: BlockedUser[];
}

export default function SafetyPageClient({
  initialBlockedUsers,
}: SafetyPageClientProps) {
  const [blockedUsers, setBlockedUsers] =
    useState<BlockedUser[]>(initialBlockedUsers);
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUnblock(blockedId: string) {
    setUnblocking(blockedId);
    setError(null);

    try {
      const result = await unblockUser(blockedId);
      if (result.error) {
        setError(result.error);
      } else {
        setBlockedUsers((prev) =>
          prev.filter((u) => u.blockedId !== blockedId)
        );
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setUnblocking(null);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-[28px] tracking-[2px] text-chalkboard">
          SAFETY
        </h1>
        <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mt-1">
          Manage blocked users. Blocked users cannot see your sessions or place
          orders with you, and you won&apos;t see theirs.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-[#FDECEA] text-ketchup font-[family-name:var(--font-body)] text-[12px] px-3 py-2 rounded-[6px]"
        >
          {error}
        </div>
      )}

      <div>
        <h2 className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[2px] text-sidewalk mb-3">
          BLOCKED USERS ({blockedUsers.length})
        </h2>

        {blockedUsers.length === 0 ? (
          <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-6 text-center">
            <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk">
              You haven&apos;t blocked anyone.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {blockedUsers.map((user) => (
              <div
                key={user.blockedId}
                className="bg-ticket rounded-[10px] border border-[#eee6d8] p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-[family-name:var(--font-body)] text-[14px] text-chalkboard font-medium">
                    {user.displayName}
                  </p>
                  <p className="font-[family-name:var(--font-mono)] text-[10px] text-sidewalk mt-0.5">
                    Blocked{" "}
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnblock(user.blockedId)}
                  disabled={unblocking === user.blockedId}
                  className="min-h-[44px] px-4 py-1.5 bg-butcher-paper border border-[#ddd4c4] text-sidewalk font-[family-name:var(--font-body)] text-[12px] font-semibold rounded-[6px] transition-colors hover:border-ketchup hover:text-ketchup disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ketchup/50"
                >
                  {unblocking === user.blockedId ? "..." : "Unblock"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
