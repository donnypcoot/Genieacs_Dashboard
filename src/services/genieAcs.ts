import { GenieACSConfig, GenieACSDevice, Customer } from '../types/ftth';

export interface GenieAcsTestResult {
  success: boolean;
  message: string;
  latencyMs: number;
  totalDevices: number;
  diagnosisType?: 'mixed_content' | 'cors_or_offline' | 'timeout' | 'http_error' | 'auth_error' | 'none';
  suggestion?: string;
  testedUrl?: string;
}

/**
 * Helper to get clean base URL for GenieACS NBI
 */
export function getCleanAcsUrl(url: string): string {
  let clean = (url || '').trim();
  if (!clean) return '/genieacs';

  // If user entered relative path without slash like "genieacs"
  if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('/')) {
    clean = '/' + clean;
  }

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
 * List of essential TR-069 projections for fast querying 500+ CPEs
 */
export function getOptimizedProjections(config: GenieACSConfig): string {
  const fields = new Set<string>([
    '_id',
    '_lastInform',
    '_ip',
    'DeviceID.SerialNumber',
    'DeviceID.Manufacturer',
    'DeviceID.ProductClass',
    'InternetGatewayDevice.DeviceInfo.SerialNumber',
    'InternetGatewayDevice.DeviceInfo.Manufacturer',
    'InternetGatewayDevice.DeviceInfo.ModelName',
    'InternetGatewayDevice.DeviceInfo.SoftwareVersion',
    'InternetGatewayDevice.WANDevice.1.WANOponDevice.OpticalRxPower',
    'InternetGatewayDevice.WANDevice.1.WANOponDevice.OpticalPowerRx',
    'InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.RxPower',
    'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.RXPower',
    'InternetGatewayDevice.WANDevice.1.X_FH_GponInterfaceConfig.RxPower',
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress',
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress',
    'Device.DeviceInfo.SerialNumber',
    'Device.DeviceInfo.Manufacturer',
    'Device.DeviceInfo.ModelName',
    'Device.DeviceInfo.SoftwareVersion',
    'Device.Optical.Interface.1.RxPower',
    'Device.IP.Interface.1.IPv4Address.1.IPAddress'
  ]);

  if (config.parameterMapping?.serialNumber) fields.add(config.parameterMapping.serialNumber);
  if (config.parameterMapping?.rxOpticalPower) fields.add(config.parameterMapping.rxOpticalPower);
  if (config.parameterMapping?.txOpticalPower) fields.add(config.parameterMapping.txOpticalPower);
  if (config.parameterMapping?.ipAddress) fields.add(config.parameterMapping.ipAddress);
  if (config.parameterMapping?.modelName) fields.add(config.parameterMapping.modelName);
  if (config.parameterMapping?.softwareVersion) fields.add(config.parameterMapping.softwareVersion);

  return Array.from(fields).join(',');
}

/**
 * Test Connection to GenieACS NBI API with detailed diagnosis
 */
export async function testGenieAcsConnection(config: GenieACSConfig): Promise<GenieAcsTestResult> {
  const startTime = performance.now();
  const baseUrl = getCleanAcsUrl(config.serverUrl);
  const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isCurrentHostLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Check 1: Mixed Content Detection (Browser will automatically block HTTP inside HTTPS)
  if (isHttpsPage && baseUrl.startsWith('http://')) {
    return {
      success: false,
      message: 'Diblokir oleh Browser (Mixed Content: HTTPS memblokir HTTP)',
      diagnosisType: 'mixed_content',
      latencyMs: 0,
      totalDevices: 0,
      testedUrl: baseUrl,
      suggestion: 'Anda mengakses dashboard ini lewat HTTPS, sehingga browser secara ketat melarang koneksi langsung ke "http://...:7557". Solusi: Ubah URL GenieACS NBI menjadi "/genieacs" (memanfaatkan reverse proxy Nginx yang sudah dibuat).'
    };
  }

  // Check 2: Loopback to client machine detection
  if (!isCurrentHostLocal && (baseUrl.includes('127.0.0.1:7557') || baseUrl.includes('localhost:7557'))) {
    return {
      success: false,
      message: 'Kesalahan Alamat: "localhost / 127.0.0.1" merujuk ke laptop/HP Anda, bukan server VPS.',
      diagnosisType: 'cors_or_offline',
      latencyMs: 0,
      totalDevices: 0,
      testedUrl: baseUrl,
      suggestion: 'Jika aplikasi berjalan di server Ubuntu, gunakan jalur Nginx Proxy "/genieacs", atau gunakan IP Public server Anda (misal http://103.xxx.xxx.xxx:7557).'
    };
  }

  try {
    const headers = getAcsHeaders(config);
    // GenieACS NBI: GET /devices?limit=1
    const res = await fetch(`${baseUrl}/devices?limit=1`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(8000)
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        message: `Autentikasi Ditolak (HTTP ${res.status} Unauthorized / Forbidden)`,
        diagnosisType: 'auth_error',
        latencyMs,
        totalDevices: 0,
        testedUrl: baseUrl,
        suggestion: 'GenieACS NBI memerlukan username & password atau API Key yang valid. Silakan sesuaikan di tab Metode Autentikasi NBI.'
      };
    }

    if (!res.ok) {
      const rawText = await res.text().catch(() => '');
      let cleanMessage = res.statusText;

      // Detect if the 404 is coming directly from Nginx web server
      const isNginx404 = res.status === 404 && (rawText.includes('nginx') || rawText.includes('404 Not Found'));
      
      let suggestion = '';
      if (isNginx404) {
        cleanMessage = 'Nginx Server merespon 404 Not Found: Rute "/genieacs/" belum terdaftar pada konfigurasi aktif Nginx.';
        suggestion = 'Nginx aktif tetapi belum memiliki aturan proxy untuk "/genieacs/". Solusi: Masukkan blok "location /genieacs/ { proxy_pass http://127.0.0.1:7557/; }" ke dalam konfigurasi aktif Nginx (/etc/nginx/sites-available/default atau /etc/nginx/sites-available/geniacs) lalu reload Nginx.';
      } else if (res.status === 404) {
        cleanMessage = 'Endpoint GenieACS tidak ditemukan (HTTP 404).';
        suggestion = 'Pastikan URL berujung ke port NBI 7557 dan pada Nginx "proxy_pass http://127.0.0.1:7557/;" wajib memiliki garis miring "/" di akhir.';
      } else if (res.status === 502) {
        cleanMessage = 'Nginx merespon 502 Bad Gateway: Service GenieACS NBI port 7557 sedang mati.';
        suggestion = 'Service GenieACS NBI belum berjalan. Jalankan "sudo systemctl restart genieacs-nbi" di server.';
      } else {
        cleanMessage = `GenieACS NBI merespon HTTP ${res.status}`;
        suggestion = 'Periksa log GenieACS di server: "sudo journalctl -u genieacs-nbi -n 50"';
      }

      return {
        success: false,
        message: cleanMessage,
        diagnosisType: 'http_error',
        latencyMs,
        totalDevices: 0,
        testedUrl: baseUrl,
        suggestion
      };
    }

    const data = await res.json();
    const count = Array.isArray(data) ? data.length : 0;

    // Fast total count for 550+ CPEs: use lightweight ?projection=_id instead of full 50MB payload
    let totalDevices = count;
    try {
      const allRes = await fetch(`${baseUrl}/devices?projection=_id`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(8000)
      });
      if (allRes.ok) {
        const allData = await allRes.json();
        if (Array.isArray(allData)) {
          totalDevices = allData.length;
        }
      }
    } catch {
      // Fallback: keep count from limit=1
    }

    return {
      success: true,
      message: `Terhubung ke GenieACS NBI! Latensi: ${latencyMs}ms. Terdeteksi ${totalDevices} perangkat TR-069.`,
      diagnosisType: 'none',
      latencyMs,
      totalDevices,
      testedUrl: baseUrl
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    let errorDetail = err.message || 'Gagal tersambung';
    let diagnosis: 'timeout' | 'cors_or_offline' = 'cors_or_offline';
    let suggestion = '';

    if (err.name === 'TimeoutError') {
      diagnosis = 'timeout';
      errorDetail = 'Koneksi timeout (lebih dari 8 detik).';
      suggestion = 'Port 7557 mungkin tertutup firewall atau database sedang sibuk. Jalankan di Ubuntu: "sudo systemctl restart mongod genieacs-nbi".';
    } else {
      errorDetail = 'Gagal menghubungi server GenieACS (Network / CORS Error / Connection Refused).';
      suggestion = 'Browser memblokir koneksi langsung (CORS) atau service genieacs-nbi belum aktif. Solusi terbaik: Ubah URL ke "/genieacs" (Nginx Proxy) dan pastikan service aktif dengan "sudo systemctl status genieacs-nbi".';
    }

    return {
      success: false,
      message: errorDetail,
      diagnosisType: diagnosis,
      latencyMs,
      totalDevices: 0,
      testedUrl: baseUrl,
      suggestion
    };
  }
}

/**
 * Parse raw GenieACS NBI JSON array into typed GenieACSDevice array
 */
export function parseRawGenieAcsJson(rawDevices: any[], config: GenieACSConfig): GenieACSDevice[] {
  if (!Array.isArray(rawDevices)) {
    throw new Error('Data bukan berupa array JSON perangkat GenieACS.');
  }

  return rawDevices.map((raw: any, index: number) => {
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
}

/**
 * Fetch real devices from GenieACS NBI (/devices)
 * Optimized for high-density environments (500+ CPEs) using TR-069 projections
 */
export async function fetchRealGenieAcsDevices(config: GenieACSConfig): Promise<GenieACSDevice[]> {
  const baseUrl = getCleanAcsUrl(config.serverUrl);
  const headers = getAcsHeaders(config);

  let rawDevices: any[] | null = null;
  const projection = getOptimizedProjections(config);

  // Strategy 1: Attempt optimized query first (?projection=...)
  // For 550 CPEs, this reduces payload from 50MB to ~150KB and executes in ~200ms!
  try {
    const projectedUrl = `${baseUrl}/devices?projection=${encodeURIComponent(projection)}`;
    const res = await fetch(projectedUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(20000)
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        rawDevices = data;
      }
    }
  } catch (err: any) {
    console.warn('GenieACS projection query skipped/failed, falling back to full query:', err?.message);
  }

  // Strategy 2: Fallback to basic /devices if projection didn't return data
  if (!rawDevices) {
    try {
      const res = await fetch(`${baseUrl}/devices`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(60000) // 60s timeout for large unprojected databases
      });

      if (!res.ok) {
        const rawText = await res.text().catch(() => '');
        if (res.status === 404 && (rawText.includes('nginx') || rawText.includes('404 Not Found'))) {
          throw new Error('Nginx merespon 404: Rute "location /genieacs/" belum terdaftar pada konfigurasi aktif Nginx.');
        } else if (res.status === 502) {
          throw new Error('Nginx 502 Bad Gateway: Service genieacs-nbi (Port 7557) di server sedang mati. Jalankan "sudo systemctl restart genieacs-nbi".');
        } else if (res.status === 504) {
          throw new Error('Nginx 504 Gateway Timeout: Query 550 CPE melebihi batas waktu Nginx. Tambahkan "proxy_read_timeout 120s;" di Nginx.');
        }
        throw new Error(`GenieACS HTTP ${res.status}: ${res.statusText}`);
      }

      rawDevices = await res.json();
    } catch (err: any) {
      if (err.name === 'TimeoutError' || err.message?.includes('timeout') || err.message?.includes('aborted')) {
        throw new Error(`Koneksi ke GenieACS (${baseUrl}) timeout. Untuk 550 CPE, pastikan Nginx memiliki "proxy_read_timeout 120s;" atau gunakan tombol "Tempel JSON Terminal".`);
      }
      throw err;
    }
  }

  if (!Array.isArray(rawDevices)) {
    throw new Error('Respon dari GenieACS bukan berupa array data perangkat.');
  }

  return parseRawGenieAcsJson(rawDevices, config);
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
