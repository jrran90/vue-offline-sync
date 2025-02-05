import { reactive as S, onMounted as m } from "vue";
const w = "vueOfflineSync", s = "syncData";
let h = 1, l = "syncId";
function O(e) {
  l !== e && (console.warn(`[IndexedDB] KeyPath changed from '${l}' to '${e}', resetting DB...`), l = e, h++, indexedDB.deleteDatabase(w));
}
function u() {
  return new Promise((e, n) => {
    const t = indexedDB.open(w, h);
    t.onerror = () => n(new Error("Failed to open IndexedDB.")), t.onsuccess = () => e(t.result), t.onupgradeneeded = (a) => {
      const c = a.target.result;
      c.objectStoreNames.contains(s) && c.deleteObjectStore(s), c.createObjectStore(s, { keyPath: l, autoIncrement: !0 });
    };
  });
}
async function b(e) {
  const n = await u();
  return new Promise((t, a) => {
    const o = n.transaction(s, "readwrite").objectStore(s);
    l in e || (e[l] = Date.now());
    const i = o.put(e);
    i.onsuccess = () => t(e), i.onerror = () => a(new Error("Failed to save data."));
  });
}
async function g() {
  const e = await u();
  return new Promise((n, t) => {
    const o = e.transaction(s, "readonly").objectStore(s).getAll();
    o.onsuccess = () => n(o.result), o.onerror = () => t(new Error("Failed to retrieve data."));
  });
}
async function v() {
  const e = await u();
  return new Promise((n, t) => {
    const o = e.transaction(s, "readwrite").objectStore(s).clear();
    o.onsuccess = () => n(), o.onerror = () => t(new Error("Failed to clear data."));
  });
}
async function p(e) {
  const n = await u();
  return new Promise((t, a) => {
    const i = n.transaction(s, "readwrite").objectStore(s).delete(e);
    i.onsuccess = () => t(), i.onerror = () => a(new Error(`Failed to remove entry with id: ${e}`));
  });
}
function k(e) {
  const n = new BroadcastChannel("vue-offline-sync"), t = S({
    isOnline: navigator.onLine,
    offlineData: []
  });
  O(e.keyPath || "id");
  const a = async () => {
    t.offlineData = await g();
  }, c = async () => {
    if (!(!t.isOnline || t.offlineData.length === 0)) {
      try {
        e.bulkSync ? await i() : await D();
      } catch (r) {
        console.error("Network error during sync:", r);
      }
      n.postMessage({ type: "synced" }), await a();
    }
  }, o = async (r) => {
    if (t.isOnline)
      try {
        const { [e.keyPath || "id"]: d, ...f } = r;
        await fetch(e.url, {
          method: e.method || "POST",
          body: JSON.stringify(f),
          headers: {
            "Content-Type": "application/json",
            ...e.headers
          }
        });
      } catch (d) {
        console.error("Network error while syncing:", d);
      }
    else
      await b(r), await a(), n.postMessage({ type: "new-data" });
  }, i = async () => {
    const r = t.offlineData.map(({ [e.keyPath || "id"]: f, ...y }) => y), d = await fetch(e.url, {
      method: e.method || "POST",
      body: JSON.stringify(r),
      headers: {
        "Content-Type": "application/json",
        ...e.headers
      }
    });
    if (!d.ok) {
      console.error(`Bulk sync failed with status: ${d.status}`);
      return;
    }
    await v();
  }, D = async () => {
    for (const r of t.offlineData) {
      const { [e.keyPath || "id"]: d, ...f } = r, y = await fetch(e.url, {
        method: e.method || "POST",
        body: JSON.stringify(f),
        headers: {
          "Content-Type": "application/json",
          ...e.headers
        }
      });
      if (!y.ok) {
        console.error(`Sync failed with status: ${y.status}`);
        continue;
      }
      await p(r[e.keyPath || "id"]);
    }
  };
  return m(async () => {
    window.addEventListener("online", async () => {
      t.isOnline = !0, await c();
    }), window.addEventListener("offline", async () => {
      t.isOnline = !1;
    }), n.addEventListener("message", async (r) => {
      (r.data.type === "synced" || r.data.type === "new-data") && (console.log("[vue-offline-sync] Sync event received from another tab, reloading offline data..."), await a());
    }), await a();
  }), {
    state: t,
    saveOfflineData: o,
    syncOfflineData: c
  };
}
export {
  k as useOfflineSync
};
