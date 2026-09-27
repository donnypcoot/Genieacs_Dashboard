import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Activity, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  WifiOff, 
  Terminal, 
  Phone, 
  Mail, 
  MapPin, 
  Trash2, 
  Edit3, 
  ExternalLink,
  ShieldAlert,
  Send,
  Sparkles,
  RefreshCw,
  X,
  Server,
  Cloud,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Customer, FTTHNode, UserRole, CustomerStatus, GenieACSConfig } from '../types/ftth';

interface CustomerManagementProps {
  customers: Customer[];
  nodes: FTTHNode[];
  userRole: UserRole;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onOpenDiagnostic: (customer: Customer) => void;
  onJumpToMapOdp: (odpId: string) => void;
  onSendWhatsappAlert: (customer: Customer) => void;
  genieAcsConfig?: GenieACSConfig;
  onOpenGenieAcs?: () => void;
  onSyncGenieAcs?: () => void;
  onOpenGoogleDrive?: () => void;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  customers,
  nodes,
  userRole,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onOpenDiagnostic,
  onJumpToMapOdp,
  onSendWhatsappAlert,
  genieAcsConfig,
  onOpenGenieAcs,
  onSyncGenieAcs,
  onOpenGoogleDrive
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Customer Form State
  const [newCustDraft, setNewCustDraft] = useState<{
    name: string;
    phone: string;
    email: string;
    address: string;
    area: string;
    packagePlan: string;
    monthlyFee: number;
    odpId: string;
    odpPort: number;
    ontSerialNumber: string;
  }>({
    name: '',
    phone: '',
    email: '',
    address: '',
    area: 'Cluster Melati',
    packagePlan: 'Home Starter 50 Mbps',
    monthlyFee: 249000,
    odpId: 'node-odp-mlt-01',
    odpPort: 1,
    ontSerialNumber: `ZTEG${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  });

  // Pagination state for handling large datasets (500+ CPEs)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.ontSerialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesArea = selectedArea === 'all' || c.area === selectedArea;
    const matchesStatus = selectedStatus === 'all' || c.status === selectedStatus;

    return matchesSearch && matchesArea && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Calculate quick stats
  const totalCount = customers.length;
  const activeCount = customers.filter(c => c.status === 'active').length;
  const losCount = customers.filter(c => c.status === 'los_down').length;
  const warningCount = customers.filter(c => c.status === 'high_loss').length;

  const odpNodes = nodes.filter(n => n.type === 'ODP');

  // Handle form submission
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustDraft.name || !newCustDraft.odpId) return;

    const targetOdp = nodes.find(n => n.id === newCustDraft.odpId);
    const odpCoords = targetOdp ? { x: targetOdp.x + (Math.random() * 40 - 20), y: targetOdp.y + (Math.random() * 40 - 20) } : { x: 300, y: 300 };

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      accountNumber: `GNC-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newCustDraft.name,
      phone: newCustDraft.phone,
      email: newCustDraft.email || `${newCustDraft.name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      address: newCustDraft.address,
      area: newCustDraft.area,
      packagePlan: newCustDraft.packagePlan,
      monthlyFee: Number(newCustDraft.monthlyFee),
      odpId: newCustDraft.odpId,
      odpPort: Number(newCustDraft.odpPort),
      ontSerialNumber: newCustDraft.ontSerialNumber,
      ipAddress: `10.24.${Math.floor(100 + Math.random() * 100)}.${Math.floor(10 + Math.random() * 80)}`,
      status: 'active',
      rxOpticalPower: Number((-18.5 - Math.random() * 2).toFixed(1)),
      txOpticalPower: 2.1,
      dropCableLengthMeters: Math.floor(40 + Math.random() * 80),
      joinDate: new Date().toISOString().split('T')[0],
      coordinates: odpCoords
    };

    onAddCustomer(newCustomer);
    setShowAddModal(false);
    setNewCustDraft({
      name: '',
      phone: '',
      email: '',
      address: '',
      area: 'Cluster Melati',
      packagePlan: 'Home Starter 50 Mbps',
      monthlyFee: 249000,
      odpId: 'node-odp-mlt-01',
      odpPort: 1,
      ontSerialNumber: `ZTEG${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    });
  };

  return (
    <div className="p-6 bg-slate-950 min-h-[calc(100vh-4rem)] space-y-6">
      {/* Top Banner & Quick KPI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <Users className="w-7 h-7 text-cyan-400" />
            <span>Manajemen Data Pelanggan FTTH</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Data terintegrasi ODP, alokasi port splitter, status ONT, dan pengukuran redaman real-time.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center space-x-3">
          {/* GenieACS status & sync button */}
          {onOpenGenieAcs && (
            <button
              onClick={onOpenGenieAcs}
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 shadow-md cursor-pointer transition-colors"
              title="Buka konfigurasi server GenieACS dan sinkronkan ONT"
            >
              <Server className="w-4 h-4 text-cyan-400" />
              <span>GenieACS TR-069</span>
              <span className={`w-2 h-2 rounded-full ${genieAcsConfig?.isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            </button>
          )}

          {/* Google Drive Workspace Backup */}
          {onOpenGoogleDrive && (
            <button
              onClick={onOpenGoogleDrive}
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 shadow-md cursor-pointer transition-colors"
              title="Ekspor daftar pelanggan dan status redaman ke Google Drive"
            >
              <Cloud className="w-4 h-4 text-amber-400" />
              <span>Drive Backup</span>
            </button>
          )}

          <button
            onClick={() => {
              if (userRole !== 'admin') {
                alert('Akses Terbatas: Hanya Admin yang dapat mendaftarkan pelanggan baru.');
                return;
              }
              setShowAddModal(true);
            }}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg cursor-pointer ${
              userRole === 'admin'
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30'
                : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrasi Pelanggan Baru</span>
            {userRole !== 'admin' && <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block font-medium">Total Pelanggan Aktif</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-white font-mono">{activeCount}</span>
            <span className="text-xs text-slate-400">dari {totalCount} akun</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full" 
              style={{ width: `${(activeCount / Math.max(1, totalCount)) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block font-medium">Loss of Signal (LOS / Cut)</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className={`text-2xl font-black font-mono ${losCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>
              {losCount}
            </span>
            <span className="text-xs text-slate-400">ONT Terputus</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-rose-500 h-full rounded-full" 
              style={{ width: `${(losCount / Math.max(1, totalCount)) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block font-medium">Peringatan Redaman Tinggi</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-amber-400 font-mono">{warningCount}</span>
            <span className="text-xs text-slate-400">Rx &gt; -25 dBm</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-amber-500 h-full rounded-full" 
              style={{ width: `${(warningCount / Math.max(1, totalCount)) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block font-medium">Rata-rata Optical Rx</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-cyan-400 font-mono">-19.4 dBm</span>
            <span className="text-xs text-emerald-400 font-medium">Ideal</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-3 font-mono">
            Rentang aman SFP: -15 s/d -24 dBm
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, ID akun, no HP, ONT..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Area filter */}
          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedArea}
              onChange={e => setSelectedArea(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">Semua Wilayah</option>
              <option value="Cluster Melati">Cluster Melati</option>
              <option value="Kawasan Niaga">Kawasan Niaga</option>
              <option value="Graha Asri">Graha Asri</option>
              <option value="Cluster Anggrek">Cluster Anggrek</option>
            </select>
          </div>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
          >
            <option value="all">Semua Status</option>
            <option value="active">Normal (Aktif)</option>
            <option value="los_down">Gangguan (LOS Down)</option>
            <option value="high_loss">Redaman Tinggi</option>
          </select>
        </div>
      </div>

      {/* Customer Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-mono tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Pelanggan & ID</th>
                <th className="py-3.5 px-4 font-semibold">Paket Layanan</th>
                <th className="py-3.5 px-4 font-semibold">ODP & Port Splitter</th>
                <th className="py-3.5 px-4 font-semibold">ONT SN & IP</th>
                <th className="py-3.5 px-4 font-semibold">Optical Rx Sinyal</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Aksi Terintegrasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="space-y-3 max-w-md mx-auto">
                      <Users className="w-10 h-10 text-slate-600 mx-auto" />
                      <div className="text-sm font-bold text-slate-300">
                        {customers.length === 0 ? 'Belum Ada Data Pelanggan' : 'Tidak ada data pelanggan yang sesuai dengan pencarian.'}
                      </div>
                      <p className="text-xs text-slate-500">
                        {customers.length === 0 
                          ? 'Hubungkan ke server GenieACS Anda pada port 7557 untuk mengimpor seluruh ONT real ke sistem.'
                          : 'Coba ubah kata kunci pencarian atau reset filter area dan status.'}
                      </p>
                      {customers.length === 0 && onOpenGenieAcs && (
                        <button
                          onClick={onOpenGenieAcs}
                          className="inline-flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-md shadow-cyan-600/30 cursor-pointer"
                        >
                          <Server className="w-4 h-4" />
                          <span>Sinkronkan ONT dari GenieACS Sekarang</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map(customer => {
                  const linkedOdp = nodes.find(n => n.id === customer.odpId);
                  const isLos = customer.status === 'los_down';
                  const isHighLoss = customer.status === 'high_loss';

                  return (
                    <tr key={customer.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Customer Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-100 text-sm">{customer.name}</div>
                        <div className="text-[11px] text-cyan-400 font-mono">{customer.accountNumber}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5">{customer.address}</div>
                      </td>

                      {/* Package Plan */}
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-950 px-2.5 py-1 rounded-md text-slate-200 font-medium border border-slate-800 inline-block">
                          {customer.packagePlan}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          Rp {customer.monthlyFee.toLocaleString('id-ID')}/bln
                        </div>
                      </td>

                      {/* Linked ODP & Port */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onJumpToMapOdp(customer.odpId)}
                          className="flex items-center space-x-1.5 text-xs text-sky-400 hover:text-sky-300 font-mono font-semibold cursor-pointer group"
                          title="Lihat ODP di Peta FTTH"
                        >
                          <span>{linkedOdp?.code || customer.odpId}</span>
                          <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          Port Splitter <span className="font-bold text-amber-400">#{customer.odpPort}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Drop cable: {customer.dropCableLengthMeters}m
                        </div>
                      </td>

                      {/* ONT SN & IP */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div className="text-slate-300">{customer.ontSerialNumber}</div>
                        <div className="text-slate-400">{customer.ipAddress}</div>
                      </td>

                      {/* Optical Power Gauge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className={`font-mono text-xs font-black ${
                            isLos 
                              ? 'text-rose-400 animate-pulse' 
                              : isHighLoss 
                              ? 'text-amber-400' 
                              : 'text-emerald-400'
                          }`}>
                            {customer.rxOpticalPower} dBm
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {isLos ? 'Signal Lost (> -30)' : isHighLoss ? 'Redaman Redup' : 'Sangat Bagus'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center space-x-1.5 capitalize ${
                          isLos
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                            : isHighLoss
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isLos ? 'bg-rose-400' : isHighLoss ? 'bg-amber-400' : 'bg-emerald-400'
                          }`} />
                          <span>{isLos ? 'LOS (Putus)' : isHighLoss ? 'High Loss' : 'Online Aktif'}</span>
                        </span>
                      </td>

                      {/* Integrated Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onOpenDiagnostic(customer)}
                            className="bg-slate-800 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer"
                            title="Buka Diagnostik ONT Remote"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                            <span>Diagnostik</span>
                          </button>

                          <button
                            onClick={() => onSendWhatsappAlert(customer)}
                            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 p-1.5 rounded-lg transition-all cursor-pointer"
                            title="Kirim Notifikasi WhatsApp Pelanggan"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {userRole === 'admin' && (
                            <button
                              onClick={() => {
                                if (confirm(`Hapus pelanggan ${customer.name} (${customer.accountNumber})?`)) {
                                  onDeleteCustomer(customer.id);
                                }
                              }}
                              className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/30 transition-all cursor-pointer"
                              title="Hapus Pelanggan (Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredCustomers.length > 0 && (
          <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3 text-slate-400">
              <span>
                Menampilkan <strong className="text-white font-mono">{((currentPage - 1) * pageSize) + 1}</strong> - <strong className="text-white font-mono">{Math.min(currentPage * pageSize, filteredCustomers.length)}</strong> dari <strong className="text-cyan-400 font-mono">{filteredCustomers.length}</strong> pelanggan
              </span>
              <div className="flex items-center space-x-1.5 pl-3 border-l border-slate-800">
                <span className="text-[11px] text-slate-500">Per halaman:</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={1000}>Semua ({filteredCustomers.length})</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 rounded-lg text-slate-300 cursor-pointer disabled:cursor-not-allowed"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-1 font-mono text-xs">
                <span className="px-2.5 py-1 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-lg font-bold">
                  {currentPage}
                </span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-400 px-1">{totalPages}</span>
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 rounded-lg text-slate-300 cursor-pointer disabled:cursor-not-allowed"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Registrasi Pelanggan Baru */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-lg text-white">Registrasi Pelanggan Baru FTTH</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Rahmat Hidayat"
                    value={newCustDraft.name}
                    onChange={e => setNewCustDraft(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nomor WhatsApp / HP</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 081234567890"
                    value={newCustDraft.phone}
                    onChange={e => setNewCustDraft(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Alamat Pemasangan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Komp. Melati Blok B No. 14"
                  value={newCustDraft.address}
                  onChange={e => setNewCustDraft(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Wilayah / Cluster</label>
                  <select
                    value={newCustDraft.area}
                    onChange={e => setNewCustDraft(prev => ({ ...prev, area: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Cluster Melati">Cluster Melati</option>
                    <option value="Kawasan Niaga">Kawasan Niaga</option>
                    <option value="Graha Asri">Graha Asri</option>
                    <option value="Cluster Anggrek">Cluster Anggrek</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Paket Internet FTTH</label>
                  <select
                    value={newCustDraft.packagePlan}
                    onChange={e => {
                      const plan = e.target.value;
                      let fee = 249000;
                      if (plan.includes('150')) fee = 429000;
                      if (plan.includes('200')) fee = 850000;
                      if (plan.includes('300')) fee = 599000;
                      if (plan.includes('500')) fee = 2450000;
                      setNewCustDraft(prev => ({ ...prev, packagePlan: plan, monthlyFee: fee }));
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Home Starter 50 Mbps">Home Starter 50 Mbps (Rp 249k)</option>
                    <option value="Gamer Fast 150 Mbps">Gamer Fast 150 Mbps (Rp 429k)</option>
                    <option value="Ultra Fiber 300 Mbps">Ultra Fiber 300 Mbps (Rp 599k)</option>
                    <option value="Business SOHO 200 Mbps">Business SOHO 200 Mbps (Rp 850k)</option>
                    <option value="Enterprise Dedicated 500 Mbps">Enterprise Dedicated 500 Mbps (Rp 2.45M)</option>
                  </select>
                </div>
              </div>

              {/* ODP and Port Assignment */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <span className="font-semibold text-slate-200 block text-xs">
                  Integrasi Titik Distribusi (ODP & Port)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Pilih ODP Terdekat</label>
                    <select
                      value={newCustDraft.odpId}
                      onChange={e => setNewCustDraft(prev => ({ ...prev, odpId: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-400"
                    >
                      {odpNodes.map(odp => (
                        <option 
                          key={odp.id} 
                          value={odp.id}
                          disabled={odp.usedPorts >= odp.capacityPorts}
                        >
                          {odp.code} ({odp.usedPorts}/{odp.capacityPorts} Terpakai {odp.usedPorts >= odp.capacityPorts ? '- PENUH' : ''})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Nomor Port Splitter</label>
                    <input
                      type="number"
                      min={1}
                      max={16}
                      value={newCustDraft.odpPort}
                      onChange={e => setNewCustDraft(prev => ({ ...prev, odpPort: Number(e.target.value) }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Serial Number ONT Terminal</label>
                  <input
                    type="text"
                    value={newCustDraft.ontSerialNumber}
                    onChange={e => setNewCustDraft(prev => ({ ...prev, ontSerialNumber: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-400 uppercase"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-600/30 cursor-pointer"
                >
                  Aktivasi Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
