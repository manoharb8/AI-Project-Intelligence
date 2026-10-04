import {beforeEach, expect, test, vi} from 'vitest';
import {AutomaticResource, type ResourceEnvironment} from './AutomaticResource';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {resolve = yes; reject = no;});
  return {promise, resolve, reject};
}
let environment: ResourceEnvironment;
beforeEach(() => {environment = {revision: 0, ready: true, sourcesChanging: false};});

test('deduplicates concurrent consumers and caches completed and insufficient results', async () => {
  const pending = deferred<string>(); const request = vi.fn(() => pending.promise);
  const resource = new AutomaticResource(request, () => environment);
  const first = resource.run('Default focus'); void resource.run('Default focus');
  expect(request).toHaveBeenCalledTimes(1);
  pending.resolve('Insufficient evidence'); await first;
  await resource.run('Default focus'); expect(request).toHaveBeenCalledTimes(1);
  expect(resource.read('Default focus').result).toBe('Insufficient evidence');
});
test('blocks unavailable and unsettled prerequisites, then permits the first ready attempt', async () => {
  const request = vi.fn().mockResolvedValue('ready'); const resource = new AutomaticResource(request, () => environment);
  environment.ready = false; await resource.run('Default focus');
  environment.ready = true; environment.sourcesChanging = true; await resource.run('Default focus');
  expect(request).not.toHaveBeenCalled(); environment.sourcesChanging = false;
  await resource.run('Default focus'); expect(request).toHaveBeenCalledTimes(1);
});
test('failures preserve previous results and require an explicit retry', async () => {
  const request = vi.fn().mockResolvedValueOnce('previous').mockRejectedValueOnce(new Error('Temporary error')).mockResolvedValueOnce('recovered');
  const resource = new AutomaticResource(request, () => environment);
  await resource.run('Default focus'); environment.revision++; resource.invalidate();
  await resource.run('Default focus');
  expect(resource.read('Default focus')).toMatchObject({result: 'previous', resultRevision: 0, error: 'Temporary error', busy: false});
  await resource.run('Default focus'); expect(request).toHaveBeenCalledTimes(2);
  await resource.run('Default focus', true); expect(resource.read('Default focus')).toMatchObject({result: 'recovered', resultRevision: 1, error: ''});
});
test('rejects late older-version success after a newer result has completed', async () => {
  const old = deferred<string>(); const request = vi.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce('new');
  const resource = new AutomaticResource(request, () => environment);
  const first = resource.run('Default focus'); environment.revision++; resource.invalidate();
  await resource.run('Default focus'); old.resolve('obsolete'); await first;
  expect(resource.read('Default focus')).toMatchObject({result: 'new', resultRevision: 1, busy: false, error: ''});
});
test('rejects a response as soon as the source version changes, even before invalidation effects', async () => {
  const pending = deferred<string>(); const resource = new AutomaticResource(() => pending.promise, () => environment);
  const run = resource.run('Default focus'); environment.revision++;
  pending.resolve('obsolete'); await run;
  expect(resource.read('Default focus')).toMatchObject({result: null, attemptedRevision: null, busy: false});
});
test('late errors cannot overwrite a newer success', async () => {
  const old = deferred<string>(); const request = vi.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce('new');
  const resource = new AutomaticResource(request, () => environment);
  const first = resource.run('Default focus'); environment.revision++; resource.invalidate();
  await resource.run('Default focus'); old.reject(new Error('Old failure')); await first;
  expect(resource.read('Default focus').error).toBe(''); expect(resource.read('Default focus').result).toBe('new');
});
test('upload beginning invalidates in-flight work before the indexed revision changes', async () => {
  const pending = deferred<string>(); const request = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValueOnce('fresh');
  const resource = new AutomaticResource(request, () => environment);
  const first = resource.run('Default focus'); environment.sourcesChanging = true; resource.invalidate();
  pending.resolve('mixed sources'); await first; expect(resource.read('Default focus').result).toBeNull();
  environment.sourcesChanging = false; await resource.run('Default focus'); expect(resource.read('Default focus').result).toBe('fresh');
});
test('custom focuses have distinct caches and share no substituted result', async () => {
  const request = vi.fn((query: string) => Promise.resolve(query)); const resource = new AutomaticResource(request, () => environment);
  await resource.run('Default focus'); await resource.run('Narrow focus'); await resource.run('Default focus');
  expect(request).toHaveBeenCalledTimes(2); expect(resource.read('Default focus').result).toBe('Default focus');
});
