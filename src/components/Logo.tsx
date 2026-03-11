type LogoSize = "sm" | "md" | "lg";
type LogoVariant = "default" | "light" | "on-ketchup";

interface LogoProps {
  size?: LogoSize;
  showTagline?: boolean;
  variant?: LogoVariant;
}

const sizeConfig: Record<LogoSize, { width: number; scissorsScale: number; fontSize: number; taglineSize: number; gap: number }> = {
  sm: { width: 120, scissorsScale: 0.7, fontSize: 28, taglineSize: 10, gap: 4 },
  md: { width: 200, scissorsScale: 1, fontSize: 42, taglineSize: 13, gap: 6 },
  lg: { width: 300, scissorsScale: 1.4, fontSize: 60, taglineSize: 16, gap: 8 },
};

const variantColors: Record<LogoVariant, { line: string; cut: string; scissors: string; dash: string; tagline: string }> = {
  default:      { line: "#1A1A18", cut: "#C4382A", scissors: "#C4382A", dash: "#8C8778", tagline: "#8C8778" },
  light:        { line: "#F5EDE0", cut: "#C4382A", scissors: "#C4382A", dash: "#F5EDE0", tagline: "#8C8778" },
  "on-ketchup": { line: "#FFFDF5", cut: "#FFFDF5", scissors: "#FFFDF5", dash: "#FFFDF5", tagline: "#FFFDF5" },
};

export default function Logo({ size = "md", showTagline = false, variant = "default" }: LogoProps) {
  const config = sizeConfig[size];
  const colors = variantColors[variant];

  // Scissors dimensions at base scale (md)
  const scissorsBaseW = 28;
  const scissorsBaseH = 28;
  const scissorsW = scissorsBaseW * config.scissorsScale;
  const scissorsH = scissorsBaseH * config.scissorsScale;

  // Estimate wordmark width based on font size (Bebas Neue is narrow)
  const wordmarkW = config.fontSize * 3.2;
  const totalW = scissorsW + config.gap + wordmarkW;

  // Total height: scissors/wordmark row + optional tagline
  const rowH = Math.max(scissorsH, config.fontSize * 1.05);
  const taglineH = showTagline ? config.taglineSize + 8 : 0;
  const totalH = rowH + taglineH;

  // Vertical center of the row for alignment
  const rowCenterY = rowH / 2;

  // Dashed line Y position (cuts through the wordmark)
  const dashY = rowCenterY;
  const lineStartX = scissorsW + config.gap + config.fontSize * 1.72;
  const lineEndX = scissorsW + config.gap + config.fontSize * 1.92;

  return (
    <svg
      width={config.width}
      height={totalH}
      viewBox={`0 0 ${Math.max(totalW, config.width)} ${totalH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="LineCut logo"
    >
      {/* Scissors icon */}
      <g transform={`translate(0, ${rowCenterY - scissorsH / 2}) scale(${config.scissorsScale})`}>
        {/* Left blade */}
        <ellipse cx="8" cy="6" rx="5.5" ry="5" stroke={colors.scissors} strokeWidth="2" fill="none" />
        <line x1="12" y1="9" x2="22" y2="22" stroke={colors.scissors} strokeWidth="2.5" strokeLinecap="round" />
        {/* Right blade */}
        <ellipse cx="20" cy="6" rx="5.5" ry="5" stroke={colors.scissors} strokeWidth="2" fill="none" />
        <line x1="16" y1="9" x2="6" y2="22" stroke={colors.scissors} strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Wordmark: "LINE" in Chalkboard, "CUT" in Ketchup */}
      <text
        x={scissorsW + config.gap}
        y={rowCenterY}
        dominantBaseline="central"
        fontFamily="var(--font-display), 'Bebas Neue', sans-serif"
        fontSize={config.fontSize}
        letterSpacing="2px"
        fontWeight="400"
      >
        <tspan fill={colors.line}>LINE</tspan>
        <tspan fill={colors.cut}>CUT</tspan>
      </text>

      {/* Dashed tear line between LINE and CUT */}
      <line
        x1={lineStartX}
        y1={dashY - rowH * 0.35}
        x2={lineEndX}
        y2={dashY + rowH * 0.35}
        stroke={colors.dash}
        strokeWidth={Math.max(1, config.scissorsScale * 1.2)}
        strokeDasharray={`${3 * config.scissorsScale} ${3 * config.scissorsScale}`}
        strokeLinecap="round"
      />

      {/* Tagline */}
      {showTagline && (
        <text
          x={scissorsW + config.gap}
          y={rowH + config.taglineSize}
          fontFamily="var(--font-body), 'DM Sans', sans-serif"
          fontSize={config.taglineSize}
          fontStyle="italic"
          fill={colors.tagline}
          fontWeight="400"
        >
          Skip the line. Someone&apos;s already in it.
        </text>
      )}
    </svg>
  );
}
