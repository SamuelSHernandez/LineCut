"use client";

import { useState } from "react";
import { useProfile } from "@/lib/profile-context";
import { updateMaxOrderCap, updatePickupTimeout } from "@/app/(dashboard)/profile/actions";

export default function SellerPreferencesSection() {
  const profile = useProfile();
  const [capDollars, setCapDollars] = useState(Math.round(profile.maxOrderCap / 100));
  const [pickupTimeout, setPickupTimeout] = useState(profile.pickupTimeoutMinutes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile.isSeller) return null;

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const formData = new FormData();
    formData.set("maxOrderCap", String(capDollars));
    const result = await updateMaxOrderCap(formData);

    if (!result.error) {
      const timeoutResult = await updatePickupTimeout(pickupTimeout);
      if (timeoutResult.error) {
        setSaving(false);
        setError(timeoutResult.error);
        return;
      }
    }

    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <h3 className="font-[family-name:var(--font-display)] text-[16px] tracking-[1px] text-chalkboard mb-4">
        SELLER PREFERENCES
      </h3>

      <div className="space-y-3">
        <label className="block">
          <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[2px] text-sidewalk">
            MAX ORDER VALUE
          </span>
          <div className="flex items-center gap-3 mt-2">
            <input
              type="range"
              min={10}
              max={200}
              step={5}
              value={capDollars}
              onChange={(e) => setCapDollars(Number(e.target.value))}
              className="flex-1 accent-ketchup"
              aria-label="Maximum order value in dollars"
            />
            <span className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] text-ketchup min-w-[60px] text-right">
              ${capDollars}
            </span>
          </div>
          <p className="font-[family-name:var(--font-body)] text-[11px] text-sidewalk mt-1">
            The most you&apos;re willing to front at the register.
          </p>
        </label>

        <label className="block">
          <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[2px] text-sidewalk">
            BUYER PICKUP WINDOW
          </span>
          <div className="flex items-center gap-3 mt-2">
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={pickupTimeout}
              onChange={(e) => setPickupTimeout(Number(e.target.value))}
              className="flex-1 accent-ketchup"
              aria-label="Buyer pickup window in minutes"
            />
            <span className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] text-ketchup min-w-[60px] text-right">
              {pickupTimeout}m
            </span>
          </div>
          <p className="font-[family-name:var(--font-body)] text-[11px] text-sidewalk mt-1">
            How long a buyer has to pick up after food is ready. Order auto-cancels after this.
          </p>
        </label>

        {error && (
          <p className="font-[family-name:var(--font-body)] text-[12px] text-ketchup" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="min-h-[44px] px-5 py-2.5 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[13px] font-semibold rounded-[6px] transition-all hover:bg-ketchup/90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ketchup/50"
        >
          {saving ? "Saving..." : saved ? "Saved" : "SAVE"}
        </button>
      </div>
    </div>
  );
}
