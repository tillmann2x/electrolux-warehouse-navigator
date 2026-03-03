import { useState, useMemo, useEffect, lazy } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { KPICard } from "@/components/KPICard";
import { SaturationBar } from "@/components/SaturationBar";
import { StatusLegend } from "@/components/StatusLegend";
import { WarehouseMap } from "@/components/WarehouseMap";
import { ExportButton } from "@/components/ExportButton";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { HeatmapChart } from "@/components/HeatmapChart";
import { SaturationAlerts } from "@/components/SaturationAlerts";
import { PositionDetailPanel } from "@/components/PositionDetailPanel";
import { Warehouse3D } from "@/components/Warehouse3D";
import { ImportButton } from "@/components/ImportButton";
import { StatusFilter } from "@/components/StatusFilter";
import { generatePositions, calculateSaturation, getKPIs, STATUS_LABELS } from "@/lib/warehouseData";
import type { WarehousePosition, PositionStatus } from "@/lib/warehouseData";
import { LayoutDashboard, Map, Forklift, BarChart3, Settings, RefreshCw, Filter, Monitor, Search, Box } from "lucide-react";
import electroluxLogo from "@/assets/electrolux-logo.png";

type Tab = 'dashboard' | 'positions' | 'high-positions' | '3d' | 'analytics' | 'settings';

const PIE_COLORS = [
  'hsl(142, 76%, 36%)',
  'hsl(0, 84%, 60%)',
  'hsl(45, 93%, 47%)',
  'hsl(0, 0%, 20%)',
  'hsl(270, 60%, 50%)',
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [positions, setPositions] = useState(() => generatePositions());
  const [filterStreet, setFilterStreet] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(() => new Date());
  const [saturationHistory, setSaturationHistory] = useState<Array<{ time: string; Z1: number; Z2: number }>>([]);
  const [selectedPosition, setSelectedPosition] = useState<WarehousePosition | null>(null);
  const [statusFilter, setStatusFilter] = useState<PositionStatus[]>([]);
  const [isImported, setIsImported] = useState(false);

  const kpis = useMemo(() => getKPIs(positions), [positions]);
  const saturation = useMemo(() => calculateSaturation(positions), [positions]);

  const streets = useMemo(() => {
    const s = new Set(positions.map(p => p.aisle));
    return Array.from(s).sort();
  }, [positions]);

  const levels = ['A', 'B', 'C', 'D', 'E', 'F'];

  const statusDistribution = useMemo(() => {
    const counts: Record<PositionStatus, number> = { FREE: 0, OCCUPIED: 0, RESERVED: 0, BLOCKED: 0, MAINTENANCE: 0 };
    positions.forEach(p => counts[p.status]++);
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_LABELS[status as PositionStatus],
      value,
    }));
  }, [positions]);

  const streetBarData = useMemo(() => {
    const sm: Record<string, { occupied: number; free: number; total: number }> = {};
    positions.forEach(p => {
      const e = sm[p.aisle] || { occupied: 0, free: 0, total: 0 };
      e.total++;
      if (p.status === 'OCCUPIED') e.occupied++;
      if (p.status === 'FREE') e.free++;
      sm[p.aisle] = e;
    });
    return Object.entries(sm).map(([name, v]) => ({ name: name.replace('Rua ', 'R'), ...v }));
  }, [positions]);

  useEffect(() => {
    const entry = {
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      Z1: saturation.find(s => s.zone === 'Z1')?.percentage || 0,
      Z2: saturation.find(s => s.zone === 'Z2')?.percentage || 0,
    };
    setSaturationHistory(prev => [...prev.slice(-11), entry]);
  }, [saturation]);

  useEffect(() => {
    if (isImported) return; // Don't auto-refresh when using real data
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

  const filteredPositions = useMemo(() => {
    let result = positions;
    if (filterLevel) result = result.filter(p => p.level === filterLevel);
    if (statusFilter.length > 0) result = result.filter(p => statusFilter.includes(p.status));
    return result;
  }, [positions, filterLevel, statusFilter]);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'positions', label: 'Posições', icon: Map },
    { id: 'high-positions', label: 'Posições Altas', icon: Forklift },
    { id: '3d', label: 'Visão 3D', icon: Box },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Config', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="gradient-primary px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-50"
      >
        <div className="flex items-center gap-3">
          <img src={electroluxLogo} alt="Electrolux" className="h-7 sm:h-8 brightness-0 invert" />
          <div className="hidden sm:block h-6 w-px bg-primary-foreground/30" />
          <div>
            <h1 className="text-primary-foreground font-bold text-sm sm:text-lg leading-tight">SLDS</h1>
            <p className="text-primary-foreground/70 text-[10px] sm:text-xs hidden sm:block">Smart Location Detection System</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-foreground/10">
            <div className={`w-2 h-2 rounded-full ${isImported ? 'bg-accent' : 'bg-status-free animate-pulse-soft'}`} />
            <span className="text-primary-foreground/80 text-[10px] sm:text-xs font-medium">
              {isImported ? 'Dados importados' : `Última sync: ${formatTime(lastSync)}`}
            </span>
          </div>
          <ImportButton onImport={handleImport} />
          <ExportButton positions={positions} />
          <DarkModeToggle />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/tv')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
            title="Modo TV para empilhadores"
          >
            <Monitor className="h-4 w-4 text-primary-foreground" />
            <span className="text-primary-foreground text-xs font-medium hidden sm:inline">Modo TV</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 text-primary-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </motion.header>

      {/* Mobile last sync */}
      <div className="sm:hidden bg-card border-b border-border px-4 py-1.5 flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-status-free animate-pulse-soft" />
        <span className="text-muted-foreground text-[10px] font-medium">
          Última sync: {formatTime(lastSync)}
        </span>
      </div>

      {/* Tab Navigation */}
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-card border-b border-border px-4 sm:px-6 sticky top-[60px] sm:top-[64px] z-40"
      >
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 gradient-accent rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.nav>

      {/* Content */}
      <main className="p-4 sm:p-6 max-w-[1600px] mx-auto">
        {activeTab === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <SaturationAlerts saturation={saturation} />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((kpi, i) => (
                <KPICard key={kpi.label} kpi={kpi} index={i} />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-lg border border-border p-5 shadow-card">
                <h3 className="text-sm font-semibold text-foreground mb-4">Ocupação por Rua</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={streetBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip />
                    <Bar dataKey="occupied" name="Ocupadas" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="free" name="Livres" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card rounded-lg border border-border p-5 shadow-card">
                <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição de Status</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                      {statusDistribution.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <StatusLegend />
              </motion.div>
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-card rounded-lg border border-border p-5 shadow-card space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Saturação por Zona</h3>
              {saturation.map((s, i) => (
                <SaturationBar key={s.zone} saturation={s} index={i} />
              ))}
            </motion.div>
          </motion.div>
        )}

        {(activeTab === 'positions' || activeTab === 'high-positions') && (
          <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {activeTab === 'high-positions' && (
                  <div className="p-2 rounded-lg gradient-primary">
                    <Forklift className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {activeTab === 'positions' ? 'Mapa de Posições' : '🏗️ Posições Altas'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === 'positions'
                      ? 'Clique em uma posição para ver detalhes'
                      : 'Níveis B+ do porta-pallet'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar endereço..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value.toUpperCase())}
                    className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent outline-none w-48"
                  />
                </div>
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select value={filterStreet} onChange={e => setFilterStreet(e.target.value)} className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground focus:ring-2 focus:ring-accent outline-none">
                  <option value="">Todas as ruas</option>
                  {streets.map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
                {activeTab === 'high-positions' && (
                  <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground focus:ring-2 focus:ring-accent outline-none">
                    <option value="">Todos os níveis</option>
                    {levels.filter(l => l !== 'A').map(l => (<option key={l} value={l}>Nível {l}</option>))}
                  </select>
                )}
                <ExportButton positions={filteredPositions} />
              </div>
            </div>
            <StatusFilter selected={statusFilter} onChange={setStatusFilter} />
            <div className="flex gap-4">
              <div className="flex-1">
                <WarehouseMap
                  positions={filteredPositions}
                  filterStreet={filterStreet || undefined}
                  showOnlyHigh={activeTab === 'high-positions'}
                  searchQuery={searchQuery || undefined}
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
            {/* Mobile detail panel */}
            {selectedPosition && (
              <div className="lg:hidden">
                <PositionDetailPanel position={selectedPosition} onClose={() => setSelectedPosition(null)} />
              </div>
            )}
          </motion.div>
        )}

        {activeTab === '3d' && (
          <motion.div key="3d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">🏗️ Visualização 3D do Armazém</h2>
                <p className="text-sm text-muted-foreground">Arraste para rotacionar • Scroll para zoom • Clique em uma posição para detalhes</p>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select value={filterStreet} onChange={e => setFilterStreet(e.target.value)} className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground focus:ring-2 focus:ring-accent outline-none">
                  <option value="">Todas as ruas</option>
                  {streets.map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            </div>
            <StatusLegend />
            <div className="flex gap-4">
              <div className="flex-1">
                <Warehouse3D
                  positions={positions}
                  onSelect={setSelectedPosition}
                  selectedId={selectedPosition?.id || null}
                  filterStreet={filterStreet || undefined}
                />
              </div>
              {selectedPosition && (
                <div className="hidden lg:block shrink-0">
                  <PositionDetailPanel position={selectedPosition} onClose={() => setSelectedPosition(null)} />
                </div>
              )}
            </div>
            {selectedPosition && (
              <div className="lg:hidden">
                <PositionDetailPanel position={selectedPosition} onClose={() => setSelectedPosition(null)} />
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-lg font-bold text-foreground">📈 Analytics Avançado</h2>
            <SaturationAlerts saturation={saturation} />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-lg border border-border p-5 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">📉 Tendência de Saturação (tempo real)</h3>
              {saturationHistory.length > 1 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={saturationHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <RechartsTooltip />
                    <Area type="monotone" dataKey="Z1" name="Zona 1" stroke="hsl(210, 100%, 50%)" fill="hsl(210, 100%, 50%)" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="Z2" name="Zona 2" stroke="hsl(270, 60%, 50%)" fill="hsl(270, 60%, 50%)" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Coletando dados... aguarde alguns ciclos de sync.</p>
              )}
            </motion.div>
            <HeatmapChart positions={positions} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {saturation.map((s, i) => {
                const predicted7d = Math.min(s.percentage + Math.floor(Math.random() * 10 + 2), 100);
                const predicted30d = Math.min(s.percentage + Math.floor(Math.random() * 18 + 5), 100);
                return (
                  <motion.div key={s.zone} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-card rounded-lg border border-border p-4 shadow-card">
                    <h4 className="text-sm font-bold text-foreground mb-3">{s.zone} — Previsão</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Atual</span>
                        <span className="font-bold text-foreground">{s.percentage}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">7 dias</span>
                        <span className={`font-bold ${predicted7d >= 85 ? 'text-status-occupied' : 'text-foreground'}`}>{predicted7d}% {predicted7d >= 85 && '⚠️'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">30 dias</span>
                        <span className={`font-bold ${predicted30d >= 85 ? 'text-status-occupied' : 'text-foreground'}`}>{predicted30d}% {predicted30d >= 85 && '🔴'}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-lg font-bold text-foreground">⚙️ Configurações</h2>
            <div className="bg-card rounded-lg border border-border p-6 shadow-card space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Padronização do Endereçamento</h3>
              <p className="text-sm text-muted-foreground">
                O sistema gera automaticamente os endereços seguindo o padrão <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">BRR0701A01</code>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-md p-4">
                  <p className="text-xs font-semibold text-foreground mb-2">Estrutura do Endereço</p>
                  <div className="space-y-1 text-xs text-muted-foreground font-mono">
                    <p><span className="text-accent font-bold">BRR</span> → Prefixo fixo</p>
                    <p><span className="text-accent font-bold">07</span> → Número da rua</p>
                    <p><span className="text-accent font-bold">01</span> → Módulo/Lado</p>
                    <p><span className="text-accent font-bold">A</span> → Nível (A-F)</p>
                    <p><span className="text-accent font-bold">01</span> → Posição do pallet</p>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-md p-4">
                  <p className="text-xs font-semibold text-foreground mb-2">Ruas Ativas</p>
                  <div className="flex flex-wrap gap-2">
                    {streets.map(s => (
                      <span key={s} className="px-2.5 py-1 rounded-full text-xs font-medium gradient-primary text-primary-foreground">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg border border-border p-6 shadow-card space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Integração SAP</h3>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-status-free animate-pulse-soft" />
                <span className="text-sm text-muted-foreground">Conexão ativa — Sync a cada 10s</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {['LAGP', 'LQUA', 'LTAP', 'T301'].map(table => (
                  <div key={table} className="bg-muted/50 rounded-md p-3 text-center">
                    <p className="font-mono font-bold text-foreground">{table}</p>
                    <p className="text-muted-foreground mt-0.5">Sincronizado</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="gradient-primary px-4 sm:px-6 py-3 flex items-center justify-between mt-6">
        <div className="flex items-center gap-3">
          <img src={electroluxLogo} alt="Electrolux" className="h-5 sm:h-6 brightness-0 invert" />
        </div>
        <p className="text-primary-foreground/60 text-[10px] sm:text-xs text-center">
          © 2026 Kauan Tillmann e Juan Castillo. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
