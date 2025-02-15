import { reactive as D, onMounted as m } from "vue";
const p = "vueOfflineSync", c = "syncData", v = 1, d = "syncId";
function y() {
  return new Promise((e, a) => {
    const t = indexedDB.open(p, v);
    t.onerror = () => a(new Error("Failed to open IndexedDB.")), t.onsuccess = () => e(t.result), t.onupgradeneeded = (n) => {
      const r = n.target.result;
      r.objectStoreNames.contains(c) && r.deleteObjectStore(c), r.createObjectStore(c, { keyPath: d, autoIncrement: !0 });
    };
  });
}
async function O(e) {
  const a = await y();
  return new Promise((t, n) => {
    const o = a.transaction(c, "readwrite").objectStore(c);
    d in e || (e[d] = Date.now());
    const i = o.put(e);
    i.onsuccess = () => t(e), i.onerror = () => n(new Error("Failed to save data."));
  });
}
async function h() {
  const e = await y();
  return new Promise((a, t) => {
    const o = e.transaction(c, "readonly").objectStore(c).getAll();
    o.onsuccess = () => a(o.result), o.onerror = () => t(new Error("Failed to retrieve data."));
  });
}
async function b() {
  const e = await y();
  return new Promise((a, t) => {
    const o = e.transaction(c, "readwrite").objectStore(c).clear();
    o.onsuccess = () => a(), o.onerror = () => t(new Error("Failed to clear data."));
  });
}
async function P(e) {
  const a = await y();
  return new Promise((t, n) => {
    const i = a.transaction(c, "readwrite").objectStore(c).delete(e);
    i.onsuccess = () => t(), i.onerror = () => n(new Error(`Failed to remove entry with id: ${e}`));
  });
}
function j(e) {
  const a = "syncId", t = new BroadcastChannel("vue-offline-sync"), n = D({
    isOnline: navigator.onLine,
    offlineData: [],
    isSyncInProgress: !1
  }), r = async () => {
    n.offlineData = await h();
  }, o = async () => {
    if (!(!n.isOnline || n.offlineData.length === 0)) {
      try {
        e.bulkSync ? await S() : await g();
      } catch (s) {
        console.error("[vue-offline-sync] Network error during sync:", s);
      }
      t.postMessage({ type: "synced" }), await r();
    }
  }, i = async (s) => {
    if (n.isOnline) {
      n.isSyncInProgress = !0;
      try {
        const { [a]: l, ...u } = s;
        await fetch(e.url, {
          method: e.method || "POST",
          body: JSON.stringify(u),
          headers: {
            "Content-Type": "application/json",
            ...e.headers
          }
        });
      } catch (l) {
        console.error("[vue-offline-sync] Network error while syncing:", l);
      } finally {
        n.isSyncInProgress = !1;
      }
    } else {
      if (e.uniqueKeys && e.uniqueKeys.length > 0 && (await h()).some(
        (f) => e.uniqueKeys.some((w) => f[w] === s[w])
      )) {
        console.warn("[vue-offline-sync] Duplicate entry detected. Skipping insert: ", s);
        return;
      }
      await O(s), await r(), t.postMessage({ type: "new-data" });
    }
  }, S = async () => {
    if (n.offlineData.length === 0) return;
    const s = n.offlineData.map(({ [a]: u, ...f }) => f), l = await fetch(e.url, {
      method: e.method || "POST",
      body: JSON.stringify(s),
      headers: {
        "Content-Type": "application/json",
        ...e.headers
      }
    });
    if (!l.ok) {
      console.error(`[vue-offline-sync] Bulk sync failed with status: ${l.status}`);
      return;
    }
    await b();
  }, g = async () => {
    for (const s of n.offlineData) {
      const { [a]: l, ...u } = s, f = await fetch(e.url, {
        method: e.method || "POST",
        body: JSON.stringify(u),
        headers: {
          "Content-Type": "application/json",
          ...e.headers
        }
      });
      if (!f.ok) {
        console.error(`[vue-offline-sync] Sync failed with status: ${f.status}`);
        continue;
      }
      await P(s[a]);
    }
  };
  return m(async () => {
    window.addEventListener("online", async () => {
      n.isOnline = !0, n.isSyncInProgress = !0, await o(), n.isSyncInProgress = !1;
    }), window.addEventListener("offline", async () => {
      n.isOnline = !1;
    }), t.addEventListener("message", async (s) => {
      (s.data.type === "synced" || s.data.type === "new-data") && (console.log("[vue-offline-sync] Sync event received from another tab, reloading offline data..."), await r());
    }), await r();
  }), {
    state: n,
    saveOfflineData: i,
    syncOfflineData: o
  };
}
export {
  j as useOfflineSync
};
