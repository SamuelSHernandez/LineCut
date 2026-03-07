interface PlaceholderCardProps {
  title: string;
  children: React.ReactNode;
}

export default function PlaceholderCard({ title, children }: PlaceholderCardProps) {
  return (
    <div className="relative bg-ticket rounded-[10px] p-5 border border-dashed border-[#ddd4c4] shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* COMING SOON watermark */}
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-[family-name:var(--font-mono)] text-[11px] tracking-[4px] uppercase text-sidewalk/20 select-none pointer-events-none whitespace-nowrap">
        COMING SOON
      </span>
      <h3 className="font-[family-name:var(--font-display)] text-[18px] tracking-[1px] mb-3 relative">
        {title}
      </h3>
      <div className="relative opacity-60">{children}</div>
    </div>
  );
}
