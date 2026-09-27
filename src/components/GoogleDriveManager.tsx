import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  FolderPlus, 
  Upload, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  Search, 
  FileText, 
  Folder, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Download,
  Database,
  Layers,
  Users,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  logoutGoogle, 
  getAccessToken 
} from '../services/googleAuth';
import { 
  listDriveFiles, 
  createDriveFolder, 
  uploadDriveFile, 
  deleteDriveFile, 
  DriveFileItem 
} from '../services/googleDrive';
import { FTTHNode, FTTHCable, Customer, WorkOrder } from '../types/ftth';

interface GoogleDriveManagerProps {
  isOpen?: boolean;
  isModal?: boolean;
  onClose?: () => void;
  nodes: FTTHNode[];
  cables: FTTHCable[];
  customers: Customer[];
  workOrders: WorkOrder[];
  onNotify: (msg: string) => void;
}

export const GoogleDriveManager: React.FC<GoogleDriveManagerProps> = ({
  isOpen = true,
  isModal = true,
  onClose,
  nodes,
  cables,
  customers,
  workOrders,
  onNotify
}) => {
  if (isModal && !isOpen) return null;

  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // New Folder Modal
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('GENIACS-FTTH-Data');

  // Mandatory Explicit Confirmation Modal for Deletion
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Init Auth on open
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, accessToken) => {
        setGoogleUser(user);
        setToken(accessToken);
        fetchFiles(accessToken);
      },
      () => {
        setGoogleUser(null);
        setToken(null);
        setFiles([]);
      }
    );

    return () => unsubscribe();
  }, []);

  const fetchFiles = async (accessToken?: string) => {
    const activeToken = accessToken || token || await getAccessToken();
    if (!activeToken) return;

    setIsLoadingFiles(true);
    try {
      const items = await listDriveFiles(activeToken, undefined, searchQuery);
      setFiles(items);
    } catch (err: any) {
      console.error('Fetch Drive Files Error:', err);
      onNotify(`Gagal memuat Google Drive: ${err.message || 'Error'}`);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setToken(result.accessToken);
        onNotify(`Berhasil terhubung dengan Google Drive (${result.user.email})!`);
        fetchFiles(result.accessToken);
      }
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      onNotify(`Login Google dibatalkan atau gagal: ${err.message || ''}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setToken(null);
    setFiles([]);
    onNotify('Telah keluar dari akun Google.');
  };

  // Export & Backup FTTH Data to Google Drive
  const handleBackupToDrive = async (type: 'json' | 'csv') => {
    const activeToken = token || await getAccessToken();
    if (!activeToken) {
      onNotify('Silakan login dengan Google terlebih dahulu.');
      return;
    }

    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

      if (type === 'json') {
        const payload = {
          appName: 'GENIACS FTTH Management',
          exportedAt: new Date().toISOString(),
          version: '3.4',
          networkNodes: nodes,
          cables: cables,
          customers: customers,
          workOrders: workOrders
        };

        const fileName = `GENIACS_FTTH_Backup_${timestamp}.json`;
        const content = JSON.stringify(payload, null, 2);
        await uploadDriveFile(activeToken, fileName, 'application/json', content);
        onNotify(`✅ Berhasil mencadangkan seluruh data FTTH ke Google Drive (${fileName})!`);
      } else {
        // CSV Export for Customers
        let csvContent = 'ID_Pelanggan,Nama,No_HP,Alamat,Area,Paket_Mbps,Tarif_IDR,ODP,Port,ONT_SN,Rx_dBm,Status\n';
        customers.forEach(c => {
          csvContent += `"${c.accountNumber}","${c.name}","${c.phone}","${c.address}","${c.area}","${c.packagePlan}",${c.monthlyFee},"${c.odpId}",${c.odpPort},"${c.ontSerialNumber}",${c.rxOpticalPower},"${c.status}"\n`;
        });

        const fileName = `GENIACS_Pelanggan_FTTH_${timestamp}.csv`;
        await uploadDriveFile(activeToken, fileName, 'text/csv', csvContent);
        onNotify(`✅ Berhasil mencadangkan data pelanggan ke Google Drive (${fileName})!`);
      }

      // Refresh list
      fetchFiles(activeToken);
    } catch (err: any) {
      console.error('Backup error:', err);
      onNotify(`Gagal backup ke Google Drive: ${err.message || 'Error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Create New Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeToken = token || await getAccessToken();
    if (!activeToken || !newFolderName.trim()) return;

    try {
      await createDriveFolder(activeToken, newFolderName.trim());
      onNotify(`Folder "${newFolderName}" berhasil dibuat di Google Drive!`);
      setShowNewFolderModal(false);
      fetchFiles(activeToken);
    } catch (err: any) {
      onNotify(`Gagal membuat folder: ${err.message}`);
    }
  };

  // Explicit User Confirmation for Destructive Delete Operation (MANDATORY PER SKILL)
  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    const activeToken = token || await getAccessToken();
    if (!activeToken) return;

    setIsDeleting(true);
    try {
      await deleteDriveFile(activeToken, fileToDelete.id);
      onNotify(`Berkas "${fileToDelete.name}" telah dihapus dari Google Drive.`);
      setFileToDelete(null);
      fetchFiles(activeToken);
    } catch (err: any) {
      onNotify(`Gagal menghapus berkas: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const managerContent = (
    <div className={`bg-slate-900 border border-slate-800 rounded-3xl w-full shadow-2xl overflow-hidden flex flex-col ${
      isModal ? 'max-w-4xl max-h-[90vh]' : 'max-w-6xl mx-auto'
    }`}>
      {/* Modal Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/40">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Integrasi Google Drive Workspace
              </h2>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                googleUser
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {googleUser ? 'Terhubung' : 'Belum Login'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Penyimpanan cloud dokumen jaringan FTTH, backup topologi OLT/ODP, ekspor data pelanggan, dan berkas SPK teknisi.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Auth Bar or Sign in Prompt */}
      <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {googleUser ? (
          <div className="flex items-center space-x-3">
            <img
              src={googleUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces'}
              alt={googleUser.displayName || 'Google User'}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/40"
            />
            <div>
              <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                <span>{googleUser.displayName || 'Akun Google'}</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 font-mono px-1.5 py-0.2 rounded border border-emerald-800">
                  Drive API Aktif
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">{googleUser.email}</div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-300">
            Masuk dengan akun Google Anda untuk mengizinkan GENIACS menyimpan dan mencadangkan data jaringan ke Google Drive.
          </div>
        )}

        <div className="flex items-center space-x-2">
          {!googleUser ? (
            /* Official Google Sign-In Button styled per workspace_integration skill guidelines */
            <button
              onClick={handleSignIn}
              disabled={isLoggingIn}
              className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-xs font-medium rounded-xl group bg-gradient-to-br from-blue-500 to-indigo-600 group-hover:from-blue-500 group-hover:to-indigo-600 text-white shadow-lg shadow-blue-500/25 cursor-pointer disabled:opacity-50"
            >
              <span className="relative px-3.5 py-2 transition-all ease-in duration-75 bg-slate-900 rounded-[10px] group-hover:bg-opacity-0 flex items-center space-x-2">
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isLoggingIn ? 'Menghubungkan...' : 'Sign in with Google'}</span>
              </span>
            </button>
          ) : (
            <button
              onClick={handleSignOut}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-xl flex items-center space-x-1.5 cursor-pointer border border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Quick Actions Panel */}
        {googleUser && (
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Aksi Pencadangan & Ekspor ke Google Drive</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Simpan Otomatis ke Cloud</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleBackupToDrive('json')}
                disabled={isExporting}
                className="bg-slate-900 hover:bg-slate-850 p-3 rounded-xl border border-slate-700 hover:border-cyan-500/50 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-400">
                    Backup Lengkap (JSON)
                  </span>
                  <Upload className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Seluruh {nodes.length} node, {cables.length} kabel, {customers.length} pelanggan & riwayat SPK.
                </p>
              </button>

              <button
                onClick={() => handleBackupToDrive('csv')}
                disabled={isExporting}
                className="bg-slate-900 hover:bg-slate-850 p-3 rounded-xl border border-slate-700 hover:border-emerald-500/50 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400">
                    Ekspor Pelanggan (CSV)
                  </span>
                  <FileText className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Daftar {customers.length} pelanggan, port ODP & status redaman untuk Google Sheets / Excel.
                </p>
              </button>

              <button
                onClick={() => setShowNewFolderModal(true)}
                className="bg-slate-900 hover:bg-slate-850 p-3 rounded-xl border border-slate-700 hover:border-amber-500/50 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-amber-400">
                    Buat Folder Baru
                  </span>
                  <FolderPlus className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Organisasi dokumen teknisi dan laporan harian NOC.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Drive Explorer Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari berkas di Google Drive..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchFiles()}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchFiles()}
              disabled={isLoadingFiles || !googleUser}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoadingFiles ? 'animate-spin' : ''}`} />
              <span>Refresh File</span>
            </button>
          </div>
        </div>

        {/* Files Table / List */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
          {!googleUser ? (
            <div className="py-12 px-4 text-center space-y-3">
              <Cloud className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">Belum Terhubung ke Google Drive</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Silakan tekan tombol "Sign in with Google" di bagian atas untuk melihat dan mengelola berkas Drive Anda.
              </p>
            </div>
          ) : isLoadingFiles ? (
            <div className="py-12 px-4 text-center text-xs text-cyan-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
              <span>Memuat berkas dari Google Drive API...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2 text-xs text-slate-400">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <span>Tidak ada berkas yang ditemukan di Google Drive Anda.</span>
              <p className="text-[11px] text-slate-500">
                Gunakan tombol "Backup Lengkap" di atas untuk membuat berkas cadangan pertama Anda!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Nama Berkas</th>
                    <th className="py-3 px-4">Tipe Berkas</th>
                    <th className="py-3 px-4">Terakhir Diubah</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {files.map(file => {
                    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

                    return (
                      <tr key={file.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2.5">
                            {isFolder ? (
                              <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                            ) : file.name.endsWith('.json') ? (
                              <Database className="w-4 h-4 text-cyan-400 shrink-0" />
                            ) : file.name.endsWith('.csv') ? (
                              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span className="font-semibold text-slate-200 truncate max-w-xs block">
                              {file.name}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-[11px] font-mono text-slate-400">
                          {isFolder ? 'Folder' : file.mimeType.split('.').pop() || file.mimeType}
                        </td>

                        <td className="py-3 px-4 text-[11px] text-slate-400 font-mono">
                          {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 bg-slate-800 hover:bg-cyan-600/30 text-cyan-300 rounded-lg border border-cyan-500/30 transition-colors"
                                title="Buka di Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {/* Delete button triggers explicit confirmation modal */}
                            <button
                              onClick={() => setFileToDelete(file)}
                              className="p-1.5 bg-slate-800 hover:bg-rose-950 text-rose-400 rounded-lg border border-slate-700 hover:border-rose-500/40 transition-colors cursor-pointer"
                              title="Hapus Berkas dari Google Drive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Terhubung aman melalui OAuth 2.0 (Google Workspace API).</span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
          >
            Tutup
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {isModal ? (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {managerContent}
        </div>
      ) : (
        <div className="p-6 bg-slate-950 min-h-[calc(100vh-4rem)] space-y-6">
          {managerContent}
        </div>
      )}
      {/* MODAL: CREATE NEW FOLDER */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                <FolderPlus className="w-4 h-4 text-amber-400" />
                <span>Buat Folder Baru di Google Drive</span>
              </h4>
              <button onClick={() => setShowNewFolderModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-3">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1">Nama Folder</label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Buat Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY CONFIRMATION MODAL FOR DESTRUCTIVE DELETE OPERATION */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-slate-950/90 z-60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">
                  Konfirmasi Penghapusan Berkas Google Drive
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus berkas <strong className="text-white font-mono">"{fileToDelete.name}"</strong> dari Google Drive Anda?
                </p>
                <p className="text-[11px] text-rose-400 mt-2">
                  Tindakan ini akan menghapus berkas secara permanen dari akun Google Drive Anda.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setFileToDelete(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteFile}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-md shadow-rose-600/30 cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Berkas'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
