component/TaskRow.vue is implemented as follows:
```
<template>
  <div class="task-row">
    <div class="meta">
      <strong>{{ task.taskName || task.name }}</strong>
      <small v-if="task.description"> — {{ task.description }}</small>
    </div>
    <div class="actions">
      <!-- emit the task as payload -->
      <button @click="$emit('edit-deps', task)">Dependencies</button>
      <button @click="requestDelete">Delete</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from './auth';

const props = defineProps<{ task: Record<string, any> }>();
const emit = defineEmits<{ (e: 'delete', payload: { deleter: string; task: string }): void; (e: 'edit-deps', task: Record<string, any>): void }>();

// Use the auth store to prefer a canonical user id, falling back to username.
// Only prompt the user if no authenticated identity is available.
const auth = useAuthStore();

function requestDelete() {
  const actor = (auth as any)._id ?? auth.username ?? '';
  if (actor) {
    emit('delete', { deleter: actor, task: props.task._id || props.task.taskName || '' });
    return;
  }

  // Last-resort: fall back to prompting when no auth info is present.
  const deleter = prompt('Your ID to delete this task:') || '';
  if (!deleter) return;
  emit('delete', { deleter, task: props.task._id || props.task.taskName || '' });
}
</script>

<style scoped>
.task-row {
display:flex;
justify-content:space-between;
align-items:center;
padding:.5rem;
border-radius:6px;
background: var(--surface);
color: var(--text);
border: 1px solid rgba(255,255,255,0.04);
}

.actions button {
margin-left:.5rem;
background: transparent;
color: var(--text);
border: 1px solid rgba(255,255,255,0.04);
padding: .25rem .5rem;
border-radius:4px;
cursor: pointer;
}
.actions button:hover { filter: brightness(1.5); }
</style>
```