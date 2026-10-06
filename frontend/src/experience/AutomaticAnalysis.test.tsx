import {StrictMode} from 'react';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter,Link,useLocation} from 'react-router-dom';
import {beforeEach,test,expect,vi} from 'vitest';
import {SessionProvider,useSession} from '../SessionContext';
import {IntelligenceProvider,useIntelligence} from '../intelligence/IntelligenceContext';
import {api} from '../api';
import {intelligenceApi} from '../intelligence/api';
import type {AgentKind,AgentResult,KnowledgeBase} from '../types';
import Notifications from './Notifications';
import ProjectFlow from './ProjectFlow';
vi.mock('../api',()=>({api:{summary:vi.fn(),agentStatus:vi.fn(),analyze:vi.fn(),upload:vi.fn(),query:vi.fn()}}));
vi.mock('../intelligence/api',()=>({intelligenceApi:{documentation:vi.fn(),health:vi.fn(),assistant:vi.fn()}}));
const source={id:'one',filename:'notes.txt',document_type:'txt',size_bytes:10,uploaded_at:'2026-01-01',status:'indexed' as const,chunk_count:1,indexed:true,error:null};
const kb:KnowledgeBase={document_count:1,indexed_documents:1,chunk_count:1,retrieval_ready:true,supported_formats:['pdf','docx','csv','txt'],documents:[source]};
const metadata={status:'insufficient_information' as const,query:'Review the uploaded project documents.',generated_at:'2026-01-01T00:00:00Z',provider:'Extractive',evidence:[],retrieved_count:0,evidence_limited:false,warnings:[]};
const result=(kind:AgentKind,query:string):AgentResult=>({...metadata,agent:kind,query,message:'Insufficient evidence',findings:[],coverage:[]});
function pending<T>(){let resolve!:(value:T)=>void;return{promise:new Promise<T>(r=>resolve=r),resolve:(v:T)=>resolve(v)};}
function Probe(){
 const s=useSession(),i=useIntelligence(),location=useLocation();
 return <><Link to={location.pathname==='/documents'?'/scope':'/documents'}>Navigate</Link><button onClick={()=>void s.refresh()}>Check sources</button><button onClick={()=>void s.agents.risk.refresh()}>Retry risk</button><button onClick={()=>{s.selectFiles([new File(['source'],'new.txt')]);void s.upload();}}>Upload</button><output data-testid="ready">{String(s.analysisReady)}</output><output data-testid="risk">{s.agents.risk.result?.message??'No result'}</output><output data-testid="error">{s.agents.risk.error}</output><output data-testid="insights">{String(i.ready)}</output><ProjectFlow/><Notifications/></>;
}
function show(){render(<StrictMode><MemoryRouter initialEntries={['/documents']}><SessionProvider><IntelligenceProvider><Probe/></IntelligenceProvider></SessionProvider></MemoryRouter></StrictMode>);}
beforeEach(()=>{
 vi.resetAllMocks();vi.mocked(api.summary).mockResolvedValue(kb);vi.mocked(api.agentStatus).mockResolvedValue({provider:'Extractive',mode:'extractive',ready:true,message:'Ready',agents:['scope','risk','blockers']});
 vi.mocked(api.analyze).mockImplementation(async(kind,query)=>result(kind,query));
 vi.mocked(intelligenceApi.documentation).mockResolvedValue({...metadata,user_stories:[],risks:[],action_items:[]});
 vi.mocked(intelligenceApi.health).mockResolvedValue({...metadata,overall_score:null,interpretation:'Insufficient evidence',assessed_dimensions:0,dimensions:[],methodology_version:'evidence-health-v1',methodology:'Unchanged formula'});
 vi.mocked(intelligenceApi.assistant).mockImplementation(async question=>({...metadata,question,resolved_question:question,answer:'Insufficient evidence',grounding:'insufficient_evidence',statements:[],health:null,suggested_questions:[]}));
});

test('all three agents run once under Strict Mode and route revisits reuse the same results',async()=>{
 show();await waitFor(()=>expect(screen.getByTestId('ready')).toHaveTextContent('true'));
 expect(vi.mocked(api.analyze).mock.calls.map(c=>c[0]).sort()).toEqual(['blockers','risk','scope']);
 fireEvent.click(screen.getByText('Navigate'));fireEvent.click(screen.getByText('Navigate'));fireEvent.click(screen.getByText('Check sources'));
 await act(async()=>{await new Promise(r=>setTimeout(r,450));});expect(api.analyze).toHaveBeenCalledTimes(3);
 await waitFor(()=>expect(intelligenceApi.documentation).toHaveBeenCalledTimes(1));expect(intelligenceApi.health).toHaveBeenCalledTimes(1);expect(intelligenceApi.assistant).toHaveBeenCalledTimes(2);
 expect(api.query).not.toHaveBeenCalled();
});
test.each(['empty','provider','processing'])('automatic analysis waits for %s prerequisite and does not retry in a loop',async condition=>{
 if(condition==='empty')vi.mocked(api.summary).mockResolvedValue({...kb,retrieval_ready:false,documents:[],document_count:0,indexed_documents:0,chunk_count:0});
 if(condition==='provider')vi.mocked(api.agentStatus).mockResolvedValue({provider:'Unavailable',mode:'unavailable',ready:false,message:'Not configured',agents:[]});
 if(condition==='processing')vi.mocked(api.summary).mockResolvedValue({...kb,documents:[{...source,status:'processing',indexed:false}]});
 show();await act(async()=>{await new Promise(r=>setTimeout(r,800));});expect(api.analyze).not.toHaveBeenCalled();expect(intelligenceApi.documentation).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Export / Download'})).toBeDisabled();
});
test('upload invalidates pending old responses, waits for indexing and refreshes once',async()=>{
 const old=pending<AgentResult>(),upload=pending<{documents:typeof source[]}>();let n=0;
 vi.mocked(api.analyze).mockImplementation(async(kind,query)=>kind==='risk'&&n++===0?old.promise:{...result(kind,query),message:'Current sources'});vi.mocked(api.upload).mockReturnValue(upload.promise);
 show();await waitFor(()=>expect(api.analyze).toHaveBeenCalledTimes(3));expect(intelligenceApi.health).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Upload'));await waitFor(()=>expect(api.upload).toHaveBeenCalledTimes(1));
 await act(async()=>old.resolve({...result('risk','old'),message:'OLD RESPONSE'}));expect(screen.getByTestId('risk')).not.toHaveTextContent('OLD RESPONSE');
 const newer={...source,id:'two'};vi.mocked(api.summary).mockResolvedValue({...kb,documents:[source,newer],document_count:2,indexed_documents:2,chunk_count:2});fireEvent.click(screen.getByText('Check sources'));
 await act(async()=>{await new Promise(r=>setTimeout(r,500));});expect(api.analyze).toHaveBeenCalledTimes(3);
 await act(async()=>upload.resolve({documents:[newer]}));await waitFor(()=>expect(api.analyze).toHaveBeenCalledTimes(6));await waitFor(()=>expect(screen.getByTestId('ready')).toHaveTextContent('true'));expect(screen.getByTestId('risk')).toHaveTextContent('Current sources');
 await waitFor(()=>expect(intelligenceApi.health).toHaveBeenCalledTimes(1));
});
test('failed refresh retains useful results, retries only explicitly and does not emit success',async()=>{
 show();await waitFor(()=>expect(screen.getByTestId('ready')).toHaveTextContent('true'));
 vi.mocked(api.analyze).mockImplementation(async(kind,query)=>{if(kind==='risk')throw new Error('Provider interrupted');return result(kind,query);});
 fireEvent.click(screen.getByText('Retry risk'));await waitFor(()=>expect(screen.getByTestId('error')).toHaveTextContent('Provider interrupted'));
 expect(screen.getByTestId('risk')).toHaveTextContent('Insufficient evidence');expect(screen.getByText('Analysis needs attention')).toBeInTheDocument();
 const calls=vi.mocked(api.analyze).mock.calls.length;fireEvent.click(screen.getByText('Navigate'));await act(async()=>{await new Promise(r=>setTimeout(r,500));});expect(api.analyze).toHaveBeenCalledTimes(calls);
 vi.mocked(api.analyze).mockImplementation(async(kind,query)=>result(kind,query));fireEvent.click(screen.getByText('Retry risk'));await waitFor(()=>expect(screen.getByTestId('ready')).toHaveTextContent('true'));expect(api.analyze).toHaveBeenCalledTimes(calls+1);
});
test('insufficient results complete the operation but never imply a healthy score or no risks',async()=>{
 show();await screen.findByText('Ready to review · some information is incomplete');expect(screen.queryByText('No risks')).not.toBeInTheDocument();expect(screen.queryByText('100 / 100')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Export / Download'})).toBeEnabled();
 const log=screen.getByRole('log',{name:'Operation notifications'});expect(log).toHaveTextContent('Some details are not established');
});
