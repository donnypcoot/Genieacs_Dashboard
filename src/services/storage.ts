import { 
  Customer, 
  FTTHNode, 
  FTTHCable, 
  OutageAlert, 
  WorkOrder, 
  NotificationLog, 
  AreaAnalytics, 
  GenieACSConfig, 
  GenieACSDevice 
} from '../types/ftth';

const KEYS = {
  CONFIG: 'geniacs_config',
  CUSTOMERS: 'geniacs_customers',
  NODES: 'geniacs_nodes',
  CABLES: 'geniacs_cables',
  OUTAGES: 'geniacs_outages',
  WORK_ORDERS: 'geniacs_work_orders',
  NOTIF_LOGS: 'geniacs_notif_logs',
  DEVICES: 'geniacs_devices',
  IS_LIVE_DATA: 'geniacs_is_live_data'
};

export const storage = {
  getConfig: (defaultVal: GenieACSConfig): GenieACSConfig => {
    try {
      const saved = localStorage.getItem(KEYS.CONFIG);
      return saved ? JSON.parse(saved) : defaultVal;
    } catch {
      return defaultVal;
    }
  },
  saveConfig: (val: GenieACSConfig) => {
    try {
      localStorage.setItem(KEYS.CONFIG, JSON.stringify(val));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  },

  getCustomers: (defaultVal: Customer[]): Customer[] => {
    try {
      const saved = localStorage.getItem(KEYS.CUSTOMERS);
      return saved ? JSON.parse(saved) : defaultVal;
    } catch {
      return defaultVal;
    }
  },
  saveCustomers: (val: Customer[]) => {
    try {
      localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(val));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  },

  getDevices: (defaultVal: GenieACSDevice[]): GenieACSDevice[] => {
    try {
      const saved = localStorage.getItem(KEYS.DEVICES);
      return saved ? JSON.parse(saved) : defaultVal;
    } catch {
      return defaultVal;
    }
  },
  saveDevices: (val: GenieACSDevice[]) => {
    try {
      localStorage.setItem(KEYS.DEVICES, JSON.stringify(val));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  },

  getNodes: (defaultVal: FTTHNode[]): FTTHNode[] => {
    try {
      const saved = localStorage.getItem(KEYS.NODES);
      return saved ? JSON.parse(saved) : defaultVal;
    } catch {
      return defaultVal;
    }
  },
  saveNodes: (val: FTTHNode[]) => {
    try {
      localStorage.setItem(KEYS.NODES, JSON.stringify(val));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  },

  getCables: (defaultVal: FTTHCable[]): FTTHCable[] => {
    try {
      const saved = localStorage.getItem(KEYS.CABLES);
      return saved ? JSON.parse(saved) : defaultVal;
    } catch {
      return defaultVal;
    }
  },
  saveCables: (val: FTTHCable[]) => {
    try {
      localStorage.setItem(KEYS.CABLES, JSON.stringify(val));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  },

  getOutages: (defaultVal: OutageAlert[]): OutageAlert[] => {
    try {
      const saved = localStorage.getItem(KEYS.OUTAGES);
      return saved ? JSON.parse(saved) : defaultVal;
    } catch {
      return defaultVal;
    }
  },
  saveOutages: (val: OutageAlert[]) => {
    try {
      localStorage.setItem(KEYS.OUTAGES, JSON.stringify(val));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  },

  getWorkOrders: (defaultVal: WorkOrder[]): WorkOrder[] => {
    try {
      const saved = localStorage.getItem(KEYS.WORK_ORDERS);
      return saved ? JSON.parse(saved) : defaultVal;
    } catch {
      return defaultVal;
    }
  },
  saveWorkOrders: (val: WorkOrder[]) => {
    try {
      localStorage.setItem(KEYS.WORK_ORDERS, JSON.stringify(val));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  },

  isLiveData: (): boolean => {
    return localStorage.getItem(KEYS.IS_LIVE_DATA) === 'true';
  },
  setLiveData: (val: boolean) => {
    localStorage.setItem(KEYS.IS_LIVE_DATA, String(val));
  },

  clearAllData: () => {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }
};
