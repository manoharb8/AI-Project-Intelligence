import {Link} from 'react-router-dom';
import {ArrowUpRight, FileSearch, RefreshCw, ShieldCheck} from 'lucide-react';
import {useSession} from '../SessionContext';
import {useIntelligence} from '../intelligence/IntelligenceContext';
import {ErrorNotice, Notice, Timestamp} from '../components/UI';
import {useAvailability} from '../intelligence/Shared';
import ProjectFlow from '../experience/ProjectFlow';
import RiskPriorityMatrix from './RiskPriorityMatrix';
import ExecutiveSummary from './ExecutiveSummary';

export default function ProjectInsights() {
  const {kb, provider, providerError, checkingProvider, checkProvider} = useSession();
  const {briefing} = useIntelligence();
  const unavailable = useAvailability();
  const jobs = [{name:'Documentation',work:briefing.documentation},{name:'Health',work:briefing.health},{name:'Delivery outlook',work:briefing.outlook},{name:'Blockers',work:briefing.blockers}];
  const busy = jobs.some(job => job.work.busy || job.work.waiting);
  const stale = jobs.some(job => job.work.stale);
  const errors = jobs.filter(job => job.work.error);
  const stamps = jobs.flatMap(job => job.work.result ? [job.work.result.generated_at] : []).sort((a,b) => Date.parse(b)-Date.parse(a));
  return <section className="executive-dashboard" aria-label="Executive project summary">
    <h2 className="sr-only">Project Insights &amp; Risk Summary</h2>
    {kb?.retrieval_ready ? <>
      <div className="executive-toolbar"><p>{stamps.length ? <>Last prepared <Timestamp value={stamps[0]}/></> : 'Insights prepare automatically from your indexed sources.'}</p><button className="button tertiary executive-refresh" aria-describedby={unavailable ? 'executive-refresh-reason' : undefined} disabled={Boolean(unavailable) || busy} onClick={() => jobs.forEach(job => void job.work.refresh())}><RefreshCw size={14}/>Refresh insights</button></div>
      {unavailable && <p id="executive-refresh-reason" className="executive-caption" role="status">{unavailable}</p>}
      <RiskPriorityMatrix result={briefing.documentation.result} busy={briefing.documentation.busy || briefing.documentation.waiting} stale={briefing.documentation.stale} failed={Boolean(briefing.documentation.error)}/>
      <ProjectFlow/>
      {stale && <Notice tone="warning">Previous results are shown while current evidence is prepared.</Notice>}
      {errors.map(job => <ErrorNotice key={job.name}><strong>{job.name}</strong><p>{job.work.error}</p><button className="button secondary notice-action" disabled={Boolean(unavailable) || job.work.busy} onClick={() => void job.work.refresh()}>Retry {job.name.toLowerCase()}</button></ErrorNotice>)}
      <ExecutiveSummary/>
    </> : <section className="executive-onboarding"><FileSearch size={32}/><h2>Start with your project documents</h2><p>Upload PDF, DOCX, TXT or CSV files. Analysis and insights prepare automatically once indexing finishes.</p><Link to="/documents" className="button">Add project documents<ArrowUpRight size={15}/></Link></section>}
    {(providerError || (provider && !provider.ready)) && <ErrorNotice><p>{providerError || provider?.message}</p><button className="button secondary notice-action" disabled={checkingProvider} onClick={() => void checkProvider()}>Check availability</button></ErrorNotice>}
    {!kb?.retrieval_ready && <ProjectFlow/>}
    {stamps.length > 0 && <details className="executive-provenance"><summary><ShieldCheck size={14}/>Review times & limitations<Link to="/assistant" onClick={event => event.stopPropagation()}>Full project briefing<ArrowUpRight size={14}/></Link></summary>{jobs.map(job => <div key={job.name}><strong>{job.name}</strong>{job.work.result ? <><p>Prepared <Timestamp value={job.work.result.generated_at}/>{job.work.stale ? ' · Previous sources' : ''}</p>{job.work.result.warnings.map(warning => <p key={warning}>{warning}</p>)}</> : <p>Result unavailable.</p>}</div>)}</details>}
  </section>;
}
