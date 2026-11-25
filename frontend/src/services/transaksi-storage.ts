import type {
  DetailTransaksiDraft,
  TransaksiDraft,
} from "@/types/transaksi"

export interface TransaksiDetailRecord extends DetailTransaksiDraft {
  nama_bahan: string
  satuan: string
}

export interface TransaksiRecord
  extends Omit<TransaksiDraft, "detail"> {
  id_transaksi: string
  created_at: string
  detail: TransaksiDetailRecord[]
}

const STORAGE_KEY = "sim-persediaan:transaksi"

export function getTransactions(): TransaksiRecord[] {
  const storedData = localStorage.getItem(STORAGE_KEY)

  if (!storedData) return []

  try {
    const parsedData: unknown = JSON.parse(storedData)

    return Array.isArray(parsedData)
      ? (parsedData as TransaksiRecord[])
      : []
  } catch {
    return []
  }
}

export function saveTransaction(
  transaction: TransaksiDraft,
  details: TransaksiDetailRecord[],
): TransaksiRecord {
  const newTransaction: TransaksiRecord = {
    ...transaction,
    detail: details,
    id_transaksi: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }

  const currentTransactions = getTransactions()

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([newTransaction, ...currentTransactions]),
  )

  return newTransaction
}