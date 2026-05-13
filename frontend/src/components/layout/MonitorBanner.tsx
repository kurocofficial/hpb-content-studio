import { useAuthStore } from "@/stores/authStore";
import { X } from "lucide-react";
import { useState } from "react";

export default function MonitorBanner() {
  const { monitorStatus } = useAuthStore();
  const [dismissed, setDismissed] = useState(false);

  if (!monitorStatus?.is_active || dismissed) return null;

  const endDate = monitorStatus.end_date
    ? `${monitorStatus.end_date.replace(/-/g, "/")}まで`
    : "";

  return (
    <div className="bg-gradient-to-r from-[#D4585A] to-[#4ECDC4] text-white text-sm px-4 py-2 flex items-center justify-between gap-3">
      <p className="flex-1 text-center font-medium leading-snug">
        🎉 モニター期間中：Proプランの全機能を無料でご利用いただけます
        {endDate && <span className="ml-1 opacity-80 font-normal">（{endDate} / 告知なく終了する場合あり）</span>}
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
        aria-label="閉じる"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
