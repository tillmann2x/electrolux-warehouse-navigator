import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileSpreadsheet } from "lucide-react";
import type { WarehousePosition } from "@/lib/warehouseData";
import { STATUS_LABELS } from "@/lib/warehouseData";

interface ExportButtonProps {
  positions: WarehousePosition[];
}

export function ExportButton({ positions }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");
      
      const data = positions.map(p => ({
        "Endereço SAP": p.sapLocationId,
        "Zona": p.zone,
        "Rua": p.aisle,
        "Módulo": p.rack,
        "Nível": p.level,
        "Posição": p.position,
        "Tipo": p.type === "GROUND" ? "Chão" : "Alta",
        "Peso Máx (kg)": p.maxWeight,
        "Status": STATUS_LABELS[p.status],
        "Última Atualização": new Date(p.lastUpdate).toLocaleString("pt-BR"),
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      
      // Column widths
      ws["!cols"] = [
        { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 8 },
        { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 12 },
        { wch: 12 }, { wch: 20 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Posições");

      // Summary sheet
      const statusCounts = positions.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const summaryData = Object.entries(statusCounts).map(([status, count]) => ({
        "Status": STATUS_LABELS[status as keyof typeof STATUS_LABELS],
        "Quantidade": count,
        "Percentual": `${Math.round((count / positions.length) * 100)}%`,
      }));
      summaryData.push({
        "Status": "TOTAL",
        "Quantidade": positions.length,
        "Percentual": "100%",
      });

      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      wsSummary["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");

      const now = new Date();
      const filename = `SLDS_Posicoes_${now.toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-status-free/20 hover:bg-status-free/30 border border-status-free/30 transition-colors disabled:opacity-50"
      title="Exportar planilha Excel"
    >
      {isExporting ? (
        <Download className="h-4 w-4 text-status-free animate-bounce" />
      ) : (
        <FileSpreadsheet className="h-4 w-4 text-status-free" />
      )}
      <span className="text-xs font-medium text-foreground hidden sm:inline">
        {isExporting ? "Exportando..." : "Exportar Excel"}
      </span>
    </motion.button>
  );
}
