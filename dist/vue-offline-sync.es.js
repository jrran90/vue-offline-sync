import { defineComponent as S, reactive as D, onMounted as m } from "vue";
const w = "vueOfflineSync", o = "syncData";
let h = 1, d = "syncId";
function O(e) {
  d !== e && (console.warn(`[IndexedDB] KeyPath changed from '${d}' to '${e}', resetting DB...`), d = e, h++, indexedDB.deleteDatabase(w));
}
function y() {
  return new Promise((e, t) => {
    const n = indexedDB.open(w, h);
    n.onerror = () => t(new Error("Failed to open IndexedDB.")), n.onsuccess = () => e(n.result), n.onupgradeneeded = (r) => {
      const s = r.target.result;
      s.objectStoreNames.contains(o) && s.deleteObjectStore(o), s.createObjectStore(o, { keyPath: d, autoIncrement: !0 });
    };
  });
}
async function b(e) {
  const t = await y();
  return new Promise((n, r) => {
    const a = t.transaction(o, "readwrite").objectStore(o);
    d in e || (e[d] = Date.now());
    const c = a.put(e);
    c.onsuccess = () => n(e), c.onerror = () => r(new Error("Failed to save data."));
  });
}
async function g() {
  const e = await y();
  return new Promise((t, n) => {
    const a = e.transaction(o, "readonly").objectStore(o).getAll();
    a.onsuccess = () => t(a.result), a.onerror = () => n(new Error("Failed to retrieve data."));
  });
}
async function k() {
  const e = await y();
  return new Promise((t, n) => {
    const a = e.transaction(o, "readwrite").objectStore(o).clear();
    a.onsuccess = () => t(), a.onerror = () => n(new Error("Failed to clear data."));
  });
}
async function v(e) {
  const t = await y();
  return new Promise((n, r) => {
    const c = t.transaction(o, "readwrite").objectStore(o).delete(e);
    c.onsuccess = () => n(), c.onerror = () => r(new Error(`Failed to remove entry with id: ${e}`));
  });
}
const j = S({
  name: "VueOfflineSync",
  props: {
    url: {
      type: String,
      required: !0
    },
    method: {
      type: String,
      default: "POST"
    },
    headers: {
      type: Object,
      default: () => ({})
    },
    // Allows the user to define their own key field.
    keyPath: {
      type: String,
      default: "id"
    },
    bulkSync: {
      type: Boolean,
      default: !1
    }
  },
  setup(e) {
    O(e.keyPath);
    const t = D({
      isOnline: navigator.onLine,
      offlineData: []
    }), n = async () => {
      t.offlineData = await g();
    }, r = async () => {
      if (!(!t.isOnline || t.offlineData.length === 0)) {
        try {
          e.bulkSync ? await a() : await c();
        } catch (i) {
          console.error("Network error during sync:", i);
        }
        await n();
      }
    }, s = async (i) => {
      if (t.isOnline)
        try {
          const { [e.keyPath]: l, ...f } = i;
          await fetch(e.url, {
            method: e.method,
            body: JSON.stringify(f),
            headers: {
              "Content-Type": "application/json",
              ...e.headers
            }
          });
        } catch (l) {
          console.error("Network error while syncing:", l);
        }
      else
        await b(i), await n();
    }, a = async () => {
      const i = t.offlineData.map(({ [e.keyPath]: f, ...u }) => u), l = await fetch(e.url, {
        method: e.method,
        body: JSON.stringify(i),
        headers: {
          "Content-Type": "application/json",
          ...e.headers
        }
      });
      if (!l.ok) {
        console.error(`Bulk sync failed with status: ${l.status}`);
        return;
      }
      await k();
    }, c = async () => {
      for (const i of t.offlineData) {
        const { [e.keyPath]: l, ...f } = i, u = await fetch(e.url, {
          method: e.method,
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
        await v(i[e.keyPath]);
      }
    };
    return m(async () => {
      window.addEventListener("online", async () => {
        t.isOnline = !0, await r();
      }), window.addEventListener("offline", async () => {
        t.isOnline = !1;
      }), await n();
    }), {
      state: t,
      saveOfflineData: s,
      syncOfflineData: r
    };
  }
});
export {
  j as default
};
