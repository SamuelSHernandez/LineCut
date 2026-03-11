"use client";

import { useActionState } from "react";
import { createRestaurant } from "./actions";

export default function RestaurantCreateForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await createRestaurant(formData);
      return result ?? null;
    },
    null
  );

  return (
    <form action={formAction} className="space-y-4 max-w-lg">
      {state?.error && (
        <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup">
          {state.error}
        </p>
      )}

      <div>
        <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
          ID (slug)
        </label>
        <input
          name="id"
          required
          placeholder="e.g. joes-pizza"
          className="w-full min-h-[44px] py-2.5 px-4 rounded-[6px] border border-[#ddd4c4] bg-ticket font-[family-name:var(--font-body)] text-[14px] text-chalkboard placeholder:text-sidewalk/50"
        />
      </div>

      <div>
        <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
          NAME
        </label>
        <input
          name="name"
          required
          placeholder="Restaurant name"
          className="w-full min-h-[44px] py-2.5 px-4 rounded-[6px] border border-[#ddd4c4] bg-ticket font-[family-name:var(--font-body)] text-[14px] text-chalkboard placeholder:text-sidewalk/50"
        />
      </div>

      <div>
        <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
          ADDRESS
        </label>
        <input
          name="address"
          required
          placeholder="Street address"
          className="w-full min-h-[44px] py-2.5 px-4 rounded-[6px] border border-[#ddd4c4] bg-ticket font-[family-name:var(--font-body)] text-[14px] text-chalkboard placeholder:text-sidewalk/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
            LATITUDE
          </label>
          <input
            name="lat"
            type="number"
            step="any"
            required
            placeholder="40.7128"
            className="w-full min-h-[44px] py-2.5 px-4 rounded-[6px] border border-[#ddd4c4] bg-ticket font-[family-name:var(--font-body)] text-[14px] text-chalkboard placeholder:text-sidewalk/50"
          />
        </div>
        <div>
          <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
            LONGITUDE
          </label>
          <input
            name="lng"
            type="number"
            step="any"
            required
            placeholder="-74.0060"
            className="w-full min-h-[44px] py-2.5 px-4 rounded-[6px] border border-[#ddd4c4] bg-ticket font-[family-name:var(--font-body)] text-[14px] text-chalkboard placeholder:text-sidewalk/50"
          />
        </div>
      </div>

      <div>
        <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
          CUISINES (comma-separated)
        </label>
        <input
          name="cuisine"
          required
          placeholder="Pizza, Italian"
          className="w-full min-h-[44px] py-2.5 px-4 rounded-[6px] border border-[#ddd4c4] bg-ticket font-[family-name:var(--font-body)] text-[14px] text-chalkboard placeholder:text-sidewalk/50"
        />
      </div>

      <div>
        <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
          DEFAULT WAIT ESTIMATE
        </label>
        <input
          name="default_wait_estimate"
          placeholder="~15 min"
          className="w-full min-h-[44px] py-2.5 px-4 rounded-[6px] border border-[#ddd4c4] bg-ticket font-[family-name:var(--font-body)] text-[14px] text-chalkboard placeholder:text-sidewalk/50"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="min-h-[44px] py-2.5 px-6 rounded-[6px] font-[family-name:var(--font-body)] text-[14px] font-semibold bg-ketchup text-ticket disabled:opacity-50 transition-opacity"
      >
        {isPending ? "Creating..." : "Add Restaurant"}
      </button>
    </form>
  );
}
