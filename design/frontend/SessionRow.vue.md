Design copy of `SessionRow.vue` used by `SessionList.vue`.

```
<template>
  <li class="session-row">
    <div v-if="showStatus" class="status" :class="statusClass">{{ statusLabel }}</div>
    <div class="content">
      <div class="title">{{ item.taskName || item.name || item.task }}</div>
      <div class="meta">{{ item.description }}</div>
    </div>
    <div class="actions">
      <button @click="$emit('start')">Start</button>
      <button @click="$emit('complete')">Complete</button>
    </div>
  </li>
</template>

<script setup lang="ts">
const props = defineProps<{ item: Record<string, any>; status?: string; showStatus?: boolean }>();

const status = (props as any).status ?? 'Incomplete';
const statusLabel = status.replace(/_/g, ' ');
const showStatus = !!(props as any).showStatus;

const statusClass = (() => {
  switch ((status || '').toLowerCase()) {
    case 'incomplete': return 'badge incomplete';
    case 'in_progress':
    case 'in progress':
    case 'started': return 'badge in-progress';
    case 'complete':
    case 'completed': return 'badge complete';
    default: return 'badge unknown';
  }
})();
</script>

<style scoped>
.session-row { display:flex; align-items:center; gap:12px; padding:0.5rem; border-radius:8px; background:var(--surface); }
.status { width:4.5rem; text-align:center; font-weight:700; }
.badge { display:inline-block; padding:0.25rem 0.5rem; border-radius:999px; color:white; font-size:0.85rem; }
.badge.incomplete { background:#6b7280; }
.badge.in-progress { background:#f59e0b; }
.badge.complete { background:#10b981; }
.badge.unknown { background:#9ca3af; }
.content { flex:1; }
.title { font-weight:600; }
.meta { font-size:0.9rem; color:var(--muted); }
.actions button { margin-left:0.5rem; }
</style>

```

Notes:
- The status badge is prominent (large, colored) and positioned left so it becomes the focal point.
- The component is intentionally simple and agnostic about ordering — `SessionList` controls ordering.
