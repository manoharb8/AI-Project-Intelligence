/** Workspace-local, query-keyed memory cache; supports server snapshot hydration. No automatic retries. */
export interface ResourceEntry<T> {
  result: T | null;
  resultRevision: number;
  busy: boolean;
  error: string;
  attemptedRevision: number | null;
}
export interface ResourceEnvironment {revision: number; ready: boolean; sourcesChanging: boolean}

export class AutomaticResource<T> {
  private entries = new Map<string, ResourceEntry<T>>();
  private listeners = new Set<() => void>();
  private pending = new Map<string, symbol>();
  constructor(private request: (query: string) => Promise<T>, private environment: () => ResourceEnvironment) {}
  restore(query: string, result: T, resultRevision: number) {
    this.entries.set(query,{result,resultRevision,busy:false,error:'',attemptedRevision:resultRevision<0?null:resultRevision});
  }
  subscribe = (listener: () => void) => {this.listeners.add(listener); return () => {this.listeners.delete(listener);};};
  read = (query: string): ResourceEntry<T> => {
    if (!this.entries.has(query)) this.entries.set(query, {result: null, resultRevision: -1, busy: false, error: '', attemptedRevision: null});
    return this.entries.get(query)!;
  };
  private write(query: string, patch: Partial<ResourceEntry<T>>) {
    this.entries.set(query, {...this.read(query), ...patch});
    this.listeners.forEach(listener => listener());
  }
  /** Invalidate the request token, retaining the last useful result. */
  invalidate() {
    for (const [query, entry] of this.entries) {
      this.pending.delete(query);
      this.write(query, {busy: false, attemptedRevision: null, error: entry.error});
    }
  }
  async run(query: string, force = false) {
    query = query.trim();
    const environment = this.environment();
    if (!environment.ready || environment.sourcesChanging || query.length < 2 || query.length > 500) return;
    const {revision} = environment;
    const entry = this.read(query);
    if (this.pending.has(query) || (!force && entry.attemptedRevision === revision)) return;
    const token = Symbol();
    this.pending.set(query, token);
    this.write(query, {busy: true, error: '', attemptedRevision: revision});
    const current = () => this.pending.get(query) === token && this.environment().revision === revision && !this.environment().sourcesChanging;
    try {
      const result = await this.request(query);
      if (current()) this.write(query, {result, resultRevision: revision});
    } catch (error) {
      if (current()) this.write(query, {error: error instanceof Error ? error.message : 'The request could not be completed. Please retry.'});
    } finally {
      if (this.pending.get(query) === token) {
        this.pending.delete(query);
        this.write(query, {busy: false, ...(!currentRevision(this.environment(), revision) ? {attemptedRevision: null} : {})});
      }
    }
  }
}
function currentRevision(environment: ResourceEnvironment, revision: number) {
  return environment.revision === revision && !environment.sourcesChanging;
}
