import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  RotateCcw, 
  Send, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  X, 
  Server,
  Zap,
  Play
} from 'lucide-react';
import { Customer, FTTHNode } from '../types/ftth';

interface DiagnosticModalProps {
  customer: Customer;
  node?: FTTHNode;
  onClose: () => void;
  onSendWhatsapp: (customer: Customer, message: string) => void;
}

export const DiagnosticModal: React.FC<DiagnosticModalProps> = ({
  customer,
  node,
  onClose,
  onSendWhatsapp
}) => {
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [customMsg, setCustomMsg] = useState('');
  const [showCustomWhatsapp, setShowCustomWhatsapp] = useState(false);

  const isLos = customer.status === 'los_down';
  const isHighLoss = customer.status === 'high_loss';

  // Initial diagnostic run on modal mount
  useEffect(() => {
    runDiagnostic();
  }, [customer.id]);

  const runDiagnostic = () => {
    setIsRunningTest(true);
    setLogs([
      `[${new Date().toLocaleTimeString()}] Memulai sesi OMCI diagnostic ke ONT ${customer.ontSerialNumber}...`,
      `[${new Date().toLocaleTimeString()}] Pinging Gateway IP ${customer.ipAddress} (TTL=64, MTU=1500)...`,
    ]);

    setTimeout(() => {
      if (isLos) {
        setLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ERROR: Request timeout! Tidak ada respon dari IP ${customer.ipAddress}.`,
          `[${new Date().toLocaleTimeString()}] Status OMCI: Link Down / Loss of Signal (LOS).`,
          `[${new Date().toLocaleTimeString()}] Rx Optical Power: ${customer.rxOpticalPower} dBm (Di bawah batas sensitivitas -28 dBm).`,
          `[${new Date().toLocaleTimeString()}] KESIMPULAN: Terdeteksi putusnya sinyal optik dari ODP ${node?.code || customer.odpId}. Perlu penanganan teknisi.`
        ]);
      } else if (isHighLoss) {
        setLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Respon diterima dari ${customer.ipAddress}: RTT = 12ms.`,
          `[${new Date().toLocaleTimeString()}] OMCI Status: Normal Registered (GPON GEM Port 2).`,
          `[${new Date().toLocaleTimeString()}] PERINGATAN: Rx Optical Power: ${customer.rxOpticalPower} dBm (Mendekati ambang batas kritis).`,
          `[${new Date().toLocaleTimeString()}] FEC Counter: 142 correctable errors / min.`,
          `[${new Date().toLocaleTimeString()}] KESIMPULAN: Layanan aktif, namun koneksi terdegradasi. Disarankan pembersihan patchcord optik.`
        ]);
      } else {
        setLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Respon diterima dari ${customer.ipAddress}: RTT = 4.2ms, Packet Loss = 0%.`,
          `[${new Date().toLocaleTimeString()}] OMCI Status: O5 (Operational Full Speed).`,
          `[${new Date().toLocaleTimeString()}] Rx Optical Power: ${customer.rxOpticalPower} dBm (Sangat Prima / Optimal).`,
          `[${new Date().toLocaleTimeString()}] Tx Optical Power: +${customer.txOpticalPower} dBm. Laser Bias: 14.2 mA.`,
          `[${new Date().toLocaleTimeString()}] LAN1 Status: 1000 Mbps Full Duplex. CPU: 12%, RAM: 34%.`,
          `[${new Date().toLocaleTimeString()}] KESIMPULAN: ONT beroperasi normal tanpa kendala.`
        ]);
      }
      setIsRunningTest(false);
    }, 1000);
  };

  const handleReboot = () => {
    setIsRebooting(true);
    setLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Mengirim sinyal OMCI Reset Command 0x1F ke ${customer.ontSerialNumber}...`,
      `[${new Date().toLocaleTimeString()}] ONT sedang melakukan cold reboot...`
    ]);

    setTimeout(() => {
      setIsRebooting(false);
      setLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Reboot selesai. ONT berhasil re-sinkronisasi dalam 14 detik.`
      ]);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isLos ? 'bg-rose-500/20 text-rose-400' : 'bg-cyan-500/20 text-cyan-400'
            }`}>
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Remote Diagnostik ONT Pelanggan</h3>
              <p className="text-xs text-slate-400 font-mono">
                {customer.name} • {customer.accountNumber} • {customer.ontSerialNumber}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick status bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Status ONT</span>
            <span className={`font-bold mt-0.5 block ${isLos ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isLos ? 'LOS (Putus)' : 'Online Registered'}
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Rx Optical Power</span>
            <span className={`font-bold font-mono mt-0.5 block ${
              isLos ? 'text-rose-400' : isHighLoss ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {customer.rxOpticalPower} dBm
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Titik ODP & Port</span>
            <span className="font-bold font-mono text-cyan-400 mt-0.5 block">
              {node?.code || customer.odpId} #{customer.odpPort}
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Panjang Drop Cable</span>
            <span className="font-bold font-mono text-slate-200 mt-0.5 block">
              {customer.dropCableLengthMeters} Meter
            </span>
          </div>
        </div>

        {/* Live Terminal Output */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs space-y-1.5 h-56 overflow-y-auto">
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-1.5 mb-2 text-[10px]">
            <span>GENIACS GPON CLI TELEMETRY ENGINE</span>
            <span>PORT: 161 (SNMP/OMCI)</span>
          </div>
          {logs.map((log, idx) => (
            <div 
              key={idx} 
              className={
                log.includes('ERROR') || log.includes('Putus') 
                  ? 'text-rose-400' 
                  : log.includes('PERINGATAN') 
                  ? 'text-amber-400' 
                  : log.includes('Sangat') || log.includes('beroperasi') 
                  ? 'text-emerald-400' 
                  : 'text-slate-300'
              }
            >
              {log}
            </div>
          ))}
          {isRunningTest && (
            <div className="text-cyan-400 animate-pulse">_ Mengukur reflektansi dan redaman laser...</div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={runDiagnostic}
              disabled={isRunningTest}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer border border-slate-700"
            >
              <Play className="w-3.5 h-3.5 text-cyan-400" />
              <span>Jalankan Ulang Diagnostik</span>
            </button>

            <button
              onClick={handleReboot}
              disabled={isRebooting || isLos}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer border border-slate-700"
              title={isLos ? 'Tidak dapat me-reboot ONT yang sedang LOS' : 'Kirim perintah reboot via OMCI'}
            >
              <RotateCcw className={`w-3.5 h-3.5 text-amber-400 ${isRebooting ? 'animate-spin' : ''}`} />
              <span>{isRebooting ? 'Me-reboot ONT...' : 'Reboot Remote ONT'}</span>
            </button>
          </div>

          <button
            onClick={() => setShowCustomWhatsapp(!showCustomWhatsapp)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim Notifikasi Langsung ke Pelanggan</span>
          </button>
        </div>

        {/* Custom WhatsApp sender box */}
        {showCustomWhatsapp && (
          <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40 space-y-3 pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Kirim Pesan WhatsApp Personal</span>
              <span className="text-slate-400 font-mono">Tujuan: {customer.phone}</span>
            </div>
            <textarea
              rows={2}
              placeholder={`Halo Bpk/Ibu ${customer.name}, status koneksi fiber optik Anda...`}
              value={customMsg}
              onChange={e => setCustomMsg(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-emerald-400"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowCustomWhatsapp(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  const finalMsg = customMsg.trim() || `Halo Bpk/Ibu ${customer.name}, tim NOC GENIACS telah melakukan diagnostik remote pada perangkat ONT Anda. Hasil pengukuran: ${customer.rxOpticalPower} dBm. Terima kasih.`;
                  onSendWhatsapp(customer, finalMsg);
                  setShowCustomWhatsapp(false);
                  setCustomMsg('');
                }}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim WhatsApp Sekarang</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
