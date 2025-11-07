// src/utils/topoShuffle.ts
// Dependency-respecting random topological shuffle.
// Input: array of nodes { id: string, deps?: string[] }.
// Output: array of ids in an order that respects deps (deps must appear before node).
export function topoShuffle<T extends { id: string; deps?: string[] }>(
  nodes: T[],
): string[] {
  const nodeById = new Map<string, T>();
  for (const n of nodes) nodeById.set(n.id, n);

  // Build indegree and adjacency list for reverse edges
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>(); // id -> list of nodes that depend on it

  for (const n of nodes) {
    indegree.set(n.id, 0);
    dependents.set(n.id, []);
  }

  for (const n of nodes) {
    const deps = n.deps ?? [];
    for (const d of deps) {
      // ignore missing dependencies gracefully (they may refer to external tasks)
      if (!indegree.has(d)) {
        // If dependency unknown, create a placeholder with indegree 0.
        indegree.set(d, 0);
        dependents.set(d, []);
      }
      indegree.set(n.id, (indegree.get(n.id) ?? 0) + 1);
      dependents.get(d)!.push(n.id);
    }
  }

  // Collect initial zero-indegree nodes
  let zeros: string[] = [];
  for (const [id, deg] of indegree) if (deg === 0) zeros.push(id);

  const out: string[] = [];
  // Helper: random pick from array (in-place)
  function pickRandomAndRemove(arr: string[]) {
    const i = Math.floor(Math.random() * arr.length);
    const val = arr[i];
    arr[i] = arr[arr.length - 1];
    arr.pop();
    return val;
  }

  while (zeros.length) {
    // choose one node at random from zeros
    const id = pickRandomAndRemove(zeros);
    // Only include nodes that were in original nodes list (skip placeholders)
    if (nodeById.has(id)) out.push(id);

    // decrement indegree of dependents
    const depsList = dependents.get(id) ?? [];
    for (const dep of depsList) {
      const newDeg = (indegree.get(dep) ?? 1) - 1;
      indegree.set(dep, newDeg);
      if (newDeg === 0) zeros.push(dep);
    }
  }

  // If out length < original nodes, there's a cycle among the original nodes (or missing deps prevented inclusion)
  if (out.length !== nodes.length) {
    // Fallback: include any remaining nodes deterministically (but warn)
    const remaining = nodes.map((n) => n.id).filter((id) => !out.includes(id));
    // Simple deterministic append: keep original relative order among remaining
    out.push(...remaining);
    console.warn(
      "[topoShuffle] detected cycle or missing dependencies; appending remaining nodes:",
      remaining,
    );
  }

  return out;
}
