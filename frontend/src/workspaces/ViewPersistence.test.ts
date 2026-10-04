import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {ViewPersistence} from './ViewPersistence';
import {workspaceApi} from './api';
import type {WorkspaceView} from './types';

vi.mock('./api',()=>({workspaceApi:{saveView:vi.fn()}}));
const view:WorkspaceView={retrieval_query:'',scope_query:'',risk_query:'',blockers_query:'',documentation_query:'Review sources',documentation_focus:'Review sources',health_query:'Review sources',health_focus:'Review sources',doc_tab:'user_stories',doc_filter:'',action_filter:'all',assistant_draft:'',turns:[]};
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>resolve=r);return{promise,resolve};}
beforeEach(()=>{vi.useFakeTimers();vi.resetAllMocks();vi.mocked(workspaceApi.saveView).mockResolvedValue(view);});
afterEach(()=>vi.useRealTimers());

test('coalesces edits for a fixed workspace without persisting evidence in browser storage',async()=>{
  const store=new ViewPersistence('alpha',{...view},vi.fn());
  store.update({retrieval_query:'one'});store.update({retrieval_query:'two'});
  await vi.advanceTimersByTimeAsync(300);
  expect(workspaceApi.saveView).toHaveBeenCalledTimes(1);
  expect(workspaceApi.saveView).toHaveBeenCalledWith('alpha',{...view,retrieval_query:'two'});
  store.update({retrieval_query:'two'});await vi.advanceTimersByTimeAsync(1000);
  expect(workspaceApi.saveView).toHaveBeenCalledTimes(1);
});

test('serial saves prevent an older view from overwriting a newer edit',async()=>{
  const pending=deferred<WorkspaceView>();vi.mocked(workspaceApi.saveView).mockReturnValueOnce(pending.promise);
  const store=new ViewPersistence('alpha',{...view},vi.fn());store.update({retrieval_query:'older'});
  const first=store.flush();store.update({retrieval_query:'newer'});await store.flush();
  expect(workspaceApi.saveView).toHaveBeenCalledTimes(1);
  pending.resolve({...view,retrieval_query:'older'});await first;
  expect(workspaceApi.saveView).toHaveBeenCalledTimes(2);
  expect(vi.mocked(workspaceApi.saveView).mock.calls.map(([,v])=>v.retrieval_query)).toEqual(['older','newer']);
});

test('failure is visible, never retries endlessly, and explicit flush retries the preserved view',async()=>{
  const report=vi.fn();vi.mocked(workspaceApi.saveView).mockRejectedValueOnce(new Error('Disk unavailable'));
  const store=new ViewPersistence('alpha',{...view},report);store.update({assistant_draft:'Who owns the task?'});
  await vi.advanceTimersByTimeAsync(300);expect(report).toHaveBeenCalledWith('alpha','Disk unavailable');
  await vi.advanceTimersByTimeAsync(60000);expect(workspaceApi.saveView).toHaveBeenCalledTimes(1);
  await store.flush();expect(workspaceApi.saveView).toHaveBeenCalledTimes(2);expect(report).toHaveBeenLastCalledWith('alpha','');
});

test('pending saves in two workspaces never exchange their views',async()=>{
  const report=vi.fn(),first=new ViewPersistence('alpha',{...view},report),second=new ViewPersistence('beta',{...view},report);
  first.update({assistant_draft:'Alpha only'});second.update({assistant_draft:'Beta only'});
  await vi.advanceTimersByTimeAsync(300);
  expect(workspaceApi.saveView).toHaveBeenCalledWith('alpha',{...view,assistant_draft:'Alpha only'});
  expect(workspaceApi.saveView).toHaveBeenCalledWith('beta',{...view,assistant_draft:'Beta only'});
});
