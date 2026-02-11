/**
 * Checkout olmuş konaklamaları tespit etmek için provider'dan değişen kayıtları listeler.
 * Gerçek implementasyonda her provider için listChangedStays çağrılır.
 */
export interface ChangedStayItem {
    tenantId: string;
    username: string;
    roomNumber: string;
    externalRef?: string;
    validUntil?: Date;
    checkedOut: boolean;
}
export declare function listChangedStays(since: Date): Promise<ChangedStayItem[]>;
export declare function registerChangedStay(item: ChangedStayItem): void;
//# sourceMappingURL=changed-stays.d.ts.map