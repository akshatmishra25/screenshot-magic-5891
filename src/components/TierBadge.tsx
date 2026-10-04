import { tierById } from "@/lib/tiers";
import { cn } from "@/lib/utils";

export function TierBadge({ tier, className }: { tier: string; className?: string }) {
  const t = tierById(tier);
  const Icon = t.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", t.soft, t.text, className)}>
      <Icon className="h-3 w-3" /> {t.name}
    </span>
  );
}
