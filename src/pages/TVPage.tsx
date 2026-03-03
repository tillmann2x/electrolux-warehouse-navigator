import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { WarehouseMap } from "@/components/WarehouseMap";
import { StatusLegend } from "@/components/StatusLegend";
import { ExportButton } from "@/components/ExportButton";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { ImportButton } from "@/components/ImportButton";
import { StatusFilter } from "@/components/StatusFilter";
import { PositionDetailPanel } from "@/components/PositionDetailPanel";
import { generatePositions, calculateSaturation, STATUS_LABELS } from "@/lib/warehouseData";
import type { WarehousePosition, PositionStatus } from "@/lib/warehouseData";
import { Search, RefreshCw, Filter, Monitor, Maximize, LogOut, AlertTriangle, Upload } from "lucide-react";
import electroluxLogo from "@/assets/electrolux-logo.png";

function loadImportedPositions(): WarehousePosition[] | null {
  try {
    const raw = localStorage.getItem('slds-imported-positions');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export default function TVPage() {
  const navigate = useNavigate();
  const [positions, setPositions] = useState<WarehousePosition[]>(() => {
    return loadImportedPositions() || generatePositions();
  });
  const [isImported, setIsImported] = useState(() => !!loadImportedPositions());
  const [filterStreet, setFilterStreet] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSync, setLastSync] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PositionStatus[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<WarehousePosition | null>(null);

  const streets = useMemo(() => {
    const s = new Set(positions.map(p => p.aisle));
    return Array.from(s).sort();
  }, [positions]);

  const filteredPositions = useMemo(() => {
    let result = positions;
    if (statusFilter.length > 0) result = result.filter(p => statusFilter.includes(p.status));
    return result;
  }, [positions, statusFilter]);

  const saturation = useMemo(() => calculateSaturation(positions), [positions]);
  const totalPositions = positions.length;
  const freeCount = positions.filter(p => p.status === 'FREE').length;
  const occupiedCount = positions.filter(p => p.status === 'OCCUPIED').length;
  const reservedCount = positions.filter(p => p.status === 'RESERVED').length;

  const criticalZones = saturation.filter(s => s.percentage >= 80);

  // Listen for storage changes from Dashboard
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'slds-imported-positions' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          setPositions(data);
          setIsImported(true);
          setLastSync(new Date());
        } catch {}
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  useEffect(() => {
    if (isImported) return;
    const interval = setInterval(() => {
      setPositions(generatePositions());
      setLastSync(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, [isImported]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      if (!isImported) {
        setPositions(generatePositions());
      }
      setLastSync(new Date());
      setIsRefreshing(false);
    }, 600);
  };

  const handleImport = (imported: WarehousePosition[]) => {
    setPositions(imported);
    setIsImported(true);
    setLastSync(new Date());
    setSelectedPosition(null);
    localStorage.setItem('slds-imported-positions', JSON.stringify(imported));
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const handleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* TV Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="gradient-primary px-4 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-50"
      >
        <div className="flex items-center gap-4">
          <img src={electroluxLogo} alt="Electrolux" className="h-7 lg:h-9 brightness-0 invert" />
          <div className="h-6 w-px bg-primary-foreground/30" />
          <div>
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary-foreground/70" />
              <h1 className="text-primary-foreground font-bold text-lg lg:text-2xl leading-tight">
                SLDS — Modo TV
              </h1>
            </div>
            <p className="text-primary-foreground/60 text-xs lg:text-sm">
              Posições do Armazém em Tempo Real
            </p>
          </div>
        </div>

        {/* KPI pills */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-foreground/10">
            <div className="w-4 h-4 rounded-full status-free" />
            <span className="text-primary-foreground text-sm lg:text-lg font-bold">{freeCount} Livres</span>
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-foreground/10">
            <div className="w-4 h-4 rounded-full status-occupied" />
            <span className="text-primary-foreground text-sm lg:text-lg font-bold">{occupiedCount} Ocupadas</span>
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-foreground/10">
            <div className="w-4 h-4 rounded-full status-reserved" />
            <span className="text-primary-foreground text-sm lg:text-lg font-bold">{reservedCount} Reservadas</span>
          </div>
          {isImported && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/20 border border-accent/30">
              <Upload className="h-3.5 w-3.5 text-accent" />
              <span className="text-accent text-xs font-bold">SAP</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary-foreground/10">
            <div className={`w-2 h-2 rounded-full ${isImported ? 'bg-accent' : 'bg-status-free animate-pulse-soft'}`} />
            <span className="text-primary-foreground/80 text-[10px] lg:text-xs font-medium">
              {isImported ? 'Dados SAP importados' : `Última sync: ${formatTime(lastSync)}`}
            </span>
          </div>
          <ImportButton onImport={handleImport} />
          <ExportButton positions={positions} />
          <DarkModeToggle />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 text-primary-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleFullscreen}
            className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
          >
            <Maximize className="h-4 w-4 text-primary-foreground" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/80 hover:bg-destructive transition-colors"
            title="Sair do Modo TV"
          >
            <LogOut className="h-4 w-4 text-primary-foreground" />
            <span className="text-primary-foreground text-xs font-medium hidden lg:inline">Sair</span>
          </motion.button>
        </div>
      </motion.header>

      {/* Alerts */}
      {criticalZones.length > 0 && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 lg:px-8 py-2">
          <div className="flex items-center gap-3 overflow-x-auto">
            <AlertTriangle className="h-4 w-4 text-status-occupied animate-pulse shrink-0" />
            {criticalZones.map(z => (
              <span key={z.zone} className="text-xs font-semibold text-status-occupied whitespace-nowrap">
                {z.zone}: {z.percentage}% ⚠️
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-card border-b border-border px-4 lg:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 sticky top-[52px] lg:top-[60px] z-40"
      >
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar endereço (ex: BRM0142A01)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value.toUpperCase())}
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterStreet}
              onChange={e => setFilterStreet(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:ring-2 focus:ring-accent outline-none"
            >
              <option value="">Todas as ruas</option>
              {streets.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusFilter selected={statusFilter} onChange={setStatusFilter} />
          <StatusLegend />
        </div>
      </motion.div>

      {/* Saturation mini-bars */}
      <div className="bg-card border-b border-border px-4 lg:px-8 py-3">
        <div className="flex gap-6 overflow-x-auto">
          {saturation.map(s => (
            <div key={s.zone} className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-bold text-foreground">{s.zone}</span>
              <div className="w-40 h-4 rounded-full bg-muted overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${s.percentage}%` }}
                  transition={{ duration: 0.8 }}
                  className={`h-full transition-all duration-700 ${s.percentage >= 85 ? 'bg-red-500' : s.percentage >= 70 ? 'bg-orange-500' : 'status-occupied'}`}
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((s.free / s.total) * 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="h-full status-free transition-all duration-700"
                />
              </div>
              <span className={`text-sm font-bold ${s.percentage >= 80 ? 'text-status-occupied' : 'text-muted-foreground'}`}>
                {s.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <main className="flex-1 p-4 lg:p-8">
        <div className="flex gap-4">
          <div className="flex-1">
            <WarehouseMap
              positions={filteredPositions}
              filterStreet={filterStreet || undefined}
              searchQuery={searchQuery || undefined}
              largeMode
              onPositionClick={setSelectedPosition}
              selectedId={selectedPosition?.id || null}
            />
          </div>
          {selectedPosition && (
            <div className="hidden lg:block shrink-0">
              <div className="sticky top-36">
                <PositionDetailPanel position={selectedPosition} onClose={() => setSelectedPosition(null)} />
              </div>
            </div>
          )}
        </div>
        {selectedPosition && (
          <div className="lg:hidden mt-4">
            <PositionDetailPanel position={selectedPosition} onClose={() => setSelectedPosition(null)} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="gradient-primary px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={electroluxLogo} alt="Electrolux" className="h-5 lg:h-6 brightness-0 invert" />
        </div>
        <p className="text-primary-foreground/60 text-[10px] lg:text-xs text-center">
          © 2026 Kauan Tillmann e Juan Castillo. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
