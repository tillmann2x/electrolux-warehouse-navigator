import { motion } from "framer-motion";
import { Warehouse, Box, Clock, Layers, TrendingUp, TrendingDown } from "lucide-react";
import type { KPI } from "@/lib/warehouseData";

const ICONS: Record<string, React.ElementType> = {
  warehouse: Warehouse,
  box: Box,
  clock: Clock,
  layers: Layers,
};

interface KPICardProps {
  kpi: KPI;
  index: number;
}

export function KPICard({ kpi, index }: KPICardProps) {
  const Icon = ICONS[kpi.icon] || Box;
  const isPositive = kpi.change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-card rounded-lg border border-border p-6 shadow-card hover:shadow-card-hover transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2.5 rounded-lg gradient-primary">
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-status-free' : 'text-status-occupied'}`}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {Math.abs(kpi.change)}%
        </div>
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.1 + 0.3 }}
        className="text-3xl font-bold text-foreground"
      >
        {kpi.value}
      </motion.p>
      <p className="text-sm text-muted-foreground mt-1">{kpi.label}</p>
    </motion.div>
  );
}
