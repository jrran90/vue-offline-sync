import { reactive as b, onMounted as p } from "vue";
const v = "vueOfflineSync", c = "syncData";
let D = 1, d = "id";
function k(e) {
  d !== e && (console.warn(`[IndexedDB] KeyPath changed from '${d}' to '${e}', resetting DB...`), d = e, D++, indexedDB.deleteDatabase(v));
}
function w() {
  return new Promise((e, a) => {
    const n = indexedDB.open(v, D);
    n.onerror = () => a(new Error("Failed to open IndexedDB.")), n.onsuccess = () => e(n.result), n.onupgradeneeded = (r) => {
      const i = r.target.result;
      i.objectStoreNames.contains(c) && i.deleteObjectStore(c), i.createObjectStore(c, { keyPath: d, autoIncrement: !0 });
    };
  });
}
async function E(e) {
  const a = await w();
  return new Promise((n, r) => {
    const o = a.transaction(c, "readwrite").objectStore(c);
    d in e || (e[d] = Date.now());
    const y = o.put(e);
    y.onsuccess = () => n(e), y.onerror = () => r(new Error("Failed to save data."));
  });
}
async function S() {
  const e = await w();
  return new Promise((a, n) => {
    const o = e.transaction(c, "readonly").objectStore(c).getAll();
    o.onsuccess = () => a(o.result), o.onerror = () => n(new Error("Failed to retrieve data."));
  });
}
async function B() {
  const e = await w();
  return new Promise((a, n) => {
    const o = e.transaction(c, "readwrite").objectStore(c).clear();
    o.onsuccess = () => a(), o.onerror = () => n(new Error("Failed to clear data."));
  });
}
async function I(e) {
  const a = await w();
  return new Promise((n, r) => {
    const y = a.transaction(c, "readwrite").objectStore(c).delete(e);
    y.onsuccess = () => n(), y.onerror = () => r(new Error(`Failed to remove entry with id: ${e}`));
  });
}
function q(e) {
  const a = new BroadcastChannel("vue-offline-sync"), n = b({
    isOnline: navigator.onLine,
    offlineData: [],
    isSyncInProgress: !1
  });
  k(e.keyPath || "id");
  const r = async () => {
    n.offlineData = await S();
  }, i = async (t, s = 1) => {
    var l;
    try {
      return await t();
    } catch {
      return s >= (((l = e.retryPolicy) == null ? void 0 : l.maxAttempts) || 3) ? (console.error("[vue-offline-sync] Max retry attempts reached."), null) : (console.warn(`[vue-offline-sync] Retrying... (${s})`), await new Promise((u) => {
        var g;
        return setTimeout(u, ((g = e.retryPolicy) == null ? void 0 : g.delayMs) || 1e3);
      }), i(t, s + 1));
    }
  }, o = async () => {
    if (!(!n.isOnline || n.offlineData.length === 0)) {
      try {
        e.bulkSync ? await P() : await O();
      } catch (t) {
        console.error("[vue-offline-sync] Network error during sync:", t);
      }
      a.postMessage({ type: "synced" }), await r();
    }
  }, y = async (t) => {
    if (n.isOnline) {
      n.isSyncInProgress = !0;
      try {
        const { [e.keyPath || "id"]: s, ...l } = t, u = await i(async () => await fetch(e.url, {
          method: e.method || "POST",
          body: JSON.stringify(l),
          headers: {
            "Content-Type": "application/json",
            ...e.headers
          }
        }));
        (!u || !u.ok) && (console.error("[vue-offline-sync] Request failed. Storing offline data.", t), await h(t));
      } catch (s) {
        console.error("[vue-offline-sync] Network error while syncing:", s), await h(t);
      } finally {
        n.isSyncInProgress = !1;
      }
    } else
      await h(t);
  }, m = async (t) => {
    var l;
    return (l = e.uniqueKeys) != null && l.length ? (await S()).some(
      (f) => e.uniqueKeys.some((u) => f[u] === t[u])
    ) : !1;
  }, h = async (t) => {
    if (await m(t)) {
      console.warn("[vue-offline-sync] Duplicate entry detected. Skipping insert: ", t);
      return;
    }
    await E(t), await r(), a.postMessage({ type: "new-data" });
  }, P = async () => {
    const t = n.offlineData.map(({ [e.keyPath || "id"]: l, ...f }) => f), s = await fetch(e.url, {
      method: e.method || "POST",
      body: JSON.stringify(t),
      headers: {
        "Content-Type": "application/json",
        ...e.headers
      }
    });
    if (!s.ok) {
      console.error(`[vue-offline-sync] Bulk sync failed with status: ${s.status}`);
      return;
    }
    await B();
  }, O = async () => {
    for (const t of n.offlineData) {
      const { [e.keyPath || "id"]: s, ...l } = t, f = await fetch(e.url, {
        method: e.method || "POST",
        body: JSON.stringify(l),
        headers: {
          "Content-Type": "application/json",
          ...e.headers
        }
      });
      if (!f.ok) {
        console.error(`[vue-offline-sync] Sync failed with status: ${f.status}`);
        continue;
      }
      await I(t[e.keyPath || "id"]);
    }
  };
  return p(async () => {
    console.log("[vue-offline-sync] Component mounted. Fetching offline data..."), await r(), window.addEventListener("online", async () => {
      console.log("[vue-offline-sync] Device is back online. Starting sync..."), n.isOnline = !0, n.isSyncInProgress = !0, await o(), n.isSyncInProgress = !1;
    }), window.addEventListener("offline", async () => {
      console.log("[vue-offline-sync] Device is offline."), n.isOnline = !1;
    }), a.addEventListener("message", async (t) => {
      (t.data.type === "synced" || t.data.type === "new-data") && (console.log("[vue-offline-sync] Sync event received from another tab, reloading offline data..."), await r());
    }), console.log("[vue-offline-sync] Initialization complete.");
  }), {
    state: n,
    saveOfflineData: y,
    syncOfflineData: o
  };
}
export {
  q as useOfflineSync
};
