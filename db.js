(() => {
  const DB_NAME = "tante-marlene-inventario";
  const DB_VERSION = 1;
  const STORES = { items: "items", sessions: "sessions", entries: "entries", meta: "meta" };

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORES.items)) db.createObjectStore(STORES.items, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.sessions)) db.createObjectStore(STORES.sessions, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.entries)) {
          const s = db.createObjectStore(STORES.entries, { keyPath: "key" });
          s.createIndex("sessionId", "sessionId", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.meta)) db.createObjectStore(STORES.meta, { keyPath: "key" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function tx(storeNames, mode, work) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(storeNames, mode);
      const stores = Object.fromEntries(storeNames.map(n => [n, t.objectStore(n)]));
      let out;
      try { out = work(stores, t); } catch (e) { reject(e); return; }
      t.oncomplete = () => resolve(out);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error("Transacción abortada"));
    });
  }

  function request(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function seedIfNeeded(seed) {
    const db = await openDB();
    const seeded = await request(db.transaction(STORES.meta).objectStore(STORES.meta).get("seeded"));
    if (seeded?.value) return;

    await tx([STORES.items, STORES.sessions, STORES.entries, STORES.meta], "readwrite", (s) => {
      seed.items.forEach(item => s.items.put(item));
      const initialSessions = [
        { id: "seed-2026-08-11", date: seed.interpretedDates.previous, source: "Libreta fotografiada", label: "Conteo transcrito · 11 ago" },
        { id: "seed-2026-08-24", date: seed.interpretedDates.current, source: "Libreta fotografiada", label: "Conteo transcrito · 24 ago (fecha interpretada)" }
      ];
      initialSessions.forEach(x => s.sessions.put(x));
      seed.items.forEach(item => {
        s.entries.put({ key:`seed-2026-08-11::${item.id}`, sessionId:"seed-2026-08-11", itemId:item.id, quantity:item.previous });
        s.entries.put({ key:`seed-2026-08-24::${item.id}`, sessionId:"seed-2026-08-24", itemId:item.id, quantity:item.current });
      });
      s.meta.put({ key:"seeded", value:true, seededAt:new Date().toISOString() });
    });
  }

  async function getItems() { const db = await openDB(); return request(db.transaction(STORES.items).objectStore(STORES.items).getAll()); }
  async function putItem(item) { await tx([STORES.items], "readwrite", s => s.items.put(item)); }
  async function deleteItem(id) { await tx([STORES.items], "readwrite", s => s.items.delete(id)); }

  async function saveCount(items) {
    const now = new Date();
    const id = `cnt-${now.toISOString()}-${Math.random().toString(16).slice(2,8)}`;
    const session = { id, date: now.toISOString(), source: "PWA", label: "Conteo guardado" };
    await tx([STORES.items, STORES.sessions, STORES.entries], "readwrite", s => {
      s.sessions.put(session);
      items.forEach(item => {
        s.items.put(item);
        s.entries.put({ key:`${id}::${item.id}`, sessionId:id, itemId:item.id, quantity:item.quantity });
      });
    });
    return session;
  }

  async function getSessions() { const db = await openDB(); const sessions = await request(db.transaction(STORES.sessions).objectStore(STORES.sessions).getAll()); return sessions.sort((a,b) => new Date(b.date) - new Date(a.date)); }
  async function getEntriesForSession(sessionId) { const db = await openDB(); const idx = db.transaction(STORES.entries).objectStore(STORES.entries).index("sessionId"); return request(idx.getAll(sessionId)); }

  async function exportData() {
    const db = await openDB();
    const readAll = store => request(db.transaction(store).objectStore(store).getAll());
    return { schema: 1, exportedAt: new Date().toISOString(), items: await readAll(STORES.items), sessions: await readAll(STORES.sessions), entries: await readAll(STORES.entries), meta: await readAll(STORES.meta) };
  }

  async function importData(data) {
    if (!data || data.schema !== 1 || !Array.isArray(data.items) || !Array.isArray(data.sessions) || !Array.isArray(data.entries)) throw new Error("Respaldo no válido");
    await tx(Object.values(STORES), "readwrite", s => {
      Object.values(s).forEach(store => store.clear());
      data.items.forEach(x => s.items.put(x)); data.sessions.forEach(x => s.sessions.put(x)); data.entries.forEach(x => s.entries.put(x));
      (data.meta || []).forEach(x => s.meta.put(x)); s.meta.put({ key:"seeded", value:true });
    });
  }

  window.TMDB = { seedIfNeeded, getItems, putItem, deleteItem, saveCount, getSessions, getEntriesForSession, exportData, importData };
})();
