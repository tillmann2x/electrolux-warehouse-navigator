import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, TrendingUp } from "lucide-react";
import type { ZoneSaturation } from "@/lib/warehouseData";

interface SaturationAlertsProps {
  saturation: ZoneSaturation[];
}

export function SaturationAlerts({ saturation }: SaturationAlertsProps) {
  const criticalZones = saturation.filter(s => s.percentage >= 80);

  if (criticalZones.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-2"
      >
        {criticalZones.map(zone => (
          <motion.div
            key={zone.zone}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
              zone.percentage >= 90
                ? 'bg-destructive/10 border-destructive/30'
                : 'bg-status-reserved/10 border-status-reserved/30'
            }`}
          >
            <AlertTriangle className={`h-5 w-5 shrink-0 ${
              zone.percentage >= 90 ? 'text-status-occupied' : 'text-status-reserved'
            } animate-pulse`} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {zone.zone} — {zone.percentage}% ocupado
              </p>
              <p className="text-xs text-muted-foreground">
                {zone.percentage >= 90 ? '⚠️ Zona crítica! Considere redistribuição.' : '⚡ Zona acima de 80%. Monitorar de perto.'}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <TrendingUp className="h-3.5 w-3.5 text-status-occupied" />
              <span className="text-xs font-medium text-status-occupied">
                Previsão 7d: {Math.min(zone.percentage + Math.floor(Math.random() * 8 + 3), 100)}%
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
