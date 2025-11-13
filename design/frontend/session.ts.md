stores/session.ts is implemented as follows:
```
import { defineStore } from 'pinia';
import type { SessionDocument, SessionListItem } from '../api/client';
import {
  changeSession as apiChangeSession,
  setSessionOrdering,
  setSessionFormat,
  randomizeSessionOrder,
  activateSession as apiActivateSession,
  deactivateSession as apiDeactivateSession,
  startSessionTask,
  completeSessionTask,
  endSession,
  deleteSession,
  addListItemToSession,
  removeListItemFromSession,
  getSession,
  getTaskStatus,
  getSessionListItems,
  getSessionForOwner,
  getActiveSessionForOwner,
  getSessionByOwner as apiGetSessionByOwner,
} from '../api/client';
import { useAuthStore } from './auth';
import { useTaskBankStore } from './taskbank';

function normalizeSessionObj(raw: any) {
  if (!raw) return null;
      // backend returns a session doc directly; ensure _id and owner exist
    return {
      _id: raw._id ?? raw.session ?? raw.id,
      owner: raw.owner,
      listId: raw.listId ?? raw.list,
      title: raw.title ?? '',
      itemCount: raw.itemCount ?? raw.items ?? 0,        active: !!raw.active,
      ordering: raw.ordering ?? raw.order,
      format: raw.format ?? 'List',
      // keep original raw for anything else
       __raw: raw
    };
  }

export const useSessionStore = defineStore('session', {
  state: () => ({
    sessions: [] as SessionDocument[],
    activeSession: null as SessionDocument | null,
    listItems: [] as SessionListItem[],
    taskStatuses: {} as Record<string, string>,
    loading: false as boolean,
    error: '' as string
  }),
  actions: {
    // ...existing actions...

    async randomizeOrder(payload: { session: string; randomizer?: string }) {
      this.loading = true;
      this.error = '';
      const auth = useAuthStore();
      try {
        const actor = payload.randomizer ?? auth.username;
        if (!actor) throw new Error('Randomizer ID required (login or provide id).');
        await randomizeSessionOrder({ session: payload.session, randomizer: actor });
        await this.loadSessionListItems(payload.session);
      } catch (e: any) {
        this.error = e?.message ?? String(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },
  async activateSession(payload: { session: string; activator: string }) {
    this.loading = true;
    try {
      const res = await apiActivateSession(payload);
      if (res && typeof res === 'object' && 'error' in res && res.error) {
        throw new Error(String(res.error));
      }

      // Optimistically mark sessions in local state
      this.sessions = this.sessions.map(s => {
        const id = s._id ?? (s as any).session;
        if (id === payload.session) return { ...s, active: true };
        // optionally mark previous active as inactive
        return { ...s, active: false };
      });

      // set activeSession locally (no reload required)
      const found = this.sessions.find(s => (s._id ?? (s as any).session) === payload.session) ?? null;
      this.activeSession = found as any;

      // still refresh in background but UI already updated
      this.fetchSessions().catch(() => {});
      this.fetchActiveForOwner(payload.activator).catch(() => {});

      return res;
    } catch (e: any) {
      this.error = e?.message ?? String(e);
      throw e;
    } finally {
      this.loading = false;
    }
  },

  async deactivateSession(payload: { sessionId: string; sessionOwner: string }) {
    this.loading = true;
    try {
      const res = await apiDeactivateSession(payload);
      if (res && typeof res === 'object' && 'error' in res && res.error) {
        throw new Error(String(res.error));
      }

      // optimistic local update: mark session inactive and clear activeSession if it matches
      this.sessions = this.sessions.map(s => {
        const id = (s as any)._id ?? (s as any).session;
        if (id === payload.sessionId) return { ...s, active: false };
        return s;
      });

      const activeId = (this.activeSession as any)?._id ?? (this.activeSession as any)?.session;
      if (activeId === payload.sessionId) {
        this.activeSession = null;
      }

      // refresh in background
      this.fetchSessions().catch(() => {});
      this.fetchActiveForOwner(payload.sessionOwner).catch(() => {});

      return res;
    } catch (e: any) {
      this.error = e?.message ?? String(e);
      throw e;
    } finally {
      this.loading = false;
    }
  },

    async setOrdering(payload: { session: string; newType: string; setter?: string }) {
      this.loading = true;
      this.error = '';
      const auth = useAuthStore();
      try {
        const actor = payload.setter ?? auth.username;
        if (!actor) throw new Error('Setter required (login or provide setter).');
        await setSessionOrdering({ session: payload.session, newType: payload.newType, setter: actor });
      } catch (e: any) {
        this.error = e?.message ?? String(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async setFormat(payload: { session: string; newFormat: string; setter?: string }) {
      this.loading = true;
      this.error = '';
      const auth = useAuthStore();
      try {
        const actor = payload.setter ?? auth.username;
        if (!actor) throw new Error('Setter required (login or provide setter).');
        await setSessionFormat({ session: payload.session, newFormat: payload.newFormat, setter: actor });
      } catch (e: any) {
        this.error = e?.message ?? String(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async addListItem(payload: { session: string; task: string; defaultOrder?: number; adder?: string }) {
      this.loading = true;
      this.error = '';
      const auth = useAuthStore();
      try {
        const actor = payload.adder ?? auth.username;
        if (!actor) throw new Error('Adder required (login or provide adder).');
        await addListItemToSession({ session: payload.session, task: payload.task, defaultOrder: payload.defaultOrder } as any);
        await this.loadSessionListItems(payload.session);
      } catch (e: any) {
        this.error = e?.message ?? String(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async activateSessionByOwner(owner?: string) {
      // helper: use auth username if owner not provided
      const auth = useAuthStore();
      await this.fetchActiveForOwner(owner ?? auth.username);
    },
    async fetchSessions() {
      this.loading = true;
      try {
        // prefer fetching sessions for the current user if possible
        const auth = useAuthStore();
        const owner = auth.username ?? (auth as any)?._id;
        let res: any = [];
        if (owner) {
          res = await getSessionForOwner(owner).catch(() => []);
        }
        // normalize into array of session objects
        if (Array.isArray(res)) {
          this.sessions = res.map(normalizeSessionObj).filter(Boolean) as SessionDocument[];
        } else if (res) {
          const one = normalizeSessionObj(res);
          this.sessions = one ? [one] : [];
        } else {
          this.sessions = [];
        }
        console.debug('[session.store] fetchSessions -> sessions', this.sessions);
      } catch (e) {
        console.error('[session.store] fetchSessions failed', e);
        this.sessions = [];
      } finally {
        this.loading = false;
      }
    },

    async fetchActiveForOwner(ownerId?: string) {
      this.loading = true;
      try {
        const owner = ownerId ?? (useAuthStore().username ?? (useAuthStore() as any)?._id);
        if (!owner) { this.activeSession = null; return null; }

        // try explicit active endpoint first
        const rawActive = await getActiveSessionForOwner(owner).catch(() => null);
        if (rawActive) {
          // endpoint may return an object or an array
          let sessionObj = Array.isArray(rawActive) ? rawActive.find((s: any) => s.active) ?? rawActive[0] : rawActive;
          this.activeSession = normalizeSessionObj(sessionObj);
          return this.activeSession;
        }
                const alt = await getSessionForOwner(owner).catch(() => null);
        if (!alt) { this.activeSession = null; return null; }
        let picked = Array.isArray(alt) ? alt.find((s: any) => s.active) ?? alt[0] : alt;
        this.activeSession = normalizeSessionObj(picked);
        return this.activeSession;
      } catch (e) {
        console.error('[session.store] fetchActiveForOwner failed', e);
        this.activeSession = null;
        return null;
      } finally {
        this.loading = false;
      }
    },

    setActiveSession(sessionId: string | null) {
      if (!sessionId) {
        this.activeSession = null;
        this.listItems = [];
        this.taskStatuses = {};
        return;
      }
      const found = this.sessions.find(s => (s._id || (s as any).session) === sessionId);
      this.activeSession = (found ?? { _id: sessionId }) as SessionDocument;
      // only load items if we have a valid id
      const idToLoad = this.activeSession?._id ?? (this.activeSession as any)?.session;
      if (idToLoad) {
        // don't await here to keep UI responsive; callers can call loadSessionListItems explicitly
        void this.loadSessionListItems(idToLoad);
      }
    },

    async startTask(payload: { session: string; task: string }) {
      this.loading = true;
      this.error = '';
      try {
        if (!payload.session || !payload.task) return;
        await startSessionTask(payload);
        await this.refreshTaskStatus(payload.session, payload.task);
      } catch (e: any) {
        this.error = e?.message ?? String(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async completeTask(payload: { session: string; task: string }) {
      this.loading = true;
      this.error = '';
      try {
        if (!payload.session || !payload.task) return;
        await completeSessionTask(payload);
        await this.refreshTaskStatus(payload.session, payload.task);
      } catch (e: any) {
        this.error = e?.message ?? String(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async endSession(payload: { session: string }) {
      this.loading = true;
      this.error = '';
      try {
        if (!payload.session) return;
        await endSession(payload);
        const activeId = this.activeSession?._id ?? (this.activeSession as any)?.session;
        if (activeId && activeId === payload.session) {
          this.activeSession = null;
          this.listItems = [];
          this.taskStatuses = {};
        }
        await this.fetchSessions();
      } catch (e: any) {
        this.error = e?.message ?? String(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async deleteSession(payload: { session: string }) {
      this.loading = true;
      this.error = '';
      try {
        if (!payload.session) return;
        await deleteSession(payload);
        const activeId = this.activeSession?._id ?? (this.activeSession as any)?.session;
        if (activeId && activeId === payload.session) {
          this.activeSession = null;
          this.listItems = [];
          this.taskStatuses = {};
        }
        await this.fetchSessions();
      } catch (e: any) {
        this.error = e?.message ?? String(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async removeListItem(payload: { session: string; task: string }) {
      this.loading = true;
      this.error = '';
      try {
        if (!payload.session || !payload.task) return;
        await removeListItemFromSession({ session: payload.session, task: payload.task });
        await this.loadSessionListItems(payload.session);
      } catch (e: any) {
        this.error = e?.message ?? String(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async refreshTaskStatus(sessionId: string, taskId: string) {
      try {
        if (!sessionId || !taskId) return;
        const statuses = await getTaskStatus({ session: sessionId, task: taskId }).catch(() => []);
        if (Array.isArray(statuses) && statuses.length > 0 && statuses[0] && typeof (statuses[0] as any).status === 'string') {
          this.taskStatuses[taskId] = (statuses[0] as any).status;
        }
      } catch {
        // ignore individual status refresh errors
      }
    },
    async changeSession(payload: { list: string; sessionOwner: string; ordering?: string; format?: string; name?: string }) {
      this.loading = true;
      try {
        const res = await apiChangeSession(payload);
        // safe narrowing before reading properties
        if (res && typeof res === 'object' && 'error' in res && res.error) {
          throw new Error(String((res as any).error));
        }

        if (res && typeof res === 'object' && 'session' in res && (res as any).session) {
          // created; refresh active/session state
          await this.fetchSessions();
          await this.fetchActiveForOwner(payload.sessionOwner);
          return res;
        }

        // fallback: refresh lists to pick up changes
        await this.fetchSessions();
        await this.fetchActiveForOwner(payload.sessionOwner);
        return res;
      } catch (e: any) {
        this.error = e?.message ?? String(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },
    async loadSessionListItems(sessionId: string) {
    this.loading = true;
    try {
      const items = await getSessionListItems(sessionId);
      console.debug('[session.store] raw session list items', items);

      if (!Array.isArray(items)) {
        this.listItems = [];
        return [];
      }

      // Trust backend-provided taskName (do not overwrite it here)
      this.listItems = items.map((it: any) => ({ ...it }));
      console.debug('[session.store] listItems set', this.listItems);
      return this.listItems;
    } catch (e: any) {
      console.error('[session.store] loadSessionListItems failed', e);
      this.listItems = [];
      throw e;
    } finally {
      this.loading = false;
    }
  }

  }
});
```