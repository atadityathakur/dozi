import { BookOpen, CloudRain, Coffee, Flame, MessagesSquare, Music, Trees, Waves, Wind, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  rain: CloudRain,
  forest: Trees,
  ocean: Waves,
  fireplace: Flame,
  wind: Wind,
  cafe: Coffee,
  library: BookOpen,
  chatter: MessagesSquare,
};

export function layerIcon(id: string): LucideIcon {
  return ICONS[id] ?? Music;
}
