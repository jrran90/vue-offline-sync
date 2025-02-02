import { reactive as D, onMounted as S } from "vue";
const w = "vueOfflineSync", r = "syncData";
let h = 1, l = "syncId";
function O(e) {
  l !== e && (console.warn(`[IndexedDB] KeyPath changed from '${l}' to '${e}', resetting DB...`), l = e, h++, indexedDB.deleteDatabase(w));
}
function y() {
  return new Promise((e, t) => {
    const n = indexedDB.open(w, h);
    n.onerror = () => t(new Error("Failed to open IndexedDB.")), n.onsuccess = () => e(n.result), n.onupgradeneeded = (o) => {
      const s = o.target.result;
      s.objectStoreNames.contains(r) && s.deleteObjectStore(r), s.createObjectStore(r, { keyPath: l, autoIncrement: !0 });
    };
  });
}
async function m(e) {
  const t = await y();
  return new Promise((n, o) => {
    const a = t.transaction(r, "readwrite").objectStore(r);
    l in e || (e[l] = Date.now());
    const i = a.put(e);
    i.onsuccess = () => n(e), i.onerror = () => o(new Error("Failed to save data."));
  });
}
async function b() {
  const e = await y();
  return new Promise((t, n) => {
    const a = e.transaction(r, "readonly").objectStore(r).getAll();
    a.onsuccess = () => t(a.result), a.onerror = () => n(new Error("Failed to retrieve data."));
  });
}
async function P() {
  const e = await y();
  return new Promise((t, n) => {
    const a = e.transaction(r, "readwrite").objectStore(r).clear();
    a.onsuccess = () => t(), a.onerror = () => n(new Error("Failed to clear data."));
  });
}
async function g(e) {
  const t = await y();
  return new Promise((n, o) => {
    const i = t.transaction(r, "readwrite").objectStore(r).delete(e);
    i.onsuccess = () => n(), i.onerror = () => o(new Error(`Failed to remove entry with id: ${e}`));
  });
}
function v(e) {
  const t = D({
    isOnline: navigator.onLine,
    offlineData: []
  });
  O(e.keyPath || "id");
  const n = async () => {
    t.offlineData = await b();
  }, o = async () => {
    if (!(!t.isOnline || t.offlineData.length === 0)) {
      try {
        e.bulkSync ? await a() : await i();
      } catch (c) {
        console.error("Network error during sync:", c);
      }
      await n();
    }
  }, s = async (c) => {
    if (t.isOnline)
      try {
        const { [e.keyPath || "id"]: d, ...f } = c;
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
      await m(c), await n();
  }, a = async () => {
    const c = t.offlineData.map(({ [e.keyPath || "id"]: f, ...u }) => u), d = await fetch(e.url, {
      method: e.method || "POST",
      body: JSON.stringify(c),
      headers: {
        "Content-Type": "application/json",
        ...e.headers
      }
    });
    if (!d.ok) {
      console.error(`Bulk sync failed with status: ${d.status}`);
      return;
    }
    await P();
  }, i = async () => {
    for (const c of t.offlineData) {
      const { [e.keyPath || "id"]: d, ...f } = c, u = await fetch(e.url, {
        method: e.method || "POST",
        body: JSON.stringify(f),
        headers: {
          "Content-Type": "application/json",
          ...e.headers
        }
      });
      if (!u.ok) {
        console.error(`Sync failed with status: ${u.status}`);
        continue;
      }
      await g(c[e.keyPath || "id"]);
    }
  };
  return S(async () => {
    window.addEventListener("online", async () => {
      t.isOnline = !0, await o();
    }), window.addEventListener("offline", async () => {
      t.isOnline = !1;
    }), await n();
  }), {
    state: t,
    saveOfflineData: s,
    syncOfflineData: o
  };
}
export {
  v as useOfflineSync
};
