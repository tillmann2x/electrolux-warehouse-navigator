export type PositionStatus = 'FREE' | 'OCCUPIED' | 'RESERVED' | 'BLOCKED' | 'MAINTENANCE';

export interface WarehousePosition {
  id: string;
  sapLocationId: string;
  zone: string;
  aisle: string; // rua
  rack: string; // módulo
  level: string; // nível (A-F)
  position: string;
  type: string;
  maxWeight: number;
  status: PositionStatus;
  lastUpdate: string;
  // SAP fields
  material?: string;
  estoqueTotal?: number;
  estoqueDisponivel?: number;
  tipoEstoque?: string;
  tipoDeposito?: string;
  armazem?: string;
  dataEntrada?: string;
}

export interface ZoneSaturation {
  zone: string;
  total: number;
  occupied: number;
  free: number;
  reserved: number;
  blocked: number;
  maintenance: number;
  percentage: number;
}

export interface KPI {
  label: string;
  value: string;
  change: number;
  icon: string;
}

const LEVELS_BY_STREET: Record<number, string[]> = {
  1: ['A', 'B', 'C', 'D', 'E', 'F'],
  2: ['A', 'B', 'C', 'D', 'E', 'F'],
  3: ['A', 'B', 'C', 'D', 'E'],
  4: ['A', 'B', 'C', 'D', 'E'],
  5: ['A', 'B', 'C', 'D', 'E', 'F'],
  6: ['A', 'B', 'C', 'D'],
};

const STATUSES: PositionStatus[] = ['FREE', 'OCCUPIED', 'RESERVED', 'BLOCKED', 'MAINTENANCE'];
const STATUS_WEIGHTS = [0.35, 0.45, 0.1, 0.05, 0.05];

function weightedRandom(): PositionStatus {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < STATUSES.length; i++) {
    cumulative += STATUS_WEIGHTS[i];
    if (r <= cumulative) return STATUSES[i];
  }
  return 'FREE';
}

export function generatePositions(): WarehousePosition[] {
  const positions: WarehousePosition[] = [];
  
  for (let street = 1; street <= 6; street++) {
    const streetStr = street.toString().padStart(2, '0');
    const levels = LEVELS_BY_STREET[street];
    const modulesCount = street <= 3 ? 4 : 3;
    
    for (let module = 1; module <= modulesCount; module++) {
      const moduleStr = module.toString().padStart(2, '0');
      
      for (const level of levels) {
        const positionsInLevel = level === 'A' ? 6 : 4;
        
        for (let pos = 1; pos <= positionsInLevel; pos++) {
          const posStr = pos.toString().padStart(2, '0');
          const sapId = `BRR${streetStr}${moduleStr}${level}${posStr}`;
          const status = weightedRandom();
          
          positions.push({
            id: `${street}-${module}-${level}-${pos}`,
            sapLocationId: sapId,
            zone: `Z${street <= 3 ? '1' : '2'}`,
            aisle: `Rua ${streetStr}`,
            rack: `M${moduleStr}`,
            level,
            position: posStr,
            type: level === 'A' ? 'GROUND' : 'HIGH',
            maxWeight: level === 'A' ? 2000 : 1500,
            status,
            lastUpdate: new Date(Date.now() - Math.random() * 3600000).toISOString(),
          });
        }
      }
    }
  }
  
  return positions;
}

export function calculateSaturation(positions: WarehousePosition[]): ZoneSaturation[] {
  const zones = new Map<string, WarehousePosition[]>();
  
  positions.forEach(p => {
    const existing = zones.get(p.zone) || [];
    existing.push(p);
    zones.set(p.zone, existing);
  });
  
  return Array.from(zones.entries()).map(([zone, zonePositions]) => {
    const total = zonePositions.length;
    const occupied = zonePositions.filter(p => p.status === 'OCCUPIED').length;
    const free = zonePositions.filter(p => p.status === 'FREE').length;
    const reserved = zonePositions.filter(p => p.status === 'RESERVED').length;
    const blocked = zonePositions.filter(p => p.status === 'BLOCKED').length;
    const maintenance = zonePositions.filter(p => p.status === 'MAINTENANCE').length;
    
    return {
      zone,
      total,
      occupied,
      free,
      reserved,
      blocked,
      maintenance,
      percentage: Math.round((occupied / total) * 100),
    };
  });
}

export function getKPIs(positions: WarehousePosition[]): KPI[] {
  const total = positions.length;
  const occupied = positions.filter(p => p.status === 'OCCUPIED').length;
  const free = positions.filter(p => p.status === 'FREE').length;
  const reserved = positions.filter(p => p.status === 'RESERVED').length;
  
  return [
    {
      label: 'Ocupação Total',
      value: `${Math.round((occupied / total) * 100)}%`,
      change: 2.4,
      icon: 'warehouse',
    },
    {
      label: 'Posições Livres',
      value: free.toString(),
      change: -5.1,
      icon: 'box',
    },
    {
      label: 'Reservadas',
      value: reserved.toString(),
      change: 12.0,
      icon: 'clock',
    },
    {
      label: 'Densidade',
      value: `${Math.round(((occupied + reserved) / total) * 100)}%`,
      change: 1.8,
      icon: 'layers',
    },
  ];
}

export const STATUS_LABELS: Record<PositionStatus, string> = {
  FREE: 'Livre',
  OCCUPIED: 'Ocupada',
  RESERVED: 'Reservada',
  BLOCKED: 'Bloqueada',
  MAINTENANCE: 'Manutenção',
};

export const STATUS_COLORS: Record<PositionStatus, string> = {
  FREE: 'status-free',
  OCCUPIED: 'status-occupied',
  RESERVED: 'status-reserved',
  BLOCKED: 'status-blocked',
  MAINTENANCE: 'status-maintenance',
};
