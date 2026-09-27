import React from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  Users, 
  AlertOctagon, 
  BarChart3, 
  ShieldAlert,
  HardDrive,
  GitBranch,
  Info,
  Cloud
} from 'lucide-react';
import { UserRole } from '../types/ftth';

export type ActiveTab = 'overview' | 'map' | 'customers' | 'outages' | 'analytics' | 'roles' | 'drive';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  userRole: UserRole;
  activeOutagesCount: number;
  openSpkCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  activeOutagesCount,
  openSpkCount,
}) => {
  const menuItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string; description: string }[] = [
    {
      id: 'overview',
      label: 'Ringkasan NOC',
      icon: <LayoutDashboard className="w-5 h-5" />,
      description: 'Status utama jaringan & KPI operasional'
    },
    {
      id: 'map',
      label: 'Peta FTTH Real-Time',
      icon: <MapPin className="w-5 h-5" />,
      description: 'Builder topologi OLT, ODC, ODP & kabel optik'
    },
    {
      id: 'customers',
      label: 'Data Pelanggan',
      icon: <Users className="w-5 h-5" />,
      description: 'Manajemen ONT, port ODP & status redaman'
    },
    {
      id: 'outages',
      label: 'Gangguan & SPK',
      icon: <AlertOctagon className="w-5 h-5" />,
      badge: activeOutagesCount + openSpkCount,
      badgeColor: activeOutagesCount > 0 ? 'bg-rose-500' : 'bg-amber-500',
      description: 'Notifikasi otomatis & pemeliharaan teknisi'
    },
    {
      id: 'analytics',
      label: 'Analitik Area',
      icon: <BarChart3 className="w-5 h-5" />,
      description: 'Kualitas sinyal dBm, SLA & utilitas port'
    },
    {
      id: 'roles',
      label: 'Akses & Tim',
      icon: <ShieldAlert className="w-5 h-5" />,
      description: 'Role management Admin vs Staf Lapangan'
    },
    {
      id: 'drive',
      label: 'Google Drive Cloud',
      icon: <Cloud className="w-5 h-5" />,
      description: 'Backup topologi, ekspor pelanggan & arsip SPK'
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between select-none">
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
          Navigasi Modul
        </div>

        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group cursor-pointer ${
                isActive
                  ? 'bg-blue-600/20 text-cyan-400 border border-blue-500/40 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3 text-left">
                <span className={`${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  {item.icon}
                </span>
                <div>
                  <div className="font-semibold leading-tight">{item.label}</div>
                  <div className="text-[10px] text-slate-400 leading-none mt-0.5 max-w-[130px] truncate">
                    {item.description}
                  </div>
                </div>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-[11px] font-bold text-white px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Role permission info box at bottom */}
      <div className="p-3 border-t border-slate-800">
        <div className={`p-3 rounded-xl border ${
          userRole === 'admin' 
            ? 'bg-blue-950/40 border-blue-800/50' 
            : 'bg-amber-950/40 border-amber-800/50'
        }`}>
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${userRole === 'admin' ? 'bg-blue-400' : 'bg-amber-400'}`} />
            <span className="text-xs font-semibold text-slate-200 uppercase font-mono">
              Akses: {userRole === 'admin' ? 'Admin Penuh' : 'Staf Lapangan'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
            {userRole === 'admin'
              ? 'Dapat menambah/hapus ODP, mengubah konfigurasi kabel, dan mengelola paket pelanggan.'
              : 'Mode terbatas: Akses SPK perbaikan, input hasil redaman OTDR, dan lihat titik ODP.'}
          </p>
        </div>
      </div>
    </aside>
  );
};
