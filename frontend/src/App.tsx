import {useCallback,useEffect,useState} from 'react';
import {NavLink,Navigate,Route,Routes} from 'react-router-dom';
import {Layers,LayoutDashboard,Files,Database,Search,PanelLeftClose,Menu,Target,TriangleAlert,ListChecks} from 'lucide-react';
import {api} from './api';
import type {KnowledgeBase as KB} from './types';
import Overview from './pages/Overview';
import Documents from './pages/Documents';
import KnowledgeBase from './pages/KnowledgeBase';
import Retrieval from './pages/Retrieval';
import ScopeDeliverables from './pages/ScopeDeliverables';
import RiskDelivery from './pages/RiskDelivery';
import BlockersActions from './pages/BlockersActions';
import {Busy,ErrorNotice} from './components/UI';
export default function App(){
 const [kb,setKb]=useState<KB|null>(null),[error,setError]=useState(''),[open,setOpen]=useState(false);
 const refresh=useCallback(async()=>{try{setKb(await api.summary());setError('');}catch(e){setError(e instanceof Error?e.message:'Cannot connect to the backend.');}},[]);
 useEffect(()=>{void refresh();},[refresh]);
 return <div className="app"><a className="skip-link" href="#main">Skip to content</a><aside className={open?'sidebar open':'sidebar'}><div className="brand"><span><Layers size={23}/></span><div>Project Intelligence<small>& Risk Advisor</small></div><button className="mobile-close" aria-label="Close navigation" onClick={()=>setOpen(false)}><PanelLeftClose size={20}/></button></div><div className="workspace"><span className="workspace-avatar">PI</span><div>Project workspace<small>Milestone 2 · Project insights</small></div></div><nav aria-label="Main navigation">{[
  {label:'WORKSPACE',links:[{to:'/dashboard',label:'Overview',icon:LayoutDashboard}]},
  {label:'MILESTONE 1',links:[{to:'/documents',label:'Documents',icon:Files},{to:'/knowledge-base',label:'Knowledge Base',icon:Database},{to:'/retrieval',label:'Retrieval',icon:Search}]},
  {label:'MILESTONE 2',links:[{to:'/scope',label:'Scope & Deliverables',icon:Target},{to:'/risks',label:'Risk & Delivery',icon:TriangleAlert},{to:'/blockers',label:'Blockers & Actions',icon:ListChecks}]}
 ].map(group=><div className="nav-group" key={group.label}><p className="nav-label">{group.label}</p>{group.links.map(n=><NavLink to={n.to} key={n.to} onClick={()=>setOpen(false)}><n.icon size={18}/>{n.label}</NavLink>)}</div>)}</nav><div className="sidebar-bottom"><span className="dot"/>Document intelligence<small>Infosys Springboard internship</small></div></aside><div className="main-wrap"><header className="topbar"><button className="mobile-menu" aria-label="Open navigation" onClick={()=>setOpen(true)}><Menu size={20}/></button><span>AI Project Intelligence & Risk Advisor</span><span className="top-status"><span className={`dot ${error?'offline':''}`}/>{error?'Connection unavailable':kb?'Workspace connected':'Connecting…'}</span></header><main id="main">{error&&<div className="connection-error"><ErrorNotice>{error}</ErrorNotice><button className="button secondary" onClick={()=>void refresh()}>Retry connection</button></div>}{!kb&&!error&&<Busy>Connecting to your knowledge base…</Busy>}{kb&&<Routes><Route path="/dashboard" element={<Overview kb={kb}/>}/><Route path="/documents" element={<Documents kb={kb} refresh={refresh}/>}/><Route path="/knowledge-base" element={<KnowledgeBase kb={kb}/>}/><Route path="/retrieval" element={<Retrieval kb={kb}/>}/><Route path="/scope" element={<ScopeDeliverables kb={kb}/>}/><Route path="/risks" element={<RiskDelivery kb={kb}/>}/><Route path="/blockers" element={<BlockersActions kb={kb}/>}/><Route path="*" element={<Navigate to="/dashboard" replace/>}/></Routes>}<footer className="main-footer">Milestone 2 · Evidence-backed project analysis</footer></main></div></div>
}
