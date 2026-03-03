import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from "lucide-react";
import * as XLSX from "xlsx";
import type { WarehousePosition, PositionStatus } from "@/lib/warehouseData";

interface ImportButtonProps {
  onImport: (positions: WarehousePosition[]) => void;
}

// Parse SAP position ID like BRM0142A01 or BRC0405A01
// Format: BR + type(1) + street(2) + module(2) + level(1) + position(2)
function parseSapPositionId(sapId: string) {
  const match = sapId.match(/^BR([A-Z])(\d{2})(\d{2})([A-Z])(\d{2})$/i);
  if (!match) return null;
  return {
    typeChar: match[1],
    street: parseInt(match[2], 10),
    module: parseInt(match[3], 10),
    level: match[4].toUpperCase(),
    position: match[5],
  };
}

function isSapFormat(rows: Record<string, any>[]): boolean {
  if (rows.length === 0) return false;
  const first = rows[0];
  return 'Posição no depósito' in first || 'Posicao no deposito' in first || 'Posição no Depósito' in first;
}

function parseSapRow(row: Record<string, any>, index: number): WarehousePosition | null {
  const sapId = (
    row['Posição no depósito'] || row['Posicao no deposito'] || row['Posição no Depósito'] || ''
  ).toString().trim();
  if (!sapId) return null;

  const parsed = parseSapPositionId(sapId);
  const streetNum = parsed?.street || 0;
  const moduleNum = parsed?.module || 0;
  const level = parsed?.level || 'A';
  const position = parsed?.position || '01';

  const estoqueTotal = Number(row['Estoque total'] || row['Estoque Total'] || 0);
  const estoqueDisponivel = Number(row['Estoque disponível'] || row['Estoque Disponível'] || row['Estoque disponivel'] || 0);
  const material = (row['Material'] || row['material'] || '').toString().trim();
  const tipoDeposito = (row['Tipo de depósito'] || row['Tipo de deposito'] || '').toString().trim();
  const armazem = (row['Armazém'] || row['Armazem'] || '').toString().trim();
  const tipoEstoque = (row['Tipo de estoque'] || row['Tipo de Estoque'] || '').toString().trim();
  const dataEntrada = (row['Data da entrada de mercadorias'] || row['Data da Entrada de Mercadorias'] || '').toString().trim();

  // If there's stock, position is OCCUPIED
  const status: PositionStatus = estoqueTotal > 0 ? 'OCCUPIED' : 'FREE';

  return {
    id: `sap-${index}`,
    sapLocationId: sapId,
    zone: `Z${streetNum <= 3 ? '1' : '2'}`,
    aisle: `Rua ${streetNum.toString().padStart(2, '0')}`,
    rack: `M${moduleNum.toString().padStart(2, '0')}`,
    level,
    position,
    type: level === 'A' ? 'GROUND' : 'HIGH',
    maxWeight: level === 'A' ? 2000 : 1500,
    status,
    lastUpdate: dataEntrada || new Date().toISOString(),
    material: material || undefined,
    estoqueTotal: estoqueTotal || undefined,
    estoqueDisponivel: estoqueDisponivel || undefined,
    tipoEstoque: tipoEstoque || undefined,
    tipoDeposito: tipoDeposito || undefined,
    armazem: armazem || undefined,
    dataEntrada: dataEntrada || undefined,
  };
}

function parseLegacyRow(row: Record<string, any>, index: number): WarehousePosition | null {
  const sapId = (row['SAP_ID'] || row['sap_id'] || row['ENDERECO'] || row['endereco'] || row['Endereço'] || row['ID'] || '').toString().trim();
  if (!sapId) return null;

  const STATUS_MAP: Record<string, PositionStatus> = {
    'FREE': 'FREE', 'LIVRE': 'FREE', 'VAZIO': 'FREE', 'VAZIA': 'FREE',
    'DISPONIVEL': 'FREE', 'DISPONÍVEL': 'FREE',
    'OCCUPIED': 'OCCUPIED', 'OCUPADO': 'OCCUPIED', 'OCUPADA': 'OCCUPIED',
    'RESERVED': 'RESERVED', 'RESERVADO': 'RESERVED', 'RESERVADA': 'RESERVED',
    'BLOCKED': 'BLOCKED', 'BLOQUEADO': 'BLOCKED', 'BLOQUEADA': 'BLOCKED',
    'MAINTENANCE': 'MAINTENANCE', 'MANUTENÇÃO': 'MAINTENANCE', 'MANUTENCAO': 'MAINTENANCE',
  };

  const statusRaw = (row['STATUS'] || row['status'] || row['Status'] || '').toString().trim().toUpperCase();
  const zone = (row['ZONE'] || row['zone'] || row['Zona'] || row['ZONA'] || '').toString().trim();
  const aisle = (row['AISLE'] || row['aisle'] || row['Rua'] || row['RUA'] || '').toString().trim();
  const rack = (row['RACK'] || row['rack'] || row['Modulo'] || row['MODULO'] || row['Módulo'] || '').toString().trim();
  const level = (row['LEVEL'] || row['level'] || row['Nivel'] || row['NIVEL'] || row['Nível'] || '').toString().trim().toUpperCase();
  const position = (row['POSITION'] || row['position'] || row['Posicao'] || row['POSICAO'] || row['Posição'] || '').toString().trim();
  const maxWeight = Number(row['MAX_WEIGHT'] || row['max_weight'] || row['PesoMax'] || row['PESO_MAX'] || (level === 'A' ? 2000 : 1500));

  return {
    id: `import-${index}`,
    sapLocationId: sapId,
    zone: zone || 'Z1',
    aisle: aisle || 'Rua 01',
    rack: rack || 'M01',
    level: level || 'A',
    position: position || '01',
    type: level === 'A' ? 'GROUND' : 'HIGH',
    maxWeight: isNaN(maxWeight) ? 1500 : maxWeight,
    status: STATUS_MAP[statusRaw] || 'FREE',
    lastUpdate: new Date().toISOString(),
  };
}

export function ImportButton({ onImport }: ImportButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count: number; errors: number; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) {
        setResult({ success: false, count: 0, errors: 0, message: 'Planilha vazia ou formato não reconhecido.' });
        setLoading(false);
        return;
      }

      const useSapFormat = isSapFormat(rows);
      const positions: WarehousePosition[] = [];
      let errors = 0;

      rows.forEach((row, i) => {
        const pos = useSapFormat ? parseSapRow(row, i) : parseLegacyRow(row, i);
        if (pos) {
          positions.push(pos);
        } else {
          errors++;
        }
      });

      if (positions.length > 0) {
        onImport(positions);
        setResult({
          success: true,
          count: positions.length,
          errors,
          message: `${positions.length} posições importadas com sucesso!${useSapFormat ? ' (formato SAP detectado)' : ''}`,
        });
      } else {
        setResult({
          success: false,
          count: 0,
          errors: rows.length,
          message: 'Nenhuma posição válida encontrada. Verifique as colunas da planilha.',
        });
      }
    } catch (err) {
      setResult({
        success: false,
        count: 0,
        errors: 0,
        message: 'Erro ao ler o arquivo. Verifique se é um .xlsx ou .xls válido.',
      });
    }

    setLoading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 border border-accent/30 transition-colors text-foreground"
        title="Importar planilha Excel"
      >
        <Upload className="h-4 w-4" />
        <span className="text-xs font-medium hidden sm:inline">Importar</span>
      </motion.button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
            onClick={() => { setShowModal(false); setResult(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-accent" />
                  <h3 className="text-base font-bold text-foreground">Importar Planilha SAP</h3>
                </div>
                <button onClick={() => { setShowModal(false); setResult(null); }} className="p-1 rounded hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Colunas SAP reconhecidas:</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground font-mono">
                  <span>Tipo de depósito</span>
                  <span>Armazém</span>
                  <span>Material</span>
                  <span>Posição no depósito</span>
                  <span>Estoque total</span>
                  <span>Estoque disponível</span>
                  <span>Tipo de estoque</span>
                  <span>Data da entrada</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Posições com estoque {'>'} 0 = <span className="font-mono text-status-occupied">Ocupada</span> · Sem estoque = <span className="font-mono text-status-free">Livre</span>
                </p>
              </div>

              <div className="flex flex-col items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFile}
                  className="hidden"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fileRef.current?.click()}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg gradient-primary text-primary-foreground font-medium text-sm disabled:opacity-50"
                >
                  {loading ? (
                    <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {loading ? 'Processando...' : 'Selecionar arquivo .xlsx / .csv'}
                </motion.button>
              </div>

              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex items-start gap-2 p-3 rounded-lg border ${
                      result.success
                        ? 'bg-status-free/10 border-status-free/30'
                        : 'bg-destructive/10 border-destructive/30'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-status-free shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="text-sm">
                      <p className="font-medium text-foreground">{result.message}</p>
                      {result.errors > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">{result.errors} linha(s) ignorada(s)</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
