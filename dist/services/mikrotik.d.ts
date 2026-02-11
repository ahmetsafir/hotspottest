export interface MikrotikConfig {
    host: string;
    port?: number;
    username: string;
    password?: string;
    privateKey?: string;
}
export declare function dropHotspotUser(config: MikrotikConfig, username: string): Promise<{
    ok: boolean;
    message?: string;
}>;
/** Örnek MikroTik drop komutları (manuel veya API script) */
export declare const MIKROTIK_DROP_COMMANDS: string;
//# sourceMappingURL=mikrotik.d.ts.map