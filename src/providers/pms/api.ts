import type { TenantPmsSettings } from '../../types/pms';
import type { IPmsConnector } from './types';
import type { GuestVerifyInput, VerifyGuestResult, StayStatus } from '../../types/pms';
import { PMS_QUERY_TIMEOUT_MS } from '../../types/pms';

interface ApiGuestResponse {
  room_number?: string;
  room?: string;
  status?: string;
  checkout_at?: string | number;
  check_out?: string | number;
  valid_until?: string | number;
  reservation_id?: string;
  external_ref?: string;
  in_house?: boolean;
  [key: string]: unknown;
}

export class ApiPmsConnector implements IPmsConnector {
  async verifyGuest(
    settings: TenantPmsSettings,
    input: GuestVerifyInput
  ): Promise<VerifyGuestResult> {
    const start = Date.now();
    const baseUrl = (settings.pms_api_url || '').trim().replace(/\/$/, '');
    if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
      return {
        matched: false,
        status: 'unknown',
        room_number: input.roomNumber,
        provider: 'api',
        ok: false,
        latency_ms: Date.now() - start,
        cache: 'miss',
      };
    }
    const url = `${baseUrl}/verify`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PMS_QUERY_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.pms_api_key ? { 'X-API-Key': settings.pms_api_key } : {}),
        },
        body: JSON.stringify({
          room_number: input.roomNumber,
          name: input.name,
          tc: input.tc,
          passport: input.passport,
          identity_hash: input.identityHash,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return {
          matched: false,
          status: 'unknown',
          room_number: input.roomNumber,
          provider: 'api',
          ok: false,
          latency_ms: latencyMs,
          cache: 'miss',
        };
      }

      const data = (await res.json()) as ApiGuestResponse;
      return normalizeApiResponse(data, input.roomNumber, settings, latencyMs);
    } catch {
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;
      return {
        matched: false,
        status: 'unknown',
        room_number: input.roomNumber,
        provider: 'api',
        ok: false,
        latency_ms: latencyMs,
        cache: 'miss',
      };
    }
  }

  async testConnection(settings: TenantPmsSettings): Promise<{ ok: boolean; message?: string }> {
    const baseUrl = (settings.pms_api_url || '').trim().replace(/\/$/, '');
    if (!baseUrl) {
      return { ok: false, message: 'API URL boş. Lütfen “API (REST)” bölümünde tam URL girin (örn. https://pms.oteliniz.com/api).' };
    }
    if (!/^https?:\/\//i.test(baseUrl)) {
      return { ok: false, message: 'API URL http:// veya https:// ile başlamalı.' };
    }
    const url = `${baseUrl}/health`;
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        method: 'GET',
        headers: settings.pms_api_key ? { 'X-API-Key': settings.pms_api_key } : {},
        signal: controller.signal,
      });
      return { ok: res.ok, message: res.ok ? undefined : `HTTP ${res.status}` };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('parse URL') || msg.includes('fetch'))
        return { ok: false, message: 'Bağlantı kurulamadı. URL’yi kontrol edin (örn. https://alanadi.com/api).' };
      return { ok: false, message: msg };
    }
  }
}

function normalizeApiResponse(
  data: ApiGuestResponse,
  fallbackRoom: string,
  settings: TenantPmsSettings,
  latencyMs: number
): VerifyGuestResult {
  const room = (data.room_number ?? data.room ?? fallbackRoom).toString().trim();
  let status: StayStatus = 'unknown';
  let valid_until: Date | undefined;

  const checkoutAt = data.checkout_at ?? data.check_out ?? data.valid_until;
  if (checkoutAt != null) {
    valid_until = new Date(checkoutAt);
    status = valid_until.getTime() > Date.now() ? 'in_house' : 'checked_out';
  } else if (data.status != null) {
    const s = String(data.status).toLowerCase();
    if (s === 'in_house' || s === 'in-house' || s === 'checked_in') status = 'in_house';
    else if (s === 'checked_out' || s === 'checked-out') status = 'checked_out';
  } else if (data.in_house === true) {
    status = 'in_house';
  } else if (data.in_house === false) {
    status = 'checked_out';
  }

  const external_ref =
    data.reservation_id ?? data.external_ref != null ? String(data.external_ref) : undefined;

  const unknownMode = settings.pms_unknown_mode;
  const ok =
    status === 'in_house' || (status === 'unknown' && unknownMode === 'short_session');

  const sessionTimeout =
    status === 'unknown' && unknownMode === 'short_session'
      ? Math.min(
          (settings.pms_session_timeout_minutes || 60) * 60,
          1440 * 60
        )
      : undefined;

  return {
    matched: true,
    status,
    valid_until,
    external_ref,
    room_number: room,
    provider: 'api',
    ok,
    session_timeout_seconds: sessionTimeout,
    latency_ms: latencyMs,
    cache: 'miss',
  };
}
