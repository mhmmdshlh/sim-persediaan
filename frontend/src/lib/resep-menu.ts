const NOTES_STORAGE_KEY = "stok_bledek_catatan_pemilik_v1"

// shortcut: catatan pemilik disimpan di localStorage browser; pindah ke database jika butuh sinkronisasi antar-perangkat.
export function loadOwnerNotes(): string[] {
  try {
    const raw = window.localStorage.getItem(NOTES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === "string")
  } catch {
    return []
  }
}

export function saveOwnerNotes(notes: string[]): void {
  try {
    window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
  } catch {
    // Abaikan jika localStorage diblokir.
  }
}
