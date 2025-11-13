stores/taskbank.ts is implemented as follows:
```
import { defineStore } from 'pinia';
import type { TaskDocument, Dependency } from '../api/client';
import {
  listTasks,
  addTaskToBank,
  deleteTaskFromBank,
  addDependency,
  deleteDependency,
  getDependencies,
  evaluateTaskOrder,
  getTasks, 
  addDependency as apiAddDependency,
  deleteDependency as apiDeleteDependency,
} from '../api/client';
import { useAuthStore } from './auth';

export const useTaskBankStore = defineStore('taskbank', {
  state: () => ({
    tasks: [] as TaskDocument[],
    dependencies: [] as Dependency[],
    loading: false as boolean,
    error: '' as string
  }),
  getters: {
    tasksMap: (state) => {
      const map = new Map<string, TaskDocument>();
      for (const t of state.tasks) {
        const id = (t as any)._id ?? (t as any).taskName ?? '';
        if (id) map.set(id, t);
      }
      return map;
    },
    getTaskName: (state) => {
      return (id?: string) => {
        if (!id) return undefined;
        const t = state.tasks.find(x => (x as any)._id === id || (x as any).taskName === id || (x as any).name === id);
        return t ? ((t as any).taskName ?? (t as any).name ?? (t as any)._id) : undefined;
      };
    }
  },
  actions: {
    async fetchAll(owner?: string) {
      this.loading = true;
      this.error = '';
      try {
        const res = await listTasks({ owner });
        this.tasks = Array.isArray(res?.tasks) ? res.tasks : [];
        console.debug('[taskbank] fetched', this.tasks.length, 'tasks');
        if (this.tasks.length > 0) console.debug('[taskbank] sample item keys:', Object.keys(this.tasks[0] as any), 'sample:', this.tasks[0]);
        return this.tasks;
      } catch (e: any) {
        this.error = e?.message ?? String(e);
        this.tasks = [];
        console.error('[taskbank] fetchAll error', e);
        throw e;
      } finally {
        this.loading = false;
      }
    },
    async addTask(adder: string | undefined, name: string, description?: string) {
      this.loading = true;
      this.error = '';
      const auth = useAuthStore();
      try {
        // Prefer canonical user id when available, fall back to username.
        // This reduces the need for the UI to prompt for an explicit id.
        const actor = adder ?? (auth as any)._id ?? auth.username;
        if (!actor) throw new Error('Adder required (login or provide adder).');
        const res = await addTaskToBank({ adder: actor, name, description });
        return res;
      } catch (e: any) {
        this.error = e.message || String(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async deleteTask(deleter: string | undefined, task: string) {
      this.loading = true;
      this.error = '';
      const auth = useAuthStore();
      try {
        // Prefer canonical user id when available, fall back to username.
        // This ensures the server receives an id when possible and avoids
        // prompting the user for an id in the UI.
        const actor = deleter ?? (auth as any)._id ?? auth.username;
        if (!actor) throw new Error('Deleter required (login or provide deleter).');
        await deleteTaskFromBank({ deleter: actor, task });
        this.tasks = this.tasks.filter(t => (t._id || (t as any).taskName) !== task);
      } catch (e: any) {
        this.error = e.message || String(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },
// ...existing code...
    async updateDeps(taskId: string, newDeps: { depTask: string; depRelation: string }[]) {
      this.loading = true;
      try {
  const authStore = useAuthStore();
  // Prefer canonical user id when available. Some auth stores set `_id`.
  const adder = (authStore as any)._id ?? authStore.username;
        if (!adder) throw new Error('Not authenticated');

        // find current task in local cache
        const currentTask = (this.tasks || []).find((t: any) => t._id === taskId);

        // safely build a currentDeps array (avoid accessing possibly undefined properties)
        let currentDeps: { depTask: string; depRelation: string }[] = [];
        if (currentTask && Array.isArray((currentTask as any).dependencies)) {
          currentDeps = (currentTask as any).dependencies.map((d: any) => ({
            depTask: d.depTask,
            depRelation: d.depRelation
          }));
        }

        // compute adds/removes by comparing arrays
        const toAdd = newDeps.filter(nd => !currentDeps.some(cd => cd.depTask === nd.depTask && cd.depRelation === nd.depRelation));
        const toRemove = currentDeps.filter(cd => !newDeps.some(nd => nd.depTask === cd.depTask && nd.depRelation === cd.depRelation));

        // perform deletions first
        for (const rem of toRemove) {
          await apiDeleteDependency({
            deleter: adder,
            sourceTask: taskId,
            targetTask: rem.depTask,
            relation: rem.depRelation
          });
        }

        // perform additions
        for (const add of toAdd) {
          await apiAddDependency({
            adder,
            task1: taskId,
            task2: add.depTask,
            dependency: add.depRelation
          });
        }

        // update local cache if present (safe check of index)
        const idx = (this.tasks || []).findIndex((t: any) => t._id === taskId);
        if (idx !== -1 && this.tasks[idx]) {
          (this.tasks[idx] as any).dependencies = newDeps.map(d => ({ depTask: d.depTask, depRelation: d.depRelation }));
        }

        return true;
      } catch (e: any) {
        this.error = e?.message ?? String(e);
        throw e;
      } finally {
        this.loading = false;
      }
    }
  }
});
```