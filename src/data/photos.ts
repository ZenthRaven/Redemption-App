import { useEffect, useState } from 'react';

// Photos live in IndexedDB (localStorage is far too small for images); records only keep their ids.
const DB = 'redemption-photos';
const STORE = 'photos';
const MAX_SIDE = 1280;

let dbp: Promise<IDBDatabase> | null = null;
function db() {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  return db().then((d) => new Promise<T>((resolve, reject) => {
    const r = fn(d.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}

/** Downscale to at most 1280px on the long side and store as JPEG. Returns the photo id. */
export async function savePhoto(file: File) {
  const img = await createImageBitmap(file);
  const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * k);
  canvas.height = Math.round(img.height * k);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', 0.82));
  const id = `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await tx('readwrite', (s) => s.put(blob, id));
  return id;
}

export const deletePhoto = (id: string) => tx('readwrite', (s) => s.delete(id)).then(() => { urls.delete(id); });

const urls = new Map<string, string>();

/** Object URL for a stored photo (cached for the session). */
export function usePhoto(id?: string) {
  const [url, setUrl] = useState(() => (id ? urls.get(id) : undefined));
  useEffect(() => {
    if (!id || urls.has(id)) { setUrl(id ? urls.get(id) : undefined); return; }
    let live = true;
    tx<Blob | undefined>('readonly', (s) => s.get(id)).then((b) => {
      if (!b || !live) return;
      const u = URL.createObjectURL(b);
      urls.set(id, u);
      setUrl(u);
    });
    return () => { live = false; };
  }, [id]);
  return url;
}
