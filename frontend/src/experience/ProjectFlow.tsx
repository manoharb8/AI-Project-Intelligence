import {Check,FileSearch,Layers,ShieldCheck,Sparkles,TriangleAlert} from 'lucide-react';
import {useSession} from '../SessionContext';
import {useIntelligence} from '../intelligence/IntelligenceContext';
import ExportMenu from './ExportMenu';
export default function ProjectFlow(){
  const {kb,agents,analysisReady,analysisAvailable,uploading,connectionError,provider,providerError,checkingProvider}=useSession();
  const {briefing}=useIntelligence();
  const jobs=Object.values(briefing),analysis=Object.values(agents);
  const reading=uploading||kb?.documents.some(d=>d.status==='processing');
  const intelligenceReady=jobs.every(w=>w.result&&!w.stale&&!w.error&&!w.busy&&!w.waiting);
  const error=analysis.some(w=>w.error)||jobs.some(w=>w.error);
  const ready=analysisReady&&intelligenceReady&&!reading&&!connectionError;
  const step=reading||!kb?.retrieval_ready?0:!analysisReady?1:!intelligenceReady?2:3;
  const incomplete=[...analysis,...jobs].some(w=>w.result&&w.result.status!=='ok');
  const unavailable=connectionError?'Connection unavailable':providerError||provider?.ready===false?'Analysis unavailable':checkingProvider?'Checking availability':!kb?.retrieval_ready?'Upload documents to begin':error?'A request needs attention':ready?incomplete?'Ready to review · some information is incomplete':'Ready to review':reading?'Reading and indexing your sources':step===1?'Analyzing indexed project evidence':'Preparing evidence-backed insights';
  const steps=[{label:'Reading documents',Icon:FileSearch},{label:'Analyzing project',Icon:Layers},{label:'Preparing insights',Icon:Sparkles},{label:'Ready',Icon:ShieldCheck}];
  return <section className="project-flow" aria-label="Project processing workflow"><div className="project-flow-main"><div className="flow-caption"><span className="eyebrow">Connected workflow</span><span className={`flow-message ${error?'flow-error':''}`} role="status">{error&&<TriangleAlert size={14}/>} {unavailable}</span></div><ol>{steps.map(({label,Icon},index)=><li key={label} className={index<step?'flow-complete':index===step?'flow-current':''} aria-current={index===step?'step':undefined}><span className="flow-step-icon">{index<step?<Check size={14}/>:<Icon size={14}/>}</span><span>{label}</span></li>)}</ol>{error&&<button className="text-link flow-retry" disabled={!analysisAvailable} onClick={()=>{analysis.filter(w=>w.error).forEach(w=>void w.refresh());if(analysisReady)jobs.filter(w=>w.error).forEach(w=>void w.refresh());}}>Retry failed requests</button>}</div><ExportMenu/></section>;
}
export function ResultSkeleton(){return <div className="result-skeleton" aria-hidden="true"><div/><div/><div/></div>;}
