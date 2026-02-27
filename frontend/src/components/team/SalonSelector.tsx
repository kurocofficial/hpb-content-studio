import { useSalonStore } from "@/stores/salonStore";
import { Store, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SalonSelector() {
  const { salons, activeSalonId, setActiveSalon } = useSalonStore();

  if (salons.length === 0) return null;

  const activeSalon = salons.find((s) => s.id === activeSalonId);

  return (
    <div className="px-3 py-2">
      <label className="text-xs text-muted-foreground mb-1 block">
        対象サロン
      </label>
      <div className="relative">
        <select
          value={activeSalonId || ""}
          onChange={(e) => setActiveSalon(e.target.value)}
          className={cn(
            "w-full appearance-none bg-white border rounded-lg px-3 py-2 pr-8",
            "text-sm font-medium text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          )}
        >
          {salons.map((salon) => (
            <option key={salon.id} value={salon.id}>
              {salon.name} ({salon.area})
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
      {activeSalon && (
        <div className="flex items-center space-x-1.5 mt-1.5">
          <Store className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {activeSalon.area}
          </span>
        </div>
      )}
    </div>
  );
}
