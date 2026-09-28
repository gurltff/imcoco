/** Tiny IndexedDB store for photos/videos of Coco. Stays on this device. */
export interface Memory { id: number; blob: Blob; type: "image" | "video"; caption: string; at: number; tilt: number }

const open = () => new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open("cocos-corner", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("memories", { keyPath: "id" });
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  const db = await open();
  return new Promise<T>((res, rej) => {
    const req = fn(db.transaction("memories", mode).objectStore("memories"));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export const listMemories = async () => (await tx<Memory[]>("readonly", (s) => s.getAll())).sort((a, b) => b.at - a.at);
export const putMemory = (m: Memory) => tx("readwrite", (s) => s.put(m));
export const deleteMemory = (id: number) => tx("readwrite", (s) => s.delete(id));
