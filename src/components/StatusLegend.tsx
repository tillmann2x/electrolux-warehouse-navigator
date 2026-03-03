import { motion } from "framer-motion";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/warehouseData";
import type { PositionStatus } from "@/lib/warehouseData";

export function StatusLegend() {
  const statuses: PositionStatus[] = ['FREE', 'OCCUPIED', 'RESERVED', 'BLOCKED', 'MAINTENANCE'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex flex-wrap gap-4"
    >
      {statuses.map(status => (
        <div key={status} className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[status]}`} />
          <span className="text-sm text-muted-foreground">{STATUS_LABELS[status]}</span>
        </div>
      ))}
    </motion.div>
  );
}
