export function Brand({ size = "md", light = false }: { size?: "sm" | "md" | "lg"; light?: boolean }) {
  const img = size === "lg" ? "h-14" : size === "sm" ? "h-7" : "h-9";
  const txt = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/emblem.png"
        alt="SIAKAD PONPES"
        className={`${img} w-auto object-contain shrink-0`}
        crossOrigin="anonymous"
        loading="eager"
        onError={(e) => {
          // Do not hide if rendering inside printable invoice paper
          const isPrintPaper = (e.currentTarget as HTMLElement).closest("#printable-invoice-paper");
          if (!isPrintPaper) {
            (e.currentTarget as HTMLElement).style.display = "none";
          }
        }}
      />
      <span className={`${txt} font-black tracking-tight inline-flex items-center`}>
        <span className={light ? "text-sidebar-foreground" : "text-[#0f766e]"}>SIAKAD</span>
        <span className={light ? "text-sidebar-primary" : "text-[#10b981]"}>PONPES</span>
      </span>
    </div>
  );
}
