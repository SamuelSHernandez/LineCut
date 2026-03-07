"use client";

interface RestaurantMarkerProps {
  isSelected: boolean;
}

export default function RestaurantMarker({ isSelected }: RestaurantMarkerProps) {
  return (
    <svg
      width={isSelected ? 36 : 28}
      height={isSelected ? 46 : 36}
      viewBox="0 0 28 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="transition-transform duration-200 cursor-pointer"
      style={{ transform: isSelected ? "translateY(-5px)" : undefined }}
    >
      <path
        d="M14 0C6.268 0 0 6.268 0 14c0 9.8 14 22 14 22s14-12.2 14-22C28 6.268 21.732 0 14 0z"
        fill={isSelected ? "#E2A832" : "#C4382A"}
      />
      <circle cx="14" cy="13" r="5" fill="#FFFDF5" />
    </svg>
  );
}
