import React, { useState } from 'react';
import { 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  RefreshCw, 
  ExternalLink, 
  Sliders, 
  Terminal, 
  ShieldCheck, 
  Key, 
  Zap, 
  Check, 
  X, 
  Wifi, 
  Radio, 
  ArrowRight,
  Database,
  Link2,
  Download,
  Trash2
} from 'lucide-react';
import { GenieACSConfig, GenieACSDevice, Customer } from '../types/ftth';
import { testGenieAcsConnection } from '../services/genieAcs';

interface GenieACSModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GenieACSConfig;
  onSaveConfig: (newConfig: GenieACSConfig) => void;
  devices: GenieACSDevice[];
  onSyncDevices: (customConfig?: GenieACSConfig, autoImport?: boolean) => Promise<void>;
  customers: Customer[];
  onRebootDevice: (deviceId: string) => Promise<void>;
  onClearDemoData?: () => void;
  isLiveData?: boolean;
}

export const GenieACSModal: React.FC<GenieACSModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  devices,
  onSyncDevices,
  customers,
  onRebootDevice,
  onClearDemoData,
  isLiveData
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'settings' | 'devices' | 'guide'>('settings');
  const [formData, setFormData] = useState<GenieACSConfig>(config);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(
    config.isConnected ? { success: true, message: `Terhubung ke GenieACS NBI (${config.serverUrl}) - Status 200 OK` } : null
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [rebootingId, setRebootingId] = useState<string | null>(null);

  // Preset mappings for common ONT vendors
  const applyPreset = (preset: 'huawei' | 'zte' | 'fiberhome' | 'standard_tr181') => {
    if (preset === 'huawei') {
      setFormData(prev => ({
        ...prev,
        parameterMapping: {
          rxOpticalPower: 'InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.RxPower',
          txOpticalPower: 'InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.TxPower',
          serialNumber: 'InternetGatewayDevice.DeviceInfo.SerialNumber',
          ipAddress: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress',
          modelName: 'InternetGatewayDevice.DeviceInfo.ModelName',
          softwareVersion: 'InternetGatewayDevice.DeviceInfo.SoftwareVersion'
        }
      }));
    } else if (preset === 'zte') {
      setFormData(prev => ({
        ...prev,
        parameterMapping: {
          rxOpticalPower: 'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.RXPower',
          txOpticalPower: 'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.TXPower',
          serialNumber: 'InternetGatewayDevice.DeviceInfo.SerialNumber',
          ipAddress: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress',
          modelName: 'InternetGatewayDevice.DeviceInfo.ModelName',
          softwareVersion: 'InternetGatewayDevice.DeviceInfo.SoftwareVersion'
        }
      }));
    } else if (preset === 'fiberhome') {
      setFormData(prev => ({
        ...prev,
        parameterMapping: {
          rxOpticalPower: 'InternetGatewayDevice.WANDevice.1.X_FH_GponInterfaceConfig.RxPower',
          txOpticalPower: 'InternetGatewayDevice.WANDevice.1.X_FH_GponInterfaceConfig.TxPower',
          serialNumber: 'InternetGatewayDevice.DeviceInfo.SerialNumber',
          ipAddress: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress',
          modelName: 'InternetGatewayDevice.DeviceInfo.ModelName',
          softwareVersion: 'InternetGatewayDevice.DeviceInfo.SoftwareVersion'
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        parameterMapping: {
          rxOpticalPower: 'Device.Optical.Interface.1.RxPower',
          txOpticalPower: 'Device.Optical.Interface.1.TxPower',
          serialNumber: 'Device.DeviceInfo.SerialNumber',
          ipAddress: 'Device.IP.Interface.1.IPv4Address.1.IPAddress',
          modelName: 'Device.DeviceInfo.ModelName',
          softwareVersion: 'Device.DeviceInfo.SoftwareVersion'
        }
      }));
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await testGenieAcsConnection(formData);
      setIsTesting(false);
      setTestResult({
        success: res.success,
        message: res.message
      });

      if (res.success) {
        setFormData(prev => ({
          ...prev,
          isConnected: true,
          totalDevicesFound: res.totalDevices,
          onlineDevices: res.totalDevices
        }));
      }
    } catch (err: any) {
      setIsTesting(false);
      setTestResult({
        success: false,
        message: `Gagal menguji koneksi: ${err.message}`
      });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      ...formData,
      isConnected: true,
      lastSyncTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    });
    onClose();
  };

  const handleManualSync = async (autoImport: boolean = true) => {
    setIsSyncing(true);
    try {
      await onSyncDevices(formData, autoImport);
    } catch {
      // toast will notify
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTriggerReboot = async (deviceId: string) => {
    setRebootingId(deviceId);
    await onRebootDevice(deviceId);
    setRebootingId(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-600/30 border border-cyan-400/40">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Integrasi GenieACS TR-069 CWMP Server
                </h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                  formData.isConnected
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}>
                  {formData.isConnected ? 'Terhubung (Online)' : 'Belum Terhubung'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Konfigurasi alamat REST API NBI (Port 7557) untuk sinkronisasi otomatis ONT, telemetri daya optik Rx/Tx, dan remote reboot.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 px-5 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Alamat Server & Parameter TR-069</span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'devices'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Daftar Perangkat CPE ({devices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'guide'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Panduan Setup GenieACS Server</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Connection Status Box */}
              <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                formData.isConnected 
                  ? 'bg-emerald-950/30 border-emerald-500/40' 
                  : 'bg-slate-950 border-slate-800'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className={`p-2.5 rounded-xl ${
                    formData.isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      Endpoint NBI: <span className="font-mono text-cyan-400">{formData.serverUrl || 'Belum diisi'}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formData.lastSyncTime 
                        ? `Terakhir disinkronkan: ${formData.lastSyncTime} • ${formData.onlineDevices} ONT Online` 
                        : 'Tekan "Uji Koneksi" untuk memverifikasi endpoint REST API'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-300 border border-cyan-500/40 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Menguji...' : 'Uji Koneksi NBI'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleManualSync(true)}
                    disabled={isSyncing}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-cyan-600/30 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                  </button>
                </div>
              </div>

              {testResult && (
                <div className={`p-3.5 rounded-xl border text-xs font-mono flex items-center space-x-2 ${
                  testResult.success 
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' 
                    : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}

              {/* Server Address Inputs */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Link2 className="w-4 h-4 text-cyan-400" />
                  <span>Alamat Host & Port GenieACS</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">
                      GenieACS NBI API URL (Northbound Interface) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="http://192.168.1.50:7557 atau /genieacs"
                        value={formData.serverUrl}
                        onChange={e => setFormData(prev => ({ ...prev, serverUrl: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-slate-500 font-medium">Pilihan Cepat:</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, serverUrl: '/genieacs' }))}
                        className="text-[10px] bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 px-2 py-0.5 rounded border border-cyan-700 font-mono cursor-pointer"
                        title="Gunakan jalur Nginx proxy /genieacs (Bebas kendala CORS)"
                      >
                        ⚡ /genieacs (Nginx Proxy)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, serverUrl: 'http://127.0.0.1:7557' }))}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono cursor-pointer"
                      >
                        127.0.0.1:7557
                      </button>
                      {typeof window !== 'undefined' && window.location.hostname && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, serverUrl: `http://${window.location.hostname}:7557` }))}
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono cursor-pointer"
                        >
                          IP Server Saat Ini:7557
                        </button>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 mt-1.5 block">
                      Default port GenieACS NBI adalah <strong>7557</strong>. Jika aplikasi dibuka lewat domain/HTTPS, disarankan menggunakan proxy Nginx <code>/genieacs</code> agar tidak terblokir CORS.
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">
                      GenieACS Web UI URL (Opsional)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="http://192.168.1.50:3000"
                        value={formData.uiUrl}
                        onChange={e => setFormData(prev => ({ ...prev, uiUrl: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Tautan pintas ke dashboard resmi GenieACS GUI Anda.
                    </span>
                  </div>
                </div>

                {/* Authentication selector */}
                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-slate-300 font-semibold mb-1.5 text-xs">Metode Autentikasi NBI</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['none', 'basic', 'bearer'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, authType: type }))}
                        className={`p-2.5 rounded-xl border text-xs font-semibold capitalize transition-all cursor-pointer ${
                          formData.authType === type
                            ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/60'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {type === 'none' ? 'Tanpa Autentikasi (Default)' : type === 'basic' ? 'HTTP Basic Auth' : 'Bearer Token'}
                      </button>
                    ))}
                  </div>

                  {formData.authType === 'basic' && (
                    <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">Username NBI</label>
                        <input
                          type="text"
                          placeholder="admin"
                          value={formData.username || ''}
                          onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">Password NBI</label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={formData.password || ''}
                          onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {formData.authType === 'bearer' && (
                    <div className="mt-3 text-xs">
                      <label className="block text-slate-400 text-[11px] mb-1">API Key / Bearer Token</label>
                      <input
                        type="password"
                        placeholder="gnc_nbi_sec_..."
                        value={formData.apiKey || ''}
                        onChange={e => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* TR-069 Parameter Path Mapping */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Sliders className="w-4 h-4 text-cyan-400" />
                      <span>Pemetaan Parameter TR-069 (CWMP Parameter Mapping)</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tentukan path TR-069 parameter untuk membaca daya optik (Rx/Tx dBm) dan Serial Number perangkat.
                    </p>
                  </div>

                  {/* Vendor Presets */}
                  <div className="flex items-center space-x-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 px-2 font-mono">Preset:</span>
                    <button
                      type="button"
                      onClick={() => applyPreset('huawei')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 rounded font-medium cursor-pointer"
                    >
                      Huawei
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('zte')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 rounded font-medium cursor-pointer"
                    >
                      ZTE
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('fiberhome')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 rounded font-medium cursor-pointer"
                    >
                      Fiberhome
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('standard_tr181')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 rounded font-medium cursor-pointer"
                    >
                      TR-181
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Path Optical Rx Power (dBm)
                    </label>
                    <input
                      type="text"
                      value={formData.parameterMapping.rxOpticalPower}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        parameterMapping: { ...prev.parameterMapping, rxOpticalPower: e.target.value }
                      }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Path Optical Tx Power (dBm)
                    </label>
                    <input
                      type="text"
                      value={formData.parameterMapping.txOpticalPower}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        parameterMapping: { ...prev.parameterMapping, txOpticalPower: e.target.value }
                      }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Path ONT Serial Number
                    </label>
                    <input
                      type="text"
                      value={formData.parameterMapping.serialNumber}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        parameterMapping: { ...prev.parameterMapping, serialNumber: e.target.value }
                      }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Path WAN IP Address
                    </label>
                    <input
                      type="text"
                      value={formData.parameterMapping.ipAddress}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        parameterMapping: { ...prev.parameterMapping, ipAddress: e.target.value }
                      }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Pengaturan tersimpan langsung pada runtime & disinkronkan ke pelanggan.</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/30 cursor-pointer flex items-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan & Terapkan Konfigurasi</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: DEVICE LIST */}
          {activeTab === 'devices' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-white">
                      Perangkat ONT Terdaftar di GenieACS TR-069
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isLiveData 
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' 
                        : 'bg-amber-950 text-amber-300 border border-amber-700'
                    }`}>
                      {isLiveData ? '● Live Data Server' : '○ Data Simulasi Demo'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Data diambil secara real-time dari NBI API port 7557 dan dicocokkan otomatis dengan data pelanggan FTTH.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {onClearDemoData && (
                    <button
                      type="button"
                      onClick={onClearDemoData}
                      className="bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
                      title="Bersihkan data dummy demo agar hanya menyisakan data real dari server Anda"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Reset Demo</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleManualSync(true)}
                    disabled={isSyncing}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer shadow-md shadow-cyan-600/30"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan & Impor ke Pelanggan'}</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Serial Number & Vendor</th>
                      <th className="py-3 px-4">Model & Firmware</th>
                      <th className="py-3 px-4">IP WAN</th>
                      <th className="py-3 px-4">Optical Rx Power</th>
                      <th className="py-3 px-4">Pelanggan Terhubung</th>
                      <th className="py-3 px-4 text-right">Aksi TR-069</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {devices.map(device => {
                      const isRebooting = rebootingId === device._id;

                      return (
                        <tr key={device._id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-4">
                            <div className="font-bold text-cyan-300">{device.serialNumber}</div>
                            <div className="text-[10px] text-slate-400 font-sans">{device.manufacturer}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-slate-200">{device.modelName}</div>
                            <div className="text-[10px] text-slate-400">{device.softwareVersion}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {device.ipAddress}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`font-bold ${
                              device.rxOpticalPower < -28 
                                ? 'text-rose-400' 
                                : device.rxOpticalPower < -24 
                                ? 'text-amber-400' 
                                : 'text-emerald-400'
                            }`}>
                              {device.rxOpticalPower} dBm
                            </span>
                            <span className="text-[9px] text-slate-500 block font-sans">
                              Inform: {device.lastInform}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-sans">
                            {device.matchedCustomerName ? (
                              <div>
                                <span className="font-semibold text-slate-200 block text-xs">{device.matchedCustomerName}</span>
                                <span className="text-[10px] text-emerald-400 font-mono">Tersinkronisasi</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[10px] italic">Belum terasosiasi</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-sans">
                            <button
                              onClick={() => handleTriggerReboot(device._id)}
                              disabled={isRebooting}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 ml-auto cursor-pointer border border-slate-700"
                              title="Kirim perintah Reboot via TR-069 NBI Task"
                            >
                              <RotateCcw className={`w-3 h-3 text-amber-400 ${isRebooting ? 'animate-spin' : ''}`} />
                              <span>{isRebooting ? 'Rebooting...' : 'Reboot ONT'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: STEP-BY-STEP GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>Cara Mengaktifkan NBI REST API di Server GenieACS</span>
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Secara default, GenieACS memiliki 4 daemon service utama: <code>cwmp</code> (Port 7547), <code>nbi</code> (Port 7557), <code>fs</code> (Port 7567), dan <code>ui</code> (Port 3000). Dashboard GENIACS berkomunikasi melalui <strong>GenieACS NBI (Port 7557)</strong>.
                </p>

                <div className="space-y-3 pt-2 font-mono text-[11px]">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 block font-sans text-xs font-semibold">1. Cek status service genieacs-nbi di server Linux:</span>
                    <pre className="text-emerald-400 overflow-x-auto">sudo systemctl status genieacs-nbi</pre>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 block font-sans text-xs font-semibold">2. Konfigurasi alamat listen dan port di /opt/genieacs/genieacs.env:</span>
                    <pre className="text-cyan-300 overflow-x-auto">{`GENIEACS_NBI_IP=0.0.0.0
GENIEACS_NBI_PORT=7557`}</pre>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 block font-sans text-xs font-semibold">3. Contoh pengujian curl dari mesin lokal / server:</span>
                    <pre className="text-amber-300 overflow-x-auto">{`curl -i http://<IP_GENIEACS>:7557/devices/`}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
