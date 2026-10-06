import {StrictMode} from 'react';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach, expect, test, vi} from 'vitest';
import App from './App';
import {SessionProvider, useSession} from './SessionContext';
import {IntelligenceProvider} from './intelligence/IntelligenceContext';
import Documentation from './pages/Documentation';
import {api} from './api';
import {intelligenceApi} from './intelligence/api';
import type {AssistantResult, DocumentationResult, HealthResult} from './intelligence/types';
import type {KnowledgeBase} from './types';

vi.mock('./api', () => ({api: {summary: vi.fn(), agentStatus: vi.fn(), analyze: vi.fn(), upload: vi.fn(), query: vi.fn()}}));
vi.mock('./intelligence/api', () => ({intelligenceApi: {documentation: vi.fn(), health: vi.fn(), assistant: vi.fn()}}));
// Isolated contract fixtures. No application module imports test data.
const source = {id:'notes', filename:'meeting.txt', document_type:'txt', size_bytes:100, uploaded_at:'2026-09-10', status:'indexed' as const, chunk_count:1, indexed:true, error:null};
const kb: KnowledgeBase = {document_count:1,indexed_documents:1,chunk_count:1,supported_formats:['pdf','docx','txt','csv'],retrieval_ready:true,documents:[source]};
const provider = {provider:'Local extractive analysis', mode:'extractive' as const, ready:true, message:'Source-based extraction.', agents:['scope','risk','blockers']};
const evidence = {id:'notes:1',document_id:'notes',filename:'meeting.txt',document_type:'txt',chunk_number:1,location:'Text section 1',text:'Action item: review the retention policy.',similarity:0.4};
const reference = {evidence_id:evidence.id, quote:evidence.text};
const metadata = {status:'partial' as const,query:'Review the uploaded project documents.',generated_at:'2026-09-25T09:30:00Z',provider:provider.provider,evidence:[evidence],retrieved_count:1,evidence_limited:false,warnings:['Only retrieved evidence is considered.']};
const documentation: DocumentationResult = {...metadata,
  user_stories:[{id:'story',title:'Review the policy',role:null,need:'Review the policy',benefit:null,acceptance_criteria:[],information_state:'partial',references:[reference]}],
  risks:[], action_items:[{id:'action',title:evidence.text,description:evidence.text,owner:null,due_date:null,status:null,dependency:null,references:[reference]}]};
const health: HealthResult = {...metadata,overall_score:null,interpretation:'Insufficient evidence',assessed_dimensions:1,methodology_version:'evidence-health-v1',methodology:'40% scope + 35% timeline health + 25% blocker health. All dimensions must be assessed.',dimensions:[
  {id:'scope_clarity',label:'Scope clarity',state:'assessed',score:20,health_contribution:20,higher_is_better:true,weight:40,count:1,explanation:'Only one scope category is supported.',calculation:'20 + 0 + 0 + 0 + 0 = 20/100',references:[reference],scope_signals:[]},
  {id:'timeline_risk',label:'Timeline risk',state:'insufficient_information',score:null,health_contribution:null,higher_is_better:false,weight:35,count:null,explanation:'No timeline assessment is available.',calculation:'Not calculated: no explicit assessment.',references:[],scope_signals:[]},
  {id:'blocker_health',label:'Blocker health',state:'insufficient_information',score:null,health_contribution:null,higher_is_better:true,weight:25,count:null,explanation:'No blocker assessment is available.',calculation:'Not calculated: no explicit assessment.',references:[],scope_signals:[]}]};
const answer: AssistantResult = {...metadata,question:'Who has pending action items?',resolved_question:'Who has pending action items?',answer:'These source statements describe the recorded actions.',grounding:'source_quotations',statements:[{category:'action_items',reference,owner:null,due_date:null,source_status:null,severity:null}],health:null,suggested_questions:[]};
function show(path='/documentation') {render(<StrictMode><MemoryRouter initialEntries={[path]}><App/></MemoryRouter></StrictMode>);}
function nav(name:string) {fireEvent.click(within(screen.getByRole('navigation',{name:'Main navigation'})).getByRole('link',{name}));}
function openFocus() {const details=screen.queryByText('Customize review focus & regenerate')?.closest('details'); if(details) details.open=true;}
async function clickRun(name='Generate documentation') {await screen.findByLabelText('Review focus'); openFocus(); const button=await screen.findByRole('button',{name}); await waitFor(()=>expect(button).toBeEnabled()); fireEvent.click(button);}
async function ask(question=answer.question) {const input=await screen.findByLabelText('Ask about your project'); await waitFor(()=>expect(input).toBeEnabled()); fireEvent.change(input,{target:{value:question}}); fireEvent.submit(input.closest('form')!);}
function deferred<T>() {let resolve!:(value:T)=>void; const promise=new Promise<T>(done=>{resolve=done;}); return {promise,resolve};}
const conversationRequest = vi.fn();
const briefingRequest = vi.fn();
beforeEach(()=>{vi.resetAllMocks();vi.mocked(api.analyze).mockImplementation(async(kind,query)=>({...metadata,agent:kind,query,message:'Test evidence checked.',findings:[],coverage:[]}));vi.mocked(api.summary).mockResolvedValue(kb);vi.mocked(api.agentStatus).mockResolvedValue(provider);vi.mocked(intelligenceApi.documentation).mockResolvedValue(documentation);vi.mocked(intelligenceApi.health).mockResolvedValue(health);conversationRequest.mockResolvedValue(answer);briefingRequest.mockResolvedValue({...answer, answer:'Briefing source statements.', statements:[]});vi.mocked(intelligenceApi.assistant).mockImplementation((question, history, signal) => signal ? conversationRequest(question, history, signal) : briefingRequest(question, history));});

test('M4 Overview and M3 open automatically once per source version, after automatic M2 analysis',async()=>{
  show('/dashboard'); await screen.findByRole('heading',{name:"Manohar B's project, in focus."});
  await screen.findByRole('heading',{name:'Project Insights & Risk Summary'});
  await waitFor(()=>expect(intelligenceApi.documentation).toHaveBeenCalledTimes(1));
  await waitFor(()=>expect(intelligenceApi.health).toHaveBeenCalledTimes(1));
  nav('Documentation Studio');await screen.findByText('Review the policy',{selector:'h3'});
  nav('Project Health');await screen.findByText(health.methodology);
  nav('Project Assistant');await waitFor(()=>expect(briefingRequest).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('heading',{name:'Your Project Briefing'})).toBeInTheDocument();
  expect(conversationRequest).not.toHaveBeenCalled();expect(screen.getByRole('log',{name:'Conversation history'})).toBeEmptyDOMElement();
  nav('Overview');nav('Documentation Studio');
  expect(intelligenceApi.documentation).toHaveBeenCalledTimes(1);expect(intelligenceApi.health).toHaveBeenCalledTimes(1);expect(api.analyze).toHaveBeenCalledTimes(3);expect(api.query).not.toHaveBeenCalled();
});
test('documentation preserves unknown fields, exact quotes, timestamps and keyboard tabs',async()=>{
  show();await screen.findByText('Review the policy',{selector:'h3'});
  expect(screen.getAllByText('Not stated')).toHaveLength(3);
  expect(document.querySelector('time')).toHaveAttribute('datetime',metadata.generated_at);
  const stories=screen.getByRole('tab',{name:/User Stories/});stories.focus();fireEvent.keyDown(stories,{key:'End'});
  const actions=screen.getByRole('tab',{name:/Action Items/});expect(actions).toHaveFocus();expect(actions).toHaveAttribute('aria-selected','true');
  expect(screen.getByRole('columnheader',{name:'Owner'})).toBeInTheDocument();
  expect(screen.getAllByText('Not stated').length).toBeGreaterThanOrEqual(3);
  fireEvent.click(screen.getByText('meeting.txt · Text section 1'));
  expect(screen.getAllByText(evidence.text,{selector:'blockquote'})[0]).toBeVisible();
});
test('documentation focus, active tab, filter and result survive navigation',async()=>{
  show();fireEvent.change(await screen.findByLabelText('Review focus'),{target:{value:'Review policy actions'}});await clickRun();await screen.findByText('Review the policy',{selector:'h3'});
  fireEvent.click(screen.getByRole('tab',{name:/Action Items/}));fireEvent.change(screen.getByLabelText('Find generated items'),{target:{value:'retention'}});
  fireEvent.change(screen.getByLabelText('Show'),{target:{value:'missing'}});nav('Overview');nav('Documentation Studio');
  expect(screen.getByLabelText('Review focus')).toHaveValue('Review policy actions');expect(screen.getByLabelText('Find generated items')).toHaveValue('retention');expect(screen.getByLabelText('Show')).toHaveValue('missing');
  expect(screen.getByRole('tab',{name:/Action Items/})).toHaveAttribute('aria-selected','true');expect(intelligenceApi.documentation).toHaveBeenCalledTimes(1);
});
test('documentation prevents duplicate requests and retains prior result on failure with retry',async()=>{
  const pending=deferred<DocumentationResult>();vi.mocked(intelligenceApi.documentation).mockReturnValueOnce(pending.promise).mockRejectedValueOnce(new Error('Provider unavailable')).mockResolvedValueOnce(documentation);
  show();await clickRun();fireEvent.submit(screen.getByLabelText('Review focus').closest('form')!);nav('Overview');nav('Documentation Studio');expect(intelligenceApi.documentation).toHaveBeenCalledTimes(1);
  await act(async()=>pending.resolve(documentation));await clickRun();expect(await screen.findByRole('alert')).toHaveTextContent('Provider unavailable');expect(screen.getByText('Review the policy',{selector:'h3'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Retry request'}));await waitFor(()=>expect(screen.queryByRole('alert')).not.toBeInTheDocument());expect(intelligenceApi.documentation).toHaveBeenCalledTimes(3);
});
test('health shows unknown instead of a zero or healthy overall score and preserves its calculation',async()=>{
  show('/project-health');expect(await screen.findByRole('img',{name:'Overall project health not assessed'})).toBeInTheDocument();await screen.findByText(health.methodology);
  expect(screen.getByRole('img',{name:'Overall project health not assessed'})).toBeInTheDocument();expect(screen.getByText('20 + 0 + 0 + 0 + 0 = 20/100')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:/Timeline risk: Unknown/})).toBeInTheDocument();expect(screen.getByRole('button',{name:/Blocker health: Unknown/})).toBeInTheDocument();nav('Overview');nav('Project Health');expect(screen.getByText(health.methodology)).toBeInTheDocument();expect(intelligenceApi.health).toHaveBeenCalledTimes(1);
});
test('chat retains its draft, exact answer and unknown owner/date across navigation',async()=>{
  show('/assistant');await ask();await screen.findByText(answer.answer);expect(within(screen.getByRole('log',{name:'Conversation history'})).getAllByText('Not stated')).toHaveLength(3);
  fireEvent.change(screen.getByLabelText('Ask about your project'),{target:{value:'Which tasks are blocked?'}});nav('Overview');nav('Project Assistant');
  expect(screen.getByText(answer.answer)).toBeInTheDocument();expect(screen.getByLabelText('Ask about your project')).toHaveValue('Which tasks are blocked?');expect(screen.getAllByText(reference.quote,{selector:'blockquote'})[0]).toBeVisible();
});
test('chat prevents duplicate sends and sends bounded conversation history on a follow-up',async()=>{
  const pending=deferred<AssistantResult>();conversationRequest.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({...answer,question:'Who owns it?',resolved_question:'Who owns the retention review?'});
  show('/assistant');await ask();fireEvent.submit(screen.getByLabelText('Ask about your project').closest('form')!);expect(conversationRequest).toHaveBeenCalledTimes(1);
  await act(async()=>pending.resolve(answer));await ask('Who owns it?');await waitFor(()=>expect(conversationRequest).toHaveBeenCalledTimes(2));
  expect(conversationRequest.mock.calls[1][1]).toEqual([{role:'user',content:answer.question},{role:'assistant',content:answer.answer}]);
});
test('new conversation cancels a pending answer and ignores its late response',async()=>{
  const pending=deferred<AssistantResult>();conversationRequest.mockReturnValue(pending.promise);show('/assistant');await ask();
  const signal=conversationRequest.mock.calls[0][2];fireEvent.click(screen.getByRole('button',{name:'New conversation'}));expect(signal?.aborted).toBe(true);
  await act(async()=>pending.resolve(answer));expect(screen.queryByText(answer.answer)).not.toBeInTheDocument();expect(screen.getByRole('heading',{name:'What needs your attention?'})).toBeInTheDocument();
});
test('chat retry retains earlier useful answers without duplicating the failed question',async()=>{
  conversationRequest.mockResolvedValueOnce(answer).mockRejectedValueOnce(new Error('Request unavailable')).mockResolvedValueOnce({...answer,answer:'No relevant evidence was found.',grounding:'insufficient_evidence',status:'insufficient_information',statements:[],evidence:[]});
  show('/assistant');await ask();await screen.findByText(answer.answer);await ask('What is the budget?');expect(await screen.findByRole('alert')).toHaveTextContent('Request unavailable');expect(screen.getByText(answer.answer)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Retry answer'}));await screen.findByText('No relevant evidence was found.');expect(screen.getAllByText('What is the budget?')).toHaveLength(1);expect(screen.getByText('Insufficient evidence')).toBeInTheDocument();
});
test('successful uploads mark all M3 results stale and exclude old chat history from new requests',async()=>{
  const added={...source,id:'new',filename:'new.txt'};vi.mocked(api.upload).mockImplementation(async()=>{vi.mocked(api.summary).mockResolvedValue({...kb,document_count:2,indexed_documents:2,chunk_count:2,documents:[source,added]});return{documents:[added]};});
  show();await screen.findByText('Review the policy',{selector:'h3'});nav('Project Health');await screen.findByText(health.methodology);nav('Project Assistant');await ask();await screen.findByText(answer.answer);
  nav('Documents');fireEvent.change(screen.getByLabelText('Choose project documents'),{target:{files:[new File(['new'],'new.txt')]}});fireEvent.click(screen.getByRole('button',{name:/Upload & index/}));await screen.findByText(/1 of 1 documents indexed/);
  for(const name of ['Documentation Studio','Project Health']) {nav(name);expect(screen.getByText(/Sources changed after this result began/)).toBeInTheDocument();}
  nav('Project Assistant');expect(screen.getByText('May be out of date')).toBeInTheDocument();await ask('What are our biggest risks?');await waitFor(()=>expect(conversationRequest).toHaveBeenCalledTimes(2));expect(conversationRequest.mock.calls[1][1]).toEqual([]);
});
test.each(['/documentation','/project-health','/assistant'])('%s prevents requests when documents are not indexed',async path=>{
  vi.mocked(api.summary).mockResolvedValue({...kb,document_count:0,indexed_documents:0,chunk_count:0,retrieval_ready:false,documents:[]});show(path);expect(await screen.findByRole('link',{name:/Add project documents/})).toHaveAttribute('href','/documents');
  openFocus(); const button=screen.getByRole('button',{name:path==='/documentation'?'Generate documentation':path==='/project-health'?'Assess project health':'Send question'});expect(button).toBeDisabled();
  expect(intelligenceApi.documentation).not.toHaveBeenCalled();expect(intelligenceApi.health).not.toHaveBeenCalled();expect(intelligenceApi.assistant).not.toHaveBeenCalled();
});
test('provider unavailability can be retried without claiming a ready state',async()=>{
  vi.mocked(api.agentStatus).mockResolvedValue({...provider,ready:false,message:'Optional provider is not configured.'});show('/assistant');expect(await screen.findByRole('alert')).toHaveTextContent('Optional provider is not configured.');expect(screen.getByLabelText('Ask about your project')).toBeDisabled();expect(screen.queryByText('Available')).not.toBeInTheDocument();
  vi.mocked(api.agentStatus).mockResolvedValue(provider);fireEvent.click(screen.getByRole('button',{name:'Check availability'}));await waitFor(()=>expect(screen.getByLabelText('Ask about your project')).toBeEnabled());expect(intelligenceApi.assistant).not.toHaveBeenCalled();
});

test('automatic failures do not retry on navigation, and explicit retry recovers',async()=>{
  vi.mocked(intelligenceApi.documentation).mockRejectedValueOnce(new Error('Temporary failure')).mockResolvedValueOnce(documentation);
  show();expect(await screen.findByRole('alert')).toHaveTextContent('Temporary failure');
  nav('Overview');nav('Documentation Studio');
  await act(async()=>{await new Promise(done=>setTimeout(done,400));});
  expect(intelligenceApi.documentation).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button',{name:'Retry request'}));await screen.findByText('Review the policy',{selector:'h3'});
  expect(intelligenceApi.documentation).toHaveBeenCalledTimes(2);
});
test('briefing reuses default results but keeps a custom documentation focus separate',async()=>{
  show();await screen.findByText('Review the policy',{selector:'h3'});openFocus();
  fireEvent.change(screen.getByLabelText('Review focus'),{target:{value:'Review policy actions'}});await clickRun();
  await waitFor(()=>expect(intelligenceApi.documentation).toHaveBeenCalledTimes(2));nav('Project Assistant');
  await waitFor(()=>expect(briefingRequest).toHaveBeenCalledTimes(2));expect(intelligenceApi.documentation).toHaveBeenCalledTimes(2);
  expect(vi.mocked(intelligenceApi.documentation).mock.calls.map(call=>call[0])).toEqual(['Review the uploaded project documents.','Review policy actions']);
  expect(screen.getByRole('log',{name:'Conversation history'})).toBeEmptyDOMElement();
});
test('automatic requests wait while indexing is in progress',async()=>{
  const processing={...source,status:'processing' as const,indexed:false};
  vi.mocked(api.summary).mockResolvedValue({...kb,documents:[processing]});show();await screen.findAllByText(/Documents are uploading or indexing/);
  await act(async()=>{await new Promise(done=>setTimeout(done,400));});expect(intelligenceApi.documentation).not.toHaveBeenCalled();
});
test('sidebar orders analysis before intelligence without changing routes',async()=>{
  show('/dashboard');await screen.findByRole('heading',{name:"Manohar B's project, in focus."});
  const navigation=screen.getByRole('navigation',{name:'Main navigation'});
  expect([...navigation.querySelectorAll('.nav-label')].map(el=>el.textContent)).toEqual(['Workspace','Sources & Search','Project Analysis','Project Intelligence']);
  expect(within(navigation).getByRole('link',{name:'Project Assistant'})).toHaveAttribute('href','/assistant');
});

function WorkspaceControls() {
  const session = useSession();
  return <><button onClick={() => void session.refresh()}>Check sources</button><button onClick={() => {session.selectFiles([new File(['new source'], 'new.txt')]); void session.upload();}}>Upload from active view</button></>;
}
function activeStudio() {
  render(<StrictMode><MemoryRouter initialEntries={['/documentation']}><SessionProvider><IntelligenceProvider><WorkspaceControls/><Documentation/></IntelligenceProvider></SessionProvider></MemoryRouter></StrictMode>);
}
test('active intelligence waits for upload completion, marks results stale and refreshes once',async()=>{
  const upload=deferred<{documents: typeof source[]}>();vi.mocked(api.upload).mockReturnValue(upload.promise);
  activeStudio();await screen.findByText('Review the policy',{selector:'h3'});
  fireEvent.click(screen.getByRole('button',{name:'Upload from active view'}));
  expect(await screen.findByText(/Sources changed after this result began/)).toBeInTheDocument();
  const added={...source,id:'new',filename:'new.txt'};
  vi.mocked(api.summary).mockResolvedValue({...kb,documents:[source,added],indexed_documents:2,document_count:2,chunk_count:2});
  fireEvent.click(screen.getByRole('button',{name:'Check sources'}));
  await act(async()=>{await new Promise(done=>setTimeout(done,450));});expect(intelligenceApi.documentation).toHaveBeenCalledTimes(1);
  await act(async()=>upload.resolve({documents:[added]}));
  await waitFor(()=>expect(intelligenceApi.documentation).toHaveBeenCalledTimes(2));
  await waitFor(()=>expect(screen.queryByText(/Sources changed after this result began/)).not.toBeInTheDocument());
  await act(async()=>{await new Promise(done=>setTimeout(done,400));});expect(intelligenceApi.documentation).toHaveBeenCalledTimes(2);
});
test('an older automatic response cannot replace refreshed results after a source change',async()=>{
  const pending=deferred<DocumentationResult>();
  vi.mocked(intelligenceApi.documentation).mockReturnValueOnce(pending.promise).mockResolvedValueOnce({...documentation,user_stories:[{...documentation.user_stories[0],title:'Current source result'}]});
  activeStudio();await waitFor(()=>expect(intelligenceApi.documentation).toHaveBeenCalledTimes(1));
  vi.mocked(api.summary).mockResolvedValue({...kb,documents:[source,{...source,id:'new'}],document_count:2,indexed_documents:2});
  fireEvent.click(screen.getByRole('button',{name:'Check sources'}));await screen.findByText('Current source result',{selector:'h3'});
  await act(async()=>pending.resolve(documentation));
  expect(screen.queryByText('Review the policy',{selector:'h3'})).not.toBeInTheDocument();expect(screen.getByText('Current source result',{selector:'h3'})).toBeInTheDocument();
});
test('automatic insufficient documentation stays empty, is cached and does not imply no risks',async()=>{
  vi.mocked(intelligenceApi.documentation).mockResolvedValue({...documentation,status:'insufficient_information',user_stories:[],risks:[],action_items:[],evidence:[]});
  show();await screen.findByText('Not established in the retrieved evidence');
  fireEvent.click(screen.getByRole('tab',{name:/Risk Register/}));
  expect(screen.getByText('Insufficient evidence')).toBeInTheDocument();expect(screen.queryByText('No risks')).not.toBeInTheDocument();
  nav('Overview');nav('Documentation Studio');await act(async()=>{await new Promise(done=>setTimeout(done,400));});
  expect(intelligenceApi.documentation).toHaveBeenCalledTimes(1);
});
test('briefing failures preserve other sections and retry only the failed section',async()=>{
  briefingRequest.mockImplementation((question: string) => question==='Are we on track?' ? Promise.reject(new Error('Outlook unavailable')) : Promise.resolve({...answer,answer:'Blocker source statements.'}));
  show('/assistant');expect(await screen.findByRole('alert')).toHaveTextContent('Outlook unavailable');
  expect(screen.getByText('Blocker source statements.')).toBeInTheDocument();expect(screen.getByRole('log',{name:'Conversation history'})).toBeEmptyDOMElement();
  briefingRequest.mockResolvedValue({...answer,answer:'Recovered outlook statements.'});
  fireEvent.click(screen.getByRole('button',{name:'Retry delivery outlook'}));await screen.findByText('Recovered outlook statements.');
  expect(briefingRequest).toHaveBeenCalledTimes(3);expect(intelligenceApi.documentation).toHaveBeenCalledTimes(1);expect(intelligenceApi.health).toHaveBeenCalledTimes(1);
});

test('a changed review focus retains the previous result on failure without a false source-change notice',async()=>{
  show();await screen.findByText('Review the policy',{selector:'h3'});openFocus();
  vi.mocked(intelligenceApi.documentation).mockRejectedValueOnce(new Error('Focus unavailable'));
  fireEvent.change(screen.getByLabelText('Review focus'),{target:{value:'Review another requirement'}});await clickRun();
  expect(await screen.findByRole('alert')).toHaveTextContent('Focus unavailable');expect(screen.getByText('Review the policy',{selector:'h3'})).toBeInTheDocument();
  expect(screen.getByText(/Showing the previous review focus/)).toBeInTheDocument();expect(screen.queryByText(/Sources changed after this result began/)).not.toBeInTheDocument();
});

// M4 dashboard reads existing M3 contracts; these fixtures never enter the app.
test('M4 dashboard automatically displays exact results, direction and unknown fields',async()=>{
  vi.mocked(intelligenceApi.documentation).mockResolvedValue({...documentation,risks:[{id:'risk',title:'Database approval',description:'Database schema approval is pending.',categories:['dependency_gaps'],impact:null,likelihood:null,status:null,mitigation:null,severity:null,references:[reference]}]});
  show('/dashboard');await screen.findByText('Database schema approval is pending.');
  const dashboard=within(screen.getByRole('region',{name:'Project Insights & Risk Summary'}));
  expect(dashboard.getByRole('img',{name:'Overall project health not assessed'})).toBeInTheDocument();
  expect(dashboard.getByText('Higher timeline risk = more risk')).toBeInTheDocument();
  expect(dashboard.getByText('1 action entry has no stated owner.')).toBeInTheDocument();
  expect(dashboard.getByText('1 action entry has no stated due date.')).toBeInTheDocument();
  expect(dashboard.getByText('Returned risk entries, not unique incidents. No priority ranking is inferred.')).toBeInTheDocument();
  expect(dashboard.getByText('20 + 0 + 0 + 0 + 0 = 20/100')).toBeInTheDocument();
  expect(dashboard.getAllByText(reference.quote,{selector:'blockquote'}).length).toBeGreaterThan(0);
  expect(api.analyze).toHaveBeenCalledTimes(3);expect(api.query).not.toHaveBeenCalled();
});
test('M4 action filters use exact source statuses and preserve source references',async()=>{
  vi.mocked(intelligenceApi.documentation).mockResolvedValue({...documentation,action_items:[
    {...documentation.action_items[0],id:'1',title:'Review retention',status:'Pending'},
    {...documentation.action_items[0],id:'2',title:'Restore staging',status:'Blocked'},
    {...documentation.action_items[0],id:'3',title:'Unassigned review',status:null},
  ]});
  show('/dashboard');await screen.findByRole('heading',{name:'Restore staging'});
  const statuses=within(screen.getByLabelText('Returned action entries by source status'));
  fireEvent.click(statuses.getByRole('button',{name:'Blocked 1'}));
  expect(screen.getByRole('heading',{name:'Restore staging'})).toBeInTheDocument();expect(screen.queryByRole('heading',{name:'Review retention'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Show all action statuses'}));
  expect(screen.getByRole('heading',{name:'Review retention'})).toBeInTheDocument();expect(screen.getByRole('heading',{name:'Unassigned review'})).toBeInTheDocument();
});
test('M4 empty dashboard requests nothing and provides the upload prerequisite',async()=>{
  vi.mocked(api.summary).mockResolvedValue({...kb,documents:[],document_count:0,indexed_documents:0,chunk_count:0,retrieval_ready:false});
  show('/dashboard');await screen.findByRole('heading',{name:'Your next clear decision starts with a source.'});
  await act(async()=>{await new Promise(done=>setTimeout(done,400));});
  expect(intelligenceApi.documentation).not.toHaveBeenCalled();expect(intelligenceApi.health).not.toHaveBeenCalled();expect(intelligenceApi.assistant).not.toHaveBeenCalled();
  expect(screen.queryByText('No risks')).not.toBeInTheDocument();
});
test('M4 partial failure retains other panels and retries only the failed request',async()=>{
  vi.mocked(intelligenceApi.health).mockRejectedValueOnce(new Error('Assessment unavailable')).mockResolvedValueOnce(health);
  show('/dashboard');expect(await screen.findByRole('alert')).toHaveTextContent('Assessment unavailable');
  expect(screen.getByRole('heading',{name:evidence.text})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Retry health'}));await screen.findByText(health.methodology);
  expect(intelligenceApi.health).toHaveBeenCalledTimes(2);expect(intelligenceApi.documentation).toHaveBeenCalledTimes(1);expect(briefingRequest).toHaveBeenCalledTimes(2);
});
test('M4 workspace status supports expanded state and Escape focus restoration',async()=>{
  show('/documents');const button=await screen.findByRole('button',{name:'Workspace status'});button.focus();fireEvent.click(button);
  expect(button).toHaveAttribute('aria-expanded','true');expect(screen.getByRole('region',{name:'Workspace status details'})).toBeInTheDocument();
  fireEvent.keyDown(document,{key:'Escape'});expect(button).toHaveFocus();expect(button).toHaveAttribute('aria-expanded','false');expect(screen.queryByRole('region',{name:'Workspace status details'})).not.toBeInTheDocument();
});
