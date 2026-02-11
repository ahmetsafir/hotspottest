"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIKROTIK_DROP_COMMANDS = void 0;
exports.dropHotspotUser = dropHotspotUser;
const ssh2_1 = require("ssh2");
async function dropHotspotUser(config, username) {
    return new Promise((resolve) => {
        const conn = new ssh2_1.Client();
        const timeout = setTimeout(() => {
            conn.end();
            resolve({ ok: false, message: 'Connection timeout' });
        }, 10000);
        conn
            .on('ready', () => {
            conn.exec(`/ip hotspot active remove [find user="${username}"]\n/ip hotspot cookie remove [find user="${username}"]`, (err, stream) => {
                if (err) {
                    clearTimeout(timeout);
                    conn.end();
                    return resolve({ ok: false, message: err.message });
                }
                const s = stream;
                let out = '';
                s.on('close', (code) => {
                    clearTimeout(timeout);
                    conn.end();
                    resolve({ ok: code === 0, message: out || undefined });
                });
                s.on('data', (data) => { out += data.toString(); });
                if (s.stderr)
                    s.stderr.on('data', (d) => { out += d.toString(); });
            });
        })
            .on('error', (err) => {
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
exports.MIKROTIK_DROP_COMMANDS = `
/ip hotspot active remove [find user="<username>"]
/ip hotspot cookie remove [find user="<username>"]
`.trim();
//# sourceMappingURL=mikrotik.js.map