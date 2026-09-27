import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { FTTHMap } from './components/FTTHMap';
import { CustomerManagement } from './components/CustomerManagement';
import { OutageAndMaintenance } from './components/OutageAndMaintenance';
import { AreaAnalytics } from './components/AreaAnalytics';
import { RoleManagement } from './components/RoleManagement';
import { DiagnosticModal } from './components/DiagnosticModal';
import { GenieACSModal } from './components/GenieACSModal';
import { GoogleDriveManager } from './components/GoogleDriveManager';

import {
  INITIAL_USERS,
  INITIAL_NODES,
  INITIAL_CABLES,
  INITIAL_CUSTOMERS,
  INITIAL_OUTAGES,
  INITIAL_WORK_ORDERS,
  INITIAL_NOTIFICATION_LOGS,
  INITIAL_AREA_ANALYTICS,
  INITIAL_GENIEACS_CONFIG,
  INITIAL_GENIEACS_DEVICES
} from './data/mockData';

import { 
  UserProfile, 
  UserRole, 
  FTTHNode, 
  FTTHCable, 
  Customer, 
  OutageAlert, 
  WorkOrder, 
  NotificationLog, 
  AreaAnalytics as AreaData,
  GenieACSConfig,
  GenieACSDevice
} from './types/ftth';

import { storage } from './services/storage';
import { 
  fetchRealGenieAcsDevices, 
  rebootRealGenieAcsDevice, 
  syncDevicesWithCustomers,
  parseRawGenieAcsJson
} from './services/genieAcs';

export default function App() {
  // Navigation & Role State
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USERS[0]); // Default: Admin

  // Core Data State with persistence
  const [nodes, setNodes] = useState<FTTHNode[]>(() => storage.getNodes(INITIAL_NODES));
  const [cables, setCables] = useState<FTTHCable[]>(() => storage.getCables(INITIAL_CABLES));
  const [customers, setCustomers] = useState<Customer[]>(() => storage.getCustomers(INITIAL_CUSTOMERS));
  const [outages, setOutages] = useState<OutageAlert[]>(() => storage.getOutages(INITIAL_OUTAGES));
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => storage.getWorkOrders(INITIAL_WORK_ORDERS));
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>(INITIAL_NOTIFICATION_LOGS);
  const [areaAnalytics, setAreaAnalytics] = useState<AreaData[]>(INITIAL_AREA_ANALYTICS);

  // GenieACS TR-069 Integration State with persistence
  const [genieAcsConfig, setGenieAcsConfig] = useState<GenieACSConfig>(() => storage.getConfig(INITIAL_GENIEACS_CONFIG));
  const [genieAcsDevices, setGenieAcsDevices] = useState<GenieACSDevice[]>(() => storage.getDevices(INITIAL_GENIEACS_DEVICES));
  const [isLiveData, setIsLiveData] = useState<boolean>(() => storage.isLiveData());
  const [isGenieAcsModalOpen, setIsGenieAcsModalOpen] = useState(false);

  // Auto-persist changes to localStorage
  useEffect(() => {
    storage.saveCustomers(customers);
  }, [customers]);

  useEffect(() => {
    storage.saveNodes(nodes);
  }, [nodes]);

  useEffect(() => {
    storage.saveCables(cables);
  }, [cables]);

  useEffect(() => {
    storage.saveOutages(outages);
  }, [outages]);

  useEffect(() => {
    storage.saveWorkOrders(workOrders);
  }, [workOrders]);

  useEffect(() => {
    storage.saveConfig(genieAcsConfig);
  }, [genieAcsConfig]);

  useEffect(() => {
    storage.saveDevices(genieAcsDevices);
  }, [genieAcsDevices]);

  // Google Drive Cloud Storage & Backup State
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState(false);

  // Modals & Diagnostic
  const [activeDiagnosticCustomer, setActiveDiagnosticCustomer] = useState<Customer | null>(null);
  const [isSimulatedCut, setIsSimulatedCut] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Switch between Admin & Field Tech
  const handleRoleSwitch = (newRole: UserRole) => {
    if (newRole === 'admin') {
      setCurrentUser(INITIAL_USERS[0]); // Donny Prasetyo
      showToast('Beralih ke mode: Admin NOC Supervisor (Akses Penuh)');
    } else {
      setCurrentUser(INITIAL_USERS[1]); // Ahmad Fauzi
      showToast('Beralih ke mode: Staf Lapangan / Field Tech (Akses Terbatas)');
    }
  };

  // Simulate Fiber Cable Cut Incident
  const handleSimulateOutage = () => {
    setIsSimulatedCut(true);

    // 1. Mark distribution cable D-MLT-03 as cut
    setCables(prev => prev.map(c => {
      if (c.id === 'cable-dst-03') {
        return { ...c, status: 'cut', attenuationDb: 18.5 };
      }
      return c;
    }));

    // 2. Mark ODP-MLT-03 as critical LOS
    setNodes(prev => prev.map(n => {
      if (n.id === 'node-odp-mlt-03') {
        return { ...n, status: 'critical', opticalPowerRx: -32.5 };
      }
      return n;
    }));

    // 3. Mark customers on ODP-MLT-03 as los_down
    setCustomers(prev => prev.map(c => {
      if (c.odpId === 'node-odp-mlt-03') {
        return { ...c, status: 'los_down', rxOpticalPower: -32.5, txOpticalPower: 0.0 };
      }
      return c;
    }));

    // 4. Ensure outage alert is active
    setOutages(prev => {
      const existing = prev.find(o => o.id === 'outage-01');
      if (existing) {
        return prev.map(o => o.id === 'outage-01' ? { ...o, status: 'dispatched', detectedAt: 'Baru saja' } : o);
      }
      return [
        {
          id: 'outage-01',
          title: 'Kabel Distribusi Putus (Fiber Cut) D-MLT-03',
          severity: 'critical',
          type: 'fiber_cut',
          nodeId: 'node-odp-mlt-03',
          nodeName: 'ODP Melati Blok C (Ruko)',
          cableId: 'cable-dst-03',
          area: 'Cluster Melati',
          impactedCustomersCount: 12,
          detectedAt: 'Baru saja',
          status: 'dispatched',
          estimatedResolutionMinutes: 45,
          description: 'Terdeteksi alarm Loss of Signal (LOS) serentak pada 12 ONT di ODP-MLT-03. Indikasi kabel udara tersenggol kendaraan tinggi.',
          autoNotificationSent: true,
          ticketId: 'SPK-2024-0091'
        },
        ...prev
      ];
    });

    // 5. Re-open work order SPK-2024-0091
    setWorkOrders(prev => prev.map(w => {
      if (w.id === 'SPK-2024-0091') {
        return { ...w, status: 'in_progress', afterOpticalDb: undefined };
      }
      return w;
    }));

    showToast('🚨 ALARM AKTIF: Terdeteksi Fiber Cut pada D-MLT-03! 12 Pelanggan LOS.');
  };

  // Reset Network back to normal
  const handleResetNetwork = () => {
    setIsSimulatedCut(false);

    // 1. Restore cable D-MLT-03
    setCables(prev => prev.map(c => {
      if (c.id === 'cable-dst-03') {
        return { ...c, status: 'active', attenuationDb: 0.28 };
      }
      return c;
    }));

    // 2. Restore node ODP-MLT-03
    setNodes(prev => prev.map(n => {
      if (n.id === 'node-odp-mlt-03') {
        return { ...n, status: 'normal', opticalPowerRx: -19.2 };
      }
      return n;
    }));

    // 3. Restore customers
    setCustomers(prev => prev.map(c => {
      if (c.odpId === 'node-odp-mlt-03') {
        return { ...c, status: 'active', rxOpticalPower: -19.2, txOpticalPower: 2.1 };
      }
      return c;
    }));

    // 4. Mark outages as resolved
    setOutages(prev => prev.map(o => {
      if (o.id === 'outage-01') {
        return { ...o, status: 'resolved' };
      }
      return o;
    }));

    // 5. Mark work order as resolved
    setWorkOrders(prev => prev.map(w => {
      if (w.id === 'SPK-2024-0091') {
        return { ...w, status: 'resolved', afterOpticalDb: -19.2, resolvedAt: 'Baru saja' };
      }
      return w;
    }));

    showToast('✅ Seluruh jaringan FTTH telah dipulihkan. Sinyal optik normal.');
  };

  // Node modifications
  const handleAddNode = (newNode: FTTHNode) => {
    setNodes(prev => [...prev, newNode]);
    showToast(`Node baru [${newNode.code}] berhasil ditempatkan di peta topologi.`);
  };

  const handleDeleteNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setCables(prev => prev.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId));
    showToast(`Node ${node?.code || nodeId} telah dihapus dari topologi.`);
  };

  const handleUpdateNodePosition = (nodeId: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, x, y } : n));
  };

  // Cable modifications
  const handleAddCable = (newCable: FTTHCable) => {
    setCables(prev => [...prev, newCable]);
    showToast(`Kabel baru (${newCable.name}) berhasil ditarik.`);
  };

  const handleDeleteCable = (cableId: string) => {
    setCables(prev => prev.filter(c => c.id !== cableId));
    showToast('Kabel telah dihapus.');
  };

  const handleToggleCableStatus = (cableId: string) => {
    const cable = cables.find(c => c.id === cableId);
    if (!cable) return;

    if (cable.status === 'cut') {
      // Restore
      setCables(prev => prev.map(c => c.id === cableId ? { ...c, status: 'active', attenuationDb: 0.3 } : c));
      showToast(`Kabel ${cable.name} telah selesai disambung ulang (Spliced).`);
    } else {
      // Cut
      setCables(prev => prev.map(c => c.id === cableId ? { ...c, status: 'cut', attenuationDb: 16.5 } : c));
      showToast(`Kabel ${cable.name} diputus untuk simulasi.`);
    }
  };

  // Customer modifications
  const handleAddCustomer = (newCustomer: Customer) => {
    setCustomers(prev => [newCustomer, ...prev]);

    // Update target ODP used ports
    setNodes(prev => prev.map(n => {
      if (n.id === newCustomer.odpId) {
        return { ...n, usedPorts: Math.min(n.capacityPorts, n.usedPorts + 1) };
      }
      return n;
    }));

    showToast(`Pelanggan baru ${newCustomer.name} (${newCustomer.accountNumber}) berhasil diaktifkan!`);
  };

  const handleDeleteCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setCustomers(prev => prev.filter(c => c.id !== customerId));
    if (customer) {
      setNodes(prev => prev.map(n => {
        if (n.id === customer.odpId) {
          return { ...n, usedPorts: Math.max(0, n.usedPorts - 1) };
        }
        return n;
      }));
    }
    showToast('Data pelanggan telah dihapus.');
  };

  // Jump from customer table to map
  const handleJumpToMapOdp = (odpId: string) => {
    setActiveTab('map');
  };

  // Automated notification broadcast trigger
  const handleSendAutomatedNotification = (outage: OutageAlert) => {
    setOutages(prev => prev.map(o => o.id === outage.id ? { ...o, autoNotificationSent: true } : o));

    const newLog: NotificationLog = {
      id: `notif-${Date.now()}`,
      timestamp: 'Baru saja',
      channel: 'whatsapp',
      targetCount: outage.impactedCustomersCount,
      title: `Pemberitahuan Otomatis: Gangguan Sinyal ${outage.nodeName}`,
      content: `Yth. Pelanggan GENIACS di ${outage.area}, gangguan sinyal optik pada ${outage.nodeName} sedang ditangani teknisi lapangan (${outage.ticketId || 'SPK'}). Estimasi perbaikan: ${outage.estimatedResolutionMinutes} menit.`,
      status: 'delivered',
      area: outage.area
    };

    setNotificationLogs(prev => [newLog, ...prev]);
    showToast(`✅ Pesan WhatsApp massal terkirim ke ${outage.impactedCustomersCount} pelanggan terdampak!`);
  };

  // Resolve Work Order (by Technician or Admin)
  const handleResolveWorkOrder = (workOrderId: string, afterOpticalDb: number, notes: string) => {
    const spk = workOrders.find(w => w.id === workOrderId);
    if (!spk) return;

    // 1. Mark work order resolved
    setWorkOrders(prev => prev.map(w => {
      if (w.id === workOrderId) {
        return {
          ...w,
          status: 'resolved',
          afterOpticalDb,
          notes,
          resolvedAt: 'Baru saja'
        };
      }
      return w;
    }));

    // 2. Restore linked node and customers
    if (spk.nodeId) {
      setNodes(prev => prev.map(n => {
        if (n.id === spk.nodeId) {
          return { ...n, status: 'normal', opticalPowerRx: afterOpticalDb };
        }
        return n;
      }));

      setCustomers(prev => prev.map(c => {
        if (c.odpId === spk.nodeId) {
          return { ...c, status: 'active', rxOpticalPower: afterOpticalDb, txOpticalPower: 2.1 };
        }
        return c;
      }));
    }

    // 3. Mark outage resolved
    if (spk.outageId) {
      setOutages(prev => prev.map(o => o.id === spk.outageId ? { ...o, status: 'resolved' } : o));
    }

    // 4. Restore cable if related
    setCables(prev => prev.map(c => {
      if (c.toNodeId === spk.nodeId || c.fromNodeId === spk.nodeId) {
        return { ...c, status: 'active', attenuationDb: 0.3 };
      }
      return c;
    }));

    // 5. Send automated restoration broadcast
    const restorationLog: NotificationLog = {
      id: `notif-${Date.now()}`,
      timestamp: 'Baru saja',
      channel: 'whatsapp',
      targetCount: 12,
      title: `Pemulihan Sukses: Jaringan ${spk.nodeName || spk.area} Normal Kembali`,
      content: `Kabar Baik! Perbaikan fiber optik oleh teknisi (${spk.technicianName}) telah rampung. Daya optik stabil pada ${afterOpticalDb} dBm. Layanan internet Anda telah pulih normal.`,
      status: 'delivered',
      area: spk.area
    };

    setNotificationLogs(prev => [restorationLog, ...prev]);
    showToast(`🎉 SPK ${workOrderId} selesai! Sinyal normal ${afterOpticalDb} dBm & pelanggan terpulihkan.`);
  };

  // Dispatch technician
  const handleDispatchTechnician = (outageId: string, technicianName: string, priority: any) => {
    const newSpk: WorkOrder = {
      id: `SPK-2024-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `Disposisi Perbaikan Cepat Insiden #${outageId}`,
      outageId,
      area: 'Cluster Melati',
      priority,
      status: 'dispatched',
      technicianName,
      technicianPhone: '+62 813-7721-9988',
      assignedAt: 'Baru saja',
      targetSla: '60 menit',
      actionRequired: 'Inspeksi redaman ODP, cek span kabel putus, dan lakukan fusion splicing ulang.',
      beforeOpticalDb: -32.0
    };

    setWorkOrders(prev => [newSpk, ...prev]);
    setOutages(prev => prev.map(o => o.id === outageId ? { ...o, status: 'dispatched', ticketId: newSpk.id } : o));
    showToast(`SPK ${newSpk.id} berhasil diterbitkan dan ditugaskan ke ${technicianName}.`);
  };

  // Direct WhatsApp message from customer row
  const handleSendWhatsappAlert = (customer: Customer) => {
    setActiveDiagnosticCustomer(customer);
  };

  const handleSendIndividualWhatsapp = (customer: Customer, message: string) => {
    const newLog: NotificationLog = {
      id: `notif-${Date.now()}`,
      timestamp: 'Baru saja',
      channel: 'whatsapp',
      targetCount: 1,
      title: `Pesan Personal ke ${customer.name} (${customer.phone})`,
      content: message,
      status: 'delivered',
      area: customer.area
    };
    setNotificationLogs(prev => [newLog, ...prev]);
    showToast(`Pesan WhatsApp terkirim ke ${customer.name} (${customer.phone}).`);
  };

  // Real Sync ONTs from GenieACS TR-069 NBI
  const handleSyncGenieAcsDevices = async (customConfig?: GenieACSConfig, autoImport: boolean = true) => {
    const activeConfig = customConfig || genieAcsConfig;
    showToast(`Menghubungkan ke GenieACS (${activeConfig.serverUrl})...`);

    try {
      // 1. Real call to GenieACS NBI API!
      const realDevices = await fetchRealGenieAcsDevices(activeConfig);

      if (realDevices.length === 0) {
        showToast('Tersambung ke GenieACS NBI, namun belum ada perangkat ONT yang terdaftar.');
      }

      setGenieAcsDevices(realDevices);
      storage.saveDevices(realDevices);

      // 2. Match with existing customers or auto-import real devices
      const { updatedCustomers, matchedCount, newImportedCount } = syncDevicesWithCustomers(
        realDevices,
        customers
      );

      setCustomers(updatedCustomers);
      storage.saveCustomers(updatedCustomers);

      const onlineCount = realDevices.filter(d => d.status === 'online').length;
      const updatedConfig: GenieACSConfig = {
        ...activeConfig,
        isConnected: true,
        totalDevicesFound: realDevices.length,
        onlineDevices: onlineCount,
        lastSyncTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
      };

      setGenieAcsConfig(updatedConfig);
      storage.saveConfig(updatedConfig);
      storage.setLiveData(true);
      setIsLiveData(true);

      showToast(`⚡ Sinkronisasi Sukses: ${realDevices.length} ONT terdeteksi (${matchedCount} diperbarui, ${newImportedCount} diimpor ke pelanggan)!`);
    } catch (err: any) {
      console.warn('Real fetch to GenieACS error:', err);
      showToast(`⚠️ Gagal sync GenieACS (${activeConfig.serverUrl}): ${err.message}`);
      throw err;
    }
  };

  // Real Remote Reboot via TR-069 Task
  const handleRebootGenieAcsDevice = async (deviceId: string) => {
    try {
      await rebootRealGenieAcsDevice(genieAcsConfig, deviceId);
      setGenieAcsDevices(prev => {
        const next = prev.map(d => {
          if (d._id === deviceId) {
            return { ...d, lastInform: 'Baru saja (Reboot Queued)' };
          }
          return d;
        });
        storage.saveDevices(next);
        return next;
      });
      showToast(`Perintah TR-069 Reboot berhasil dikirimkan ke GenieACS untuk perangkat ${deviceId}!`);
    } catch (err: any) {
      showToast(`Gagal reboot perangkat: ${err.message}`);
    }
  };

  // Manual import JSON output (e.g. from curl or file)
  const handleImportGenieAcsJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString.trim());
      const devicesArray = Array.isArray(parsed) ? parsed : [parsed];
      if (devicesArray.length === 0) {
        showToast('JSON valid tetapi tidak ada objek perangkat yang ditemukan.');
        return;
      }
      const realDevices = parseRawGenieAcsJson(devicesArray, genieAcsConfig);
      setGenieAcsDevices(realDevices);
      storage.saveDevices(realDevices);

      const { updatedCustomers, matchedCount, newImportedCount } = syncDevicesWithCustomers(
        realDevices,
        customers
      );
      setCustomers(updatedCustomers);
      storage.saveCustomers(updatedCustomers);
      
      const onlineCount = realDevices.filter(d => d.status === 'online').length;
      const updatedConfig: GenieACSConfig = {
        ...genieAcsConfig,
        isConnected: true,
        totalDevicesFound: realDevices.length,
        onlineDevices: onlineCount,
        lastSyncTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
      };
      setGenieAcsConfig(updatedConfig);
      storage.saveConfig(updatedConfig);
      storage.setLiveData(true);
      setIsLiveData(true);

      showToast(`⚡ Sukses Impor Manual: ${realDevices.length} ONT (${matchedCount} diperbarui, ${newImportedCount} diimpor ke pelanggan)!`);
    } catch (err: any) {
      showToast(`Format JSON tidak valid: ${err.message}`);
      throw err;
    }
  };

  // Clear demo customers so user only sees real data from their server
  const handleClearDemoData = () => {
    if (confirm('Kosongkan data pelanggan contoh/demo? Data pelanggan akan digantikan sepenuhnya oleh ONT real dari server GenieACS Anda.')) {
      setCustomers([]);
      storage.saveCustomers([]);
      storage.setLiveData(true);
      setIsLiveData(true);
      showToast('Data pelanggan demo dibersihkan. Silakan tekan "Sinkronkan & Impor ke Pelanggan" untuk memuat ONT asli Anda.');
    }
  };

  const activeOutagesCount = outages.filter(o => o.status !== 'resolved').length;
  const openSpkCount = workOrders.filter(w => w.status !== 'resolved').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        onRoleSwitch={handleRoleSwitch}
        activeOutagesCount={activeOutagesCount}
        openSpkCount={openSpkCount}
        onSimulateOutage={handleSimulateOutage}
        onResetNetwork={handleResetNetwork}
        isSimulatedCut={isSimulatedCut}
        genieAcsConfig={genieAcsConfig}
        onOpenGenieAcsModal={() => setIsGenieAcsModalOpen(true)}
        onOpenGoogleDrive={() => setIsGoogleDriveModalOpen(true)}
        isLiveData={isLiveData}
      />

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          userRole={currentUser.role}
          activeOutagesCount={activeOutagesCount}
          openSpkCount={openSpkCount}
        />

        {/* Content View Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          {activeTab === 'overview' && (
            <DashboardOverview
              nodes={nodes}
              cables={cables}
              customers={customers}
              outages={outages}
              workOrders={workOrders}
              areaAnalytics={areaAnalytics}
              userRole={currentUser.role}
              onNavigateToTab={setActiveTab}
              onSimulateOutage={handleSimulateOutage}
              onResetNetwork={handleResetNetwork}
              isSimulatedCut={isSimulatedCut}
            />
          )}

          {activeTab === 'map' && (
            <FTTHMap
              nodes={nodes}
              cables={cables}
              customers={customers}
              userRole={currentUser.role}
              onAddNode={handleAddNode}
              onDeleteNode={handleDeleteNode}
              onAddCable={handleAddCable}
              onDeleteCable={handleDeleteCable}
              onUpdateNodePosition={handleUpdateNodePosition}
              onSelectCustomerFromMap={(customerId) => {
                const c = customers.find(cust => cust.id === customerId);
                if (c) setActiveDiagnosticCustomer(c);
              }}
              onToggleCableStatus={handleToggleCableStatus}
            />
          )}

          {activeTab === 'customers' && (
            <CustomerManagement
              customers={customers}
              nodes={nodes}
              userRole={currentUser.role}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={(updated) => {
                setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
                showToast(`Data ${updated.name} diperbarui.`);
              }}
              onDeleteCustomer={handleDeleteCustomer}
              onOpenDiagnostic={(cust) => setActiveDiagnosticCustomer(cust)}
              onJumpToMapOdp={handleJumpToMapOdp}
              onSendWhatsappAlert={handleSendWhatsappAlert}
              genieAcsConfig={genieAcsConfig}
              onOpenGenieAcs={() => setIsGenieAcsModalOpen(true)}
              onSyncGenieAcs={handleSyncGenieAcsDevices}
              onOpenGoogleDrive={() => setIsGoogleDriveModalOpen(true)}
            />
          )}

          {activeTab === 'outages' && (
            <OutageAndMaintenance
              outages={outages}
              workOrders={workOrders}
              notificationLogs={notificationLogs}
              customers={customers}
              nodes={nodes}
              userRole={currentUser.role}
              onSendAutomatedNotification={handleSendAutomatedNotification}
              onResolveWorkOrder={handleResolveWorkOrder}
              onDispatchTechnician={handleDispatchTechnician}
            />
          )}

          {activeTab === 'analytics' && (
            <AreaAnalytics
              areaAnalytics={areaAnalytics}
              customers={customers}
              nodes={nodes}
            />
          )}

          {activeTab === 'roles' && (
            <RoleManagement
              users={INITIAL_USERS}
              currentUser={currentUser}
              onRoleSwitch={handleRoleSwitch}
              onSelectUser={(u) => {
                setCurrentUser(u);
                showToast(`Beralih ke akun pengguna: ${u.name}`);
              }}
            />
          )}

          {activeTab === 'drive' && (
            <GoogleDriveManager
              isModal={false}
              nodes={nodes}
              cables={cables}
              customers={customers}
              workOrders={workOrders}
              onNotify={(msg) => showToast(msg)}
            />
          )}
        </main>
      </div>

      {/* ONT Diagnostic Modal */}
      {activeDiagnosticCustomer && (
        <DiagnosticModal
          customer={activeDiagnosticCustomer}
          node={nodes.find(n => n.id === activeDiagnosticCustomer.odpId)}
          onClose={() => setActiveDiagnosticCustomer(null)}
          onSendWhatsapp={handleSendIndividualWhatsapp}
        />
      )}

      {/* GenieACS Configuration & Device Sync Modal */}
      <GenieACSModal
        isOpen={isGenieAcsModalOpen}
        onClose={() => setIsGenieAcsModalOpen(false)}
        config={genieAcsConfig}
        onSaveConfig={(newConfig) => {
          setGenieAcsConfig(newConfig);
          storage.saveConfig(newConfig);
          showToast(`Konfigurasi GenieACS tersimpan: ${newConfig.serverUrl}`);
        }}
        devices={genieAcsDevices}
        onSyncDevices={handleSyncGenieAcsDevices}
        customers={customers}
        onRebootDevice={handleRebootGenieAcsDevice}
        onClearDemoData={handleClearDemoData}
        isLiveData={isLiveData}
        onImportJson={handleImportGenieAcsJson}
      />

      {/* Google Drive Workspace Cloud Modal */}
      <GoogleDriveManager
        isOpen={isGoogleDriveModalOpen}
        isModal={true}
        onClose={() => setIsGoogleDriveModalOpen(false)}
        nodes={nodes}
        cables={cables}
        customers={customers}
        workOrders={workOrders}
        onNotify={(msg) => showToast(msg)}
      />

      {/* Floating System Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-cyan-500/50 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-medium text-slate-200">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
