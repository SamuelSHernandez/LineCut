"use client";

import { useActionState } from "react";
import { useProfile } from "@/lib/profile-context";
import {
  updateProfile,
  type ProfileActionState,
} from "@/app/(dashboard)/profile/actions";

const initialState: ProfileActionState = { error: null };

export default function PersonalInfoForm() {
  const profile = useProfile();
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState
  );

  return (
    <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] mb-4">
        PERSONAL INFO
      </h2>

      {state.error && (
        <div className="bg-[#FFF3D6] border border-ketchup rounded-[6px] px-4 py-3 mb-4">
          <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup font-medium">
            {state.error}
          </p>
        </div>
      )}

      {state.success && (
        <div className="bg-[#DDEFDD] border border-[#2D6A2D] rounded-[6px] px-4 py-3 mb-4">
          <p className="font-[family-name:var(--font-body)] text-[13px] text-[#2D6A2D] font-medium">
            Profile updated.
          </p>
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label className="font-[family-name:var(--font-body)] text-[12px] font-medium text-sidewalk uppercase tracking-[1px] mb-1.5 block">
            Display Name
          </label>
          <input
            type="text"
            name="displayName"
            required
            defaultValue={profile.displayName}
            className="w-full px-4 py-3 rounded-[6px] bg-butcher-paper border border-[#eee6d8] text-chalkboard font-[family-name:var(--font-body)] text-[15px] outline-none placeholder:text-sidewalk/60 focus:border-chalkboard transition-colors"
          />
        </div>

        <div>
          <label className="font-[family-name:var(--font-body)] text-[12px] font-medium text-sidewalk uppercase tracking-[1px] mb-1.5 block">
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            defaultValue={profile.phone ?? ""}
            placeholder="(555) 123-4567"
            className="w-full px-4 py-3 rounded-[6px] bg-butcher-paper border border-[#eee6d8] text-chalkboard font-[family-name:var(--font-body)] text-[15px] outline-none placeholder:text-sidewalk/60 focus:border-chalkboard transition-colors"
          />
        </div>

        <div>
          <label className="font-[family-name:var(--font-body)] text-[12px] font-medium text-sidewalk uppercase tracking-[1px] mb-1.5 block">
            Bio
          </label>
          <textarea
            name="bio"
            maxLength={160}
            rows={2}
            defaultValue={profile.bio ?? ""}
            placeholder="A few words about you"
            className="w-full px-4 py-3 rounded-[6px] bg-butcher-paper border border-[#eee6d8] text-chalkboard font-[family-name:var(--font-body)] text-[15px] outline-none placeholder:text-sidewalk/60 focus:border-chalkboard transition-colors resize-none"
          />
          <p className="font-[family-name:var(--font-mono)] text-[11px] text-sidewalk mt-1">
            160 characters max
          </p>
        </div>

        <div>
          <label className="font-[family-name:var(--font-body)] text-[12px] font-medium text-sidewalk uppercase tracking-[1px] mb-1.5 block">
            Neighborhood
          </label>
          <input
            type="text"
            name="neighborhood"
            defaultValue={profile.neighborhood ?? ""}
            placeholder="e.g. Lower East Side"
            className="w-full px-4 py-3 rounded-[6px] bg-butcher-paper border border-[#eee6d8] text-chalkboard font-[family-name:var(--font-body)] text-[15px] outline-none placeholder:text-sidewalk/60 focus:border-chalkboard transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 bg-ketchup text-ticket font-[family-name:var(--font-body)] text-[14px] font-semibold rounded-[6px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
