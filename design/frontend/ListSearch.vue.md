<!--
Design: ListSearch.vue
Purpose: a small Vue 3 component placed on the list page that lets users search their own lists
and jump/scroll to the selected list on the page.

Integration notes:
- Each list container on the page should be given an id `list-<list._id>` so the component can
  find it via `document.getElementById` and call `scrollIntoView`.
- The component expects an API endpoint that returns the user's lists. The backend already
  exposes `/api/ListCreation/getListsByOwner` (see `Requesting.passthrough`). Use that to fetch
  the current user's lists. If you store `auth._id` in the auth store, pass it as `ownerId` prop
  or the component will attempt to read `authStore.user._id`.

Paste the `<script setup>` block below directly into a `.vue` file (or adapt to your component style).
-->

# ListSearch.vue (design)

```vue
<template>
  <div class="list-search" @keydown.escape="close">
    <label class="sr-only" for="list-search-input">Search lists</label>
    <div class="search-wrap">
      <input
        id="list-search-input"
        type="search"
        v-model="query"
        @input="onInput"
        @keydown.down.prevent="focusNext"
        @keydown.up.prevent="focusPrev"
        @keydown.enter.prevent="acceptFocused"
        autocomplete="off"
        placeholder="Search your lists..."
        aria-autocomplete="list"
        aria-controls="list-search-results"
        :aria-expanded="showResults.toString()"
      />
      <button v-if="query" @click="clear" aria-label="Clear search">✕</button>
    </div>

    <ul
      v-if="showResults && matches.length"
      id="list-search-results"
      class="results"
      role="listbox"
      :aria-activedescendant="activeDescendantId"
    >
      <li
        v-for="(l, i) in matches"
        :key="l._id"
        :id="`list-search-item-${l._id}`"
        :class="{focused: i === focusedIndex}"
        role="option"
        @mousedown.prevent="select(l)"  <!-- mousedown so click doesn't blur input first -->
        @mouseenter="focusedIndex = i"
      >
        <div class="title">{{ l.title || l.name || 'Untitled list' }}</div>
        <div class="meta">{{ l.itemCount ?? '' }} items</div>
      </li>
    </ul>

    <div v-if="showResults && !matches.length" class="no-results">No lists found</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
// If your app has a central auth store, import it here. This design expects `authStore.user._id`.
// import useAuthStore from "@/stores/auth";

interface ListDoc {
  _id: string;
  title?: string;
  name?: string;
  itemCount?: number;
}

const props = defineProps<{
  ownerId?: string | null; // optional prop; if omitted, we try to read from auth store
  minChars?: number;
  debounceMs?: number;
}>();

const ownerId = ref(props.ownerId ?? null);
const minChars = props.minChars ?? 1;
const debounceMs = props.debounceMs ?? 200;

const query = ref("");
const allLists = ref<ListDoc[]>([]);
const matches = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return [];
  return allLists.value.filter((l) => {
    const title = (l.title || l.name || "").toLowerCase();
    return title.includes(q);
  });
});

const showResults = computed(() => query.value.trim().length >= minChars && (matches.value.length > 0 || !matches.value.length));

// keyboard navigation
const focusedIndex = ref(-1);
watch(matches, () => {
  focusedIndex.value = matches.value.length ? 0 : -1;
});

const activeDescendantId = computed(() => {
  const m = matches.value[focusedIndex.value];
  return m ? `list-search-item-${listId(m)}` : undefined;
});

let fetchTimer: number | null = null;

function debounceFetch() {
  if (fetchTimer) {
    clearTimeout(fetchTimer);
  }
  fetchTimer = setTimeout(() => { fetchLists(); fetchTimer = null; }, debounceMs) as unknown as number;
}

async function fetchLists() {
  // Resolve ownerId: prefer prop, then try auth store (uncomment and adapt to your app)
  let owner = ownerId.value;
  if (!owner) {
    try {
      // const auth = useAuthStore(); owner = auth.user?._id ?? null;
      // If you rely on server-side caller identity instead, do not pass owner and
      // ensure the server accepts caller-derived lookups. This endpoint requires
      // `owner` currently, so we return early if missing to avoid the server error.
    } catch (e) {
      // ignore
    }
  }

  if (!owner) {
    console.warn("ListSearch: missing ownerId; call fetch with an ownerId prop or ensure auth store provides user._id");
    allLists.value = [];
    <ul
        v-if="showResults && matches.length"
        id="list-search-results"
        class="results"
        role="listbox"
        :aria-activedescendant="activeDescendantId"
      >
        <li
          v-for="(l, i) in matches"
          :key="listId(l)"
          :id="`list-search-item-${listId(l)}`"
          :class="{focused: i === focusedIndex}"
          role="option"
          @mousedown.prevent="select(l)"  <!-- mousedown so click doesn't blur input first -->
          @mouseenter="focusedIndex = i"
        >
          <div class="title">{{ l.title || l.name || 'Untitled list' }}</div>
          <div class="meta">{{ l.itemCount ?? '' }} items</div>
        </li>
      </ul>
    } else if (data.lists && Array.isArray(data.lists)) {
      allLists.value = data.lists;
    } else {
      allLists.value = [];
    }
  } catch (err) {
    console.warn("ListSearch: fetch error", err);
    allLists.value = [];
  }
}

function onInput() {
  if (query.value.trim().length < minChars) {
    // don't search yet
    return;
  }
  debounceFetch();
}

function clear() {
  query.value = "";
  focusedIndex.value = -1;
}

function close() {
  clear();
}

function focusNext() {
  if (!matches.value.length) return;
  focusedIndex.value = (focusedIndex.value + 1) % matches.value.length;
  ensureFocusedVisible();
}
function focusPrev() {
  if (!matches.value.length) return;
  focusedIndex.value = (focusedIndex.value - 1 + matches.value.length) % matches.value.length;
  ensureFocusedVisible();
}

function ensureFocusedVisible() {
  // optional: scroll the results list to show focused item
  const m = matches.value[focusedIndex.value];
  if (!m) return;
  const el = document.getElementById(`list-search-item-${m._id}`);
  el?.scrollIntoView({ block: "nearest" });
}

function acceptFocused() {
  if (focusedIndex.value >= 0 && matches.value[focusedIndex.value]) {
    select(matches.value[focusedIndex.value]);
  }
}

function select(list: ListDoc) {
  // Primary behavior: find the list element on the page and scroll to it
  const id = listId(list);
  const targetId = `list-${id}`;
  const el = document.getElementById(targetId);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    // Optionally focus the list container
    (el as HTMLElement).focus?.();
  } else {
    // Fallback: navigate to hash so other code (or server-side routing) can handle it
    window.location.hash = `#${targetId}`;
  }
  // close results and clear query
  query.value = "";
}

// Helper: tolerate different id field names returned by server
function listId(l: any) {
  return l?._id ?? l?.id ?? l?.listId ?? null;
}

onMounted(() => {
  // pre-fetch user's lists so matches are instant; keep lightweight
  fetchLists();
});
</script>

<style scoped>
.list-search { position: relative; max-width: 420px; }
.search-wrap { display:flex; gap:8px; align-items:center; }
input[type="search"] { flex:1; padding:8px; }
.results { position:absolute; left:0; right:0; z-index:30; max-height:240px; overflow:auto; background:white; border:1px solid #ddd; margin-top:6px; padding:0; list-style:none; }
.results li { padding:8px; cursor:pointer; display:flex; justify-content:space-between; }
.results li.focused { background:#f0f6ff; }
.no-results { margin-top:6px; color:#666; }
.sr-only { position:absolute !important; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
</style>
```
