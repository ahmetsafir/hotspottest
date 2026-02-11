"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMikrotikConfig = setMikrotikConfig;
exports.setRadiusUpdateCallback = setRadiusUpdateCallback;
exports.getCheckoutJobStatus = getCheckoutJobStatus;
exports.startCheckoutJob = startCheckoutJob;
exports.stopCheckoutJob = stopCheckoutJob;
const node_cron_1 = __importDefault(require("node-cron"));
const tenant_settings_1 = require("../services/tenant-settings");
const changed_stays_1 = require("../services/changed-stays");
const mikrotik_1 = require("../services/mikrotik");
const radius_1 = require("../services/radius");
const status = {
    lastRunAt: null,
    lastRunCount: 0,
    lastError: null,
    nextRunAt: null,
};
let mikrotikConfigByTenant = {};
let radiusUpdateFn = null;
function setMikrotikConfig(tenantId, config) {
    mikrotikConfigByTenant[tenantId] = config;
}
function setRadiusUpdateCallback(fn) {
    radiusUpdateFn = fn;
}
function getCheckoutJobStatus() {
    return { ...status };
}
async function runCheckoutJob() {
    const since = status.lastRunAt || new Date(Date.now() - 15 * 60 * 1000);
    let count = 0;
    status.lastError = null;
    try {
        const changed = await (0, changed_stays_1.listChangedStays)(since);
        for (const item of changed) {
            const settings = (0, tenant_settings_1.getTenantPmsSettings)(item.tenantId);
            if (!settings)
                continue;
            const username = item.username;
            const tenantId = item.tenantId;
            if (radiusUpdateFn && item.validUntil) {
                const expStr = (0, radius_1.formatExpiration)(new Date(0));
                await radiusUpdateFn(tenantId, username, expStr).catch(() => { });
            }
            const mikrotik = mikrotikConfigByTenant[tenantId];
            if (mikrotik) {
                const res = await (0, mikrotik_1.dropHotspotUser)(mikrotik, username);
                if (res.ok)
                    count++;
            }
        }
        status.lastRunCount = count;
    }
    catch (e) {
        status.lastError = e instanceof Error ? e.message : String(e);
    }
    finally {
        status.lastRunAt = new Date();
    }
}
let scheduled = null;
function startCheckoutJob() {
    if (scheduled)
        return;
    scheduled = node_cron_1.default.schedule('*/10 * * * *', () => {
        status.nextRunAt = new Date(Date.now() + 10 * 60 * 1000);
        runCheckoutJob();
    });
    status.nextRunAt = new Date(Date.now() + 10 * 60 * 1000);
}
function stopCheckoutJob() {
    if (scheduled) {
        scheduled.stop();
        scheduled = null;
    }
    status.nextRunAt = null;
}
//# sourceMappingURL=checkout-automation.js.map