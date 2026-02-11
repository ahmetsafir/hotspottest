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

const stubChanged: ChangedStayItem[] = [];

export async function listChangedStays(since: Date): Promise<ChangedStayItem[]> {
  // TODO: Her tenant için PMS provider'a "son X dakikada checkout olanlar" sorgusu
  // Şimdilik stub - gerçekte MySQL/MSSQL/Postgres/API'den değişen rezervasyonlar çekilir
  return [...stubChanged];
}

export function registerChangedStay(item: ChangedStayItem): void {
  stubChanged.push(item);
}
