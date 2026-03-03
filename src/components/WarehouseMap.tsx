import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { WarehousePosition } from "@/lib/warehouseData";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/warehouseData";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface WarehouseMapProps {
  positions: WarehousePosition[];
  filterStreet?: string;
  showOnlyHigh?: boolean;
  searchQuery?: string;
  largeMode?: boolean;
  onPositionClick?: (pos: WarehousePosition) => void;
  selectedId?: string | null;
}

export function WarehouseMap({ positions, filterStreet, showOnlyHigh = false, searchQuery, largeMode = false, onPositionClick, selectedId }: WarehouseMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = positions;
    if (filterStreet) result = result.filter(p => p.aisle === filterStreet);
    if (showOnlyHigh) result = result.filter(p => p.level !== 'A');
    return result;
  }, [positions, filterStreet, showOnlyHigh]);

  const matchedIds = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return new Set<string>();
    const q = searchQuery.toUpperCase();
    return new Set(
      positions
        .filter(p => p.sapLocationId.includes(q))
        .map(p => p.id)
    );
  }, [positions, searchQuery]);

  const hasSearch = matchedIds.size > 0;

  // Group by street > module > level
  const grouped = useMemo(() => {
    const map = new window.Map<string, globalThis.Map<string, globalThis.Map<string, WarehousePosition[]>>>();
    filtered.forEach(p => {
      if (!map.has(p.aisle)) map.set(p.aisle, new window.Map());
      const streetMap = map.get(p.aisle)!;
      if (!streetMap.has(p.rack)) streetMap.set(p.rack, new window.Map());
      const rackMap = streetMap.get(p.rack)!;
      if (!rackMap.has(p.level)) rackMap.set(p.level, []);
      rackMap.get(p.level)!.push(p);
    });
    return map;
  }, [filtered]);

  const cellSize = largeMode ? 'w-9 h-9 rounded-md' : 'w-5 h-5 rounded-sm';
  const cellGap = largeMode ? 'gap-1.5' : 'gap-0.5';
  const levelGap = largeMode ? 'space-y-2.5' : 'space-y-1.5';
  const levelLabelSize = largeMode ? 'text-sm font-bold w-6' : 'text-[10px] w-4';
  const moduleLabel = largeMode ? 'text-sm font-bold' : 'text-xs font-semibold';
  const streetLabel = largeMode ? 'text-base font-bold px-4 py-2' : 'text-sm font-bold px-3 py-1.5';
  const gridCols = largeMode ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <div className={largeMode ? 'space-y-8' : 'space-y-6'}>
      {hasSearch && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-accent/10 border border-accent/30 rounded-lg px-4 py-2.5 ${largeMode ? 'text-base' : 'text-sm'} text-foreground`}
        >
          <span className="font-semibold">{matchedIds.size}</span> posição(ões) encontrada(s) para "<span className="font-mono font-semibold">{searchQuery}</span>"
        </motion.div>
      )}
      {searchQuery && searchQuery.length >= 2 && matchedIds.size === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2.5 ${largeMode ? 'text-base' : 'text-sm'} text-foreground`}
        >
          Nenhuma posição encontrada para "<span className="font-mono font-semibold">{searchQuery}</span>"
        </motion.div>
      )}
      <AnimatePresence>
        {Array.from(grouped.entries()).map(([street, modules], streetIdx) => (
          <motion.div
            key={street}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: streetIdx * 0.08 }}
            className={`bg-card rounded-lg border border-border ${largeMode ? 'p-6' : 'p-4'} shadow-card`}
          >
            <h4 className={`${streetLabel} text-foreground mb-3 gradient-primary text-primary-foreground rounded-md inline-block`}>
              {street}
            </h4>
            <div className={`grid ${gridCols} ${largeMode ? 'gap-6' : 'gap-4'}`}>
              {Array.from(modules.entries()).map(([module, levels]) => (
                <div key={module} className={`bg-muted/50 rounded-md ${largeMode ? 'p-4' : 'p-3'}`}>
                  <p className={`${moduleLabel} text-muted-foreground ${largeMode ? 'mb-3' : 'mb-2'}`}>{module}</p>
                  <div className={levelGap}>
                    {Array.from(levels.entries())
                      .sort(([a], [b]) => b.localeCompare(a))
                      .map(([level, levelPositions]) => (
                        <div key={level} className="flex items-center gap-1.5">
                          <span className={`${levelLabelSize} font-mono text-muted-foreground shrink-0`}>
                            {level}
                          </span>
                          <div className={`flex ${cellGap} flex-wrap`}>
                            {levelPositions.map(pos => {
                              const isMatch = hasSearch && matchedIds.has(pos.id);
                              const isDimmed = hasSearch && !isMatch;
                              return (
                                <Tooltip key={pos.id}>
                                  <TooltipTrigger asChild>
                                    <motion.div
                                      whileHover={{ scale: 1.3 }}
                                      animate={isMatch ? { scale: [1, 1.4, 1.2], transition: { repeat: Infinity, duration: 1.2 } } : {}}
                                      onMouseEnter={() => setHoveredId(pos.id)}
                                      onMouseLeave={() => setHoveredId(null)}
                                      onClick={() => onPositionClick?.(pos)}
                                      className={`${cellSize} cursor-pointer ${STATUS_COLORS[pos.status]} transition-all ${
                                        hoveredId === pos.id || selectedId === pos.id ? 'ring-2 ring-accent shadow-glow' : ''
                                      } ${isMatch ? 'ring-2 ring-accent shadow-glow z-10' : ''} ${isDimmed ? 'opacity-25' : ''}`}
                                    >
                                      {largeMode && (
                                        <span className="flex items-center justify-center h-full text-[8px] font-bold text-white/80">
                                          {pos.position}
                                        </span>
                                      )}
                                    </motion.div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className={largeMode ? 'text-sm p-3' : 'text-xs'}>
                                    <p className="font-bold">{pos.sapLocationId}</p>
                                    <p>{STATUS_LABELS[pos.status]}</p>
                                    <p className="text-muted-foreground">
                                      Peso máx: {pos.maxWeight}kg
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
