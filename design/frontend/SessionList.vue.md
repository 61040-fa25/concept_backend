A proposed `SessionList.vue` component (design copy) that removes any default re-ordering and makes the task status a focal badge.

```
<template>
  <div class="session-list">
    <h2>{{ session.title || 'Session' }}</h2>

    <!-- Controls: no automatic 'default order' applied; user can choose ordering explicitly -->
    <div class="controls">
      <label>Ordering:
        <select v-model="localOrdering" @change="onChangeOrdering">
          <option value="none">None</option>
          <option value="default">Default</option>
          <option value="random">Random</option>
        </select>
      </label>
    </div>

    <!-- Search integration: mount the ListSearch component here to let users search their lists
         and jump to them on the page. Each list container must include an id matching
         `list-<list._id>` so the component can call `document.getElementById('list-<id>').scrollIntoView()`.
         Example:
         <ListSearch :ownerId="store.user?._id" />
 -->


    <ul class="items">
      <SessionRow
        v-for="item in displayedItems"
        :key="item._id || item.task"
        :item="item"
        :status="taskStatuses[item.task]"
        :showStatus="isActive"
        @start="onStart(item)"
        @complete="onComplete(item)"
      />
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import SessionRow from './SessionRow.vue';
import { useSessionStore } from '../stores/session';

const props = defineProps<{ sessionId: string }>();
const store = useSessionStore();

const localOrdering = ref('none');

// Determine whether this session is currently active so we can
// show/hide the status column and badges.
const isActive = computed(() => {
  // Try to find the session in the store's sessions list first
  const found = (store.sessions || []).find(
    (s: any) => (s._id ?? (s as any).session) === props.sessionId,
  );
  if (found && typeof (found as any).active === 'boolean') return (found as any).active;
  // Fall back to the store's activeSession
  const activeId = (store.activeSession as any)?._id ?? (store.activeSession as any)?.session;
  return activeId === props.sessionId;
});

// Keep the original backend ordering by default; but do NOT auto-apply a 'default' reorder.
// Instead, show items as provided and allow the user to explicitly pick ordering.
const displayedItems = computed(() => {
  const items = store.listItems || [];
  if (localOrdering.value === 'none') return items;
  if (localOrdering.value === 'default') return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (localOrdering.value === 'random') return [...items].sort(() => Math.random() - 0.5);
  return items;
});

function onChangeOrdering() {
  // If user selects 'default' or 'random' we optionally call the session store to persist
  // the user's choice. For now, we only re-render locally.
}

function onStart(item: any) {
  void store.startTask({ session: props.sessionId, task: item.task });
}

function onComplete(item: any) {
  void store.completeTask({ session: props.sessionId, task: item.task });
}
</script>

<style scoped>
.session-list { padding: 1rem; }
.controls { margin-bottom: 0.5rem; }
.items { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
</style>
```

Notes:
- The select defaults to 'none' so the UI does not apply a default ordering automatically.
- Status rendering is delegated to `SessionRow` which will show a prominent colored badge.
