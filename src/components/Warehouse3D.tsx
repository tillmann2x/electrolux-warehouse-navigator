import { useRef, useMemo, useState, Suspense } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Text, Environment } from "@react-three/drei";
import type { WarehousePosition } from "@/lib/warehouseData";
import * as THREE from "three";

const STATUS_COLOR_MAP: Record<string, string> = {
  FREE: "#22c55e",
  OCCUPIED: "#ef4444",
  RESERVED: "#eab308",
  BLOCKED: "#333333",
  MAINTENANCE: "#8b5cf6",
};

interface PalletBoxProps {
  position: [number, number, number];
  color: string;
  data: WarehousePosition;
  onSelect: (pos: WarehousePosition) => void;
  isSelected: boolean;
}

function PalletBox({ position, color, data, onSelect, isSelected }: PalletBoxProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      const target = hovered || isSelected ? 1.08 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(data);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.8, 0.5, 0.8]} />
      <meshStandardMaterial
        color={color}
        emissive={hovered || isSelected ? color : "#000000"}
        emissiveIntensity={hovered ? 0.4 : isSelected ? 0.3 : 0}
        roughness={0.4}
        metalness={0.1}
      />
    </mesh>
  );
}

function RackFrame({ x, z, levels }: { x: number; z: number; levels: number }) {
  const height = levels * 0.7;
  return (
    <group position={[x, height / 2, z]}>
      {/* Vertical posts */}
      {[[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]].map(([dx, dz], i) => (
        <mesh key={i} position={[dx, 0, dz]}>
          <boxGeometry args={[0.05, height, 0.05]} />
          <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {/* Shelves */}
      {Array.from({ length: levels + 1 }).map((_, i) => (
        <mesh key={`shelf-${i}`} position={[0, -height / 2 + i * 0.7, 0]}>
          <boxGeometry args={[1, 0.03, 1]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function FloorGrid() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[50, 30]} />
      <meshStandardMaterial color="#1e293b" roughness={0.9} />
    </mesh>
  );
}

interface WarehouseSceneProps {
  positions: WarehousePosition[];
  onSelect: (pos: WarehousePosition) => void;
  selectedId: string | null;
  filterStreet?: string;
}

function WarehouseScene({ positions, onSelect, selectedId, filterStreet }: WarehouseSceneProps) {
  const grouped = useMemo(() => {
    const filtered = filterStreet ? positions.filter(p => p.aisle === filterStreet) : positions;
    const streets = new Map<string, Map<string, Map<string, WarehousePosition[]>>>();
    filtered.forEach(p => {
      if (!streets.has(p.aisle)) streets.set(p.aisle, new Map());
      const st = streets.get(p.aisle)!;
      if (!st.has(p.rack)) st.set(p.rack, new Map());
      const rk = st.get(p.rack)!;
      if (!rk.has(p.level)) rk.set(p.level, []);
      rk.get(p.level)!.push(p);
    });
    return streets;
  }, [positions, filterStreet]);

  const levelIndex: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 15, 10]} intensity={1} castShadow shadow-mapSize={1024} />
      <pointLight position={[-5, 8, -5]} intensity={0.3} color="#60a5fa" />
      
      <FloorGrid />

      {Array.from(grouped.entries()).map(([street, modules], streetIdx) => {
        const streetNum = parseInt(street.replace(/\D/g, '')) || streetIdx;
        const zBase = streetIdx * 4;

        return (
          <group key={street}>
            {/* Street label */}
            <Text
              position={[-2, 0.1, zBase + 1]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.5}
              color="#60a5fa"
              anchorX="right"
              font={undefined}
            >
              {street}
            </Text>

            {Array.from(modules.entries()).map(([module, levels], modIdx) => {
              const xBase = modIdx * 2;
              const maxLevel = Math.max(...Array.from(levels.keys()).map(l => (levelIndex[l] || 0) + 1));

              return (
                <group key={module}>
                  <RackFrame x={xBase} z={zBase} levels={maxLevel} />
                  
                  {Array.from(levels.entries()).map(([level, levelPositions]) => {
                    const yBase = (levelIndex[level] || 0) * 0.7 + 0.3;

                    return levelPositions.map((pos, posIdx) => (
                      <PalletBox
                        key={pos.id}
                        position={[xBase, yBase, zBase]}
                        color={STATUS_COLOR_MAP[pos.status]}
                        data={pos}
                        onSelect={onSelect}
                        isSelected={selectedId === pos.id}
                      />
                    ));
                  })}
                </group>
              );
            })}
          </group>
        );
      })}

      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={3}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  );
}

interface Warehouse3DProps {
  positions: WarehousePosition[];
  onSelect: (pos: WarehousePosition) => void;
  selectedId: string | null;
  filterStreet?: string;
}

export function Warehouse3D({ positions, onSelect, selectedId, filterStreet }: Warehouse3DProps) {
  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border border-border bg-[#0f172a]">
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center bg-[#0f172a]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Carregando visualização 3D...</p>
          </div>
        </div>
      }>
        <Canvas
          shadows
          camera={{ position: [8, 10, 15], fov: 50 }}
          gl={{ antialias: true }}
        >
          <WarehouseScene
            positions={positions}
            onSelect={onSelect}
            selectedId={selectedId}
            filterStreet={filterStreet}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
