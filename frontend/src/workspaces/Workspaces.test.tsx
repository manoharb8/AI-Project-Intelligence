import {StrictMode} from 'react';
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import App from '../App';
import {WorkspaceManagerProvider} from './WorkspaceContext';
import {workspaceApi} from './api';
import {createApi} from '../api';
import {createIntelligenceApi} from '../intelligence/api';
import {resultKey,type Workspace,type WorkspaceSnapshot,type WorkspaceView} from './types';
import {DEFAULT_FOCUS} from '../intelligence/useAutomaticWork';
import type {AssistantResult,DocumentationResult,HealthResult} from '../intelligence/types';
import type {AgentResult,KnowledgeBase,QueryResult} from '../types';

// API fixtures are confined to this test. Production starts with the real existing KB.
const legacy:Workspace={id:'legacy',name:'Current project',created_at:'2026-01-01',is_legacy:true};
const beta:Workspace={id:'b'.repeat(32),name:'Beta project',created_at:'2026-01-02',is_legacy:false};
const gamma:Workspace={id:'c'.repeat(32),name:'Gamma project',created_at:'2026-01-03',is_legacy:false};
const provider={provider:'Local extractive analysis',mode:'extractive',ready:true,message:'Source extraction ready.',agents:['scope','risk','blockers']};
const freshView=():WorkspaceView=>({retrieval_query:'',scope_query:'',risk_query:'',blockers_query:'',documentation_query:DEFAULT_FOCUS,documentation_focus:DEFAULT_FOCUS,health_query:DEFAULT_FOCUS,health_focus:DEFAULT_FOCUS,doc_tab:'user_stories',doc_filter:'',action_filter:'all',assistant_draft:'',turns:[]});
const source=(id:string)=>({id,filename:`${id}.txt`,document_type:'txt',size_bytes:100,uploaded_at:'2026-01-01',status:'indexed' as const,chunk_count:1,indexed:true,error:null});
const evidence=(id:string)=>({id:`${id}:chunk-1`,document_id:id,filename:`${id}.txt`,document_type:'txt',chunk_number:1,location:'Text section 1',text:`Action item: review ${id} policy.`,similarity:0.6});
const summary=(id:string,empty=false):KnowledgeBase=>({document_count:empty?0:1,indexed_documents:empty?0:1,chunk_count:empty?0:1,supported_formats:['pdf','docx','csv','txt'],retrieval_ready:!empty,documents:empty?[]:[source(id)]});
const metadata=(id:string)=>({status:'partial' as const,query:DEFAULT_FOCUS,generated_at:'2026-01-02T09:00:00Z',provider:provider.provider,evidence:[evidence(id)],retrieved_count:1,evidence_limited:false,warnings:[]});
const docs=(id:string):DocumentationResult=>({...metadata(id),user_stories:[{id:'story',title:`Review ${id} policy`,role:null,need:`Review ${id} policy`,benefit:null,acceptance_criteria:[],information_state:'partial',references:[{evidence_id:evidence(id).id,quote:evidence(id).text}]}],risks:[],action_items:[]});
const health=(id:string):HealthResult=>({...metadata(id),overall_score:null,interpretation:'Insufficient evidence',assessed_dimensions:0,methodology_version:'evidence-health-v1',methodology:'40% scope + 35% timeline health + 25% blocker health.',dimensions:[]});
const answer=(id:string,question:string):AssistantResult=>({...metadata(id),question,resolved_question:question,answer:`Recorded answer for ${id}`,grounding:'source_quotations',statements:[{category:'action_items',reference:{evidence_id:evidence(id).id,quote:evidence(id).text},owner:null,due_date:null,source_status:null,severity:null}],health:null,suggested_questions:[]});
const queryResult=(id:string,query:string):QueryResult=>({status:'ok',query,message:'Relevant source passages.',results:[evidence(id)]});
const analysis=(id:string):AgentResult=>({agent:'scope',status:'partial',query:'Project scope',message:'Missing remains unknown.',provider:provider.provider,generated_at:'2026-01-02T09:00:00Z',findings:[{category:'goals',evidence_id:evidence(id).id,quote:evidence(id).text,information_state:'known',owner:null,due_date:null,dates:[],source_status:null,severity:null,confidence:'explicit_source_statement'}],evidence:[evidence(id)],coverage:[{category:'goals',state:'known',count:1}],retrieved_count:1,evidence_limited:false,warnings:[]});
const snapshot=(id:string):WorkspaceSnapshot=>({workspace_id:id,source_version:'version-1',indexed_sources:{[id]:1},view:freshView(),results:[]});
let projects:Workspace[], snapshots:Record<string,WorkspaceSnapshot>, summaries:Record<string,KnowledgeBase>;
type Call={path:string;id:string;method:string;body:Record<string,unknown>};
let calls:Call[];
type Handler=(call:Call,options:RequestInit)=>Promise<Response>|Response|undefined;
let override:Handler;
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>resolve=r);return{promise,resolve};}
function savedBase(kind:string,query=DEFAULT_FOCUS){return{key:resultKey(kind,query),query,source_version:'version-1',saved_at:'2026-01-02T09:00:00Z'};}
beforeEach(()=>{
  sessionStorage.clear();localStorage.clear();projects=[legacy,beta,gamma];calls=[];
  snapshots=Object.fromEntries(projects.map(p=>[p.id,snapshot(p.id)]));
  summaries=Object.fromEntries(projects.map(p=>[p.id,summary(p.id)]));
  override=()=>undefined;
  vi.stubGlobal('fetch',vi.fn(async(input:string,options:RequestInit={})=>{
    const path=String(input),id=new Headers(options.headers).get('X-Workspace-ID')??'legacy';
    const body=typeof options.body==='string'?JSON.parse(options.body) as Record<string,unknown>:{};
    const call={path,id,method:options.method??'GET',body};calls.push(call);
    const custom=override(call,options);if(custom)return custom;
    if(path==='/api/workspaces'&&call.method==='GET')return json({default_workspace_id:'legacy',workspaces:projects});
    if(path==='/api/workspaces'&&call.method==='POST'){
      if(projects.some(p=>p.name.toLowerCase()===String(body.name).toLowerCase()))return json({detail:'A workspace with that name already exists. Choose another name.'},409);
      const created={id:'d'.repeat(32),name:String(body.name),created_at:'2026-01-04',is_legacy:false};projects.push(created);snapshots[created.id]=snapshot(created.id);snapshots[created.id].indexed_sources={};summaries[created.id]=summary(created.id,true);return json(created,201);
    }
    if(path.endsWith('/state'))return json(snapshots[id]);
    if(path.endsWith('/view')){snapshots[id].view=body as unknown as WorkspaceView;return json(body);}
    if(path==='/api/knowledge-base')return json(summaries[id]);
    if(path==='/api/agents/status')return json(provider);
    if(path==='/api/retrieval/query')return json(queryResult(id,String(body.query)));
    if(['/api/agents/scope','/api/agents/risk','/api/agents/blockers'].includes(path))return json({...analysis(id),agent:path.split('/').at(-1),query:String(body.query)});
    if(path==='/api/documentation/generate')return json(docs(id));
    if(path==='/api/project-health/assess')return json(health(id));
    if(path==='/api/assistant/query')return json(answer(id,String(body.question)));
    throw new Error(`Unexpected request: ${path}`);
  }));
});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
function show(path='/documents'){return render(<StrictMode><MemoryRouter initialEntries={[path]}><WorkspaceManagerProvider><App/></WorkspaceManagerProvider></MemoryRouter></StrictMode>);}
async function open(){fireEvent.click(await screen.findByRole('button',{name:/Switch workspace:/}));return screen.getByRole('dialog',{name:'Project workspaces'});}
async function select(name:string){const panel=await open();fireEvent.click(within(panel).getByRole('button',{name:new RegExp(`^${name} `)}));await screen.findByRole('button',{name:`Switch workspace: ${name}`});}
function nav(name:string){fireEvent.click(within(screen.getByRole('navigation',{name:'Main navigation'})).getByRole('link',{name}));}
const count=(path:string,id?:string)=>calls.filter(c=>c.path===path&&(!id||c.id===id)).length;

test('Strict Mode loads the actual registry once and binds the current project without creating demo workspaces',async()=>{
  show();await screen.findByText('legacy.txt');
  expect(count('/api/workspaces')).toBe(1);expect(count('/api/workspaces/legacy/state')).toBe(1);
  expect(calls.filter(c=>c.path==='/api/workspaces'&&c.method==='POST')).toHaveLength(0);
  expect(calls.filter(c=>c.path==='/api/knowledge-base').every(c=>c.id==='legacy')).toBe(true);
  expect(localStorage.length).toBe(0);
});

test('new workspace is empty and switching back restores analysis, draft and queued files',async()=>{
  show('/scope');await screen.findByText(evidence('legacy').text,{selector:'blockquote.finding-text'});const input=screen.getByLabelText('Analysis focus');fireEvent.change(input,{target:{value:'policy'}});
  nav('Documents');fireEvent.change(await screen.findByLabelText('Choose project documents'),{target:{files:[new File(['policy'],'pending.txt')]}});
  await open();fireEvent.click(screen.getByRole('button',{name:/New workspace/}));fireEvent.change(screen.getByLabelText('Project name'),{target:{value:'A fresh project'}});fireEvent.click(screen.getByRole('button',{name:'Create workspace'}));
  const active=await screen.findByRole('button',{name:'Switch workspace: A fresh project'});await waitFor(()=>expect(active).toHaveFocus());
  expect(screen.queryByText('legacy.txt')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Remove pending.txt'})).not.toBeInTheDocument();
  nav('Project Health');await screen.findByRole('heading',{name:'Project Health'});expect(count('/api/project-health/assess','d'.repeat(32))).toBe(0);
  await select('Current project');nav('Documents');expect(await screen.findByRole('button',{name:'Remove pending.txt'})).toBeInTheDocument();
  nav('Scope & Deliverables');expect(await screen.findByLabelText('Analysis focus')).toHaveValue('policy');expect(screen.getByText(evidence('legacy').text,{selector:'blockquote.finding-text'})).toBeInTheDocument();expect(count('/api/agents/scope','legacy')).toBe(1);
});

test('saved M2 results and default intelligence hydrate without rerunning completed analysis',async()=>{
  const state=snapshots.legacy;state.view.scope_query='Project scope';
  state.results=[{...savedBase('scope','Project scope'),kind:'scope',result:analysis('legacy')},{...savedBase('documentation'),kind:'documentation',result:docs('legacy')},{...savedBase('health'),kind:'health',result:health('legacy')}];
  show('/scope');await screen.findByText('Analysis complete · partial information');expect(count('/api/agents/scope')).toBe(0);
  nav('Documentation Studio');await screen.findByText('Review legacy policy',{selector:'h3'});
  nav('Project Health');await screen.findByText(health('legacy').methodology);
  await act(async()=>{await new Promise(r=>setTimeout(r,450));});
  expect(count('/api/documentation/generate')).toBe(0);expect(count('/api/project-health/assess')).toBe(0);
});

test('late response stays with its originating workspace after a switch',async()=>{
  const delayed=deferred<Response>();override=c=>c.path==='/api/agents/scope'&&c.id==='legacy'?delayed.promise:undefined;
  show('/scope');await waitFor(()=>expect(count('/api/agents/scope','legacy')).toBe(1));
  await select('Beta project');await screen.findByLabelText('Analysis focus');
  await act(async()=>delayed.resolve(json(analysis('legacy'))));
  expect(screen.queryByText(evidence('legacy').text)).not.toBeInTheDocument();expect(screen.getByLabelText('Analysis focus')).not.toHaveValue('policy');
  await select('Current project');expect(await screen.findByText(evidence('legacy').text,{selector:'blockquote.finding-text'})).toBeInTheDocument();
});

test('upload in flight finishes only in its original workspace and does not block another workspace queue',async()=>{
  const delayed=deferred<Response>();override=c=>c.path==='/api/documents/upload'?delayed.promise:undefined;
  show();fireEvent.change(await screen.findByLabelText('Choose project documents'),{target:{files:[new File(['content'],'upload.txt')]}});fireEvent.click(screen.getByRole('button',{name:/Upload & index/}));
  await waitFor(()=>expect(count('/api/documents/upload','legacy')).toBe(1));await select('Beta project');
  fireEvent.change(await screen.findByLabelText('Choose project documents'),{target:{files:[new File(['beta'],'beta-pending.txt')]}});
  const uploaded={...source('upload'),filename:'upload.txt'};summaries.legacy={...summaries.legacy,document_count:2,indexed_documents:2,chunk_count:2,documents:[source('legacy'),uploaded]};
  await act(async()=>delayed.resolve(json({documents:[uploaded]})));
  expect(screen.queryByText('upload.txt')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Remove beta-pending.txt'})).toBeEnabled();
  await select('Current project');expect((await screen.findAllByText('upload.txt')).length).toBeGreaterThan(0);expect(screen.queryByRole('button',{name:'Remove beta-pending.txt'})).not.toBeInTheDocument();
});

test('inactive workspace intelligence does not auto-run and active completed results are cached on revisit',async()=>{
  show('/documentation');await screen.findByText('Review legacy policy',{selector:'h3'});await select('Beta project');await screen.findByText(`Review ${beta.id} policy`,{selector:'h3'});
  nav('Project Health');await screen.findByText(health(beta.id).methodology);expect(count('/api/project-health/assess','legacy')).toBe(1);
  await select('Current project');await screen.findByText(health('legacy').methodology);nav('Documentation Studio');await screen.findByText('Review legacy policy',{selector:'h3'});
  expect(count('/api/documentation/generate','legacy')).toBe(1);expect(count('/api/documentation/generate',beta.id)).toBe(1);
});

test('a stale restored source version refreshes only the active intelligence view',async()=>{
  snapshots.legacy.results=[{...savedBase('documentation'),source_version:'old',kind:'documentation',result:{...docs('legacy'),generated_at:'2025-12-01T00:00:00Z'}}];
  snapshots[beta.id].results=[{...savedBase('documentation'),source_version:'old',kind:'documentation',result:docs(beta.id)}];
  show('/documentation');await screen.findByText('Review legacy policy',{selector:'h3'});await waitFor(()=>expect(count('/api/documentation/generate','legacy')).toBe(1));expect(count('/api/documentation/generate',beta.id)).toBe(0);
  await select('Beta project');await waitFor(()=>expect(count('/api/documentation/generate',beta.id)).toBe(1));
});

test('switch failure preserves current data and selecting again retries explicitly',async()=>{
  override=c=>c.path===`/api/workspaces/${beta.id}/state`?json({detail:'Workspace temporarily unavailable'},503):undefined;
  show();await screen.findByText('legacy.txt');const panel=await open();fireEvent.click(within(panel).getByRole('button',{name:/^Beta project /}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Workspace temporarily unavailable');expect(screen.getByText('legacy.txt')).toBeInTheDocument();
  override=()=>undefined;await select('Beta project');expect(await screen.findByText(`${beta.id}.txt`)).toBeInTheDocument();
});

test('late workspace snapshot cannot override a newer selection',async()=>{
  const delayed=deferred<Response>();override=c=>c.path===`/api/workspaces/${beta.id}/state`?delayed.promise:undefined;
  show();await screen.findByText('legacy.txt');const panel=await open();fireEvent.click(within(panel).getByRole('button',{name:/^Beta project /}));fireEvent.click(within(panel).getByRole('button',{name:/^Gamma project /}));
  await screen.findByRole('button',{name:'Switch workspace: Gamma project'});await act(async()=>delayed.resolve(json(snapshots[beta.id])));
  expect(screen.getByRole('button',{name:'Switch workspace: Gamma project'})).toBeInTheDocument();expect(screen.queryByText(`${beta.id}.txt`)).not.toBeInTheDocument();
});

test('returning to current workspace cancels a pending switch',async()=>{
  const delayed=deferred<Response>();override=c=>c.path===`/api/workspaces/${beta.id}/state`?delayed.promise:undefined;
  show();await screen.findByText('legacy.txt');const panel=await open();fireEvent.click(within(panel).getByRole('button',{name:/^Beta project /}));fireEvent.click(within(panel).getByRole('button',{name:/^Current project /}));await act(async()=>delayed.resolve(json(snapshots[beta.id])));
  expect(screen.getByRole('button',{name:'Switch workspace: Current project'})).toBeInTheDocument();
});

test('creation prevents duplicate submissions and preserves existing data on error',async()=>{
  const delayed=deferred<Response>();override=c=>c.path==='/api/workspaces'&&c.method==='POST'?delayed.promise:undefined;
  show();await open();fireEvent.click(screen.getByRole('button',{name:/New workspace/}));const input=screen.getByLabelText('Project name');fireEvent.change(input,{target:{value:'Current project'}});fireEvent.submit(input.closest('form')!);fireEvent.submit(input.closest('form')!);
  expect(calls.filter(c=>c.path==='/api/workspaces'&&c.method==='POST')).toHaveLength(1);expect(screen.getByRole('button',{name:'Creating…'})).toBeDisabled();
  await act(async()=>delayed.resolve(json({detail:'A workspace with that name already exists.'},409)));
  expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('already exists');expect(screen.getByRole('button',{name:'Switch workspace: Current project'})).toBeInTheDocument();
});

test('keyboard open, arrow navigation, Escape and creation focus are accessible',async()=>{
  show();const trigger=await screen.findByRole('button',{name:/Switch workspace:/});trigger.focus();fireEvent.keyDown(trigger,{key:'ArrowDown'});
  const panel=screen.getByRole('dialog');const active=within(panel).getByRole('button',{name:/^Current project /});expect(active).toHaveFocus();fireEvent.keyDown(active,{key:'ArrowDown'});expect(within(panel).getByRole('button',{name:/^Beta project /})).toHaveFocus();
  fireEvent.keyDown(panel,{key:'Escape'});expect(trigger).toHaveFocus();expect(trigger).toHaveAttribute('aria-expanded','false');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await open();fireEvent.click(screen.getByRole('button',{name:/New workspace/}));expect(screen.getByLabelText('Project name')).toHaveFocus();
});

test('larger histories expose project search and preserve long names',async()=>{
  projects.push(...Array.from({length:4},(_,i)=>({id:String(i+1).repeat(32),name:`Research workspace ${i+1}`,created_at:'2026-01-01',is_legacy:false})));
  show();await open();const search=screen.getByLabelText('Search projects');expect(search).toHaveFocus();fireEvent.change(search,{target:{value:'Research workspace 3'}});expect(screen.getAllByRole('button',{name:/^Research workspace /})).toHaveLength(1);
  fireEvent.change(search,{target:{value:'no match'}});expect(screen.getByText(/No projects match/)).toBeInTheDocument();
});

test('opening the switcher focuses the active workspace even when it is not first',async()=>{
  sessionStorage.setItem('project-intelligence-workspace',beta.id);show();
  const panel=await open();expect(within(panel).getByRole('button',{name:/^Beta project /})).toHaveFocus();
  fireEvent.keyDown(panel,{key:'Escape'});expect(screen.getByRole('button',{name:'Switch workspace: Beta project'})).toHaveFocus();
});

test('saved conversation uses only matching workspace references and keeps its draft',async()=>{
  const question='Who has pending action items?';const response=answer('legacy',question);
  snapshots.legacy.results=[{...savedBase('assistant',question),kind:'assistant',history:[],result:response}];snapshots.legacy.view.turns=[{id:1,question,result_key:resultKey('assistant',question),error:''}];snapshots.legacy.view.assistant_draft='What about the policy?';
  show('/assistant');await screen.findByText(response.answer);expect(screen.getByLabelText('Ask about your project')).toHaveValue('What about the policy?');
  await select('Beta project');expect(await screen.findByRole('log')).toBeEmptyDOMElement();expect(screen.queryByText(response.answer)).not.toBeInTheDocument();expect(screen.getByLabelText('Ask about your project')).toHaveValue('');
  await select('Current project');expect(await screen.findByText(response.answer)).toBeInTheDocument();
});

test('all API client methods bind a workspace at construction and preserve request bodies',async()=>{
  override=c=>c.path==='/api/documents/upload'?json({documents:[]}):c.path.startsWith('/api/agents/')&&c.path!='/api/agents/status'?json(analysis(c.id)):undefined;
  const api=createApi(beta.id), intelligence=createIntelligenceApi(beta.id);
  await api.summary();await api.agentStatus();await api.upload([new File(['content'],'source.txt')]);await api.query('policy');await api.analyze('risk','project risks');await intelligence.documentation(DEFAULT_FOCUS);await intelligence.health(DEFAULT_FOCUS);await intelligence.assistant('Who owns it?',[]);
  expect(calls.every(c=>c.id===beta.id)).toBe(true);expect(calls.find(c=>c.path==='/api/agents/risk')?.body).toEqual({query:'project risks'});
  expect(calls.find(c=>c.path==='/api/retrieval/query')?.body).toEqual({query:'policy',top_k:5});
  await workspaceApi.snapshot(beta.id);expect(calls.at(-1)?.id).toBe(beta.id);
});
