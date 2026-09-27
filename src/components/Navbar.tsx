import React from 'react';
import { 
  Radio, 
  Activity, 
  ShieldCheck, 
  Wrench, 
  Bell, 
  Zap, 
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Server,
  Cloud
} from 'lucide-react';
import { UserProfile, UserRole, GenieACSConfig } from '../types/ftth';

interface NavbarProps {
  currentUser: UserProfile;
  onRoleSwitch: (role: UserRole) => void;
  activeOutagesCount: number;
  openSpkCount: number;
  onSimulateOutage: () => void;
  onResetNetwork: () => void;
  isSimulatedCut: boolean;
  genieAcsConfig: GenieACSConfig;
  onOpenGenieAcsModal: () => void;
  onOpenGoogleDrive?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onRoleSwitch,
  activeOutagesCount,
  openSpkCount,
  onSimulateOutage,
  onResetNetwork,
  isSimulatedCut,
  genieAcsConfig,
  onOpenGenieAcsModal,
  onOpenGoogleDrive
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Subtitle */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 font-mono">
                  GENIACS
                </span>
                <span className="bg-cyan-950/80 text-cyan-300 text-[10px] font-semibold uppercase px-2 py-0.5 rounded border border-cyan-500/30">
                  FTTH NOC v3.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Fiber Network Operations & Automated Customer Care
              </p>
            </div>
          </div>

          {/* Center Network Pulse / Live Status */}
          <div className="hidden md:flex items-center space-x-4 bg-slate-950/60 px-3.5 py-1.5 rounded-full border border-slate-800/80">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isSimulatedCut ? 'bg-rose-500 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
              <span className="text-xs font-medium text-slate-300">
                {isSimulatedCut ? 'Alarm Aktif: Kabel Putus' : 'Jaringan Backbone Normal'}
              </span>
            </div>
            <div className="h-3 w-[1px] bg-slate-800" />
            <div className="text-xs font-mono text-cyan-400 flex items-center space-x-1">
              <Activity className="w-3.5 h-3.5" />
              <span>SLA Core: 99.85%</span>
            </div>
          </div>

          {/* Quick Simulation & Role Switcher */}
          <div className="flex items-center space-x-3">
            {/* GenieACS TR-069 Server Indicator & Configuration Button */}
            <button
              onClick={onOpenGenieAcsModal}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
                genieAcsConfig.isConnected
                  ? 'bg-cyan-950/60 hover:bg-cyan-900/60 border-cyan-500/40 text-cyan-300'
                  : 'bg-rose-950/60 hover:bg-rose-900/60 border-rose-500/40 text-rose-300 animate-pulse'
              }`}
              title="Klik untuk membuka konfigurasi alamat GenieACS TR-069 NBI & pemetaan parameter ONT"
            >
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <div className="text-left hidden sm:block">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold font-mono">GenieACS</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${genieAcsConfig.isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                </div>
                <div className="text-[10px] text-slate-400 font-mono leading-none truncate max-w-[110px]">
                  {genieAcsConfig.serverUrl.replace('http://', '').replace('https://', '')}
                </div>
              </div>
              <span className="sm:hidden font-mono text-[11px]">ACS</span>
            </button>

            {/* Google Drive Workspace Cloud Button */}
            {onOpenGoogleDrive && (
              <button
                onClick={onOpenGoogleDrive}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-sm bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/40 text-amber-300"
                title="Akses Google Drive: Backup topologi FTTH, ekspor database pelanggan, dan arsip dokumen SPK"
              >
                <Cloud className="w-3.5 h-3.5 text-amber-400" />
                <div className="text-left hidden md:block">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold font-mono">Google Drive</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  </div>
                  <div className="text-[10px] text-amber-200/70 font-mono leading-none">
                    Cloud Workspace
                  </div>
                </div>
                <span className="md:hidden font-mono text-[11px]">Drive</span>
              </button>
            )}

            {/* Quick Simulation Trigger */}
            {currentUser.role === 'admin' && (
              <div className="hidden lg:flex items-center space-x-2">
                {!isSimulatedCut ? (
                  <button
                    onClick={onSimulateOutage}
                    className="flex items-center space-x-1.5 text-xs bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    title="Simulasikan putusnya kabel distribusi untuk menguji deteksi otomatis dan notifikasi massal"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Uji Putus Kabel</span>
                  </button>
                ) : (
                  <button
                    onClick={onResetNetwork}
                    className="flex items-center space-x-1.5 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    title="Reset jaringan kembali normal"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pulihkan Jaringan</span>
                  </button>
                )}
              </div>
            )}

            {/* Notification indicators */}
            <div className="flex items-center space-x-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
              <div 
                className={`relative px-2 py-1 rounded text-xs flex items-center space-x-1 ${
                  activeOutagesCount > 0 ? 'bg-rose-500/20 text-rose-300 font-semibold' : 'text-slate-400'
                }`}
                title={`${activeOutagesCount} Gangguan Jaringan Terdeteksi`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{activeOutagesCount}</span>
              </div>
              <div 
                className={`px-2 py-1 rounded text-xs flex items-center space-x-1 ${
                  openSpkCount > 0 ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400'
                }`}
                title={`${openSpkCount} SPK Teknisi Sedang Berjalan`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>{openSpkCount}</span>
              </div>
            </div>

            {/* Role Switcher Pill */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-700/80">
              <button
                onClick={() => onRoleSwitch('admin')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  currentUser.role === 'admin'
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin NOC</span>
              </button>
              <button
                onClick={() => onRoleSwitch('field_technician')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  currentUser.role === 'field_technician'
                    ? 'bg-amber-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Staf Lapangan</span>
              </button>
            </div>

            {/* User Profile Avatar */}
            <div className="flex items-center space-x-2 pl-1">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-700 border border-slate-600"
              />
              <div className="hidden xl:block text-left">
                <p className="text-xs font-medium text-slate-200 leading-tight truncate max-w-[130px]">
                  {currentUser.name.split(' ')[0]}
                </p>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {currentUser.role === 'admin' ? 'Super Admin' : 'Teknisi Wilayah'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
