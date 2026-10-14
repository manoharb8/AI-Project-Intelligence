/** Retired screens remain tested in isolation; these routes are NOT mounted by App. */
import {MemoryRouter,Link,Routes,Route} from 'react-router-dom';
import {SessionProvider,useSession} from './SessionContext';
import Retrieval from './pages/Retrieval';
import KnowledgeBase from './pages/KnowledgeBase';
function Screens(){const {kb}=useSession();return <><nav aria-label="Main navigation"><Link to="/dashboard">Overview</Link><Link to="/retrieval">Evidence Search</Link></nav>{kb&&<Routes><Route path="/retrieval" element={<Retrieval kb={kb}/>}/><Route path="/knowledge-base" element={<KnowledgeBase kb={kb}/>}/><Route path="/dashboard" element={<h1>Test navigation destination</h1>}/></Routes>}</>;}
export function LegacyScreens({path}:{path:string}){return <MemoryRouter initialEntries={[path]}><SessionProvider><Screens/></SessionProvider></MemoryRouter>;}
