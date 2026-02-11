import cron from 'node-cron';
import { getTenantPmsSettings } from '../services/tenant-settings';
import { getPmsConnector } from '../providers/pms';
import { listChangedStays } from '../services/changed-stays';
import { dropHotspotUser, type MikrotikConfig } from '../services/mikrotik';
import { formatExpiration } from '../services/radius';

export interface CheckoutJobStatus {
  lastRunAt: Date | null;
  lastRunCount: number;
  lastError: string | null;
  nextRunAt: Date | null;
}

const status: CheckoutJobStatus = {
  lastRunAt: null,
  lastRunCount: 0,
  lastError: null,
  nextRunAt: null,
};

let mikrotikConfigByTenant: Record<string, MikrotikConfig> = {};
let radiusUpdateFn: ((tenantId: string, username: string, expiration: string) => Promise<void>) | null = null;

export function setMikrotikConfig(tenantId: string, config: MikrotikConfig): void {
  mikrotikConfigByTenant[tenantId] = config;
}

export function setRadiusUpdateCallback(fn: (tenantId: string, username: string, expiration: string) => Promise<void>): void {
  radiusUpdateFn = fn;
}

export function getCheckoutJobStatus(): CheckoutJobStatus {
  return { ...status };
}

async function runCheckoutJob(): Promise<void> {
  const since = status.lastRunAt || new Date(Date.now() - 15 * 60 * 1000);
  let count = 0;
  status.lastError = null;

  try {
    const changed = await listChangedStays(since);
    for (const item of changed) {
      const settings = getTenantPmsSettings(item.tenantId);
      if (!settings) continue;

      const username = item.username;
      const tenantId = item.tenantId;

      if (radiusUpdateFn && item.validUntil) {
        const expStr = formatExpiration(new Date(0));
        await radiusUpdateFn(tenantId, username, expStr).catch(() => {});
      }

      const mikrotik = mikrotikConfigByTenant[tenantId];
      if (mikrotik) {
        const res = await dropHotspotUser(mikrotik, username);
        if (res.ok) count++;
      }
    }
    status.lastRunCount = count;
  } catch (e) {
    status.lastError = e instanceof Error ? e.message : String(e);
  } finally {
    status.lastRunAt = new Date();
  }
}

let scheduled: cron.ScheduledTask | null = null;

export function startCheckoutJob(): void {
  if (scheduled) return;
  scheduled = cron.schedule('*/10 * * * *', () => {
    status.nextRunAt = new Date(Date.now() + 10 * 60 * 1000);
    runCheckoutJob();
  });
  status.nextRunAt = new Date(Date.now() + 10 * 60 * 1000);
}

export function stopCheckoutJob(): void {
  if (scheduled) {
    scheduled.stop();
    scheduled = null;
  }
  status.nextRunAt = null;
}
