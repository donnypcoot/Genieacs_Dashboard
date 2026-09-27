export type UserRole = 'admin' | 'field_technician';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  avatar: string;
  zone: string;
}

export type NodeType = 'OLT' | 'ODC' | 'ODP' | 'ONT';
export type NodeStatus = 'normal' | 'warning' | 'critical' | 'maintenance' | 'offline';

export interface FTTHNode {
  id: string;
  name: string;
  type: NodeType;
  code: string; // e.g. OLT-BDG-01, ODC-MLT-01, ODP-MLT-04
  x: number; // relative coordinate on map canvas (0-1000)
  y: number;
  latitude: number;
  longitude: number;
  area: string; // e.g. Cluster Melati
  status: NodeStatus;
  capacityPorts: number; // e.g. ODP: 8 or 16 ports, ODC: 48 ports, OLT: 16 PON ports
  usedPorts: number;
  opticalPowerRx: number; // dBm (e.g. -19.5 dBm)
  opticalPowerTx: number; // dBm (e.g. +3.0 dBm)
  parentId?: string; // id of parent node (e.g. ODP points to ODC, ODC points to OLT)
  splitterRatio?: string; // e.g. 1:8, 1:16, 1:4
  notes?: string;
  lastUpdated: string;
}

export type CableType = 'feeder' | 'distribution' | 'drop';

export interface FTTHCable {
  id: string;
  name: string;
  fromNodeId: string;
  toNodeId: string;
  cableType: CableType;
  coreCount: number; // 96, 48, 24, 12, 2 core
  usedCores: number;
  lengthMeters: number;
  attenuationDb: number; // dB loss
  status: 'active' | 'degraded' | 'cut';
  installationDate: string;
}

export type CustomerStatus = 'active' | 'suspended' | 'isolated' | 'los_down' | 'high_loss';

export interface Customer {
  id: string;
  accountNumber: string; // e.g. GNC-88201
  name: string;
  phone: string;
  email: string;
  address: string;
  area: string;
  packagePlan: string; // e.g. "Home 50 Mbps", "Gamer 150 Mbps", "Ultra 300 Mbps"
  monthlyFee: number; // IDR
  odpId: string; // linked ODP
  odpPort: number; // 1 to 16
  ontSerialNumber: string;
  ipAddress: string;
  status: CustomerStatus;
  rxOpticalPower: number; // dBm (standard normal: -15 to -24 dBm; critical > -27 dBm)
  txOpticalPower: number;
  dropCableLengthMeters: number;
  joinDate: string;
  coordinates: {
    x: number;
    y: number;
  };
}

export type OutageSeverity = 'critical' | 'major' | 'minor';
export type OutageType = 'fiber_cut' | 'high_attenuation' | 'power_failure' | 'ont_los' | 'planned_maintenance';

export interface OutageAlert {
  id: string;
  title: string;
  severity: OutageSeverity;
  type: OutageType;
  nodeId?: string;
  nodeName?: string;
  cableId?: string;
  area: string;
  impactedCustomersCount: number;
  detectedAt: string;
  status: 'active' | 'investigating' | 'dispatched' | 'resolved';
  estimatedResolutionMinutes: number;
  description: string;
  autoNotificationSent: boolean;
  ticketId?: string;
}

export type TicketStatus = 'open' | 'dispatched' | 'in_progress' | 'pending_verification' | 'resolved';
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';

export interface WorkOrder {
  id: string; // e.g. SPK-2024-0091
  title: string;
  outageId?: string;
  area: string;
  priority: TicketPriority;
  status: TicketStatus;
  technicianName: string;
  technicianPhone: string;
  assignedAt: string;
  targetSla: string; // ISO string
  nodeId?: string;
  nodeName?: string;
  actionRequired: string; // e.g. "Splicing Core 3 & 4 pada FDT-01", "Ganti Drop Cable Rusak"
  beforeOpticalDb?: number;
  afterOpticalDb?: number;
  photoUploaded?: boolean;
  notes?: string;
  resolvedAt?: string;
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  channel: 'whatsapp' | 'sms' | 'push';
  targetCount: number;
  title: string;
  content: string;
  status: 'sent' | 'delivered' | 'failed';
  area: string;
}

export interface AreaAnalytics {
  areaName: string;
  totalCustomers: number;
  activeCustomers: number;
  losCustomers: number;
  avgRxPower: number; // dBm
  uptimeSla: number; // percentage, e.g. 99.85
  bandwidthPeakGbps: number;
  bandwidthAvgGbps: number;
  totalOdps: number;
  portUtilizationPercent: number;
  openIncidents: number;
}

export interface GenieACSConfig {
  serverUrl: string; // NBI endpoint, e.g. "http://192.168.1.10:7557"
  uiUrl: string; // GenieACS UI endpoint, e.g. "http://192.168.1.10:3000"
  authType: 'none' | 'basic' | 'bearer';
  username?: string;
  password?: string;
  apiKey?: string;
  autoSync: boolean;
  syncIntervalMinutes: number;
  isConnected: boolean;
  lastSyncTime: string | null;
  totalDevicesFound: number;
  onlineDevices: number;
  parameterMapping: {
    rxOpticalPower: string;
    txOpticalPower: string;
    serialNumber: string;
    ipAddress: string;
    modelName: string;
    softwareVersion: string;
  };
}

export interface GenieACSDevice {
  _id: string; // TR-069 device id in GenieACS, e.g. "00259E-HG8245H-HWTC12345678"
  serialNumber: string;
  manufacturer: string;
  modelName: string;
  softwareVersion: string;
  ipAddress: string;
  rxOpticalPower: number; // dBm
  txOpticalPower: number;
  lastInform: string;
  status: 'online' | 'offline' | 'warning';
  matchedCustomerId?: string;
  matchedCustomerName?: string;
}
