import { Crown, Car, Headphones, VolumeX, type LucideIcon } from "lucide-react";

export type TierId = "holy_grail" | "active_rotation" | "lofi_beats" | "sonic_pollution";

export const TIERS: {
  id: TierId;
  name: string;
  emoji: string;
  blurb: string;
  icon: LucideIcon;
  text: string;
  bg: string;
  border: string;
  soft: string;
}[] = [
  { id: "holy_grail", name: "The Holy Grail", emoji: "👑", blurb: "Masterpiece. Zero skips. Unrepeatable.", icon: Crown,
    text: "text-tier-grail", bg: "bg-tier-grail", border: "border-tier-grail", soft: "bg-tier-grail/15" },
  { id: "active_rotation", name: "Active Rotation", emoji: "🚗", blurb: "Heavy replay. Perfect for the drive.", icon: Car,
    text: "text-tier-rotation", bg: "bg-tier-rotation", border: "border-tier-rotation", soft: "bg-tier-rotation/15" },
  { id: "lofi_beats", name: "Lofi Beats", emoji: "🧹", blurb: "Pleasant background. Forgettable.", icon: Headphones,
    text: "text-tier-lofi", bg: "bg-tier-lofi", border: "border-tier-lofi", soft: "bg-tier-lofi/15" },
  { id: "sonic_pollution", name: "Sonic Pollution", emoji: "🔇", blurb: "A waste of time. Instant headache.", icon: VolumeX,
    text: "text-tier-pollution", bg: "bg-tier-pollution", border: "border-tier-pollution", soft: "bg-tier-pollution/15" },
];

export const tierById = (id: string) => TIERS.find((t) => t.id === id) ?? TIERS[0]!;
