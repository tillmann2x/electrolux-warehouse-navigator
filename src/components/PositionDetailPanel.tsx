import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Weight, Clock, Layers, Tag, Package, BarChart3, Calendar } from "lucide-react";
import type { WarehousePosition } from "@/lib/warehouseData";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/warehouseData";

interface PositionDetailPanelProps {
  position: WarehousePosition | null;
  onClose: () => void;
}

export function PositionDetailPanel({ position, onClose }: PositionDetailPanelProps) {
  return (
    <AnimatePresence>
      {position && (
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-card rounded-lg border border-border p-5 shadow-card-hover w-full max-w-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${STATUS_COLORS[position.status]}`} />
              <h3 className="text-base font-bold text-foreground">{position.sapLocationId}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-md">
              <Tag className="h-4 w-4 text-accent shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Status</p>
                <p className="text-sm font-semibold text-foreground">{STATUS_LABELS[position.status]}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Zona</p>
                  <p className="text-xs font-semibold text-foreground">{position.zone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Rua</p>
                  <p className="text-xs font-semibold text-foreground">{position.aisle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                <Layers className="h-3.5 w-3.5 text-accent shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Módulo</p>
                  <p className="text-xs font-semibold text-foreground">{position.rack}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                <Layers className="h-3.5 w-3.5 text-accent shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Nível / Posição</p>
                  <p className="text-xs font-semibold text-foreground">{position.level}{position.position}</p>
                </div>
              </div>
            </div>

            {/* SAP Fields */}
            {position.material && (
              <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-md">
                <Package className="h-4 w-4 text-accent shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Material</p>
                  <p className="text-sm font-semibold text-foreground">{position.material}</p>
                </div>
              </div>
            )}

            {(position.estoqueTotal !== undefined || position.estoqueDisponivel !== undefined) && (
              <div className="grid grid-cols-2 gap-2">
                {position.estoqueTotal !== undefined && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                    <BarChart3 className="h-3.5 w-3.5 text-accent shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Estoque Total</p>
                      <p className="text-xs font-semibold text-foreground">{position.estoqueTotal.toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                )}
                {position.estoqueDisponivel !== undefined && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                    <BarChart3 className="h-3.5 w-3.5 text-accent shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Estoque Disponível</p>
                      <p className="text-xs font-semibold text-foreground">{position.estoqueDisponivel.toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(position.tipoDeposito || position.armazem) && (
              <div className="grid grid-cols-2 gap-2">
                {position.tipoDeposito && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                    <Tag className="h-3.5 w-3.5 text-accent shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Tipo Depósito</p>
                      <p className="text-xs font-semibold text-foreground">{position.tipoDeposito}</p>
                    </div>
                  </div>
                )}
                {position.armazem && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                    <Tag className="h-3.5 w-3.5 text-accent shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Armazém</p>
                      <p className="text-xs font-semibold text-foreground">{position.armazem}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {position.dataEntrada && (
              <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-md">
                <Calendar className="h-4 w-4 text-accent shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Data Entrada Mercadoria</p>
                  <p className="text-sm font-semibold text-foreground">{position.dataEntrada}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-md">
              <Weight className="h-4 w-4 text-accent shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Peso Máximo</p>
                <p className="text-sm font-semibold text-foreground">{position.maxWeight} kg</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-md">
              <Clock className="h-4 w-4 text-accent shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Tipo Posição</p>
                <p className="text-sm font-semibold text-foreground">
                  {position.type === 'GROUND' ? 'Chão (nível A)' : 'Alta (empilhadeira)'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}