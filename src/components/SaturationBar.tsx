import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { ZoneSaturation } from "@/lib/warehouseData";

interface SaturationBarProps {
  saturation: ZoneSaturation;
  index: number;
}

export function SaturationBar({ saturation, index }: SaturationBarProps) {
  const isWarning = saturation.percentage >= 80;
  const isCritical = saturation.percentage >= 90;

  const segments = [
    { key: 'occupied', value: saturation.occupied, className: 'status-occupied' },
    { key: 'reserved', value: saturation.reserved, className: 'status-reserved' },
    { key: 'blocked', value: saturation.blocked, className: 'status-blocked' },
    { key: 'maintenance', value: saturation.maintenance, className: 'status-maintenance' },
    { key: 'free', value: saturation.free, className: 'status-free' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className={`space-y-2 p-3 rounded-lg transition-colors ${
        isCritical ? 'bg-destructive/5 border border-destructive/20' :
        isWarning ? 'bg-status-reserved/5 border border-status-reserved/20' :
        ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{saturation.zone}</span>
          {isWarning && (
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <AlertTriangle className={`h-3.5 w-3.5 ${isCritical ? 'text-status-occupied' : 'text-status-reserved'}`} />
            </motion.div>
          )}
        </div>
        <span className={`text-sm font-medium ${
          isCritical ? 'text-status-occupied font-bold' :
          isWarning ? 'text-status-reserved font-bold' :
          'text-muted-foreground'
        }`}>
          {saturation.percentage}% ocupado · {saturation.total} posições
        </span>
      </div>
      <div className="h-5 rounded-full overflow-hidden bg-muted flex relative">
        {segments.map(seg => {
          const pct = (seg.value / saturation.total) * 100;
          if (pct === 0) return null;
          return (
            <motion.div
              key={seg.key}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: index * 0.1 + 0.3, duration: 0.8, ease: "easeOut" }}
              className={`h-full ${seg.className}`}
            />
          );
        })}
        {/* Percentage label overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white drop-shadow-sm">{saturation.percentage}%</span>
        </div>
      </div>
    </motion.div>
  );
}
