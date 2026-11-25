export type StockStatus = 'habis' | 'menipis' | 'aman';

export function computeStockStatus(stokSaatIni: number, stokMinimum: number): StockStatus {
  if (stokSaatIni <= 0) return 'habis';
  if (stokSaatIni <= stokMinimum) return 'menipis';
  return 'aman';
}
