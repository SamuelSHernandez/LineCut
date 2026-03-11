"use client";

import { useActionState, useState } from "react";
import { updateMenuItem, deleteMenuItem } from "./actions";

interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  popular: boolean;
  available: boolean;
  sort_order: number;
}

export default function MenuItemRow({ item }: { item: MenuItem }) {
  const [editing, setEditing] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await updateMenuItem(item.id, formData);
      if (result?.success) {
        setEditing(false);
      }
      return result ?? null;
    },
    null
  );

  const [, deleteAction, isDeleting] = useActionState(
    async () => {
      const result = await deleteMenuItem(item.id);
      return result ?? null;
    },
    null
  );

  if (editing) {
    return (
      <form
        action={formAction}
        className="bg-ticket rounded-[10px] border border-[#eee6d8] p-4 space-y-3"
      >
        {state?.error && (
          <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup">
            {state.error}
          </p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
              NAME
            </label>
            <input
              name="name"
              required
              defaultValue={item.name}
              className="w-full min-h-[36px] py-1.5 px-3 rounded-[6px] border border-[#ddd4c4] bg-white font-[family-name:var(--font-body)] text-[13px] text-chalkboard"
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
              defaultValue={(item.price / 100).toFixed(2)}
              className="w-full min-h-[36px] py-1.5 px-3 rounded-[6px] border border-[#ddd4c4] bg-white font-[family-name:var(--font-body)] text-[13px] text-chalkboard"
            />
          </div>
          <div>
            <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
              SORT ORDER
            </label>
            <input
              name="sort_order"
              type="number"
              defaultValue={item.sort_order}
              className="w-full min-h-[36px] py-1.5 px-3 rounded-[6px] border border-[#ddd4c4] bg-white font-[family-name:var(--font-body)] text-[13px] text-chalkboard"
            />
          </div>
          <div className="flex items-end gap-4 pb-1">
            <label className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] text-sidewalk">
              <input
                type="checkbox"
                name="popular"
                defaultChecked={item.popular}
                className="accent-ketchup"
              />
              Popular
            </label>
            <label className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] text-sidewalk">
              <input
                type="checkbox"
                name="available"
                defaultChecked={item.available}
                className="accent-ketchup"
              />
              Available
            </label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="min-h-[36px] py-1.5 px-4 rounded-[6px] font-[family-name:var(--font-body)] text-[13px] font-semibold bg-ketchup text-ticket disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="min-h-[36px] py-1.5 px-4 rounded-[6px] font-[family-name:var(--font-body)] text-[13px] font-semibold bg-butcher-paper border border-[#ddd4c4] text-chalkboard"
          >
            Cancel
          </button>
          <form action={deleteAction} className="ml-auto">
            <button
              type="submit"
              disabled={isDeleting}
              className="min-h-[36px] py-1.5 px-4 rounded-[6px] font-[family-name:var(--font-body)] text-[13px] font-semibold text-ketchup hover:bg-ketchup/10 transition-colors disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </form>
        </div>
      </form>
    );
  }

  return (
    <div className="bg-ticket rounded-[10px] border border-[#eee6d8] p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="font-[family-name:var(--font-body)] text-[14px] text-chalkboard font-medium">
          {item.name}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[13px] text-sidewalk">
          ${(item.price / 100).toFixed(2)}
        </span>
        {item.popular && (
          <span className="px-2.5 py-1 rounded-full font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] bg-mustard/20 text-mustard">
            POPULAR
          </span>
        )}
        {!item.available && (
          <span className="px-2.5 py-1 rounded-full font-[family-name:var(--font-mono)] text-[10px] tracking-[1px] bg-sidewalk/20 text-sidewalk">
            UNAVAILABLE
          </span>
        )}
      </div>
      <button
        onClick={() => setEditing(true)}
        className="min-h-[36px] py-1.5 px-4 rounded-[6px] font-[family-name:var(--font-body)] text-[13px] font-semibold bg-butcher-paper border border-[#ddd4c4] text-chalkboard hover:border-sidewalk transition-colors"
      >
        Edit
      </button>
    </div>
  );
}
