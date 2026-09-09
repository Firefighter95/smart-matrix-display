import type { DeviceApi } from './deviceApi';
import { Esp32DeviceApi } from './esp32DeviceApi';
import { createMockDeviceApi } from './mockDeviceApi';

export const isMockMode = (import.meta.env.VITE_API_MODE || 'mock').toLowerCase() !== 'esp32';

export const createDeviceApi = (): DeviceApi => (isMockMode ? createMockDeviceApi() : new Esp32DeviceApi());

