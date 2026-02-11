"use strict";
/**
 * Checkout olmuş konaklamaları tespit etmek için provider'dan değişen kayıtları listeler.
 * Gerçek implementasyonda her provider için listChangedStays çağrılır.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listChangedStays = listChangedStays;
exports.registerChangedStay = registerChangedStay;
const stubChanged = [];
async function listChangedStays(since) {
    // TODO: Her tenant için PMS provider'a "son X dakikada checkout olanlar" sorgusu
    // Şimdilik stub - gerçekte MySQL/MSSQL/Postgres/API'den değişen rezervasyonlar çekilir
    return [...stubChanged];
}
function registerChangedStay(item) {
    stubChanged.push(item);
}
//# sourceMappingURL=changed-stays.js.map