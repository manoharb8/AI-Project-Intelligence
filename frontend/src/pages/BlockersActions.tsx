import type {KnowledgeBase} from '../types';
import AgentAnalysis from './AgentAnalysis';

/** Dedicated route; shared rendering keeps evidence and unknown fields consistent. */
export default function BlockersActions({kb}:{kb:KnowledgeBase}){
  return <AgentAnalysis kind="blockers" kb={kb}/>;
}
