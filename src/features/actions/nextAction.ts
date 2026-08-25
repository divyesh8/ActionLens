type Candidate = { id: string; status: 'not_started' | 'in_progress' | 'waiting' | 'ready' | 'completed' | 'blocked'; priority: 'low' | 'normal' | 'high' | 'urgent'; due_at: string | null; estimated_minutes: number | null; sort_order: number; depends_on_ids: string[] };

const priorityScore = { low: 0, normal: 10, high: 25, urgent: 45 } as const;

export function selectNextAction<T extends Candidate>(actions: T[], now = new Date()): T | null {
  const statusById = new Map(actions.map((action) => [action.id, action.status]));
  const actionable = actions.filter((action) =>
    !['completed', 'waiting', 'blocked'].includes(action.status)
    && action.depends_on_ids.every((dependencyId) => statusById.get(dependencyId) === 'completed'));
  if (actionable.length === 0) return null;
  return [...actionable].sort((left, right) => score(right, now) - score(left, now) || left.sort_order - right.sort_order)[0] ?? null;
}

function score(action: Candidate, now: Date): number {
  const status = action.status === 'in_progress' ? 18 : action.status === 'ready' ? 14 : 0;
  const effort = action.estimated_minutes === null ? 0 : Math.max(0, 12 - action.estimated_minutes / 15);
  let deadline = 0;
  if (action.due_at) {
    const days = (new Date(action.due_at).getTime() - now.getTime()) / 86_400_000;
    deadline = days <= 0 ? 60 : days <= 1 ? 45 : days <= 3 ? 30 : days <= 7 ? 18 : 5;
  }
  return priorityScore[action.priority] + status + effort + deadline;
}
