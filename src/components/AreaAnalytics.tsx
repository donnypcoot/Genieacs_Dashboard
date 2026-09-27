import React, { useState } from 'react';
import { 
  BarChart3, 
  Activity, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowUpRight, 
  Wifi, 
  Zap, 
  Layers, 
  Calendar, 
  Clock, 
  Download,
  Filter
} from 'lucide-react';
import { AreaAnalytics as AreaData, Customer, FTTHNode } from '../types/ftth';

interface AreaAnalyticsProps {
  areaAnalytics: AreaData[];
  customers: Customer[];
  nodes: FTTHNode[];
}

export const AreaAnalytics: React.FC<AreaAnalyticsProps> = ({
  areaAnalytics,
  customers,
  nodes
}) => {
  const [selectedAreaName, setSelectedAreaName] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<'today' | '7days' | '30days'>('7days');

  const filteredAreas = selectedAreaName === 'all' 
    ? areaAnalytics 
    : areaAnalytics.filter(a => a.areaName === selectedAreaName);

  // Overall calculations
  const totalAreaCustomers = areaAnalytics.reduce((acc, a) => acc + a.totalCustomers, 0);
  const totalActive = areaAnalytics.reduce((acc, a) => acc + a.activeCustomers, 0);
  const totalLos = areaAnalytics.reduce((acc, a) => acc + a.losCustomers, 0);
  const avgSla = (areaAnalytics.reduce((acc, a) => acc + a.uptimeSla, 0) / areaAnalytics.length).toFixed(2);
  const totalBandwidth = areaAnalytics.reduce((acc, a) => acc + a.bandwidthPeakGbps, 0).toFixed(1);

  return (
    <div className="p-6 bg-slate-950 min-h-[calc(100vh-4rem)] space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <BarChart3 className="w-7 h-7 text-cyan-400" />
            <span>Analitik Performa Kualitas Koneksi Area</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitoring mendalam parameter optical budget (dBm), SLA ketersediaan jaringan, dan utilisasi kapasitas per cluster.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3">
          {/* Timeframe selector */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                timeframe === 'today' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              24 Jam
            </button>
            <button
              onClick={() => setTimeframe('7days')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                timeframe === '7days' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setTimeframe('30days')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                timeframe === '30days' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              30 Hari
            </button>
          </div>

          {/* Area Selector */}
          <select
            value={selectedAreaName}
            onChange={e => setSelectedAreaName(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400"
          >
            <option value="all">Semua Wilayah Cluster</option>
            {areaAnalytics.map(a => (
              <option key={a.areaName} value={a.areaName}>{a.areaName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Network SLA & Quality Overview KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block font-medium">SLA Availability Global</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-cyan-400 font-mono">{avgSla}%</span>
            <span className="text-xs text-emerald-400">Target 99.5%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${avgSla}%` }} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block font-medium">Peak Traffic Throughput</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-white font-mono">{totalBandwidth}</span>
            <span className="text-xs text-slate-400">Gbps Agregat</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-3">
            Kapasitas Uplink 100G GPON Core
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block font-medium">Rata-rata Optical Rx Global</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-emerald-400 font-mono">-20.6 dBm</span>
            <span className="text-xs text-slate-400">dB Margin: +6.4 dB</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 block mt-3">
            92% Pelanggan dalam batas optimal
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block font-medium">Rata-rata Utilitas Port ODP</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-amber-400 font-mono">75.8%</span>
            <span className="text-xs text-slate-400">Siap Pasang</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-amber-400 h-full rounded-full" style={{ width: '75.8%' }} />
          </div>
        </div>
      </div>

      {/* Area Detailed Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredAreas.map(area => {
          const isHealthy = area.uptimeSla >= 99.5;
          const isWarning = area.uptimeSla < 99.0;

          return (
            <div 
              key={area.areaName}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <span>{area.areaName}</span>
                    {area.openIncidents > 0 && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                        {area.openIncidents} Gangguan
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {area.totalOdps} Kotak ODP Terpasang • {area.totalCustomers} Pelanggan Aktif
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">Uptime SLA</div>
                  <div className={`text-xl font-black font-mono ${
                    isWarning ? 'text-rose-400' : isHealthy ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {area.uptimeSla}%
                  </div>
                </div>
              </div>

              {/* Progress Gauges Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Optical Signal Quality */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Rata-rata Optical Rx</span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className={`text-lg font-black font-mono ${
                      area.avgRxPower < -23 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {area.avgRxPower} dBm
                    </span>
                    <span className="text-[10px] text-slate-400">SFP Rx</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${area.avgRxPower < -23 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      style={{ width: `${Math.min(100, Math.max(20, (1 - (Math.abs(area.avgRxPower) - 15) / 15) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Port Utilization */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Utilitas Port ODP</span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="text-lg font-black font-mono text-cyan-400">
                      {area.portUtilizationPercent}%
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {area.portUtilizationPercent > 85 ? 'Perlu Ekspansi' : 'Tersedia'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${area.portUtilizationPercent > 85 ? 'bg-rose-500' : 'bg-cyan-500'}`}
                      style={{ width: `${area.portUtilizationPercent}%` }}
                    />
                  </div>
                </div>

                {/* Bandwidth Usage */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Trafik Puncak (Peak)</span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="text-lg font-black font-mono text-white">
                      {area.bandwidthPeakGbps} Gbps
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Rata-rata harian: {area.bandwidthAvgGbps} Gbps
                  </span>
                </div>

                {/* Customer Status in Area */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Koneksi Pelanggan</span>
                  <div className="flex items-center justify-between mt-1 font-mono text-xs">
                    <span className="text-emerald-400">{area.activeCustomers} Normal</span>
                    {area.losCustomers > 0 ? (
                      <span className="text-rose-400 font-bold">{area.losCustomers} LOS Cut</span>
                    ) : (
                      <span className="text-slate-500">0 LOS</span>
                    )}
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 flex overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full" 
                      style={{ width: `${(area.activeCustomers / area.totalCustomers) * 100}%` }}
                    />
                    {area.losCustomers > 0 && (
                      <div 
                        className="bg-rose-500 h-full" 
                        style={{ width: `${(area.losCustomers / area.totalCustomers) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Recommendation insight */}
              <div className="text-[11px] text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    {area.losCustomers > 0
                      ? `Perbaikan kabel distribusi sedang berjalan pada area ${area.areaName}.`
                      : area.portUtilizationPercent > 85
                      ? `Rekomendasi NOC: Tambahkan 1 unit ODP baru untuk ekspansi calon pelanggan.`
                      : `Kualitas optik stabil dan kapasitas port masih mencukupi untuk PSB baru.`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Optical Power Distribution Histogram Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Distribusi Kualitas Redaman Optik (dBm Distribution Histogram)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Klasifikasi sinyal seluruh ONT terpasang berdasarkan standar ITU-T G.984 GPON.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">Kategori Optimal (&lt; -24 dBm)</span>
              <span className="font-mono text-emerald-400 font-bold">92.4%</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Sinyal sangat jernih, packet loss 0%, SNR tinggi. Kecepatan maksimal tercapai tanpa drop frame.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">Kategori Perlu Atensi (-24 s/d -27 dBm)</span>
              <span className="font-mono text-amber-400 font-bold">5.8%</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Redaman mendekati batas sensitivitas receiver. Potensi drop cable tertekuk (micro-bend) atau debu pada konektor.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400">Kategori Kritis / LOS (&gt; -27 dBm)</span>
              <span className="font-mono text-rose-400 font-bold">1.8%</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Terjadi Loss of Signal (LOS). ONT mengalami diskoneksi. Membutuhkan intervensi pemulihan teknisi segera.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
