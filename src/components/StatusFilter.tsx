import { motion } from "framer-motion";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/warehouseData";
import type { PositionStatus } from "@/lib/warehouseData";

interface StatusFilterProps {
  selected: PositionStatus[];
  onChange: (statuses: PositionStatus[]) => void;
}

const ALL_STATUSES: PositionStatus[] = ['FREE', 'OCCUPIED', 'RESERVED', 'BLOCKED', 'MAINTENANCE'];

export function StatusFilter({ selected, onChange }: StatusFilterProps) {
  const allSelected = selected.length === 0;

  const toggle = (status: PositionStatus) => {
    if (allSelected) {
      onChange([status]);
    } else if (selected.includes(status)) {
      const next = selected.filter(s => s !== status);
      onChange(next); // empty = all
    } else {
      onChange([...selected, status]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onChange([])}
        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
          allSelected
            ? 'bg-accent text-accent-foreground border-accent'
            : 'bg-card text-muted-foreground border-border hover:border-accent/50'
        }`}
      >
        Todos
      </motion.button>
      {ALL_STATUSES.map(status => {
        const isActive = selected.includes(status);
        return (
          <motion.button
            key={status}
            whileTap={{ scale: 0.95 }}
            onClick={() => toggle(status)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              isActive
                ? 'bg-accent text-accent-foreground border-accent'
                : 'bg-card text-muted-foreground border-border hover:border-accent/50'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
            {STATUS_LABELS[status]}
          </motion.button>
        );
      })}
    </div>
  );
}
