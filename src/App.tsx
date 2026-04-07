import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid } from '@react-three/drei';
import { TableModel } from './components/TableModel';
import { ConfigPanel } from './components/ConfigPanel';
import { RefreshCw } from 'lucide-react';
import { SnapshotHelper } from './components/SnapshotHelper';

function App() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#f5f5f5]">
      {/* 3D Viewer Fullscreen */}
      <div className="absolute inset-0">
        <Canvas key="main-canvas" gl={{ preserveDrawingBuffer: true }}>
          <color attach="background" args={['#f5f5f5']} />
          <PerspectiveCamera makeDefault position={[2, 1.5, 2]} near={0.01} />
          <OrbitControls makeDefault enableDamping target={[0, 0.5, 0]} minDistance={1.2} maxDistance={8} />
          <Environment preset="studio" />
          <Grid 
            name="floor-grid"
            position={[0, -0.51, 0]} 
            args={[10, 10]} 
            cellSize={0.2} 
            cellThickness={0.7} 
            cellColor="#808080" 
            sectionSize={1}
            sectionThickness={1}
            sectionColor="#808080"
            fadeDistance={10}
            infiniteGrid
          />
          <TableModel />
          <SnapshotHelper />
        </Canvas>
      </div>

      {/* Floating Header */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <h1 className="text-2xl font-bold text-gray-900 drop-shadow-sm">MeshRare Table Configurator</h1>
      </div>
      
      {/* View Reset Control */}
      <div className="absolute bottom-6 left-6 z-10">
        <button 
          onClick={() => window.dispatchEvent(new Event('reset-view'))}
          className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-xl shadow-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white hover:text-[color:var(--primary-color)] transition-all group pointer-events-auto"
        >
          <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
          重置视角
        </button>
      </div>

      {/* Floating Configuration Panel */}
      <div className="absolute top-4 right-4 bottom-4 w-[420px] bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden z-20 pointer-events-auto">
        <ConfigPanel />
      </div>
    </div>
  );
}

export default App;
