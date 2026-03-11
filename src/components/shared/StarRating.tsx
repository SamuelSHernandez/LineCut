"use client";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
}

const SIZES = {
  sm: { width: 16, height: 16 },
  md: { width: 22, height: 22 },
} as const;

export default function StarRating({ value, onChange, size = "md" }: StarRatingProps) {
  const interactive = typeof onChange === "function";
  const { width, height } = SIZES[size];

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? "Rating" : `${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        return interactive ? (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} star${star !== 1 ? "s" : ""}`}
            onClick={() => onChange(star)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" && star < 5) onChange(star + 1);
              if (e.key === "ArrowLeft" && star > 1) onChange(star - 1);
            }}
            className="p-0.5 focus:outline-none focus:ring-2 focus:ring-mustard/50 rounded-sm transition-transform hover:scale-110"
          >
            <StarIcon width={width} height={height} filled={filled} />
          </button>
        ) : (
          <span key={star} aria-hidden="true">
            <StarIcon width={width} height={height} filled={filled} />
          </span>
        );
      })}
    </div>
  );
}

function StarIcon({ width, height, filled }: { width: number; height: number; filled: boolean }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill={filled ? "#D4A843" : "none"}
      stroke={filled ? "#D4A843" : "#B8AD9880"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
