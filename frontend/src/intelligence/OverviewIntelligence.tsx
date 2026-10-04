import {Link} from 'react-router-dom';
import {Activity, ArrowUpRight, BookOpen, MessageSquare} from 'lucide-react';
import {useIntelligence} from './IntelligenceContext';
import {useSession} from '../SessionContext';

export default function OverviewIntelligence() {
  const {documentation, health, turns} = useIntelligence();
  const {revision} = useSession();
  const doc = documentation.result;
  const latestAnswer = [...turns].reverse().find(turn => turn.result)?.result;
  const rows = [
    {to:'/documentation', icon:BookOpen, title:'Documentation Studio', description:'Evidence into stories, risks, and actions.', value: doc ? `${doc.user_stories.length} stories · ${doc.risks.length} risks · ${doc.action_items.length} actions` : 'Generate a working draft', stale: Boolean(doc && documentation.resultRevision < revision)},
    {to:'/project-health', icon:Activity, title:'Project Health', description:'Three dimensions. A calculation you can trace.', value: health.result ? health.result.overall_score === null ? 'Insufficient evidence for an overall score' : `${health.result.overall_score}/100 · ${health.result.interpretation}` : 'Run an evidence-based assessment', stale: Boolean(health.result && health.resultRevision < revision)},
    {to:'/assistant', icon:MessageSquare, title:'Project Assistant', description:'Ask a question. Inspect the source.', value: latestAnswer ? 'Continue your conversation' : 'Ask about your project', stale:false},
  ];
  return <section className="overview-intelligence" aria-labelledby="intelligence-title"><div className="section-heading plain"><div><p className="eyebrow">The next layer of intelligence</p><h2 id="intelligence-title">Put your project knowledge to work.</h2></div><span className="section-meta">Evidence stays connected</span></div><div className="intelligence-links">{rows.map(row => <Link key={row.to} to={row.to}><span className="intelligence-link-icon"><row.icon size={21}/></span><div><h3>{row.title}</h3><p>{row.description}</p><span className="intelligence-link-value">{row.stale ? 'Sources changed · review previous result' : row.value}</span></div><ArrowUpRight size={17}/></Link>)}</div></section>;
}
