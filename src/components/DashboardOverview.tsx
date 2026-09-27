import React from 'react';
import { 
  Radio, 
  Users, 
  MapPin, 
  AlertOctagon, 
  Wrench, 
  Activity, 
  ShieldCheck, 
  ArrowRight, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  TrendingUp, 
  Clock, 
  ExternalLink,
  MessageSquare,
  Cloud
} from 'lucide-react';
import { 
  FTTHNode, 
  FTTHCable, 
  Customer, 
  OutageAlert, 
  WorkOrder, 
  AreaAnalytics, 
  UserRole 
} from '../types/ftth';

interface DashboardOverviewProps {
  nodes: FTTHNode[];
  cables: FTTHCable[];
  customers: Customer[];
  outages: OutageAlert[];
  workOrders: WorkOrder[];
  areaAnalytics: AreaAnalytics[];
  userRole: UserRole;
  onNavigateToTab: (tab: any) => void;
  onSimulateOutage: () => void;
  onResetNetwork: () => void;
  isSimulatedCut: boolean;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  nodes,
  cables,
  customers,
  outages,
  workOrders,
  areaAnalytics,
  userRole,
  onNavigateToTab,
  onSimulateOutage,
  onResetNetwork,
  isSimulatedCut
}) => {
  const activeOutages = outages.filter(o => o.status !== 'resolved');
  const activeWorkOrders = workOrders.filter(w => w.status !== 'resolved');
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const losCustomers = customers.filter(c => c.status === 'los_down').length;

  const totalFiberLengthKm = (cables.reduce((acc, c) => acc + c.lengthMeters, 0) / 1000).toFixed(1);
  const totalOdps = nodes.filter(n => n.type === 'ODP').length;
  const totalOdcs = nodes.filter(n => n.type === 'ODC').length;

  return (
    <div className="p-6 bg-slate-950 min-h-[calc(100vh-4rem)] space-y-6">
      {/* Hero Welcome & Emergency Event Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950/60 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                GENIACS FTTH COMMAND CENTER
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Live Polling: 3s
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Pusat Operasi Jaringan Serat Optik & Pelanggan
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Platform terpadu untuk monitoring topologi FTTH real-time, mendeteksi kabel putus, mengirim notifikasi otomatis massal via WhatsApp, dan memantau penugasan teknisi lapangan.
            </p>
          </div>

          {/* Quick Simulation Trigger */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 flex flex-col space-y-2.5 min-w-[260px]">
            <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulasi Uji Skenario Insiden</span>
            </span>

            {!isSimulatedCut ? (
              <button
                onClick={onSimulateOutage}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Simulasikan Putus Kabel (Cut)</span>
              </button>
            ) : (
              <button
                onClick={onResetNetwork}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Pulihkan Jaringan ke Normal</span>
              </button>
            )}

            <span className="text-[10px] text-slate-400 text-center">
              {isSimulatedCut ? 'Alarm aktif: 12 ONT mengalami LOS' : 'Uji deteksi otomatis & broadcast WhatsApp'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div 
          onClick={() => onNavigateToTab('customers')}
          className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 p-4 rounded-2xl cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Pelanggan Aktif</span>
            <Users className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-white font-mono">{activeCustomers}</span>
            <span className="text-xs text-slate-400">/ {customers.length} total</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 flex items-center space-x-1">
            <TrendingUp className="w-3 h-3" />
            <span>98.2% ONT Online</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div 
          onClick={() => onNavigateToTab('map')}
          className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 p-4 rounded-2xl cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Infrastruktur FTTH</span>
            <MapPin className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-white font-mono">{totalOdps} ODP</span>
            <span className="text-xs text-slate-400">({totalOdcs} ODC)</span>
          </div>
          <div className="mt-2 text-[11px] text-cyan-400 font-mono">
            {totalFiberLengthKm} km jalur serat optik
          </div>
        </div>

        {/* KPI 3 */}
        <div 
          onClick={() => onNavigateToTab('outages')}
          className="bg-slate-900 border border-slate-800 hover:border-rose-500/50 p-4 rounded-2xl cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Gangguan Jaringan</span>
            <AlertOctagon className={`w-4 h-4 ${activeOutages.length > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`} />
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className={`text-2xl font-black font-mono ${activeOutages.length > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {activeOutages.length}
            </span>
            <span className="text-xs text-slate-400">Insiden Aktif</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-400 font-medium">
            {losCustomers} Pelanggan LOS Outage
          </div>
        </div>

        {/* KPI 4 */}
        <div 
          onClick={() => onNavigateToTab('outages')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-4 rounded-2xl cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">SPK Pemeliharaan</span>
            <Wrench className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-black text-amber-400 font-mono">{activeWorkOrders.length}</span>
            <span className="text-xs text-slate-400">Tugas Lapangan</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            2 Teknisi Sedang On-Site
          </div>
        </div>
      </div>

      {/* Active Incident Warning Alert Bar */}
      {activeOutages.length > 0 && (
        <div className="bg-rose-950/40 border border-rose-500/60 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-rose-950/50 animate-pulse">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase tracking-wider text-rose-300 font-mono">
                  PERINGATAN GANGGUAN SERAT OPTIK AKTIF
                </span>
                <span className="text-[10px] bg-rose-900 text-rose-200 px-2 py-0.5 rounded font-bold">
                  {activeOutages[0].nodeName}
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-1">
                {activeOutages[0].title}. {losCustomers} pelanggan terputus (LOS). 
                {activeOutages[0].autoNotificationSent 
                  ? ' Notifikasi otomatis WhatsApp telah dikirimkan ke pelanggan terdampak.' 
                  : ' Belum dikirimkan notifikasi massal ke pelanggan.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigateToTab('outages')}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-rose-600/40 cursor-pointer whitespace-nowrap"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Kelola Notifikasi & SPK</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Cloud Workspace & Google Drive Integration Banner */}
      <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white">Google Drive Cloud Storage & Backup</span>
              <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded font-mono border border-amber-800">
                Workspace API
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sinkronkan topologi OLT/ODP, ekspor {customers.length} data pelanggan (CSV), dan arsip dokumen SPK teknisi ke Google Drive.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateToTab('drive')}
          className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-semibold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
        >
          <span>Buka Google Drive</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Split Section: Quick Map Teaser & Area Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: FTTH Map Interactive Teaser */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="font-bold text-white text-base">Topologi Peta FTTH Real-Time</h3>
                <p className="text-xs text-slate-400">Penataan kabel optik feeder, distribution, dan drop kabel</p>
              </div>
            </div>

            <button
              onClick={() => onNavigateToTab('map')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800"
            >
              <span>Buka Builder Peta Lengkap</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mini Interactive Canvas Preview */}
          <div 
            onClick={() => onNavigateToTab('map')}
            className="h-64 bg-slate-950 rounded-2xl border border-slate-800 relative overflow-hidden cursor-pointer group"
          >
            {/* Grid preview */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />

            {/* Simulated mini topology */}
            <svg className="w-full h-full">
              {cables.map(c => {
                const s = nodes.find(n => n.id === c.fromNodeId);
                const t = nodes.find(n => n.id === c.toNodeId);
                if (!s || !t) return null;
                const isCut = c.status === 'cut';
                return (
                  <line
                    key={c.id}
                    x1={s.x * 0.7}
                    y1={s.y * 0.35}
                    x2={t.x * 0.7}
                    y2={t.y * 0.35}
                    stroke={isCut ? '#f43f5e' : c.cableType === 'feeder' ? '#38bdf8' : '#10b981'}
                    strokeWidth={isCut ? 3 : 2}
                    strokeDasharray={isCut ? '6 4' : 'none'}
                  />
                );
              })}

              {nodes.map(n => (
                <g key={n.id} transform={`translate(${n.x * 0.7}, ${n.y * 0.35})`}>
                  <circle
                    r={n.type === 'OLT' ? 9 : n.type === 'ODC' ? 7 : 5}
                    fill={n.status === 'critical' ? '#f43f5e' : n.type === 'OLT' ? '#0284c7' : n.type === 'ODC' ? '#a855f7' : '#10b981'}
                    stroke="#ffffff"
                    strokeWidth={1}
                  />
                  <text
                    x="0"
                    y="14"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    {n.code}
                  </text>
                </g>
              ))}
            </svg>

            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="bg-cyan-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Klik untuk Membuka & Mengedit Topologi Peta</span>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Normal SFP: -19.4 dBm</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Alarm Sinyal LOS: ODP-MLT-03</span>
            </span>
            <span className="font-mono text-cyan-400">Total 12 Node Aktif</span>
          </div>
        </div>

        {/* Right 1 Col: Area Quality Health Snapshot */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Kualitas Koneksi Area</span>
              </h3>
              <button
                onClick={() => onNavigateToTab('analytics')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                Lihat Semua
              </button>
            </div>
            <p className="text-xs text-slate-400">Uptime SLA dan rata-rata optical budget</p>
          </div>

          <div className="space-y-3">
            {areaAnalytics.slice(0, 4).map(area => (
              <div 
                key={area.areaName}
                className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">{area.areaName}</span>
                  <span className={`font-mono font-bold ${
                    area.uptimeSla < 99.0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {area.uptimeSla}% SLA
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Rx: {area.avgRxPower} dBm</span>
                  <span>Port: {area.portUtilizationPercent}%</span>
                </div>

                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      area.uptimeSla < 99.0 ? 'bg-rose-500' : 'bg-cyan-400'
                    }`}
                    style={{ width: `${area.uptimeSla}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => onNavigateToTab('analytics')}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer"
            >
              <span>Buka Analitik Performa Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
