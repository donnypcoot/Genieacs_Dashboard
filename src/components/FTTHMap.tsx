import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Zap, 
  Radio, 
  Server, 
  Box, 
  MapPin, 
  Move, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  Link2, 
  Info, 
  Eye, 
  Activity, 
  X,
  ShieldAlert,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { FTTHNode, FTTHCable, Customer, UserRole, NodeType, CableType } from '../types/ftth';

interface FTTHMapProps {
  nodes: FTTHNode[];
  cables: FTTHCable[];
  customers: Customer[];
  userRole: UserRole;
  onAddNode: (node: FTTHNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddCable: (cable: FTTHCable) => void;
  onDeleteCable: (cableId: string) => void;
  onUpdateNodePosition: (nodeId: string, x: number, y: number) => void;
  onSelectCustomerFromMap: (customerId: string) => void;
  onToggleCableStatus: (cableId: string) => void;
}

export const FTTHMap: React.FC<FTTHMapProps> = ({
  nodes,
  cables,
  customers,
  userRole,
  onAddNode,
  onDeleteNode,
  onAddCable,
  onDeleteCable,
  onUpdateNodePosition,
  onSelectCustomerFromMap,
  onToggleCableStatus
}) => {
  // Map canvas controls
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [mapTheme, setMapTheme] = useState<'noc' | 'blueprint' | 'satellite'>('noc');

  // Selected elements
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node-odp-mlt-03');
  const [selectedCableId, setSelectedCableId] = useState<string | null>(null);

  // Dragging node
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Creation modes
  const [isAddingNodeMode, setIsAddingNodeMode] = useState(false);
  const [isConnectingCableMode, setIsConnectingCableMode] = useState(false);
  const [cableSourceNodeId, setCableSourceNodeId] = useState<string | null>(null);

  // New Node Form Modal
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [newNodeDraft, setNewNodeDraft] = useState<{
    name: string;
    type: NodeType;
    code: string;
    area: string;
    capacityPorts: number;
    splitterRatio: string;
    parentId?: string;
  }>({
    name: '',
    type: 'ODP',
    code: '',
    area: 'Cluster Melati',
    capacityPorts: 8,
    splitterRatio: '1:8 Secondary',
    parentId: 'node-odc-01'
  });

  // Layer Visibility
  const [showFeeders, setShowFeeders] = useState(true);
  const [showDistributions, setShowDistributions] = useState(true);
  const [showCustomers, setShowCustomers] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // OTDR Ping Simulation
  const [otdrTesting, setOtdrTesting] = useState(false);
  const [otdrResult, setOtdrResult] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedCable = cables.find(c => c.id === selectedCableId);
  const connectedCustomers = selectedNode ? customers.filter(c => c.odpId === selectedNode.id) : [];

  // Zoom handlers
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (draggingNodeId || isAddingNodeMode) return;
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    } else if (draggingNodeId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - pan.x) / scale;
      const rawY = (e.clientY - rect.top - pan.y) / scale;
      onUpdateNodePosition(
        draggingNodeId,
        Math.max(40, Math.min(rawX, 960)),
        Math.max(40, Math.min(rawY, 760))
      );
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Node Drag start
  const handleNodeMouseDown = (e: React.MouseEvent, node: FTTHNode) => {
    e.stopPropagation();
    
    if (isConnectingCableMode) {
      handleCableConnectClick(node.id);
      return;
    }

    setSelectedNodeId(node.id);
    setSelectedCableId(null);

    // Only allow drag if admin or normal viewing
    setDraggingNodeId(node.id);
  };

  // Cable Connection flow
  const handleCableConnectClick = (nodeId: string) => {
    if (!cableSourceNodeId) {
      setCableSourceNodeId(nodeId);
    } else {
      if (cableSourceNodeId === nodeId) {
        setCableSourceNodeId(null);
        return;
      }
      
      const source = nodes.find(n => n.id === cableSourceNodeId);
      const target = nodes.find(n => n.id === nodeId);
      if (!source || !target) return;

      // Determine cable type
      let type: CableType = 'distribution';
      let cores = 12;
      let loss = 0.35;
      if (source.type === 'OLT' || target.type === 'OLT') {
        type = 'feeder';
        cores = 48;
        loss = 0.65;
      }

      // Calculate distance in pixels to approx meters
      const dx = source.x - target.x;
      const dy = source.y - target.y;
      const distPx = Math.sqrt(dx * dx + dy * dy);
      const meters = Math.round(distPx * 2.5);

      const newCable: FTTHCable = {
        id: `cable-${Date.now()}`,
        name: `${type === 'feeder' ? 'Feeder' : 'Distribusi'} (${source.code} ➔ ${target.code})`,
        fromNodeId: source.id,
        toNodeId: target.id,
        cableType: type,
        coreCount: cores,
        usedCores: 4,
        lengthMeters: meters,
        attenuationDb: Number((loss + (meters / 1000) * 0.35).toFixed(2)),
        status: 'active',
        installationDate: new Date().toISOString().split('T')[0]
      };

      onAddCable(newCable);
      setIsConnectingCableMode(false);
      setCableSourceNodeId(null);
      setSelectedCableId(newCable.id);
    }
  };

  // Create node submit
  const handleCreateNodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeDraft.name || !newNodeDraft.code) return;

    // Random placement near center
    const x = Math.floor(300 + Math.random() * 350);
    const y = Math.floor(250 + Math.random() * 300);

    const createdNode: FTTHNode = {
      id: `node-${Date.now()}`,
      name: newNodeDraft.name,
      type: newNodeDraft.type,
      code: newNodeDraft.code.toUpperCase(),
      x,
      y,
      latitude: -6.92 + (Math.random() * 0.02 - 0.01),
      longitude: 107.62 + (Math.random() * 0.02 - 0.01),
      area: newNodeDraft.area,
      status: 'normal',
      capacityPorts: Number(newNodeDraft.capacityPorts),
      usedPorts: 0,
      opticalPowerRx: newNodeDraft.type === 'OLT' ? -12.0 : newNodeDraft.type === 'ODC' ? -15.5 : -19.2,
      opticalPowerTx: 1.5,
      parentId: newNodeDraft.parentId,
      splitterRatio: newNodeDraft.splitterRatio,
      notes: 'Node baru diintegrasikan ke map',
      lastUpdated: 'Baru saja'
    };

    onAddNode(createdNode);
    setShowAddNodeModal(false);
    setSelectedNodeId(createdNode.id);
    setNewNodeDraft({
      name: '',
      type: 'ODP',
      code: '',
      area: 'Cluster Melati',
      capacityPorts: 8,
      splitterRatio: '1:8 Secondary',
      parentId: 'node-odc-01'
    });
  };

  // Run OTDR simulation
  const handleRunOtdr = () => {
    if (!selectedNode) return;
    setOtdrTesting(true);
    setOtdrResult(null);

    setTimeout(() => {
      setOtdrTesting(false);
      if (selectedNode.status === 'critical') {
        setOtdrResult(`[ALARM OTDR] Terdeteksi patahan / Event Reflection Loss pada jarak 320m dari ODC. Attenuation: > 28.5 dB (LOS Outage). Titik koordinat perbaikan tiang No. TM-14.`);
      } else if (selectedNode.status === 'warning') {
        setOtdrResult(`[WARNING OTDR] Sinyal terdegradasi. Attenuation: -24.8 dBm. Terdeteksi microbending loss pada splice tray No. 2.`);
      } else {
        setOtdrResult(`[NORMAL OTDR] Redaman sempurna: -19.2 dBm. Jarak span kabel 420m. Tidak ada splice fault atau macro-bend terdeteksi.`);
      }
    }, 1200);
  };

  // Helper color functions
  const getNodeColor = (node: FTTHNode) => {
    if (node.status === 'critical') return '#f43f5e'; // rose-500
    if (node.status === 'warning') return '#f59e0b'; // amber-500
    if (node.type === 'OLT') return '#38bdf8'; // sky-400
    if (node.type === 'ODC') return '#a855f7'; // purple-500
    return '#10b981'; // emerald-500 for ODP
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden">
      {/* Top Map Toolbar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none z-10">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="font-bold text-slate-300">GIS FTTH Canvas</span>
            <span className="text-cyan-400 font-mono text-[11px]">{nodes.length} Node • {cables.length} Kabel</span>
          </div>

          {/* Builder action tools */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => {
                if (userRole !== 'admin') {
                  alert('Akses Terbatas: Hanya Admin NOC yang dapat menambahkan node baru ke topologi.');
                  return;
                }
                setShowAddNodeModal(true);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                userRole === 'admin'
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30'
                  : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
              }`}
              title={userRole !== 'admin' ? 'Akses terbatas untuk Staf Lapangan' : 'Tambah OLT, ODC, atau ODP baru'}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Node</span>
              {userRole !== 'admin' && <ShieldAlert className="w-3 h-3 text-amber-400 ml-1" />}
            </button>

            <button
              onClick={() => {
                if (userRole !== 'admin') {
                  alert('Akses Terbatas: Hanya Admin NOC yang dapat menarik/mengkonfigurasi kabel baru.');
                  return;
                }
                setIsConnectingCableMode(!isConnectingCableMode);
                setCableSourceNodeId(null);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                isConnectingCableMode
                  ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                  : userRole === 'admin'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{isConnectingCableMode ? 'Pilih 2 Node...' : 'Tarik Kabel Serat'}</span>
            </button>
          </div>
        </div>

        {/* View and Layer Toggles */}
        <div className="flex items-center space-x-2">
          {/* Layer toggles */}
          <div className="flex items-center bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 space-x-2">
            <label className="flex items-center space-x-1 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showFeeders}
                onChange={e => setShowFeeders(e.target.checked)}
                className="rounded border-slate-700 text-blue-500 focus:ring-0 w-3 h-3"
              />
              <span className="text-[11px] text-blue-400">Feeder</span>
            </label>
            <span className="text-slate-700">|</span>
            <label className="flex items-center space-x-1 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showDistributions}
                onChange={e => setShowDistributions(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-0 w-3 h-3"
              />
              <span className="text-[11px] text-emerald-400">Distribusi</span>
            </label>
            <span className="text-slate-700">|</span>
            <label className="flex items-center space-x-1 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showCustomers}
                onChange={e => setShowCustomers(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-0 w-3 h-3"
              />
              <span className="text-[11px] text-amber-400">Drop Pelanggan</span>
            </label>
          </div>

          {/* Theme selector */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setMapTheme('noc')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                mapTheme === 'noc' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              NOC Dark
            </button>
            <button
              onClick={() => setMapTheme('blueprint')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                mapTheme === 'blueprint' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Blueprint GIS
            </button>
            <button
              onClick={() => setMapTheme('satellite')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                mapTheme === 'satellite' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Terrain Map
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={handleZoomIn}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 cursor-pointer"
              title="Perbesar"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 cursor-pointer"
              title="Perkecil"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 cursor-pointer"
              title="Reset Tampilan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Map View Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas / SVG Map */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`flex-1 relative overflow-hidden select-none cursor-${isPanning ? 'grabbing' : isConnectingCableMode ? 'crosshair' : 'grab'} ${
            mapTheme === 'noc'
              ? 'bg-slate-950'
              : mapTheme === 'blueprint'
              ? 'bg-blue-950'
              : 'bg-[#0f172a]'
          }`}
        >
          {/* Grid background styling */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: mapTheme === 'noc' 
                ? 'radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#64748b 1px, transparent 1px)' 
                : 'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: '0 0'
            }}
          />

          {/* Connect cable helper banner */}
          {isConnectingCableMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-slate-950 px-4 py-2 rounded-full font-bold text-xs shadow-xl flex items-center space-x-2 animate-bounce">
              <Link2 className="w-4 h-4" />
              <span>
                {cableSourceNodeId 
                  ? `Node Sumber Terpilih: [${nodes.find(n => n.id === cableSourceNodeId)?.code}]. Klik node tujuan...`
                  : 'Klik Node Awal (OLT, ODC, atau ODP)...'}
              </span>
              <button 
                onClick={() => { setIsConnectingCableMode(false); setCableSourceNodeId(null); }}
                className="ml-2 bg-slate-950/20 hover:bg-slate-950/40 rounded-full p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* SVG Canvas Layer */}
          <svg
            className="w-full h-full absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: '0 0',
            }}
          >
            <defs>
              {/* Glow filter for active laser signal */}
              <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="alarmGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Render Fiber Cables */}
            {cables.map(cable => {
              const sourceNode = nodes.find(n => n.id === cable.fromNodeId);
              const targetNode = nodes.find(n => n.id === cable.toNodeId);
              if (!sourceNode || !targetNode) return null;

              if (cable.cableType === 'feeder' && !showFeeders) return null;
              if (cable.cableType === 'distribution' && !showDistributions) return null;

              const isSelected = selectedCableId === cable.id;
              const isCut = cable.status === 'cut';
              const isDegraded = cable.status === 'degraded';

              // Midpoint for label
              const midX = (sourceNode.x + targetNode.x) / 2;
              const midY = (sourceNode.y + targetNode.y) / 2;

              let strokeColor = '#38bdf8'; // sky blue for feeder
              let strokeWidth = 4;
              let dashArray = 'none';

              if (cable.cableType === 'distribution') {
                strokeColor = '#10b981'; // emerald
                strokeWidth = 3;
              }

              if (isDegraded) {
                strokeColor = '#f59e0b'; // amber
              }

              if (isCut) {
                strokeColor = '#f43f5e'; // rose-500
                dashArray = '8 6';
              }

              return (
                <g 
                  key={cable.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCableId(cable.id);
                    setSelectedNodeId(null);
                  }}
                  className="cursor-pointer group"
                >
                  {/* Invisible thicker stroke for easy clicking */}
                  <line
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke="transparent"
                    strokeWidth={16}
                  />

                  {/* Main Fiber line */}
                  <line
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? strokeWidth + 2 : strokeWidth}
                    strokeDasharray={dashArray}
                    filter={isSelected ? 'url(#laserGlow)' : undefined}
                    className={`transition-all ${isCut ? 'animate-pulse' : ''}`}
                  />

                  {/* Fiber Cut marker with blinking badge */}
                  {isCut && (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <circle r={14} fill="#f43f5e" className="animate-ping opacity-75" />
                      <circle r={12} fill="#9f1239" stroke="#f43f5e" strokeWidth={2} />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        CUT
                      </text>
                    </g>
                  )}

                  {/* Cable Info Label Pill */}
                  <g transform={`translate(${midX}, ${midY - 10})`}>
                    <rect
                      x="-42"
                      y="-10"
                      width="84"
                      height="20"
                      rx="4"
                      fill="#0f172a"
                      stroke={isSelected ? '#38bdf8' : isCut ? '#f43f5e' : '#334155'}
                      strokeWidth={1}
                      className="opacity-90 group-hover:opacity-100"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill={isCut ? '#fda4af' : '#cbd5e1'}
                      fontSize="9"
                      fontWeight="500"
                      fontFamily="monospace"
                    >
                      {cable.coreCount}C • {cable.lengthMeters}m
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Drop cables to customers (if toggled) */}
            {showCustomers && customers.map(customer => {
              const odp = nodes.find(n => n.id === customer.odpId);
              if (!odp) return null;

              const isLos = customer.status === 'los_down';
              const isSelectedOdp = selectedNodeId === odp.id;

              return (
                <g key={customer.id}>
                  {/* Drop cable line */}
                  <line
                    x1={odp.x}
                    y1={odp.y}
                    x2={customer.coordinates.x}
                    y2={customer.coordinates.y}
                    stroke={isLos ? '#f43f5e' : isSelectedOdp ? '#38bdf8' : '#64748b'}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    opacity={isSelectedOdp ? 1 : 0.4}
                  />

                  {/* Customer ONT marker */}
                  <g
                    transform={`translate(${customer.coordinates.x}, ${customer.coordinates.y})`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCustomerFromMap(customer.id);
                    }}
                  >
                    <circle
                      r={isSelectedOdp ? 7 : 5}
                      fill={isLos ? '#f43f5e' : '#0284c7'}
                      stroke="#0f172a"
                      strokeWidth={1.5}
                      className={isLos ? 'animate-ping' : ''}
                    />
                    <circle
                      r={isSelectedOdp ? 7 : 5}
                      fill={isLos ? '#f43f5e' : '#0284c7'}
                      stroke="#ffffff"
                      strokeWidth={1}
                    />
                  </g>
                </g>
              );
            })}

            {/* Render Nodes (OLT, ODC, ODP) */}
            {nodes.map(node => {
              const isSelected = selectedNodeId === node.id;
              const isConnectingSource = cableSourceNodeId === node.id;
              const isCritical = node.status === 'critical';
              const isWarning = node.status === 'warning';
              const nodeColor = getNodeColor(node);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  className="cursor-pointer group"
                >
                  {/* Selection / Alert Halo */}
                  {(isSelected || isConnectingSource || isCritical) && (
                    <circle
                      r={node.type === 'OLT' ? 38 : node.type === 'ODC' ? 30 : 26}
                      fill={isCritical ? '#f43f5e' : isConnectingSource ? '#f59e0b' : '#38bdf8'}
                      opacity={0.25}
                      filter="url(#alarmGlow)"
                      className={isCritical ? 'animate-ping' : ''}
                    />
                  )}

                  {/* Node Icon Graphic based on type */}
                  {node.type === 'OLT' ? (
                    // OLT Node Graphic
                    <g>
                      <rect
                        x="-24"
                        y="-24"
                        width="48"
                        height="48"
                        rx="8"
                        fill="#0369a1"
                        stroke={isSelected ? '#38bdf8' : '#0284c7'}
                        strokeWidth={isSelected ? 3 : 2}
                      />
                      <Server className="w-6 h-6 text-white -translate-x-3 -translate-y-3 pointer-events-none" />
                    </g>
                  ) : node.type === 'ODC' ? (
                    // ODC Cabinet Graphic (Diamond)
                    <g>
                      <rect
                        x="-18"
                        y="-18"
                        width="36"
                        height="36"
                        rx="6"
                        transform="rotate(45)"
                        fill="#7e22ce"
                        stroke={isSelected ? '#c084fc' : '#a855f7'}
                        strokeWidth={isSelected ? 3 : 2}
                      />
                      <Box className="w-5 h-5 text-white -translate-x-2.5 -translate-y-2.5 pointer-events-none" />
                    </g>
                  ) : (
                    // ODP Terminal Graphic (Pole Mounted Circle)
                    <g>
                      <circle
                        r={18}
                        fill={isCritical ? '#9f1239' : isWarning ? '#78350f' : '#064e3b'}
                        stroke={nodeColor}
                        strokeWidth={isSelected ? 3 : 2}
                      />
                      <Radio className="w-4 h-4 text-white -translate-x-2 -translate-y-2 pointer-events-none" />
                    </g>
                  )}

                  {/* Node Label Badge */}
                  <g transform="translate(0, 32)">
                    <rect
                      x="-55"
                      y="-10"
                      width="110"
                      height="20"
                      rx="4"
                      fill="#020617"
                      stroke={nodeColor}
                      strokeWidth={1}
                      className="opacity-95"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {node.code}
                    </text>
                  </g>

                  {/* Port Occupancy Badge */}
                  <g transform="translate(0, 48)">
                    <text
                      x="0"
                      y="0"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9"
                      fontWeight="500"
                    >
                      {node.usedPorts}/{node.capacityPorts} Port • {node.opticalPowerRx} dBm
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Bottom Left Legend */}
          <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-xs text-slate-300 shadow-xl pointer-events-auto select-none max-w-xs">
            <div className="font-bold text-slate-200 mb-2 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Legenda Topologi FTTH</span>
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[11px]">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-sky-500" />
                <span>OLT (Central POP)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rotate-45 bg-purple-500 rounded-sm" />
                <span>ODC / FDT (Kabinet)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>ODP / FAT (Tiang)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                <span>Alarm Putus / LOS</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-1 bg-sky-400" />
                <span>Kabel Feeder (48C)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-1 bg-emerald-400" />
                <span>Kabel Distribusi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Inspection & Telemetry Sidebar */}
        <div className="w-80 md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col justify-between overflow-y-auto select-none">
          {selectedNode ? (
            <div className="p-4 space-y-4">
              {/* Node Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                      selectedNode.type === 'OLT' 
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' 
                        : selectedNode.type === 'ODC'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {selectedNode.type}
                    </span>
                    <span className="font-mono text-sm font-bold text-white">
                      {selectedNode.code}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-100 mt-1">
                    {selectedNode.name}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-cyan-400" />
                    <span>{selectedNode.area}</span>
                  </p>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize flex items-center space-x-1 ${
                  selectedNode.status === 'normal'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : selectedNode.status === 'warning'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    selectedNode.status === 'normal' ? 'bg-emerald-400' : selectedNode.status === 'warning' ? 'bg-amber-400' : 'bg-rose-500'
                  }`} />
                  <span>{selectedNode.status === 'critical' ? 'LOS / Cut' : selectedNode.status}</span>
                </span>
              </div>

              {/* Optical Power Telemetry Gauges */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Sinyal Optik SFP / Splitter</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">1310/1490nm</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Rx Optical Power</span>
                    <span className={`text-lg font-black font-mono ${
                      selectedNode.opticalPowerRx < -28 
                        ? 'text-rose-400' 
                        : selectedNode.opticalPowerRx < -24 
                        ? 'text-amber-400' 
                        : 'text-emerald-400'
                    }`}>
                      {selectedNode.opticalPowerRx} dBm
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {selectedNode.opticalPowerRx < -28 ? 'Loss of Signal' : 'Batas Normal: -15 s/d -24'}
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Tx Optical Power</span>
                    <span className="text-lg font-black font-mono text-cyan-400">
                      +{selectedNode.opticalPowerTx} dBm
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      Output Laser Modul
                    </span>
                  </div>
                </div>

                {/* OTDR Diagnostic Tool */}
                <div className="pt-1">
                  <button
                    onClick={handleRunOtdr}
                    disabled={otdrTesting}
                    className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-300 border border-cyan-500/30 font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Radio className={`w-3.5 h-3.5 ${otdrTesting ? 'animate-spin' : ''}`} />
                    <span>{otdrTesting ? 'Menjalankan Tes Reflektometer OTDR...' : 'Jalankan Diagnostik OTDR'}</span>
                  </button>

                  {otdrResult && (
                    <div className="mt-2 p-2 rounded bg-slate-900 border border-slate-700 text-[11px] text-slate-300 font-mono leading-relaxed">
                      {otdrResult}
                    </div>
                  )}
                </div>
              </div>

              {/* Port Occupancy Matrix */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    Kapasitas Port Splitter ({selectedNode.splitterRatio || '1:8'})
                  </span>
                  <span className="font-mono text-cyan-400">
                    {selectedNode.usedPorts} / {selectedNode.capacityPorts} Terpakai
                  </span>
                </div>

                {/* Visual port grid */}
                <div className="grid grid-cols-8 gap-1.5 pt-1">
                  {Array.from({ length: selectedNode.capacityPorts }).map((_, index) => {
                    const portNumber = index + 1;
                    const isOccupied = portNumber <= selectedNode.usedPorts;
                    const customerOnPort = connectedCustomers.find(c => c.odpPort === portNumber);

                    return (
                      <div
                        key={portNumber}
                        className={`aspect-square rounded flex flex-col items-center justify-center border text-[9px] font-mono cursor-pointer transition-transform hover:scale-110 ${
                          isOccupied
                            ? customerOnPort?.status === 'los_down'
                              ? 'bg-rose-950 text-rose-300 border-rose-500/60'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
                            : 'bg-slate-900 text-slate-600 border-slate-800'
                        }`}
                        title={
                          isOccupied
                            ? `Port ${portNumber}: Terisi oleh ${customerOnPort?.name || 'Pelanggan Aktif'}`
                            : `Port ${portNumber}: Kosong (Siap PSB)`
                        }
                      >
                        {portNumber}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded bg-emerald-500" />
                    <span>Aktif</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded bg-rose-500" />
                    <span>LOS Outage</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded bg-slate-800" />
                    <span>Kosong</span>
                  </span>
                </div>
              </div>

              {/* Connected Customers List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    Pelanggan Terhubung ({connectedCustomers.length})
                  </span>
                </div>

                {connectedCustomers.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                    Belum ada pelanggan terdaftar pada ODP ini.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {connectedCustomers.map(cust => (
                      <div
                        key={cust.id}
                        onClick={() => onSelectCustomerFromMap(cust.id)}
                        className="bg-slate-950 hover:bg-slate-800/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between cursor-pointer transition-colors group"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                            {cust.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Port #{cust.odpPort} • {cust.packagePlan}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            cust.status === 'los_down'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          }`}>
                            {cust.rxOpticalPower} dBm
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {cust.status === 'los_down' ? 'LOS Down' : 'Normal'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Node metadata info */}
              <div className="text-[11px] text-slate-400 space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                <div className="flex justify-between">
                  <span>Splitter:</span>
                  <span className="text-slate-300 font-mono">{selectedNode.splitterRatio || 'Direct Core'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Koordinat GPS:</span>
                  <span className="text-slate-300 font-mono">{selectedNode.latitude.toFixed(4)}, {selectedNode.longitude.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Catatan Lapangan:</span>
                  <span className="text-slate-300 truncate max-w-[180px]">{selectedNode.notes}</span>
                </div>
              </div>
            </div>
          ) : selectedCable ? (
            /* Selected Cable Inspector */
            <div className="p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    selectedCable.cableType === 'feeder'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    Kabel {selectedCable.cableType}
                  </span>
                  <h3 className="text-base font-semibold text-slate-100 mt-1">
                    {selectedCable.name}
                  </h3>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                  selectedCable.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : selectedCable.status === 'degraded'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                }`}>
                  {selectedCable.status === 'cut' ? 'Putus (Cut)' : selectedCable.status}
                </span>
              </div>

              {/* Cable metrics */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">Total Core</span>
                    <span className="text-base font-bold text-white font-mono">{selectedCable.coreCount} Core</span>
                    <span className="text-[10px] text-slate-400">{selectedCable.usedCores} Core Aktif</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">Panjang Rentang</span>
                    <span className="text-base font-bold text-cyan-400 font-mono">{selectedCable.lengthMeters} m</span>
                    <span className="text-[10px] text-slate-400">Kabel Udara Aerial</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">Total Redaman</span>
                    <span className={`text-base font-bold font-mono ${
                      selectedCable.attenuationDb > 10 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {selectedCable.attenuationDb} dB
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {selectedCable.status === 'cut' ? 'Loss Total' : '0.35 dB/km normal'}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">Tanggal Pasang</span>
                    <span className="text-xs font-bold text-slate-300 font-mono">{selectedCable.installationDate}</span>
                  </div>
                </div>

                {/* Cable Action Buttons */}
                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={() => onToggleCableStatus(selectedCable.id)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                      selectedCable.status === 'cut'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{selectedCable.status === 'cut' ? 'Pulihkan / Splicing Ulang Kabel' : 'Simulasikan Putus Kabel (Cut)'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 space-y-3 my-auto">
              <MapPin className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="font-semibold text-slate-300">Pilih Elemen Jaringan</div>
              <p className="text-xs leading-relaxed">
                Klik salah satu OLT, ODC, atau ODP pada peta untuk melihat telemetri daya optik, alokasi port splitter, dan daftar pelanggan terhubung.
              </p>
            </div>
          )}

          {/* Bottom admin node management actions */}
          {selectedNode && (
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              {userRole === 'admin' ? (
                <button
                  onClick={() => {
                    if (confirm(`Yakin ingin menghapus node [${selectedNode.code}] ${selectedNode.name}?`)) {
                      onDeleteNode(selectedNode.id);
                      setSelectedNodeId(null);
                    }
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1.5 p-1.5 rounded hover:bg-rose-950/40 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Node Dari Topologi</span>
                </button>
              ) : (
                <div className="text-[11px] text-amber-400/80 flex items-center space-x-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Staf Lapangan: Mode Baca Saja</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Tambah Node Baru */}
      {showAddNodeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Box className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-lg text-white">Tambah Node FTTH Baru</h3>
              </div>
              <button
                onClick={() => setShowAddNodeModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNodeSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tipe Node FTTH</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ODP', 'ODC', 'OLT'] as NodeType[]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setNewNodeDraft(prev => ({
                          ...prev,
                          type,
                          capacityPorts: type === 'OLT' ? 16 : type === 'ODC' ? 48 : 8,
                          splitterRatio: type === 'OLT' ? '1:64' : type === 'ODC' ? '1:4 Primary' : '1:8 Secondary'
                        }));
                      }}
                      className={`py-2 px-3 rounded-lg font-bold border text-center cursor-pointer transition-all ${
                        newNodeDraft.type === type
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Kode Unik Node</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ODP-MLT-04"
                  value={newNodeDraft.code}
                  onChange={e => setNewNodeDraft(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Lokasi / Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ODP Melati Blok D Tiang 18"
                  value={newNodeDraft.name}
                  onChange={e => setNewNodeDraft(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Area Wilayah</label>
                  <select
                    value={newNodeDraft.area}
                    onChange={e => setNewNodeDraft(prev => ({ ...prev, area: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Cluster Melati">Cluster Melati</option>
                    <option value="Kawasan Niaga">Kawasan Niaga</option>
                    <option value="Graha Asri">Graha Asri</option>
                    <option value="Cluster Anggrek">Cluster Anggrek</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kapasitas Port</label>
                  <select
                    value={newNodeDraft.capacityPorts}
                    onChange={e => setNewNodeDraft(prev => ({ ...prev, capacityPorts: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                  >
                    <option value={8}>8 Port</option>
                    <option value={16}>16 Port</option>
                    <option value={32}>32 Port</option>
                    <option value={48}>48 Port</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddNodeModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-600/30 cursor-pointer"
                >
                  Simpan & Tempatkan di Peta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
