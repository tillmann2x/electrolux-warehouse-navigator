import { useMemo } from "react";
import { motion } from "framer-motion";
import type { WarehousePosition } from "@/lib/warehouseData";

interface HeatmapChartProps {
  positions: WarehousePosition[];
}

export function HeatmapChart({ positions }: HeatmapChartProps) {
  const heatData = useMemo(() => {
    const streets = new Map<string, { occupied: number; total: number; levels: Map<string, { occupied: number; total: number }> }>();
    
    positions.forEach(p => {
      if (!streets.has(p.aisle)) {
        streets.set(p.aisle, { occupied: 0, total: 0, levels: new Map() });
      }
      const street = streets.get(p.aisle)!;
      street.total++;
      if (p.status === 'OCCUPIED') street.occupied++;

      if (!street.levels.has(p.level)) {
        street.levels.set(p.level, { occupied: 0, total: 0 });
      }
      const level = street.levels.get(p.level)!;
      level.total++;
      if (p.status === 'OCCUPIED') level.occupied++;
    });

    return Array.from(streets.entries()).map(([street, data]) => ({
      street,
      percentage: Math.round((data.occupied / data.total) * 100),
      levels: Array.from(data.levels.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([level, ld]) => ({
          level,
          percentage: Math.round((ld.occupied / ld.total) * 100),
        })),
    }));
  }, [positions]);

  const getHeatColor = (pct: number) => {
    if (pct >= 85) return 'bg-red-500';
    if (pct >= 70) return 'bg-orange-500';
    if (pct >= 50) return 'bg-yellow-500';
    if (pct >= 30) return 'bg-green-400';
    return 'bg-green-600';
  };

  const allLevels = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card rounded-lg border border-border p-5 shadow-card"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">🔥 Heatmap de Ocupação (Rua × Nível)</h3>
      <div className="overflow-x-auto">
        <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${allLevels.length}, 1fr)` }}>
          {/* Header row */}
          <div className="text-xs font-semibold text-muted-foreground p-2" />
          {allLevels.map(l => (
            <div key={l} className="text-xs font-semibold text-center text-muted-foreground p-2 min-w-[48px]">
              {l}
            </div>
          ))}

          {/* Data rows */}
          {heatData.map((row, idx) => (
            <>
              <div key={`label-${row.street}`} className="text-xs font-semibold text-foreground p-2 whitespace-nowrap">
                {row.street}
              </div>
              {allLevels.map(level => {
                const cell = row.levels.find(l => l.level === level);
                if (!cell) {
                  return <div key={`${row.street}-${level}`} className="bg-muted/30 rounded-md min-h-[36px] min-w-[48px]" />;
                }
                return (
                  <motion.div
                    key={`${row.street}-${level}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`${getHeatColor(cell.percentage)} rounded-md min-h-[36px] min-w-[48px] flex items-center justify-center cursor-default transition-transform hover:scale-110`}
                    title={`${row.street} Nível ${level}: ${cell.percentage}% ocupado`}
                  >
                    <span className="text-[10px] font-bold text-white">{cell.percentage}%</span>
                  </motion.div>
                );
              })}
            </>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <span className="text-[10px] text-muted-foreground">Ocupação:</span>
        {[
          { label: '< 30%', color: 'bg-green-600' },
          { label: '30-50%', color: 'bg-green-400' },
          { label: '50-70%', color: 'bg-yellow-500' },
          { label: '70-85%', color: 'bg-orange-500' },
          { label: '> 85%', color: 'bg-red-500' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${item.color}`} />
            <span className="text-[10px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
