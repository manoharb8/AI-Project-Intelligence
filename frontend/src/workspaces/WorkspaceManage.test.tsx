import {StrictMode} from 'react';
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import App from '../App';
import {WorkspaceManagerProvider} from './WorkspaceContext';
import type {FlowchartAnalysis,FlowchartStatus} from '../flowchart/types';
import type {Workspace,WorkspaceView} from './types';

const view=():WorkspaceView=>({retrieval_query:'',scope_query:'',risk_query:'',blockers_query:'',documentation_query:'Review the uploaded project documents.',documentation_focus:'Review the uploaded project documents.',health_query:'Review the uploaded project documents.',health_focus:'Review the uploaded project documents.',doc_tab:'user_stories',doc_filter:'',action_filter:'all',assistant_draft:'',turns:[]});
const legacy:Workspace={id:'legacy',name:'Current project',created_at:'2026-01-01',is_legacy:true};
const beta:Workspace={id:'b'.repeat(32),name:'Beta project',created_at:'2026-01-02',is_legacy:false,project_type:'uiux'};
const gamma:Workspace={id:'c'.repeat(32),name:'Gamma project',created_at:'2026-01-03',is_legacy:false,project_type:'code'};
const kb={document_count:0,indexed_documents:0,chunk_count:0,supported_formats:['pdf'],retrieval_ready:false,documents:[]};
const ready:FlowchartStatus={provider:'Groq Vision API',mode:'groq',model:'qwen/qwen3.8-27b',ready:true,message:'Diagram images are sent to the Groq Vision API for analysis.',accepted_formats:['png'],max_file_mb:10,pdf_max_pages:5};
const result:FlowchartAnalysis={id:'e'.repeat(32),filename:'order_flow.png',source_type:'png',page:null,page_count:null,created_at:'2026-01-05T10:00:00Z',title:'Order fulfilment',node_count:3,
  risk_summary:{critical:1,high:0,medium:1,low:0,observed:1,inferred:1},provider:'Groq Vision API',model:'qwen/qwen3.8-27b',project_type:'uiux',purpose:'Receives and ships an order.',legibility:'good',image_issues:[],
  nodes:[{id:'N1',label:'Start',type:'start',legible:true},{id:'N2',label:'Payment valid?',type:'decision',legible:true},{id:'N3',label:'Ship order',type:'process',legible:true}],
  edges:[{source:'N1',target:'N2',label:''},{source:'N2',target:'N3',label:'Yes'}],
  risks:[{id:'R1',title:'No path when payment fails',description:'The decision has only a Yes branch.',category:'logic_gap',priority:'Critical',basis:'observed',origin:'vision_model',evidence_nodes:['N2'],evidence_edges:[],priority_reason:'A failed payment has no outcome.',mitigation:'Add a No branch that ends the order.',assumption:null,priority_note:null},
         {id:'R2',title:'No stock check',description:'Stock may be oversold.',category:'missing_step',priority:'Medium',basis:'inferred',origin:'vision_model',evidence_nodes:[],evidence_edges:[],priority_reason:'Possible overselling.',mitigation:'Check availability first.',assumption:'Shipping does not check stock.',priority_note:'Capped at Medium (the model proposed Critical): the diagram does not show this risk.'}],
  uncertainties:['Arrow labels were small.'],warnings:[],processing_notes:[],image_media_type:'image/png',image_data_url:'data:image/png;base64,iVBORw0KGgo='};
type Call={path:string;id:string;method:string;body:unknown};
let projects:Workspace[],calls:Call[],flow:{status:FlowchartStatus;list:unknown[];analyze:()=>Response};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
beforeEach(()=>{
  sessionStorage.clear();projects=[legacy,beta,gamma].map(p=>({...p}));calls=[];
  flow={status:ready,list:[],analyze:()=>json({analyses:[result],skipped:[],notes:[]})};
  vi.stubGlobal('fetch',vi.fn(async(input:string,options:RequestInit={})=>{
    const path=String(input),id=new Headers(options.headers).get('X-Workspace-ID')??'legacy',method=options.method??'GET';
    const body=typeof options.body==='string'?JSON.parse(options.body):options.body;calls.push({path,id,method,body});
    const own=path.match(/^\/api\/workspaces\/([a-f0-9]{32})$/);
    if(path==='/api/workspaces'&&method==='GET')return json({default_workspace_id:'legacy',workspaces:projects});
    if(path==='/api/workspaces'&&method==='POST'){const created={id:'d'.repeat(32),name:body.name,created_at:'2026-01-04',is_legacy:false,project_type:body.project_type};projects.push(created);return json(created,201);}
    if(own&&method==='PATCH'){if(projects.some(p=>p.id!==own[1]&&p.name.toLowerCase()===body.name.toLowerCase()))return json({detail:'A workspace with that name already exists. Choose another name.'},409);
      const target=projects.find(p=>p.id===own[1])!;target.name=body.name;return json(target);}
    if(own&&method==='DELETE'){projects=projects.filter(p=>p.id!==own[1]);return json({id:own[1],deleted:true,cleanup_pending:false});}
    if(path.endsWith('/state'))return json({workspace_id:id,source_version:'v',indexed_sources:{},view:view(),results:[]});
    if(path.endsWith('/view'))return json(body);
    if(path==='/api/knowledge-base')return json(kb);
    if(path==='/api/agents/status')return json({provider:'x',mode:'extractive',ready:true,message:'ok',agents:[]});
    if(path==='/api/flowcharts/status')return json(flow.status);
    if(path==='/api/flowcharts'&&method==='GET')return json(flow.list);
    if(path==='/api/flowcharts/analyze')return flow.analyze();
    return json({detail:`Unexpected ${path}`},404);
  }));
});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
const show=(path='/documents')=>render(<StrictMode><MemoryRouter initialEntries={[path]}><WorkspaceManagerProvider><App/></WorkspaceManagerProvider></MemoryRouter></StrictMode>);
async function open(){fireEvent.click(await screen.findByRole('button',{name:/Switch workspace:/}));return screen.getByRole('dialog',{name:'Project workspaces'});}
const sent=(method:string)=>calls.filter(c=>c.method===method&&c.path.startsWith('/api/workspaces'));

test('new workspaces default to Code and can be created as UI/UX; the type is sent and shown',async()=>{
  show();await open();fireEvent.click(screen.getByRole('button',{name:/New workspace/}));
  expect(screen.getByRole('radio',{name:/Code/})).toBeChecked();
  fireEvent.click(screen.getByRole('radio',{name:/UI\/UX/}));
  fireEvent.change(screen.getByLabelText('Project name'),{target:{value:'Checkout redesign'}});
  fireEvent.click(screen.getByRole('button',{name:'Create workspace'}));
  const active=await screen.findByRole('button',{name:'Switch workspace: Checkout redesign'});
  expect(sent('POST')[0].body).toEqual({name:'Checkout redesign',project_type:'uiux'});
  expect(active).toHaveTextContent('UI/UX');
});

test('an existing workspace without a stored type is shown as Code',async()=>{
  show();const panel=await open();
  expect(within(panel).getByRole('button',{name:/^Current project Code · Original knowledge base/})).toBeInTheDocument();
  expect(within(panel).getByRole('button',{name:/^Beta project UI\/UX · Isolated project workspace/})).toBeInTheDocument();
});

test('rename updates the name, and a duplicate name is rejected with a visible message',async()=>{
  show();let panel=await open();
  fireEvent.click(within(panel).getByRole('button',{name:'Rename Beta project'}));
  const input=screen.getByLabelText('Workspace name');expect(input).toHaveValue('Beta project');
  fireEvent.change(input,{target:{value:'gamma PROJECT'}});fireEvent.click(screen.getByRole('button',{name:'Save name'}));
  expect(within(await screen.findByRole('dialog')).getByRole('alert')).toHaveTextContent('already exists');
  fireEvent.change(screen.getByLabelText('Workspace name'),{target:{value:'Beta renamed'}});fireEvent.click(screen.getByRole('button',{name:'Save name'}));
  await waitFor(()=>expect(sent('PATCH').at(-1)!.body).toEqual({name:'Beta renamed'}));
  panel=await screen.findByRole('dialog',{name:'Project workspaces'});
  expect(await within(panel).findByRole('button',{name:/^Beta renamed /})).toBeInTheDocument();
});

test('renaming the active workspace updates the top bar',async()=>{
  show();let panel=await open();fireEvent.click(within(panel).getByRole('button',{name:/^Beta project /}));
  await screen.findByRole('button',{name:'Switch workspace: Beta project'});
  panel=await open();fireEvent.click(within(panel).getByRole('button',{name:'Rename Beta project'}));
  fireEvent.change(screen.getByLabelText('Workspace name'),{target:{value:'Beta v2'}});fireEvent.click(screen.getByRole('button',{name:'Save name'}));
  expect(await screen.findByRole('button',{name:'Switch workspace: Beta v2'})).toBeInTheDocument();
});

test('delete needs explicit confirmation, cancel changes nothing, confirm removes only that workspace',async()=>{
  show();let panel=await open();
  fireEvent.click(within(panel).getByRole('button',{name:'Delete Beta project'}));
  const group=screen.getByRole('group',{name:'Confirm workspace deletion'});
  expect(group).toHaveTextContent('permanently removes');expect(group).toHaveTextContent('Beta project');
  expect(sent('DELETE')).toHaveLength(0);
  fireEvent.click(within(group).getByRole('button',{name:/Cancel/}));
  expect(sent('DELETE')).toHaveLength(0);expect(within(screen.getByRole('dialog')).getByRole('button',{name:/^Beta project /})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Delete Beta project'}));
  fireEvent.click(screen.getByRole('button',{name:/Delete permanently/}));
  await waitFor(()=>expect(sent('DELETE')).toHaveLength(1));
  expect(sent('DELETE')[0].path).toBe(`/api/workspaces/${beta.id}`);
  panel=await open();
  expect(within(panel).queryByRole('button',{name:/^Beta project /})).not.toBeInTheDocument();
  expect(within(panel).getByRole('button',{name:/^Gamma project /})).toBeInTheDocument();
});

test('deleting the active workspace first moves to the original project, with no stray save errors',async()=>{
  show();let panel=await open();fireEvent.click(within(panel).getByRole('button',{name:/^Beta project /}));
  await screen.findByRole('button',{name:'Switch workspace: Beta project'});
  panel=await open();fireEvent.click(within(panel).getByRole('button',{name:'Delete Beta project'}));
  fireEvent.click(screen.getByRole('button',{name:/Delete permanently/}));
  expect(await screen.findByRole('button',{name:'Switch workspace: Current project'})).toBeInTheDocument();
  await waitFor(()=>expect(sent('DELETE')).toHaveLength(1));
  await new Promise(r=>setTimeout(r,500));
  expect(screen.queryByText(/could not be saved/)).not.toBeInTheDocument();
  expect(calls.filter(c=>c.path.endsWith('/view')&&c.id===beta.id&&calls.indexOf(c)>calls.findIndex(x=>x.method==='DELETE'))).toHaveLength(0);
});

test('the original project cannot be deleted from the interface',async()=>{
  show();const panel=await open();
  expect(within(panel).getByRole('button',{name:'Delete Current project'})).toBeDisabled();
  expect(within(panel).getByRole('button',{name:'Rename Current project'})).toBeEnabled();
});

test('a failed delete keeps the workspace and explains why',async()=>{
  const original=globalThis.fetch;
  vi.stubGlobal('fetch',vi.fn(async(input:string,options:RequestInit={})=>options.method==='DELETE'?json({detail:'Folder is locked.'},500):original(input,options)));
  show();const panel=await open();fireEvent.click(within(panel).getByRole('button',{name:'Delete Gamma project'}));
  fireEvent.click(screen.getByRole('button',{name:/Delete permanently/}));
  await waitFor(()=>expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('Folder is locked.'));
  fireEvent.click(screen.getByRole('button',{name:/Cancel/}));
  expect(screen.getByRole('button',{name:/^Gamma project /})).toBeInTheDocument();
});

// ---------------------------------------------------------------- Flowchart page
const png=()=>new File([new Uint8Array([137,80,78,71])],'order_flow.png',{type:'image/png'});

test('a PNG flowchart is uploaded and the priority-based risk assessment is displayed',async()=>{
  show('/flowcharts');
  const input=await screen.findByLabelText('Choose a flowchart image or PDF');
  await waitFor(()=>expect(input).toBeEnabled());
  fireEvent.change(input,{target:{files:[png()]}});
  const risk=await screen.findByRole('article',{name:/Critical risk: No path when payment fails/});
  const post=calls.find(c=>c.path==='/api/flowcharts/analyze')!;
  expect(post.method).toBe('POST');expect((post.body as FormData).get('file')).toBeInstanceOf(File);
  expect(within(risk).getByText('Shown in the diagram')).toBeInTheDocument();
  expect(within(risk).getByText('Add a No branch that ends the order.')).toBeInTheDocument();
  expect(within(risk).getByText('A failed payment has no outcome.')).toBeInTheDocument();
  const inferred=screen.getByRole('article',{name:/Medium risk: No stock check/});
  expect(within(inferred).getByText('Inferred — needs confirmation')).toBeInTheDocument();
  expect(within(inferred).getByText('Shipping does not check stock.')).toBeInTheDocument();
  expect(within(inferred).getByText(/Capped at Medium/)).toBeInTheDocument();
  expect(screen.getByRole('cell',{name:'Payment valid?'})).toBeInTheDocument();
  expect(screen.getByAltText('Uploaded flowchart: order_flow.png')).toHaveAttribute('src',expect.stringContaining('data:image/png'));
  expect(within(screen.getByRole('list',{name:'Risks by priority'})).getAllByRole('listitem')[0]).toHaveTextContent('1Critical');
});

test('saved analyses are listed and the latest opens automatically',async()=>{
  flow.list=[{...result,nodes:undefined}];
  const original=globalThis.fetch;
  vi.stubGlobal('fetch',vi.fn(async(input:string,options:RequestInit={})=>String(input)===`/api/flowcharts/${result.id}`?json(result):original(input,options)));
  show('/flowcharts');
  expect(await screen.findByRole('article',{name:/Critical risk/})).toBeInTheDocument();
  expect(screen.getByRole('region',{name:'Saved flowchart analyses'})).toHaveTextContent('order_flow.png');
});

test('server errors are shown with their message instead of failing silently',async()=>{
  flow.analyze=()=>json({detail:'The image appears to be blank (one uniform colour). Check the export and upload it again.'},422);
  show('/flowcharts');const input=await screen.findByLabelText('Choose a flowchart image or PDF');await waitFor(()=>expect(input).toBeEnabled());
  fireEvent.change(input,{target:{files:[png()]}});
  expect(await screen.findByRole('alert')).toHaveTextContent('appears to be blank');
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
});

test('unsupported and oversize files are rejected before upload',async()=>{
  show('/flowcharts');const input=await screen.findByLabelText('Choose a flowchart image or PDF');await waitFor(()=>expect(input).toBeEnabled());
  fireEvent.change(input,{target:{files:[new File(['x'],'notes.docx')]}});
  expect(await screen.findByRole('alert')).toHaveTextContent('unsupported format');
  const big=new File(['x'],'big.png');Object.defineProperty(big,'size',{value:10*1024*1024+1});
  fireEvent.change(input,{target:{files:[big]}});
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('exceeds 10 MB'));
  expect(calls.some(c=>c.path==='/api/flowcharts/analyze')).toBe(false);
});

test('when no vision model is configured the page explains how to set it up and blocks uploads',async()=>{
  flow.status={...ready,ready:false,mode:'unavailable',model:null,message:'Set GROQ_API_KEY then restart the backend.'};
  show('/flowcharts');
  expect(await screen.findByText(/Flowchart analysis is not configured/)).toBeInTheDocument();
  expect(screen.getByText(/Set GROQ_API_KEY/)).toBeInTheDocument();
  expect(screen.getByLabelText('Choose a flowchart image or PDF')).toBeDisabled();
});

test('dropping a PNG on the Documents page points to Flowchart Analysis instead of a dead end',async()=>{
  show('/documents');const input=await screen.findByLabelText('Choose project documents');
  fireEvent.change(input,{target:{files:[png()]}});
  expect(await screen.findByText(/analysed on the Flowchart Analysis page/)).toBeInTheDocument();
});

test('Flowchart Analysis appears in the navigation',async()=>{
  show('/dashboard');
  expect(await within(await screen.findByRole('navigation',{name:'Main navigation'})).findByRole('link',{name:'Flowchart Analysis'})).toHaveAttribute('href','/flowcharts');
});
