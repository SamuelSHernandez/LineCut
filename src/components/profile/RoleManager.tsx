"use client";

import { useState, useTransition } from "react";
import { useProfile } from "@/lib/profile-context";
import { toggleRole } from "@/app/(dashboard)/profile/actions";

export default function RoleManager() {
  const profile = useProfile();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(role: "buyer" | "seller", currentlyEnabled: boolean) {
    setError(null);

    // Confirmation for removing a role
    if (currentlyEnabled) {
      const roleName = role === "buyer" ? "buyer" : "seller";
      const confirmed = window.confirm(
        `Remove your ${roleName} role? You can add it back anytime.`
      );
      if (!confirmed) return;
    }

    startTransition(async () => {
      const result = await toggleRole(role, !currentlyEnabled);
      if (result.error) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  }

  return (
    <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] mb-1">
        ROLES
      </h2>
      <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk mb-4">
        Add or remove roles. You need at least one.
      </p>

      {error && (
        <div className="bg-[#FFF3D6] border border-ketchup rounded-[6px] px-4 py-3 mb-4">
          <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup font-medium">
            {error}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between py-3 px-4 rounded-[6px] bg-butcher-paper border border-[#eee6d8]">
          <div>
            <span className="font-[family-name:var(--font-body)] text-[15px] font-semibold text-chalkboard">
              Buyer
            </span>
            <p className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk">
              Skip lines, get food delivered
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle("buyer", profile.isBuyer)}
            disabled={isPending}
            className={`px-4 py-2 rounded-[6px] font-[family-name:var(--font-body)] text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
              profile.isBuyer
                ? "bg-[#DDEFDD] text-[#2D6A2D]"
                : "bg-butcher-paper border-2 border-chalkboard text-chalkboard hover:bg-[#eee6d8]"
            }`}
          >
            {profile.isBuyer ? "Active" : "Add"}
          </button>
        </div>

        <div className="flex items-center justify-between py-3 px-4 rounded-[6px] bg-butcher-paper border border-[#eee6d8]">
          <div>
            <span className="font-[family-name:var(--font-body)] text-[15px] font-semibold text-chalkboard">
              Seller
            </span>
            <p className="font-[family-name:var(--font-body)] text-[12px] text-sidewalk">
              Earn money while you wait
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle("seller", profile.isSeller)}
            disabled={isPending}
            className={`px-4 py-2 rounded-[6px] font-[family-name:var(--font-body)] text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
              profile.isSeller
                ? "bg-[#DDEFDD] text-[#2D6A2D]"
                : "bg-butcher-paper border-2 border-chalkboard text-chalkboard hover:bg-[#eee6d8]"
            }`}
          >
            {profile.isSeller ? "Active" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
