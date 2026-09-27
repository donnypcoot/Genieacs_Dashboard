import React, { useState } from 'react';
import { 
  AlertOctagon, 
  Send, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  MessageSquare, 
  Phone, 
  Zap, 
  AlertTriangle, 
  FileText, 
  Camera, 
  Radio, 
  Activity, 
  RotateCcw,
  Plus,
  ShieldCheck,
  Check,
  ChevronRight,
  Sparkles,
  X
} from 'lucide-react';
import { 
  OutageAlert, 
  WorkOrder, 
  NotificationLog, 
  Customer, 
  FTTHNode, 
  UserRole,
  TicketStatus
} from '../types/ftth';

interface OutageAndMaintenanceProps {
  outages: OutageAlert[];
  workOrders: WorkOrder[];
  notificationLogs: NotificationLog[];
  customers: Customer[];
  nodes: FTTHNode[];
  userRole: UserRole;
  onSendAutomatedNotification: (outage: OutageAlert) => void;
  onResolveWorkOrder: (workOrderId: string, afterOpticalDb: number, notes: string) => void;
  onDispatchTechnician: (outageId: string, technicianName: string, priority: any) => void;
}

export const OutageAndMaintenance: React.FC<OutageAndMaintenanceProps> = ({
  outages,
  workOrders,
  notificationLogs,
  customers,
  nodes,
  userRole,
  onSendAutomatedNotification,
  onResolveWorkOrder,
  onDispatchTechnician
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'incidents' | 'workorders' | 'logs'>('incidents');
  const [selectedOutageForPreview, setSelectedOutageForPreview] = useState<OutageAlert | null>(null);
  const [selectedSpkForExecution, setSelectedSpkForExecution] = useState<WorkOrder | null>(null);

  // Field Repair Form state
  const [repairForm, setRepairForm] = useState({
    afterOpticalDb: -19.2,
    splicingCompleted: true,
    ferruleCleaned: true,
    photoUploaded: true,
    notes: 'Kabel fiber telah disambung ulang dengan fusion splicer. Redaman stabil pada -19.2 dBm.'
  });

  // New Dispatch modal state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchDraft, setDispatchDraft] = useState({
    outageId: '',
    technicianName: 'Ahmad Fauzi (Field Tech 1)',
    priority: 'critical'
  });

  const activeOutages = outages.filter(o => o.status !== 'resolved');
  const resolvedOutages = outages.filter(o => o.status === 'resolved');

  return (
    <div className="p-6 bg-slate-950 min-h-[calc(100vh-4rem)] space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <AlertOctagon className="w-7 h-7 text-rose-500 animate-pulse" />
            <span>Pusat Gangguan & Pemeliharaan Teknisi</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deteksi otomatis gangguan serat optik, broadcast notifikasi WhatsApp massal, dan manajemen Surat Perintah Kerja (SPK).
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('incidents')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
              activeSubTab === 'incidents'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Gangguan & Notifikasi ({activeOutages.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('workorders')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
              activeSubTab === 'workorders'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>SPK Teknisi ({workOrders.filter(w => w.status !== 'resolved').length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('logs')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
              activeSubTab === 'logs'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Riwayat Notifikasi ({notificationLogs.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: INCIDENTS & AUTOMATED NOTIFICATIONS */}
      {activeSubTab === 'incidents' && (
        <div className="space-y-6">
          {/* Active Incidents Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-200 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>Insiden Aktif Terdeteksi Otomatis ({activeOutages.length})</span>
              </h2>
            </div>

            {activeOutages.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-lg font-bold text-slate-100">Kondisi Jaringan FTTH Prima</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Tidak ada kabel putus atau degradasi redaman di seluruh OLT, ODC, dan ODP saat ini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeOutages.map(outage => {
                  const impactedCusts = customers.filter(c => c.odpId === outage.nodeId);
                  const linkedSpk = workOrders.find(w => w.outageId === outage.id);

                  return (
                    <div 
                      key={outage.id}
                      className="bg-slate-900 border border-rose-500/40 rounded-2xl p-5 shadow-xl relative overflow-hidden space-y-4"
                    >
                      {/* Top ribbon badge */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              {outage.severity.toUpperCase()} ALERT
                            </span>
                            <span className="text-xs font-mono text-slate-400">
                              Terdeteksi: {outage.detectedAt}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
                            {outage.title}
                          </h3>
                        </div>

                        <span className="text-xs font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-cyan-400">
                          SLA Est: {outage.estimatedResolutionMinutes} Mnt
                        </span>
                      </div>

                      {/* Outage Details */}
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                        {outage.description}
                      </p>

                      {/* Impact metrics */}
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Titik Node Terdampak</span>
                          <span className="font-bold text-slate-200 font-mono text-xs">{outage.nodeName || outage.nodeId}</span>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Pelanggan Terdampak</span>
                          <span className="font-bold text-rose-400 font-mono text-base">{impactedCusts.length || outage.impactedCustomersCount} ONT</span>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Status SPK</span>
                          <span className="font-bold text-amber-400 font-mono text-xs">
                            {linkedSpk ? linkedSpk.id : 'Menunggu Disposisi'}
                          </span>
                        </div>
                      </div>

                      {/* Automated Notification Action */}
                      <div className="bg-gradient-to-r from-blue-950/40 to-cyan-950/40 border border-blue-800/40 p-3.5 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <MessageSquare className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-bold text-white">
                              Modul Notifikasi Otomatis Pelanggan
                            </span>
                          </div>
                          {outage.autoNotificationSent && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 flex items-center space-x-1">
                              <Check className="w-3 h-3" />
                              <span>Terkirim ke WhatsApp Pelanggan</span>
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-300">
                          Sistem secara otomatis membuat template pesan broadcast resmi berisi estimasi perbaikan dan nomor SPK teknisi untuk seluruh pelanggan di {outage.nodeName}.
                        </p>

                        <div className="flex items-center space-x-2 pt-1">
                          <button
                            onClick={() => setSelectedOutageForPreview(outage)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-slate-700"
                          >
                            Lihat Draft Pesan
                          </button>

                          <button
                            onClick={() => onSendAutomatedNotification(outage)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-600/30 cursor-pointer ml-auto"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{outage.autoNotificationSent ? 'Kirim Ulang Broadcast' : 'Kirim Broadcast Sekarang'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: WORK ORDERS (SPK) TEKNISI */}
      {activeSubTab === 'workorders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-200 flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-blue-400" />
              <span>Daftar Surat Perintah Kerja (SPK) Pemeliharaan Teknisi</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workOrders.map(spk => {
              const isResolved = spk.status === 'resolved';
              const isInProgress = spk.status === 'in_progress';

              return (
                <div 
                  key={spk.id}
                  className={`bg-slate-900 border rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between ${
                    isResolved 
                      ? 'border-emerald-500/30 opacity-80' 
                      : isInProgress 
                      ? 'border-blue-500/50' 
                      : 'border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-cyan-400">
                            {spk.id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            spk.priority === 'critical' ? 'bg-rose-950 text-rose-300' : 'bg-amber-950 text-amber-300'
                          }`}>
                            {spk.priority}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1 leading-snug">
                          {spk.title}
                        </h4>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        isResolved
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : isInProgress
                          ? 'bg-blue-500/20 text-blue-300 animate-pulse'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {spk.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Assigned Technician & SLA */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center space-x-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Teknisi Penanggung Jawab</span>
                        </span>
                        <span className="font-semibold text-slate-200">{spk.technicianName}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Target SLA</span>
                        </span>
                        <span className="font-mono font-bold text-slate-200">{spk.targetSla}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Redaman Awal</span>
                        <span className="font-mono font-bold text-rose-400">{spk.beforeOpticalDb || '-'} dBm</span>
                      </div>

                      {spk.afterOpticalDb && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Hasil Splicing (Akhir)</span>
                          <span className="font-mono font-bold text-emerald-400">{spk.afterOpticalDb} dBm</span>
                        </div>
                      )}
                    </div>

                    {/* Required Field Action */}
                    <p className="text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
                      {spk.actionRequired}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-800">
                    {!isResolved ? (
                      <button
                        onClick={() => {
                          setSelectedSpkForExecution(spk);
                          setRepairForm({
                            afterOpticalDb: -19.2,
                            splicingCompleted: true,
                            ferruleCleaned: true,
                            photoUploaded: true,
                            notes: `Pekerjaan perbaikan pada ${spk.nodeName || 'titik gangguan'} telah selesai dilaksanakan dengan baik.`
                          });
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Input Hasil Perbaikan Lapangan</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-center space-x-1 text-xs text-emerald-400 font-semibold py-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Telah Selesai & Terverifikasi</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: NOTIFICATION AUDIT LOGS */}
      {activeSubTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Log Pengiriman Notifikasi Otomatis</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Gateway: WhatsApp Business API</span>
          </div>

          <div className="space-y-3">
            {notificationLogs.map(log => (
              <div 
                key={log.id}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-200">{log.title}</span>
                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      {log.targetCount} Pelanggan Menerima
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed max-w-3xl">
                    "{log.content}"
                  </p>
                </div>

                <div className="text-right whitespace-nowrap">
                  <div className="font-mono text-slate-400 text-[11px]">{log.timestamp}</div>
                  <span className="text-[10px] text-emerald-400 font-semibold">Terkirim (100% Delivered)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW AUTOMATED NOTIFICATION */}
      {selectedOutageForPreview && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-lg text-white">Preview Pesan WhatsApp Massal</h3>
              </div>
              <button 
                onClick={() => setSelectedOutageForPreview(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated WhatsApp message bubble */}
            <div className="bg-[#0b141a] p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
                  G
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">GENIACS Customer Care Official</div>
                  <div className="text-[10px] text-emerald-400">Centang Hijau Resmi (WhatsApp Verified)</div>
                </div>
              </div>

              <div className="bg-[#1f2c34] p-3.5 rounded-lg text-slate-200 text-xs leading-relaxed font-sans space-y-2">
                <p className="font-bold text-cyan-300">
                  ⚠️ Pemberitahuan Gangguan Jaringan Fiber Optik
                </p>
                <p>
                  Yth. Pelanggan Setia GENIACS di wilayah <strong>{selectedOutageForPreview.area}</strong>,
                </p>
                <p>
                  Sistem monitoring NOC kami mendeteksi adanya kendala kabel serat optik pada <strong>{selectedOutageForPreview.nodeName}</strong>. 
                </p>
                <p>
                  Tim teknisi lapangan kami telah dikerahkan ke lokasi (Surat Tugas: <strong>{selectedOutageForPreview.ticketId || 'SPK-2024-0091'}</strong>).
                </p>
                <div className="bg-black/30 p-2 rounded text-[11px] font-mono text-amber-300">
                  Estimasi Selesai: ± {selectedOutageForPreview.estimatedResolutionMinutes} Menit
                </div>
                <p className="text-[11px] text-slate-400">
                  Kami memohon maaf yang sebesar-besarnya atas ketidaknyamanan aktivitas digital Anda. Informasi pemulihan akan kami kirimkan sesaat setelah sinyal normal kembali.
                </p>
                <div className="text-[9px] text-slate-400 text-right">
                  12:45 • Terkirim Otomatis
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setSelectedOutageForPreview(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  onSendAutomatedNotification(selectedOutageForPreview);
                  setSelectedOutageForPreview(null);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Broadcast Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TECHNICIAN REPAIR EXECUTION (SPK EXECUTION) */}
      {selectedSpkForExecution && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Wrench className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-lg text-white">Eksekusi SPK & Pemulihan Sinyal</h3>
                  <span className="text-xs text-cyan-400 font-mono">{selectedSpkForExecution.id}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSpkForExecution(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400 font-medium">Tindakan Lapangan:</div>
                <div className="font-semibold text-slate-200 mt-0.5">{selectedSpkForExecution.actionRequired}</div>
              </div>

              {/* Optical Power measurement input */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Redaman Sebelum (LOS)</span>
                  <span className="text-base font-bold font-mono text-rose-400 mt-1 block">
                    {selectedSpkForExecution.beforeOpticalDb || -32.5} dBm
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-blue-500/40">
                  <label className="text-cyan-400 block text-[11px] font-bold">Hasil Pengukuran Baru (OTDR/OPM)</label>
                  <div className="flex items-center space-x-1 mt-1">
                    <input
                      type="number"
                      step="0.1"
                      value={repairForm.afterOpticalDb}
                      onChange={e => setRepairForm(prev => ({ ...prev, afterOpticalDb: Number(e.target.value) }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                    />
                    <span className="text-slate-300 font-mono">dBm</span>
                  </div>
                </div>
              </div>

              {/* Field Technician checklist */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-slate-200 block">Checklist Verifikasi Teknis</span>
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={repairForm.splicingCompleted}
                    onChange={e => setRepairForm(prev => ({ ...prev, splicingCompleted: e.target.checked }))}
                    className="rounded border-slate-700 text-blue-500 w-4 h-4"
                  />
                  <span>Penyambungan core (Fusion Splicing) & Protection Sleeve terpasang sempurna</span>
                </label>
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={repairForm.ferruleCleaned}
                    onChange={e => setRepairForm(prev => ({ ...prev, ferruleCleaned: e.target.checked }))}
                    className="rounded border-slate-700 text-blue-500 w-4 h-4"
                  />
                  <span>Konektor SC-APC telah dibersihkan dengan Alkohol Isopropil 99%</span>
                </label>
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={repairForm.photoUploaded}
                    onChange={e => setRepairForm(prev => ({ ...prev, photoUploaded: e.target.checked }))}
                    className="rounded border-slate-700 text-blue-500 w-4 h-4"
                  />
                  <span>Dokumentasi foto tiang & angka display OPM terunggah</span>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Catatan Berita Acara Perbaikan</label>
                <textarea
                  rows={2}
                  value={repairForm.notes}
                  onChange={e => setRepairForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedSpkForExecution(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResolveWorkOrder(
                      selectedSpkForExecution.id,
                      repairForm.afterOpticalDb,
                      repairForm.notes
                    );
                    setSelectedSpkForExecution(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Selesaikan & Pulihkan Sinyal Jaringan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
