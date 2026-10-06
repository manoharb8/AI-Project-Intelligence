import {useEffect, useRef, useState} from 'react';
import {NavLink, Navigate, Route, Routes, useLocation} from 'react-router-dom';
import {LayoutDashboard, Files, Database, Menu, X, Target, TriangleAlert, ListChecks, CircleCheck, CircleAlert, LoaderCircle, BookOpen, Activity, MessageSquare} from 'lucide-react';
import Overview from './pages/Overview';
import Documents from './pages/Documents';
import ScopeDeliverables from './pages/ScopeDeliverables';
import RiskDelivery from './pages/RiskDelivery';
import BlockersActions from './pages/BlockersActions';
import Documentation from './pages/Documentation';
import ProjectHealth from './pages/ProjectHealth';
import Assistant from './pages/Assistant';
import {IntelligenceProvider} from './intelligence/IntelligenceContext';
import {Busy, ErrorNotice} from './components/UI';
import {SessionProvider, useSession} from './SessionContext';
import WorkspaceStatus from './components/WorkspaceStatus';
import SidebarBrand from './presentation/SidebarBrand';
import {ThemeProvider, ThemeToggle} from './presentation/Theme';
import {WorkspaceBinding,useWorkspaceManager} from './workspaces/WorkspaceContext';
import WorkspaceSwitcher from './workspaces/WorkspaceSwitcher';
import ProjectFlow from './experience/ProjectFlow';
import Notifications from './experience/Notifications';

const navigation = [
  {label: 'Workspace', links: [{to: '/dashboard', label: 'Overview', icon: LayoutDashboard}]},
  {label: 'Sources & Search', links: [{to: '/documents', label: 'Documents', icon: Files}]},
  {label: 'Project Analysis', links: [{to: '/scope', label: 'Scope & Deliverables', icon: Target}, {to: '/risks', label: 'Risk & Delivery', icon: TriangleAlert}, {to: '/blockers', label: 'Blockers & Actions', icon: ListChecks}]},
  {label: 'Project Intelligence', links: [{to: '/documentation', label: 'Documentation Studio', icon: BookOpen}, {to: '/project-health', label: 'Project Health', icon: Activity}, {to: '/assistant', label: 'Project Assistant', icon: MessageSquare}]},
];

function AppShell() {
  const manager=useWorkspaceManager();
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
      <div className="brand"><SidebarBrand/><button ref={closeButton} className="mobile-close icon-button" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={20}/></button></div>
      <nav aria-label="Main navigation">{navigation.map(group => <div className="nav-group" key={group.label}><p className="nav-label">{group.label}</p>{group.links.map(link => <NavLink to={link.to} key={link.to} onClick={() => setOpen(false)}><link.icon size={19} aria-hidden="true"/><span>{link.label}</span></NavLink>)}</div>)}</nav>
    </aside>
    <div className="main-wrap" inert={mobile && open}>
      <header className={`topbar ${manager?'managed-topbar':''}`}><div className="topbar-location"><button ref={trigger} className="mobile-menu icon-button" aria-label="Open navigation" aria-controls="workspace-navigation" aria-expanded={mobile && open} onClick={() => setOpen(true)}><Menu size={21}/></button>{manager?<WorkspaceSwitcher/>:<span className="topbar-workspace">Workspace<span className="breadcrumb-divider">/</span></span>}<strong className="current-page-crumb">{currentPage}</strong></div><span className={`connection-status ${connectionError ? 'connection-unavailable' : ''}`}>{connectionError ? <CircleAlert size={15}/> : kb ? <CircleCheck size={15}/> : <LoaderCircle className="spin" size={15}/>}<span>{connectionError ? 'Connection unavailable' : kb ? 'Workspace connected' : 'Connecting…'}</span></span><ThemeToggle/><WorkspaceStatus/></header>
      <main id="main" tabIndex={-1}>
        {manager?.switching&&<Busy>Opening {manager.workspaces.find(w=>w.id===manager.switching)?.name}… Your current project stays visible until it is ready.</Busy>}
        {manager?.error&&<ErrorNotice>{manager.error}</ErrorNotice>}
        {manager?.saveErrors[manager.activeId]&&<ErrorNotice><p>Workspace view could not be saved. Completed API results and documents are stored separately. {manager.saveErrors[manager.activeId]}</p><button className="button secondary" onClick={()=>void manager.loaded.find(w=>w.workspace.id===manager.activeId)?.persistence.flush()}>Retry saving view</button></ErrorNotice>}
        {connectionError && <div className="connection-error"><ErrorNotice>{connectionError}{kb && ' Previously loaded content is still shown.'}</ErrorNotice><button className="button secondary" disabled={refreshing} onClick={() => void refresh()}>{refreshing ? 'Retrying…' : 'Retry connection'}</button></div>}
        {!kb && !connectionError && <Busy>Connecting to your knowledge base…</Busy>}
        {uploading && location.pathname !== '/documents' && <Busy>Documents are uploading and indexing. You can continue browsing.</Busy>}
        {kb && <ProjectFlow/>}
        {kb && <div className="page-stage" key={location.pathname}><Routes>
          <Route path="/dashboard" element={<Overview kb={kb}/>}/>
          <Route path="/documents" element={<Documents kb={kb} refresh={refresh}/>}/>
          <Route path="/scope" element={<ScopeDeliverables kb={kb}/>}/>
          <Route path="/risks" element={<RiskDelivery kb={kb}/>}/>
          <Route path="/blockers" element={<BlockersActions kb={kb}/>}/>
          <Route path="/documentation" element={<Documentation/>}/>
          <Route path="/project-health" element={<ProjectHealth/>}/>
          <Route path="/assistant" element={<Assistant/>}/>
          <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
        </Routes></div>}
        <footer className="main-footer"><span>Insights with source evidence</span></footer>
      </main>
      <Notifications/>
    </div>
  </div>;
}

function Sessions(){
  const manager=useWorkspaceManager();
  if(!manager)return <SessionProvider><IntelligenceProvider><AppShell/></IntelligenceProvider></SessionProvider>;
  if(!manager.activeId)return <div className="workspace-boot"><div className="workspace-boot-mark"><LayersIcon/></div><h1>{manager.loading?'Opening your workspace':'Workspace unavailable'}</h1><p>{manager.loading?'Loading your saved projects and evidence.':manager.error}</p>{!manager.loading&&<button className="button" onClick={manager.retry}>Retry connection</button>}</div>;
  return <>{manager.loaded.map(loaded=><WorkspaceBinding key={loaded.workspace.id} loaded={loaded} active={loaded.workspace.id===manager.activeId}><SessionProvider><IntelligenceProvider>{loaded.workspace.id===manager.activeId?<AppShell/>:null}</IntelligenceProvider></SessionProvider></WorkspaceBinding>)}</>;
}
function LayersIcon(){return <Database size={30} aria-hidden="true"/>;}
export default function App() {return <ThemeProvider><Sessions/></ThemeProvider>;}
