import { reactive as m, onMounted as O } from "vue";
const S = "vueOfflineSync", o = "syncData";
let D = 1, f = "id";
function P(e) {
  f !== e && (console.warn(`[IndexedDB] KeyPath changed from '${f}' to '${e}', resetting DB...`), f = e, D++, indexedDB.deleteDatabase(S));
}
function u() {
  return new Promise((e, a) => {
    const t = indexedDB.open(S, D);
    t.onerror = () => a(new Error("Failed to open IndexedDB.")), t.onsuccess = () => e(t.result), t.onupgradeneeded = (r) => {
      const c = r.target.result;
      c.objectStoreNames.contains(o) && c.deleteObjectStore(o), c.createObjectStore(o, { keyPath: f, autoIncrement: !0 });
    };
  });
}
async function b(e) {
  const a = await u();
  return new Promise((t, r) => {
    const s = a.transaction(o, "readwrite").objectStore(o);
    f in e || (e[f] = Date.now());
    const i = s.put(e);
    i.onsuccess = () => t(e), i.onerror = () => r(new Error("Failed to save data."));
  });
}
async function h() {
  const e = await u();
  return new Promise((a, t) => {
    const s = e.transaction(o, "readonly").objectStore(o).getAll();
    s.onsuccess = () => a(s.result), s.onerror = () => t(new Error("Failed to retrieve data."));
  });
}
async function v() {
  const e = await u();
  return new Promise((a, t) => {
    const s = e.transaction(o, "readwrite").objectStore(o).clear();
    s.onsuccess = () => a(), s.onerror = () => t(new Error("Failed to clear data."));
  });
}
async function p(e) {
  const a = await u();
  return new Promise((t, r) => {
    const i = a.transaction(o, "readwrite").objectStore(o).delete(e);
    i.onsuccess = () => t(), i.onerror = () => r(new Error(`Failed to remove entry with id: ${e}`));
  });
}
function E(e) {
  const a = new BroadcastChannel("vue-offline-sync"), t = m({
    isOnline: navigator.onLine,
    offlineData: [],
    isSyncInProgress: !1
  });
  P(e.keyPath || "id");
  const r = async () => {
    t.offlineData = await h();
  }, c = async () => {
    if (!(!t.isOnline || t.offlineData.length === 0)) {
      try {
        e.bulkSync ? await i() : await g();
      } catch (n) {
        console.error("Network error during sync:", n);
      }
      a.postMessage({ type: "synced" }), await r();
    }
  }, s = async (n) => {
    if (t.isOnline) {
      t.isSyncInProgress = !0;
      try {
        const { [e.keyPath || "id"]: l, ...y } = n;
        await fetch(e.url, {
          method: e.method || "POST",
          body: JSON.stringify(y),
          headers: {
            "Content-Type": "application/json",
            ...e.headers
          }
        });
      } catch (l) {
        console.error("Network error while syncing:", l);
      } finally {
        t.isSyncInProgress = !1;
      }
    } else {
      if (e.uniqueKeys && e.uniqueKeys.length > 0 && (await h()).some(
        (d) => e.uniqueKeys.some((w) => d[w] === n[w])
      )) {
        console.warn("[vue-offline-sync] Duplicate entry detected. Skipping insert: ", n);
        return;
      }
      await b(n), await r(), a.postMessage({ type: "new-data" });
    }
  }, i = async () => {
    const n = t.offlineData.map(({ [e.keyPath || "id"]: y, ...d }) => d), l = await fetch(e.url, {
      method: e.method || "POST",
      body: JSON.stringify(n),
      headers: {
        "Content-Type": "application/json",
        ...e.headers
      }
    });
    if (!l.ok) {
      console.error(`Bulk sync failed with status: ${l.status}`);
      return;
    }
    await v();
  }, g = async () => {
    for (const n of t.offlineData) {
      const { [e.keyPath || "id"]: l, ...y } = n, d = await fetch(e.url, {
        method: e.method || "POST",
        body: JSON.stringify(y),
        headers: {
          "Content-Type": "application/json",
          ...e.headers
        }
      });
      if (!d.ok) {
        console.error(`Sync failed with status: ${d.status}`);
        continue;
      }
      await p(n[e.keyPath || "id"]);
    }
  };
  return O(async () => {
    window.addEventListener("online", async () => {
      t.isOnline = !0, t.isSyncInProgress = !0, await c(), t.isSyncInProgress = !1;
    }), window.addEventListener("offline", async () => {
      t.isOnline = !1;
    }), a.addEventListener("message", async (n) => {
      (n.data.type === "synced" || n.data.type === "new-data") && (console.log("[vue-offline-sync] Sync event received from another tab, reloading offline data..."), await r());
    }), await r();
  }), {
    state: t,
    saveOfflineData: s,
    syncOfflineData: c
  };
}
export {
  E as useOfflineSync
};
