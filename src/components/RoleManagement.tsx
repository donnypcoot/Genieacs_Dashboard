import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Wrench, 
  Users, 
  Check, 
  X, 
  Lock, 
  Unlock, 
  Activity, 
  UserPlus, 
  Phone, 
  Mail, 
  MapPin,
  Clock,
  Radio
} from 'lucide-react';
import { UserProfile, UserRole } from '../types/ftth';

interface RoleManagementProps {
  users: UserProfile[];
  currentUser: UserProfile;
  onRoleSwitch: (role: UserRole) => void;
  onSelectUser: (user: UserProfile) => void;
}

export const RoleManagement: React.FC<RoleManagementProps> = ({
  users,
  currentUser,
  onRoleSwitch,
  onSelectUser
}) => {
  const permissionsList = [
    {
      feature: 'Lihat Topologi Peta FTTH GIS & Status ODP',
      admin: true,
      technician: true,
      description: 'Memantau posisi node dan redaman sinyal optik secara real-time.'
    },
    {
      feature: 'Tambah / Modifikasi / Hapus Node (OLT, ODC, ODP)',
      admin: true,
      technician: false,
      description: 'Merombak arsitektur kabel dan menambahkan perangkat utama jaringan.'
    },
    {
      feature: 'Tarik Kabel Serat & Konfigurasi Core Fiber',
      admin: true,
      technician: false,
      description: 'Menghubungkan feeder, distribution, dan menentukan core count.'
    },
    {
      feature: 'Uji Reflektometer OTDR & Pengukuran Daya (OPM)',
      admin: true,
      technician: true,
      description: 'Mendiagnosis titik putus dan redaman dBm dari ODP ke ONT.'
    },
    {
      feature: 'Registrasi Pelanggan Baru & Alokasi Port Splitter',
      admin: true,
      technician: false,
      description: 'Mendaftarkan akun baru dan menentukan port splitter di ODP.'
    },
    {
      feature: 'Lihat Data Kontak & Diagnostik Remote ONT Pelanggan',
      admin: true,
      technician: true,
      description: 'Melihat alamat, nomor HP, dan merestart ONT untuk perbaikan teknis.'
    },
    {
      feature: 'Hapus Pelanggan & Modifikasi Paket / Tarif',
      admin: true,
      technician: false,
      description: 'Mengubah paket internet dan menghapus data pelanggan terdaftar.'
    },
    {
      feature: 'Kirim Broadcast Notifikasi Otomatis Massal (WhatsApp/SMS)',
      admin: true,
      technician: false,
      description: 'Memicu pengiriman pesan blast darurat ke pelanggan di ODP terdampak.'
    },
    {
      feature: 'Eksekusi & Update Hasil Perbaikan Lapangan (SPK)',
      admin: true,
      technician: true,
      description: 'Mengisi checklist penyambungan fiber, input redaman baru, dan menyelesaikan tugas.'
    },
    {
      feature: 'Pengaturan Tim & Role Access Control',
      admin: true,
      technician: false,
      description: 'Mengelola hak akses anggota NOC dan teknisi lapangan.'
    }
  ];

  const auditLogs = [
    {
      user: 'Donny Prasetyo',
      role: 'admin',
      action: 'Memicu broadcast darurat ke 12 pelanggan ODP-MLT-03',
      timestamp: '18 menit lalu'
    },
    {
      user: 'Ahmad Fauzi',
      role: 'field_technician',
      action: 'Memperbarui progres SPK-2024-0091: Persiapan fusion splicer',
      timestamp: '25 menit lalu'
    },
    {
      user: 'Rian Pratama',
      role: 'admin',
      action: 'Mendisposisikan SPK-2024-0089 ke Budi Santoso',
      timestamp: '1 jam lalu'
    },
    {
      user: 'Ahmad Fauzi',
      role: 'field_technician',
      action: 'Menyelesaikan pemasangan PSB baru di Ruko Harmoni (SPK-2024-0085)',
      timestamp: '2 jam lalu'
    }
  ];

  return (
    <div className="p-6 bg-slate-950 min-h-[calc(100vh-4rem)] space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <ShieldCheck className="w-7 h-7 text-cyan-400" />
            <span>Manajemen Akses Pengguna & Role Tim</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurasi pembagian hak akses terpisah antara Admin NOC Supervisor dan Staf Lapangan / Field Technician.
          </p>
        </div>

        {/* Current Role Indicator Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-2 rounded-2xl space-x-3">
          <div className="text-xs text-slate-400 pl-2">
            Simulasi Role Aktif:
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => onRoleSwitch('admin')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentUser.role === 'admin'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin NOC (Akses Penuh)</span>
            </button>
            <button
              onClick={() => onRoleSwitch('field_technician')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentUser.role === 'field_technician'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Staf Lapangan (Akses Terbatas)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Role Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Admin Card */}
        <div className={`p-5 rounded-2xl border transition-all ${
          currentUser.role === 'admin'
            ? 'bg-blue-950/30 border-blue-500/50 shadow-xl'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Admin / NOC Supervisor</h3>
                <span className="text-[11px] text-cyan-400 font-mono">Full Infrastructure & Master Control</span>
              </div>
            </div>
            {currentUser.role === 'admin' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                Role Anda Saat Ini
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300 mt-3 leading-relaxed">
            Memiliki wewenang penuh untuk merancang topologi peta FTTH real-time, menambah/menghapus perangkat OLT & ODP, mengelola database pelanggan, melakukan blast notifikasi WhatsApp massal, serta menerbitkan surat tugas pemeliharaan.
          </p>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Tingkat Otoritas: Master (Level 1)</span>
            <span className="font-mono text-cyan-400">10 / 10 Hak Akses</span>
          </div>
        </div>

        {/* Field Tech Card */}
        <div className={`p-5 rounded-2xl border transition-all ${
          currentUser.role === 'field_technician'
            ? 'bg-amber-950/30 border-amber-500/50 shadow-xl'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Staf Lapangan / Field Technician</h3>
                <span className="text-[11px] text-amber-400 font-mono">Operational & Maintenance Only</span>
              </div>
            </div>
            {currentUser.role === 'field_technician' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Role Anda Saat Ini
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300 mt-3 leading-relaxed">
            Dikhususkan untuk tim teknisi di lokasi kejadian. Akses terbatas hanya untuk melihat rute titik tiang ODP, menjalankan pengujian redaman sinyal optik, memperbarui status tiket SPK, dan melaporkan hasil penyambungan fiber (splicing). Dibatasi dari pengubahan arsitektur dan billing.
          </p>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Tingkat Otoritas: Lapangan (Level 2)</span>
            <span className="font-mono text-amber-400">4 / 10 Hak Akses (Terbatas)</span>
          </div>
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>Matriks Perbandingan Hak Akses (Role Permissions Matrix)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Rincian kontrol izin akses yang diterapkan pada sistem GENIACS FTTH.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-mono tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Fitur & Kemampuan Sistem</th>
                <th className="py-3 px-4 font-semibold text-center w-36">Admin NOC</th>
                <th className="py-3 px-4 font-semibold text-center w-36">Staf Lapangan</th>
                <th className="py-3 px-4 font-semibold">Catatan Otoritas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {permissionsList.map((perm, index) => (
                <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-200">
                    {perm.feature}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {perm.admin ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400">
                        <Check className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-500/20 text-rose-400">
                        <X className="w-4 h-4" />
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {perm.technician ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400">
                        <Check className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-500/20 text-rose-400">
                        <X className="w-4 h-4" />
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {perm.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Members List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Daftar Anggota Tim & Penugasan Wilayah</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">{users.length} Akun Terdaftar</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map(user => {
            const isCurrent = currentUser.id === user.id;

            return (
              <div 
                key={user.id}
                onClick={() => onSelectUser(user)}
                className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-slate-950 border-cyan-500/60 shadow-lg'
                    : 'bg-slate-950 hover:bg-slate-800/40 border-slate-800'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-700"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-white">{user.name}</h4>
                      {isCurrent && (
                        <span className="text-[9px] bg-cyan-950 text-cyan-300 font-bold px-1.5 py-0.5 rounded border border-cyan-800">
                          Aktif
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>{user.zone}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {user.phone} • {user.email}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase font-mono ${
                    user.role === 'admin'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {user.role === 'admin' ? 'Admin NOC' : 'Staf Lapangan'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Audit Trail */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Riwayat Audit Aktivitas Tim (Security & Activity Trail)</span>
        </h3>

        <div className="space-y-2">
          {auditLogs.map((log, i) => (
            <div key={i} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  log.role === 'admin' ? 'bg-blue-950 text-blue-300' : 'bg-amber-950 text-amber-300'
                }`}>
                  {log.user}
                </span>
                <span className="text-slate-300">{log.action}</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px] whitespace-nowrap">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
