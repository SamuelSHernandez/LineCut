"use client";

import { useActionState, useState } from "react";
import { updateRestaurant, deleteRestaurant } from "../actions";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  cuisine: string[];
  default_wait_estimate: string;
  google_place_id?: string | null;
  image_url?: string | null;
}

export default function RestaurantEditForm({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await updateRestaurant(restaurant.id, formData);
      return result ?? null;
    },
    null
  );

  const [deleteState, deleteAction, isDeleting] = useActionState(
    async (_prev: { error?: string } | null) => {
      const result = await deleteRestaurant(restaurant.id);
      return result ?? null;
    },
    null
  );

  return (
    <div className="space-y-8">
      <form action={formAction} className="space-y-4 max-w-lg">
        {state?.error && (
          <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup">
            {state.error}
          </p>
        )}

        <div>
          <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
            ID
          </label>
          <p className="font-[family-name:var(--font-mono)] text-[13px] text-chalkboard">
            {restaurant.id}
          </p>
        </div>

        <div>
          <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
            NAME
          </label>
          <input
            name="name"
            required
            defaultValue={restaurant.name}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-[6px] border border-[#ddd4c4] bg-ticket font-[family-name:var(--font-body)] text-[14px] text-chalkboard"
          />
        </div>

        <div>
          <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
            ADDRESS
          </label>
          <input
            name="address"
            required
            defaultValue={restaurant.address}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-[6px] border border-[#ddd4c4] bg-ticket font-[family-name:var(--font-body)] text-[14px] text-chalkboard"
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
              defaultValue={restaurant.lat}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-[6px] border border-[#ddd4c4] bg-ticket font-[family-name:var(--font-body)] text-[14px] text-chalkboard"
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
              defaultValue={restaurant.lng}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-[6px] border border-[#ddd4c4] bg-ticket font-[family-name:var(--font-body)] text-[14px] text-chalkboard"
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
            defaultValue={restaurant.cuisine.join(", ")}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-[6px] border border-[#ddd4c4] bg-ticket font-[family-name:var(--font-body)] text-[14px] text-chalkboard"
          />
        </div>

        <div>
          <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
            DEFAULT WAIT ESTIMATE
          </label>
          <input
            name="default_wait_estimate"
            defaultValue={restaurant.default_wait_estimate}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-[6px] border border-[#ddd4c4] bg-ticket font-[family-name:var(--font-body)] text-[14px] text-chalkboard"
          />
        </div>

        <div>
          <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
            GOOGLE PLACE ID (optional)
          </label>
          <input
            name="google_place_id"
            defaultValue={restaurant.google_place_id ?? ""}
            placeholder="ChIJ..."
            className="w-full min-h-[44px] py-2.5 px-4 rounded-[6px] border border-[#ddd4c4] bg-ticket font-[family-name:var(--font-body)] text-[14px] text-chalkboard placeholder:text-sidewalk/50"
          />
        </div>

        <div>
          <label className="block font-[family-name:var(--font-mono)] text-[10px] tracking-[2px] text-sidewalk mb-1">
            IMAGE URL (optional)
          </label>
          <input
            name="image_url"
            defaultValue={restaurant.image_url ?? ""}
            placeholder="https://..."
            className="w-full min-h-[44px] py-2.5 px-4 rounded-[6px] border border-[#ddd4c4] bg-ticket font-[family-name:var(--font-body)] text-[14px] text-chalkboard placeholder:text-sidewalk/50"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="min-h-[44px] py-2.5 px-6 rounded-[6px] font-[family-name:var(--font-body)] text-[14px] font-semibold bg-ketchup text-ticket disabled:opacity-50 transition-opacity"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Delete section */}
      <div className="border-t border-dashed border-[#ddd4c4] pt-6">
        {deleteState?.error && (
          <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup mb-2">
            {deleteState.error}
          </p>
        )}

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="min-h-[44px] py-2.5 px-6 rounded-[6px] font-[family-name:var(--font-body)] text-[14px] font-semibold bg-butcher-paper border border-ketchup text-ketchup hover:bg-ketchup hover:text-ticket transition-colors"
          >
            Delete Restaurant
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <p className="font-[family-name:var(--font-body)] text-[13px] text-ketchup font-semibold">
              Are you sure? This will delete all menu items too.
            </p>
            <form action={deleteAction}>
              <button
                type="submit"
                disabled={isDeleting}
                className="min-h-[44px] py-2.5 px-6 rounded-[6px] font-[family-name:var(--font-body)] text-[14px] font-semibold bg-ketchup text-ticket disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </form>
            <button
              onClick={() => setConfirmDelete(false)}
              className="min-h-[44px] py-2.5 px-6 rounded-[6px] font-[family-name:var(--font-body)] text-[14px] font-semibold bg-butcher-paper border border-[#ddd4c4] text-chalkboard"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
