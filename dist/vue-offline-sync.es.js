import { reactive as O, onMounted as b } from "vue";
const P = "vueOfflineSync", i = "syncData", E = 1, g = "syncId";
function d() {
  return new Promise((e, r) => {
    const o = indexedDB.open(P, E);
    o.onerror = () => r(new Error("Failed to open IndexedDB.")), o.onsuccess = () => e(o.result), o.onupgradeneeded = (t) => {
      const s = t.target.result;
      s.objectStoreNames.contains(i) && s.deleteObjectStore(i), s.createObjectStore(i, { keyPath: g, autoIncrement: !0 });
    };
  });
}
async function I(e) {
  const r = await d();
  return new Promise((o, t) => {
    const a = r.transaction(i, "readwrite").objectStore(i);
    g in e || (e[g] = Date.now());
    const f = a.put(e);
    f.onsuccess = () => o(e), f.onerror = () => t(new Error("Failed to save data."));
  });
}
async function S() {
  const e = await d();
  return new Promise((r, o) => {
    const a = e.transaction(i, "readonly").objectStore(i).getAll();
    a.onsuccess = () => r(a.result), a.onerror = () => o(new Error("Failed to retrieve data."));
  });
}
async function k() {
  const e = await d();
  return new Promise((r, o) => {
    const a = e.transaction(i, "readwrite").objectStore(i).clear();
    a.onsuccess = () => r(), a.onerror = () => o(new Error("Failed to clear data."));
  });
}
async function j(e) {
  const r = await d();
  return new Promise((o, t) => {
    const f = r.transaction(i, "readwrite").objectStore(i).delete(e);
    f.onsuccess = () => o(), f.onerror = () => t(new Error(`Failed to remove entry with id: ${e}`));
  });
}
function N(e) {
  const r = "syncId", o = new BroadcastChannel("vue-offline-sync"), t = O({
    isOnline: navigator.onLine,
    offlineData: [],
    isSyncInProgress: !1
  }), s = async () => {
    t.offlineData = await S();
  }, a = async (n, c = 1) => {
    var l;
    try {
      return await n();
    } catch {
      return c >= (((l = e.retryPolicy) == null ? void 0 : l.maxAttempts) || 1) ? (console.error("[vue-offline-sync] Max retry attempts reached."), null) : (console.warn(`[vue-offline-sync] Retrying... (${c})`), await new Promise((u) => {
        var h;
        return setTimeout(u, ((h = e.retryPolicy) == null ? void 0 : h.delayMs) || 1e3);
      }), a(n, c + 1));
    }
  }, f = async () => {
    if (!(!t.isOnline || t.offlineData.length === 0)) {
      try {
        e.bulkSync ? await D() : await p();
      } catch (n) {
        console.error("[vue-offline-sync] Network error during sync:", n);
      }
      o.postMessage({ type: "synced" }), await s();
    }
  }, v = async (n) => {
    if (t.isOnline) {
      t.isSyncInProgress = !0;
      try {
        const { [r]: c, ...l } = n, u = await a(async () => await fetch(e.url, {
          method: e.method || "POST",
          body: JSON.stringify(l),
          headers: {
            "Content-Type": "application/json",
            ...e.headers
          }
        }));
        (!u || !u.ok) && (console.error("[vue-offline-sync] Request failed. Storing offline data.", n), await w(n));
      } catch (c) {
        console.error("[vue-offline-sync] Network error while syncing:", c), await w(n);
      } finally {
        t.isSyncInProgress = !1;
      }
    } else
      await w(n);
  }, m = async (n) => {
    var l;
    return (l = e.uniqueKeys) != null && l.length ? (await S()).some(
      (y) => e.uniqueKeys.some((u) => y[u] === n[u])
    ) : !1;
  }, w = async (n) => {
    if (await m(n)) {
      console.warn("[vue-offline-sync] Duplicate entry detected. Skipping insert: ", n);
      return;
    }
    await I(n), await s(), o.postMessage({ type: "new-data" });
  }, D = async () => {
    if (t.offlineData.length === 0) return;
    const n = t.offlineData.map(({ [r]: l, ...y }) => y), c = await fetch(e.url, {
      method: e.method || "POST",
      body: JSON.stringify(n),
      headers: {
        "Content-Type": "application/json",
        ...e.headers
      }
    });
    if (!c.ok) {
      console.error(`[vue-offline-sync] Bulk sync failed with status: ${c.status}`);
      return;
    }
    await k();
  }, p = async () => {
    for (const n of t.offlineData) {
      const { [r]: c, ...l } = n, y = await fetch(e.url, {
        method: e.method || "POST",
        body: JSON.stringify(l),
        headers: {
          "Content-Type": "application/json",
          ...e.headers
        }
      });
      if (!y.ok) {
        console.error(`[vue-offline-sync] Sync failed with status: ${y.status}`);
        continue;
      }
      await j(n[r]);
    }
  };
  return b(async () => {
    console.log("[vue-offline-sync] Component mounted. Fetching offline data..."), await s(), window.addEventListener("online", async () => {
      console.log("[vue-offline-sync] Device is back online. Starting sync..."), t.isOnline = !0, t.isSyncInProgress = !0, await f(), t.isSyncInProgress = !1;
    }), window.addEventListener("offline", async () => {
      console.log("[vue-offline-sync] Device is offline."), t.isOnline = !1;
    }), o.addEventListener("message", async (n) => {
      (n.data.type === "synced" || n.data.type === "new-data") && (console.log("[vue-offline-sync] Sync event received from another tab, reloading offline data..."), await s());
    }), console.log("[vue-offline-sync] Initialization complete.");
  }), {
    state: t,
    saveOfflineData: v,
    syncOfflineData: f
  };
}
export {
  N as useOfflineSync
};
