import type { SongDetail, SongSummary } from "./types";

const DB_NAME = "strimpello-offline";
const DB_VERSION = 1;
const STORE = "songs";
const MAX_CACHED_SONGS = 64;

export type CachedSongRecord = {
  slug: string;
  song: SongDetail;
  relatedSongs: SongSummary[];
  cachedAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "slug" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        const request = fn(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

export async function cacheSongRecord(
  slug: string,
  song: SongDetail,
  relatedSongs: SongSummary[],
): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }

  const record: CachedSongRecord = {
    slug,
    song,
    relatedSongs,
    cachedAt: new Date().toISOString(),
  };

  await runTransaction("readwrite", (store) => store.put(record));
  await trimCachedSongs();
}

export async function getCachedSongRecord(slug: string): Promise<CachedSongRecord | null> {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  return runTransaction("readonly", (store) => store.get(slug)).then(
    (record) => (record as CachedSongRecord | undefined) ?? null,
  );
}

export async function listCachedSongRecords(): Promise<CachedSongRecord[]> {
  if (typeof indexedDB === "undefined") {
    return [];
  }

  const records = await runTransaction<CachedSongRecord[]>("readonly", (store) => store.getAll());
  return records.sort((a, b) => b.cachedAt.localeCompare(a.cachedAt));
}

export async function isSongCachedOffline(slug: string): Promise<boolean> {
  const record = await getCachedSongRecord(slug);
  return record !== null;
}

async function trimCachedSongs(): Promise<void> {
  const records = await listCachedSongRecords();
  if (records.length <= MAX_CACHED_SONGS) {
    return;
  }

  const stale = records.slice(MAX_CACHED_SONGS);
  await openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        for (const record of stale) {
          store.delete(record.slug);
        }
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

export const OFFLINE_PAGE_CACHE = "strimpello-pages-v1";

export async function cacheSongPageShell(slug: string): Promise<void> {
  if (typeof caches === "undefined" || !navigator.onLine) {
    return;
  }

  const cache = await caches.open(OFFLINE_PAGE_CACHE);
  const url = `/song/${slug}`;
  const existing = await cache.match(url);
  if (existing) {
    return;
  }

  await cache.add(url);
}
