"use client";

import { useRef, useEffect, useCallback } from "react";
import Map, { Marker } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Restaurant } from "@/lib/types";
import RestaurantMarker from "./RestaurantMarker";

const NYC_CENTER = { lat: 40.7228, lng: -73.9925 };

interface RestaurantMapProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelectRestaurant: (id: string) => void;
  userLocation: { lat: number; lng: number } | null;
}

export default function RestaurantMap({
  restaurants,
  selectedId,
  onSelectRestaurant,
  userLocation,
}: RestaurantMapProps) {
  const mapRef = useRef<MapRef>(null);
  const center = userLocation ?? NYC_CENTER;

  const flyTo = useCallback(
    (lat: number, lng: number) => {
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 14, duration: 800 });
    },
    []
  );

  useEffect(() => {
    if (selectedId) {
      const r = restaurants.find((r) => r.id === selectedId);
      if (r) flyTo(r.lat, r.lng);
    }
  }, [selectedId, restaurants, flyTo]);

  return (
    <div className="rounded-[10px] overflow-hidden h-[350px] md:h-full md:min-h-[500px]">
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{
          longitude: center.lng,
          latitude: center.lat,
          zoom: 13,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/light-v11"
      >
        {restaurants.map((r) => (
          <Marker
            key={r.id}
            longitude={r.lng}
            latitude={r.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelectRestaurant(r.id);
            }}
          >
            <RestaurantMarker isSelected={selectedId === r.id} />
          </Marker>
        ))}
      </Map>
    </div>
  );
}
