"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Restaurant, WaitTimeStats } from "@/lib/types";
import { getDistanceMiles, formatDistance } from "@/lib/geo";
import RestaurantCard from "./RestaurantCard";

const RestaurantMap = dynamic(() => import("./RestaurantMap"), { ssr: false });

interface RestaurantBrowserProps {
  restaurants: Restaurant[];
  waitStats: Record<string, WaitTimeStats>;
}

export default function RestaurantBrowser({
  restaurants,
  waitStats,
}: RestaurantBrowserProps) {
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [activeCuisines, setActiveCuisines] = useState<Set<string>>(new Set());

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  const allCuisines = useMemo(
    () => [...new Set(restaurants.flatMap((r) => r.cuisine))],
    [restaurants]
  );

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const matchesSearch = r.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCuisine =
        activeCuisines.size === 0 ||
        r.cuisine.some((c) => activeCuisines.has(c));
      return matchesSearch && matchesCuisine;
    });
  }, [restaurants, search, activeCuisines]);

  function getDistance(r: Restaurant): string | null {
    if (!userLocation) return null;
    const miles = getDistanceMiles(
      userLocation.lat,
      userLocation.lng,
      r.lat,
      r.lng
    );
    return formatDistance(miles);
  }

  function handleSelectFromMap(id: string) {
    router.push(`/buyer/restaurant/${id}`);
  }

  function toggleCuisine(cuisine: string) {
    setActiveCuisines((prev) => {
      const next = new Set(prev);
      if (next.has(cuisine)) next.delete(cuisine);
      else next.add(cuisine);
      return next;
    });
  }

  return (
    <div className="-mx-6 md:-mx-12 px-6 md:px-12">
      {/* Header */}
      <h2 className="font-[family-name:var(--font-display)] text-[22px] tracking-[1px] mb-4">
        NEARBY RESTAURANTS
      </h2>

      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search restaurants near you..."
          className="w-full h-10 bg-butcher-paper rounded-[6px] border border-[#ddd4c4] px-3 font-[family-name:var(--font-body)] text-[13px] text-chalkboard placeholder:text-sidewalk focus:outline-none focus:border-ketchup transition-colors"
        />
      </div>

      {/* Cuisine filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        {allCuisines.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => toggleCuisine(c)}
            className={`px-3 py-1 rounded-full font-[family-name:var(--font-body)] text-[12px] transition-colors ${
              activeCuisines.has(c)
                ? "bg-ketchup text-ticket border border-ketchup"
                : "bg-butcher-paper border border-[#ddd4c4] text-sidewalk hover:border-ketchup hover:text-ketchup"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Split layout */}
      <div className="md:flex md:gap-6">
        {/* Cards */}
        <div className="md:w-[55%] space-y-4 mb-6 md:mb-0 md:max-h-[600px] md:overflow-y-auto md:pr-2">
          {filteredRestaurants.length === 0 ? (
            <p className="font-[family-name:var(--font-body)] text-[13px] text-sidewalk py-8 text-center">
              No restaurants match your search.
            </p>
          ) : (
            filteredRestaurants.map((r) => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                distance={getDistance(r)}
                waitStats={waitStats[r.id]}
              />
            ))
          )}
        </div>

        {/* Map */}
        <div className="md:w-[45%]">
          <RestaurantMap
            restaurants={filteredRestaurants}
            selectedId={null}
            onSelectRestaurant={handleSelectFromMap}
            userLocation={userLocation}
          />
        </div>
      </div>
    </div>
  );
}
