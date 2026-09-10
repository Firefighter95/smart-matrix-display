import type { DeviceFault, DeviceStatus } from '../../../shared/schemas/models';

const fault = (code: DeviceFault['code'], label: string, shortLabel: string, severity: DeviceFault['severity']): DeviceFault => ({ code, label, shortLabel, severity });

export function deriveDeviceFaults(status: DeviceStatus, apiError?: string): DeviceFault[] {
  if (apiError) return [fault('API_UNAVAILABLE', 'API fout', 'API FOUT', 'error')];
  if (status.faults?.length) return status.faults;
  const faults: DeviceFault[] = [];
  if (!status.online) faults.push(fault('WIFI_OFFLINE', 'WiFi offline', 'WIFI UIT', 'error'));
  if (!status.timeSynced) faults.push(fault('NTP_UNSYNCED', 'NTP niet gesynchroniseerd', 'NTP FOUT', 'warning'));
  if (!status.displayEnabled && status.mode !== 'OFF') faults.push(fault('DISPLAY_OFFLINE', 'Display offline', 'DISPLAY UIT', 'error'));
  return faults;
}

export const primaryDeviceFault = (status: DeviceStatus) => status.faults?.[0];

export const faultColor = (code?: DeviceFault['code']) => {
  switch (code) {
    case 'WIFI_OFFLINE': return '#f47f8e';
    case 'NTP_UNSYNCED': return '#f2b866';
    case 'DISPLAY_OFFLINE': return '#c39aff';
    case 'API_UNAVAILABLE': return '#70d7f4';
    default: return '#72e6a8';
  }
};
