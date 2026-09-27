import { GenieACSConfig, GenieACSDevice, Customer } from '../types/ftth';

/**
 * Helper to get clean base URL for GenieACS NBI
 */
export function getCleanAcsUrl(url: string): string {
  let clean = url.trim();
  if (clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }
  return clean;
}

/**
 * Generate HTTP Headers for GenieACS NBI requests
 */
export function getAcsHeaders(config: GenieACSConfig): HeadersInit {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  if (config.authType === 'basic' && config.username && config.password) {
    headers['Authorization'] = 'Basic ' + btoa(`${config.username}:${config.password}`);
  } else if (config.authType === 'bearer' && config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  return headers;
}

/**
 * Deep extraction of values from TR-069 parameter structure
 * GenieACS may return parameters in various shapes:
 * - "InternetGatewayDevice.DeviceInfo.SerialNumber": { "_value": "ZTEGC123", "_type": "xsd:string" }
 * - or nested objects
 * - or primitive strings
 */
function extractTr069Value(device: any, path: string): any {
  if (!device || !path) return undefined;

  // Direct key lookup
  if (device[path] !== undefined) {
    const val = device[path];
    if (val && typeof val === 'object' && '_value' in val) {
      return val._value;
    }
    return val;
  }

  // Nested dot lookup (e.g. DeviceID.SerialNumber)
  const parts = path.split('.');
  let current = device;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      current = undefined;
      break;
    }
  }

  if (current !== undefined) {
    if (current && typeof current === 'object' && '_value' in current) {
      return current._value;
    }
    return current;
  }

  return undefined;
}

/**
 * Parse optical power value to normal float dBm (e.g. -19.4 dBm)
 */
function parseOpticalPower(rawVal: any): number {
  if (rawVal === undefined || rawVal === null) return -20.0;
  const num = parseFloat(String(rawVal));
  if (isNaN(num)) return -20.0;

  // In some ONTs (ZTE/Huawei), optical power is reported in 0.001 dBm or 0.1 dBm
  // Example: -19500 => -19.5 dBm
  if (num < -1000 || num > 1000) {
    return parseFloat((num / 1000).toFixed(2));
  } else if (num < -100 || num > 100) {
    return parseFloat((num / 100).toFixed(2));
  }
  return parseFloat(num.toFixed(2));
}

/**
 * Test Connection to GenieACS NBI API
 */
export async function testGenieAcsConnection(config: GenieACSConfig): Promise<{
  success: boolean;
  message: string;
  latencyMs: number;
  totalDevices: number;
}> {
  const startTime = performance.now();
  const baseUrl = getCleanAcsUrl(config.serverUrl);

  try {
    const headers = getAcsHeaders(config);
    // GenieACS NBI: GET /devices?limit=1 or GET /devices
    const res = await fetch(`${baseUrl}/devices?limit=1`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(8000)
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        message: `GenieACS NBI merespon error HTTP ${res.status}: ${errText || res.statusText}`,
        latencyMs,
        totalDevices: 0
      };
    }

    const data = await res.json();
    const count = Array.isArray(data) ? data.length : 0;

    // Fetch total count if possible
    let totalDevices = count;
    try {
      const allRes = await fetch(`${baseUrl}/devices`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(5000)
      });
      if (allRes.ok) {
        const allData = await allRes.json();
        if (Array.isArray(allData)) {
          totalDevices = allData.length;
        }
      }
    } catch {
      // Ignore fallback error
    }

    return {
      success: true,
      message: `Terhubung ke GenieACS NBI! Latensi: ${latencyMs}ms. Terdeteksi ${totalDevices} perangkat TR-069.`,
      latencyMs,
      totalDevices
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    let errorDetail = err.message || 'Gagal tersambung';

    if (err.name === 'TimeoutError') {
      errorDetail = 'Koneksi timeout (lebih dari 8 detik). Pastikan port 7557 terbuka di firewall.';
    } else if (errorDetail.includes('Failed to fetch') || errorDetail.includes('NetworkError')) {
      errorDetail = 'Gagal menghubungi server GenieACS (Network / CORS Error). Jika mengakses lewat browser HTTPS, gunakan Nginx reverse proxy /genieacs untuk menghindari blokir CORS.';
    }

    return {
      success: false,
      message: errorDetail,
      latencyMs,
      totalDevices: 0
    };
  }
}

/**
 * Fetch real devices from GenieACS NBI (/devices)
 */
export async function fetchRealGenieAcsDevices(config: GenieACSConfig): Promise<GenieACSDevice[]> {
  const baseUrl = getCleanAcsUrl(config.serverUrl);
  const headers = getAcsHeaders(config);

  const res = await fetch(`${baseUrl}/devices`, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(10000)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`GenieACS HTTP ${res.status}: ${errText || res.statusText}`);
  }

  const rawDevices = await res.json();
  if (!Array.isArray(rawDevices)) {
    throw new Error('Respon dari GenieACS bukan berupa array data perangkat.');
  }

  const parsedDevices: GenieACSDevice[] = rawDevices.map((raw: any, index: number) => {
    const id = raw._id || `cpe-${index}`;
    
    // Serial Number: check DeviceID.SerialNumber, custom mapping, or standard TR-069 paths
    const serialNumber = 
      extractTr069Value(raw, config.parameterMapping.serialNumber) ||
      extractTr069Value(raw, 'DeviceID.SerialNumber') ||
      extractTr069Value(raw, 'Device.DeviceInfo.SerialNumber') ||
      extractTr069Value(raw, 'InternetGatewayDevice.DeviceInfo.SerialNumber') ||
      id.split('-').pop() ||
      `ONT-${index + 1}`;

    // Manufacturer
    const manufacturer = 
      extractTr069Value(raw, 'DeviceID.Manufacturer') ||
      extractTr069Value(raw, 'Device.DeviceInfo.Manufacturer') ||
      extractTr069Value(raw, 'InternetGatewayDevice.DeviceInfo.Manufacturer') ||
      (id.includes('ZTE') ? 'ZTE' : id.includes('HW') || id.includes('Huawei') ? 'Huawei' : id.includes('FIB') ? 'Fiberhome' : 'CPE Device');

    // Model Name
    const modelName = 
      extractTr069Value(raw, config.parameterMapping.modelName) ||
      extractTr069Value(raw, 'DeviceID.ProductClass') ||
      extractTr069Value(raw, 'Device.DeviceInfo.ModelName') ||
      extractTr069Value(raw, 'InternetGatewayDevice.DeviceInfo.ModelName') ||
      'GPON ONT';

    // Software Version
    const softwareVersion = 
      extractTr069Value(raw, config.parameterMapping.softwareVersion) ||
      extractTr069Value(raw, 'Device.DeviceInfo.SoftwareVersion') ||
      extractTr069Value(raw, 'InternetGatewayDevice.DeviceInfo.SoftwareVersion') ||
      'V1.0.0';

    // IP Address
    const ipAddress = 
      extractTr069Value(raw, config.parameterMapping.ipAddress) ||
      extractTr069Value(raw, 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress') ||
      extractTr069Value(raw, 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress') ||
      extractTr069Value(raw, 'Device.IP.Interface.1.IPv4Address.1.IPAddress') ||
      extractTr069Value(raw, '_ip') ||
      `10.20.${Math.floor(index / 250) + 1}.${(index % 250) + 10}`;

    // Optical Rx Power (dBm)
    const rawRxPower = 
      extractTr069Value(raw, config.parameterMapping.rxOpticalPower) ||
      extractTr069Value(raw, 'InternetGatewayDevice.WANDevice.1.WANOponDevice.OpticalRxPower') ||
      extractTr069Value(raw, 'InternetGatewayDevice.WANDevice.1.WANOponDevice.OpticalPowerRx') ||
      extractTr069Value(raw, 'Device.Optical.Interface.1.RxPower') ||
      extractTr069Value(raw, 'InternetGatewayDevice.DeviceInfo.X_CT-COM_OpticalInfo.RxPower') ||
      extractTr069Value(raw, 'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.RXPower');

    const rxOpticalPower = parseOpticalPower(rawRxPower);

    // Optical Tx Power (dBm)
    const rawTxPower = 
      extractTr069Value(raw, config.parameterMapping.txOpticalPower) ||
      extractTr069Value(raw, 'InternetGatewayDevice.WANDevice.1.WANOponDevice.OpticalTxPower') ||
      extractTr069Value(raw, 'InternetGatewayDevice.WANDevice.1.WANOponDevice.OpticalPowerTx') ||
      extractTr069Value(raw, 'Device.Optical.Interface.1.TxPower');

    const txOpticalPower = rawTxPower !== undefined ? parseOpticalPower(rawTxPower) : 2.1;

    // Last Inform
    let lastInform = 'Tidak Diketahui';
    if (raw._lastInform) {
      try {
        const date = new Date(raw._lastInform);
        lastInform = date.toLocaleString('id-ID', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        lastInform = String(raw._lastInform);
      }
    }

    // Status (Online if last inform < 15 minutes ago, or active)
    let isOnline = true;
    if (raw._lastInform) {
      const diffMs = Date.now() - new Date(raw._lastInform).getTime();
      isOnline = diffMs < 15 * 60 * 1000;
    }

    return {
      _id: id,
      serialNumber,
      manufacturer,
      modelName,
      softwareVersion,
      ipAddress,
      rxOpticalPower,
      txOpticalPower,
      lastInform,
      status: isOnline ? 'online' : 'offline',
      uptimeHours: 24,
      lanPortsActive: 1,
      wifiClients: 2
    };
  });

  return parsedDevices;
}

/**
 * Trigger Remote Reboot via GenieACS TR-069 NBI Task
 */
export async function rebootRealGenieAcsDevice(config: GenieACSConfig, deviceId: string): Promise<void> {
  const baseUrl = getCleanAcsUrl(config.serverUrl);
  const headers = getAcsHeaders(config);

  const res = await fetch(`${baseUrl}/devices/${encodeURIComponent(deviceId)}/tasks?name=reboot`, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(8000)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`GenieACS Reboot Failed (${res.status}): ${errText || res.statusText}`);
  }
}

/**
 * Synchronize real GenieACS devices with customers database
 * Returns updated customers and newly created customers
 */
export function syncDevicesWithCustomers(
  realDevices: GenieACSDevice[],
  existingCustomers: Customer[],
  defaultOdpId: string = 'node-odp-mlt-01'
): { updatedCustomers: Customer[]; matchedCount: number; newImportedCount: number } {
  let matchedCount = 0;
  let newImportedCount = 0;

  const updatedCustomers = [...existingCustomers];

  for (const device of realDevices) {
    const custIndex = updatedCustomers.findIndex(
      c => c.ontSerialNumber.trim().toUpperCase() === device.serialNumber.trim().toUpperCase()
    );

    if (custIndex >= 0) {
      // Existing customer: update metrics from real GenieACS ONT
      matchedCount++;
      const current = updatedCustomers[custIndex];
      const newStatus = device.status === 'offline' || device.rxOpticalPower < -28
        ? 'los_down'
        : device.rxOpticalPower < -24
        ? 'high_loss'
        : 'active';

      updatedCustomers[custIndex] = {
        ...current,
        rxOpticalPower: device.rxOpticalPower,
        txOpticalPower: device.txOpticalPower,
        ipAddress: device.ipAddress,
        ontModel: `${device.manufacturer} ${device.modelName}`,
        status: newStatus,
        lastOnlineTime: device.lastInform
      };
    } else {
      // Device exists in GenieACS but not in customer table: auto-import as real customer!
      newImportedCount++;
      const newId = `cust-genieacs-${device.serialNumber.toLowerCase()}`;
      const newStatus = device.status === 'offline' || device.rxOpticalPower < -28
        ? 'los_down'
        : device.rxOpticalPower < -24
        ? 'high_loss'
        : 'active';

      updatedCustomers.push({
        id: newId,
        accountNumber: `GNC-${device.serialNumber.slice(-6).toUpperCase()}`,
        name: `Pelanggan ONT (${device.serialNumber})`,
        phone: '0812-XXXX-XXXX',
        email: `${device.serialNumber.toLowerCase()}@customer.net`,
        address: `Alamat Pelanggan ONT ${device.serialNumber}`,
        area: 'Cluster Melati',
        packagePlan: 'Home Fiber 50 Mbps',
        monthlyFee: 250000,
        odpId: defaultOdpId,
        odpPort: (newImportedCount % 8) + 1,
        ontSerialNumber: device.serialNumber,
        ontModel: `${device.manufacturer} ${device.modelName}`,
        rxOpticalPower: device.rxOpticalPower,
        txOpticalPower: device.txOpticalPower,
        ipAddress: device.ipAddress,
        status: newStatus,
        dropCableLengthMeters: 45,
        joinDate: new Date().toISOString().split('T')[0],
        lastOnlineTime: device.lastInform,
        coordinates: {
          x: 320 + ((newImportedCount * 35) % 400),
          y: 220 + ((newImportedCount * 25) % 250)
        }
      });
    }
  }

  return { updatedCustomers, matchedCount, newImportedCount };
}
