interface VerifiedBadgeProps {
  size?: "sm" | "md";
}

export default function VerifiedBadge({ size = "sm" }: VerifiedBadgeProps) {
  const px = size === "sm" ? 16 : 20;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 20 20"
      fill="none"
      role="img"
      aria-label="Identity verified"
      className="inline-block flex-shrink-0"
    >
      <title>Identity verified</title>
      <circle cx="10" cy="10" r="10" fill="#3B82F6" />
      <path
        d="M6 10.5L8.5 13L14 7.5"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
