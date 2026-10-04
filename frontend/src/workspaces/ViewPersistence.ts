import {workspaceApi} from './api';
import type {WorkspaceView} from './types';

/** Serialise view saves for one fixed workspace. Results are saved by the backend. */
export class ViewPersistence {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pending = false;
  private running = false;
  private version = 0;
  constructor(readonly id: string, public view: WorkspaceView, private onError: (id: string, message: string) => void) {}
  update = (patch: Partial<WorkspaceView>) => {
    const next = {...this.view, ...patch};
    if (JSON.stringify(next) === JSON.stringify(this.view)) return;
    this.view = next; this.pending = true; this.version++;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 300);
  };
  flush = async () => {
    clearTimeout(this.timer);
    if (!this.pending || this.running) return;
    this.running = true; this.pending = false;
    const version = this.version;
    try {await workspaceApi.saveView(this.id, this.view); this.onError(this.id, '');}
    catch (error) {this.pending = true; this.onError(this.id, error instanceof Error ? error.message : 'Workspace view could not be saved.');}
    finally {
      this.running = false;
      // Follow a newer edit, but never automatically retry the same failed save.
      if (this.version !== version) void this.flush();
    }
  };
}
