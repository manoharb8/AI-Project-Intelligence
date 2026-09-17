import {useEffect, useRef, useState} from 'react';
import {NavLink, Navigate, Route, Routes, useLocation} from 'react-router-dom';
import {Layers, LayoutDashboard, Files, Database, Search, Menu, X, Target, TriangleAlert, ListChecks, CircleCheck, CircleAlert, LoaderCircle} from 'lucide-react';
import Overview from './pages/Overview';
import Documents from './pages/Documents';
import KnowledgeBase from './pages/KnowledgeBase';
import Retrieval from './pages/Retrieval';
import ScopeDeliverables from './pages/ScopeDeliverables';
import RiskDelivery from './pages/RiskDelivery';
import BlockersActions from './pages/BlockersActions';
import {Busy, ErrorNotice} from './components/UI';
import {SessionProvider, useSession} from './SessionContext';

const navigation = [
  {label: 'Workspace', links: [{to: '/dashboard', label: 'Overview', icon: LayoutDashboard}]},
  {label: 'Sources & Search', links: [{to: '/documents', label: 'Documents', icon: Files}, {to: '/knowledge-base', label: 'Knowledge Base', icon: Database}, {to: '/retrieval', label: 'Evidence Search', icon: Search}]},
  {label: 'Project Analysis', links: [{to: '/scope', label: 'Scope & Deliverables', icon: Target}, {to: '/risks', label: 'Risk & Delivery', icon: TriangleAlert}, {to: '/blockers', label: 'Blockers & Actions', icon: ListChecks}]},
];

function AppShell() {
  const {kb, connectionError, refresh, refreshing, uploading} = useSession();
  const [mobile, setMobile] = useState(() => window.matchMedia?.('(max-width: 767px)').matches ?? false);
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const currentPage = navigation.flatMap(group => group.links).find(link => link.to === location.pathname)?.label ?? 'Overview';

  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 767px)');
    if (!media) return;
    const change = () => {setMobile(media.matches); setOpen(false);};
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {setOpen(false);}, [location.pathname]);
  useEffect(() => {
    if (!mobile || !open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {event.preventDefault(); setOpen(false);}
      if (event.key !== 'Tab') return;
      const elements = Array.from(menu.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !menu.current?.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !menu.current?.contains(document.activeElement))) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (window.matchMedia?.('(max-width: 767px)').matches) trigger.current?.focus();
      else menu.current?.querySelector<HTMLElement>('a[aria-current="page"]')?.focus();
    };
  }, [mobile, open]);

  return <div className="app">
    <a className="skip-link" href="#main" hidden={mobile && open}>Skip to content</a>
    {mobile && open && <button className="nav-backdrop" tabIndex={-1} aria-label="Dismiss navigation" onClick={() => setOpen(false)}/>}
    <aside id="workspace-navigation" ref={menu} className="sidebar" hidden={mobile && !open} role={mobile && open ? 'dialog' : undefined} aria-modal={mobile && open ? true : undefined} aria-label={mobile && open ? 'Workspace navigation' : undefined}>
      <div className="brand"><span className="brand-mark"><Layers size={23}/></span><div>Project Intelligence<small>& Risk Advisor</small></div><button ref={closeButton} className="mobile-close icon-button" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={20}/></button></div>
      <div className="workspace"><span className="workspace-avatar">PI</span><div>Your workspace<small>Project intelligence</small></div></div>
      <nav aria-label="Main navigation">{navigation.map(group => <div className="nav-group" key={group.label}><p className="nav-label">{group.label}</p>{group.links.map(link => <NavLink to={link.to} key={link.to} onClick={() => setOpen(false)}><link.icon size={19} aria-hidden="true"/><span>{link.label}</span></NavLink>)}</div>)}</nav>
      <div className="sidebar-bottom"><Layers size={16}/><div>AI Project Intelligence<small>Infosys Springboard internship</small></div></div>
    </aside>
    <div className="main-wrap" inert={mobile && open}>
      <header className="topbar"><div className="topbar-location"><button ref={trigger} className="mobile-menu icon-button" aria-label="Open navigation" aria-controls="workspace-navigation" aria-expanded={mobile && open} onClick={() => setOpen(true)}><Menu size={21}/></button><span className="topbar-workspace">Workspace<span className="breadcrumb-divider">/</span></span><strong>{currentPage}</strong></div><span className={`connection-status ${connectionError ? 'connection-unavailable' : ''}`}>{connectionError ? <CircleAlert size={15}/> : kb ? <CircleCheck size={15}/> : <LoaderCircle className="spin" size={15}/>}<span>{connectionError ? 'Connection unavailable' : kb ? 'Workspace connected' : 'Connecting…'}</span></span></header>
      <main id="main" tabIndex={-1}>
        {connectionError && <div className="connection-error"><ErrorNotice>{connectionError}{kb && ' Previously loaded content is still shown.'}</ErrorNotice><button className="button secondary" disabled={refreshing} onClick={() => void refresh()}>{refreshing ? 'Retrying…' : 'Retry connection'}</button></div>}
        {!kb && !connectionError && <Busy>Connecting to your knowledge base…</Busy>}
        {uploading && location.pathname !== '/documents' && <Busy>Documents are uploading and indexing. You can continue browsing.</Busy>}
        {kb && <Routes>
          <Route path="/dashboard" element={<Overview kb={kb}/>}/>
          <Route path="/documents" element={<Documents kb={kb} refresh={refresh}/>}/>
          <Route path="/knowledge-base" element={<KnowledgeBase kb={kb}/>}/>
          <Route path="/retrieval" element={<Retrieval kb={kb}/>}/>
          <Route path="/scope" element={<ScopeDeliverables kb={kb}/>}/>
          <Route path="/risks" element={<RiskDelivery kb={kb}/>}/>
          <Route path="/blockers" element={<BlockersActions kb={kb}/>}/>
          <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
        </Routes>}
        <footer className="main-footer"><span>AI Project Intelligence & Risk Advisor</span><span>Insights with source evidence</span></footer>
      </main>
    </div>
  </div>;
}

export default function App() {return <SessionProvider><AppShell/></SessionProvider>;}
