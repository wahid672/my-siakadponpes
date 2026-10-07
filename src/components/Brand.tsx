import emblem from "@/assets/emblem.png.asset.json";

export function Brand({ size = "md", light = false }: { size?: "sm" | "md" | "lg"; light?: boolean }) {
  const img = size === "lg" ? "h-14" : size === "sm" ? "h-7" : "h-9";
  const txt = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <div className="flex items-center gap-2.5">
      <img src={emblem.url} alt="" className={`${img} w-auto`} />
      <span className={`${txt} font-extrabold tracking-tight ${light ? "text-sidebar-foreground" : "text-brand"}`}>
        SIAKAD<span className={light ? "text-sidebar-primary" : ""}>PONPES</span>
      </span>
    </div>
  );
}
