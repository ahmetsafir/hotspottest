import { Client as SSHClient } from 'ssh2';

export interface MikrotikConfig {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export async function dropHotspotUser(config: MikrotikConfig, username: string): Promise<{ ok: boolean; message?: string }> {
  return new Promise((resolve) => {
    const conn = new SSHClient();
    const timeout = setTimeout(() => {
      conn.end();
      resolve({ ok: false, message: 'Connection timeout' });
    }, 10000);

    conn
      .on('ready', () => {
        conn.exec(
          `/ip hotspot active remove [find user="${username}"]\n/ip hotspot cookie remove [find user="${username}"]`,
          (err: Error | undefined, stream: unknown) => {
            if (err) {
              clearTimeout(timeout);
              conn.end();
              return resolve({ ok: false, message: err.message });
            }
            const s = stream as { on: (ev: string, cb: (...a: unknown[]) => void) => unknown; stderr?: { on: (ev: string, cb: (d: Buffer) => void) => void } };
            let out = '';
            s.on('close', (code: unknown) => {
              clearTimeout(timeout);
              conn.end();
              resolve({ ok: (code as number) === 0, message: out || undefined });
            });
            s.on('data', (data: unknown) => { out += (data as Buffer).toString(); });
            if (s.stderr) s.stderr.on('data', (d: unknown) => { out += (d as Buffer).toString(); });
          }
        );
      })
      .on('error', (err: Error) => {
        clearTimeout(timeout);
        resolve({ ok: false, message: err.message });
      })
      .connect({
        host: config.host,
        port: config.port || 22,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
      });
  });
}

/** Örnek MikroTik drop komutları (manuel veya API script) */
export const MIKROTIK_DROP_COMMANDS = `
/ip hotspot active remove [find user="<username>"]
/ip hotspot cookie remove [find user="<username>"]
`.trim();
