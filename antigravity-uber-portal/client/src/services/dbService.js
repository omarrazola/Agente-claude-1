import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  collection, 
  onSnapshot 
} from 'firebase/firestore';

class MemoryDatabase {
  constructor() {
    this.storageKey = 'antigravity_portal_db_v1';
    this.data = this.load();
    this.listeners = new Map();
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        let modified = false;
        if (parsed?.config?.main?.figmaFile && (parsed.config.main.figmaFile.includes('I1mmXqqcqnPGp86ibfgjHo') || !parsed.config.main.figmaFile.includes('dcKVRyGjsYiK3Cl1iBHeXc'))) {
          parsed.config.main.figmaFile = "https://www.figma.com/design/dcKVRyGjsYiK3Cl1iBHeXc/Untitled?node-id=0-1";
          modified = true;
        }
        if (parsed?.runs) {
          for (const key of Object.keys(parsed.runs)) {
            const r = parsed.runs[key];
            if (r.figmaFileKey && r.figmaFileKey !== 'dcKVRyGjsYiK3Cl1iBHeXc') {
              r.figmaFileKey = 'dcKVRyGjsYiK3Cl1iBHeXc';
              modified = true;
            }
            if (r.figmaUrl && !r.figmaUrl.includes('dcKVRyGjsYiK3Cl1iBHeXc')) {
              r.figmaUrl = "https://www.figma.com/design/dcKVRyGjsYiK3Cl1iBHeXc/Untitled?node-id=0-1";
              modified = true;
            }
            if (r.figmaSent) {
              for (const vk of Object.keys(r.figmaSent)) {
                if (typeof r.figmaSent[vk] === 'string' && !r.figmaSent[vk].includes('dcKVRyGjsYiK3Cl1iBHeXc')) {
                  const nodeMatch = r.figmaSent[vk].match(/[?&]node-id=([^&#]+)/);
                  const nodeId = nodeMatch ? `?node-id=${nodeMatch[1]}` : '?node-id=0-1';
                  r.figmaSent[vk] = `https://www.figma.com/design/dcKVRyGjsYiK3Cl1iBHeXc/Untitled${nodeId}`;
                  modified = true;
                }
              }
            }
          }
        }
        if (modified) {
          try {
            localStorage.setItem(this.storageKey, JSON.stringify(parsed));
          } catch (e) {}
        }
        return parsed;
      }
      return {
        runs: {},
        flow: {},
        config: {
          main: {
            figmaFile: "https://www.figma.com/design/dcKVRyGjsYiK3Cl1iBHeXc/Untitled?node-id=0-1",
            jiraBoard: "https://pruebasantigravity.atlassian.net/jira/software/projects/KAN/boards/1",
            primary: "#0F6E6A",
            platform: "mobile",
            useDs: true
          },
          prompts: {},
          ds: null
        },
        versions: {},
        locks: {},
        asks: {}
      };
    } catch (e) {
      return { runs: {}, flow: {}, config: {}, versions: {}, locks: {}, asks: {} };
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Error guardando en localStorage:', e);
    }
  }

  notify(path) {
    this.save();
    // Notificar a listeners del documento exacto
    const exact = this.listeners.get(path);
    if (exact) {
      const val = this.getVal(path);
      exact.forEach(cb => cb({
        exists: val !== undefined && val !== null,
        data: () => val
      }));
    }

    // Notificar a listeners de la colección padre
    const parts = path.split('/');
    if (parts.length >= 2) {
      const colPath = parts.slice(0, parts.length - 1).join('/');
      const colListeners = this.listeners.get(colPath);
      if (colListeners) {
        const colVal = this.getVal(colPath) || {};
        const docs = Object.entries(colVal).map(([id, data]) => ({
          id,
          exists: true,
          data: () => data
        }));
        colListeners.forEach(cb => cb({ docs }));
      }
    }
  }

  getVal(path) {
    const parts = path.split('/').filter(Boolean);
    let cur = this.data;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[p];
    }
    return cur;
  }

  setVal(path, val) {
    const parts = path.split('/').filter(Boolean);
    let cur = this.data;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = val;
    this.notify(path);
  }

  doc(path) {
    return {
      get: async () => {
        const val = this.getVal(path);
        return {
          exists: val !== undefined && val !== null,
          data: () => val
        };
      },
      set: async (data, opts = {}) => {
        const old = opts.merge ? (this.getVal(path) || {}) : {};
        const next = opts.merge ? { ...old, ...data } : data;
        this.setVal(path, next);
        return true;
      },
      update: async (data) => {
        const old = this.getVal(path) || {};
        const next = { ...old, ...data };
        this.setVal(path, next);
        return true;
      },
      delete: async () => {
        const parts = path.split('/').filter(Boolean);
        let cur = this.data;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!cur[parts[i]]) return true;
          cur = cur[parts[i]];
        }
        if (cur && parts.length > 0) {
          delete cur[parts[parts.length - 1]];
          this.notify(path);
        }
        return true;
      },
      acquire: async ({ holder, ttlMs }) => {
        // Mock de locks
        this.setVal(path, { holder, expiresAt: Date.now() + (ttlMs || 60000) });
        return { acquired: true };
      },
      onSnapshot: (onNext, onError) => {
        if (!this.listeners.has(path)) this.listeners.set(path, new Set());
        const set = this.listeners.get(path);
        set.add(onNext);

        // Disparar valor inicial
        setTimeout(() => {
          const val = this.getVal(path);
          onNext({
            exists: val !== undefined && val !== null,
            data: () => val
          });
        }, 0);

        return () => {
          set.delete(onNext);
        };
      }
    };
  }

  collection(path) {
    return {
      doc: (id) => this.doc(`${path}/${id}`),
      onSnapshot: (onNext, onError) => {
        if (!this.listeners.has(path)) this.listeners.set(path, new Set());
        const set = this.listeners.get(path);
        set.add(onNext);

        setTimeout(() => {
          const colVal = this.getVal(path) || {};
          const docs = Object.entries(colVal).map(([id, data]) => ({
            id,
            exists: true,
            data: () => data
          }));
          onNext({ docs });
        }, 0);

        return () => {
          set.delete(onNext);
        };
      }
    };
  }
}

export class DBService {
  constructor() {
    this.memDb = new MemoryDatabase();
    this.firestore = null;
    this.isFirebaseReady = false;
  }

  async init(firebaseConfig) {
    if (!firebaseConfig || !firebaseConfig.projectId || !firebaseConfig.apiKey) {
      console.log('📌 DBService: Usando base de datos reactiva local (IndexedDB/LocalStorage).');
      return;
    }

    try {
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      this.firestore = getFirestore(app);
      this.isFirebaseReady = true;
      console.log('🔥 DBService: Conectado con éxito a Firebase Firestore.');
    } catch (e) {
      console.warn('⚠️ No se pudo inicializar Firebase, manteniendo almacenamiento local:', e);
      this.isFirebaseReady = false;
    }
  }

  doc(path) {
    if (!this.isFirebaseReady || !this.firestore) {
      return this.memDb.doc(path);
    }

    const docRef = doc(this.firestore, path);
    return {
      get: async () => {
        const snap = await getDoc(docRef);
        return {
          exists: snap.exists(),
          data: () => snap.data()
        };
      },
      set: async (data, opts = {}) => {
        await setDoc(docRef, data, opts);
      },
      update: async (data) => {
        await setDoc(docRef, data, { merge: true });
      },
      delete: async () => {
        try {
          await deleteDoc(docRef);
        } catch (e) {
          console.warn('Error borrando documento en Firebase:', e);
        }
      },
      acquire: async ({ holder, ttlMs }) => {
        try {
          await setDoc(doc(this.firestore, `locks/${path.replace(/\//g, '_')}`), {
            holder,
            expiresAt: Date.now() + (ttlMs || 60000)
          });
          return { acquired: true };
        } catch (e) {
          return { acquired: true };
        }
      },
      onSnapshot: (onNext, onError) => {
        return onSnapshot(docRef, (snap) => {
          onNext({
            exists: snap.exists(),
            data: () => snap.data()
          });
        }, onError);
      }
    };
  }

  collection(path) {
    if (!this.isFirebaseReady || !this.firestore) {
      return this.memDb.collection(path);
    }

    const colRef = collection(this.firestore, path);
    return {
      doc: (id) => this.doc(`${path}/${id}`),
      onSnapshot: (onNext, onError) => {
        return onSnapshot(colRef, (snap) => {
          const docs = snap.docs.map(d => ({
            id: d.id,
            exists: d.exists(),
            data: () => d.data()
          }));
          onNext({ docs });
        }, onError);
      }
    };
  }
}
