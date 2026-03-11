"use client";

import { useActionState, useState } from "react";
import { createMenuItem } from "./actions";

export default function MenuItemCreateForm({
  restaurantId,
}: {
  restaurantId: string;
}) {
  const [open, setOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await createMenuItem(formData);
      return result ?? null;
    },
    null
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="min-h-[36px] py-1.5 px-4 rounded-[6px] font-[family-name:var(--font-body)] text-[13px] font-semibold bg-butcher-paper border border-dashed border-[#ddd4c4] text-sidewalk hover:text-chalkboard hover:border-sidewalk transition-colors"
      >
        + Add Item
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="bg-ticket rounded-[10px] border border-dashed border-[#ddd4c4] p-4 space-y-3"
    >
      <input type="hidden" name="restaurant_id" value={restaurantId} />

      {state?.error && (
        <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
            ID
          </label>
          <input
            name="id"
            required
            placeholder={`${restaurantId}-N`}
            className="w-full min-h-[36px] py-1.5 px-3 rounded-[6px] border border-[#ddd4c4] bg-white font-[family-name:var(--font-body)] text-[13px] text-chalkboard placeholder:text-sidewalk/50"
          />
        </div>
        <div>
          <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
            NAME
          </label>
          <input
            name="name"
            required
            placeholder="Item name"
            className="w-full min-h-[36px] py-1.5 px-3 rounded-[6px] border border-[#ddd4c4] bg-white font-[family-name:var(--font-body)] text-[13px] text-chalkboard placeholder:text-sidewalk/50"
          />
        </div>
        <div>
          <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
            PRICE ($)
          </label>
          <input
            name="price"
            type="number"
            step="0.01"
            required
            placeholder="9.99"
            className="w-full min-h-[36px] py-1.5 px-3 rounded-[6px] border border-[#ddd4c4] bg-white font-[family-name:var(--font-body)] text-[13px] text-chalkboard placeholder:text-sidewalk/50"
          />
        </div>
        <div>
          <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
            SORT ORDER
          </label>
          <input
            name="sort_order"
            type="number"
            defaultValue="0"
            className="w-full min-h-[36px] py-1.5 px-3 rounded-[6px] border border-[#ddd4c4] bg-white font-[family-name:var(--font-body)] text-[13px] text-chalkboard"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] text-sidewalk">
          <input type="checkbox" name="popular" className="accent-ketchup" />
          Popular
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-[36px] py-1.5 px-4 rounded-[6px] font-[family-name:var(--font-body)] text-[13px] font-semibold bg-ketchup text-ticket disabled:opacity-50"
        >
          {isPending ? "Adding..." : "Add Item"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-[36px] py-1.5 px-4 rounded-[6px] font-[family-name:var(--font-body)] text-[13px] font-semibold bg-butcher-paper border border-[#ddd4c4] text-chalkboard"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
