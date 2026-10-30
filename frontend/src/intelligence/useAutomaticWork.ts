import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {AutomaticResource} from './AutomaticResource';

export const DEFAULT_FOCUS = 'Review the uploaded project documents.';
export const SETTLE_MS = 350;

export function useAutomaticWork<T>(resource: AutomaticResource<T>, initialQuery: string, active: boolean, ready: boolean, revision: number, saved?: {query:string;focus:string}) {
  const [query, setQuery] = useState(saved?.query??initialQuery);
  const [focus, setFocus] = useState(saved?.focus??initialQuery);
  const read = useCallback(() => resource.read(focus), [resource, focus]);
  const entry = useSyncExternalStore(resource.subscribe, read, read);
  const previous = useRef<{result: T; resultRevision: number} | null>(null);
  useEffect(() => {if (entry.result) previous.current = {result: entry.result, resultRevision: entry.resultRevision};}, [entry.result, entry.resultRevision]);
  useEffect(() => {
    if (!active || !ready || entry.busy || entry.attemptedRevision === revision) return;
    // Debounce readiness/source changes and Strict Mode's effect replay. This is
    // a single delayed operation, not polling or a failure retry loop.
    const timer = window.setTimeout(() => void resource.run(focus), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [resource, focus, active, ready, revision, entry.busy, entry.attemptedRevision]);
  async function run(text = query, _revision?: number) {
    if (!ready || text.trim().length < 2 || text.trim().length > 500) return;
    setFocus(text.trim());
    await resource.run(text.trim(), true);
  }
  const result = entry.result ?? previous.current?.result ?? null;
  const resultRevision = entry.result ? entry.resultRevision : previous.current?.resultRevision ?? -1;
  return {...entry, result, resultRevision, query, focus, setQuery, run, refresh: () => resource.run(focus, true),
    waiting: active && ready && !entry.busy && entry.attemptedRevision !== revision,
    stale: Boolean(result && resultRevision !== revision), previousFocus: Boolean(result && !entry.result)};
}
