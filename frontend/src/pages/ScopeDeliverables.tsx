import type {KnowledgeBase} from '../types';
import AgentAnalysis from './AgentAnalysis';

/** Dedicated route; shared rendering keeps evidence and unknown fields consistent. */
export default function ScopeDeliverables({kb}:{kb:KnowledgeBase}){
  return <AgentAnalysis kind="scope" kb={kb}/>;
}
