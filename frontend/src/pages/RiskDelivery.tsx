import type {KnowledgeBase} from '../types';
import AgentAnalysis from './AgentAnalysis';

/** Dedicated route; shared rendering keeps evidence and unknown fields consistent. */
export default function RiskDelivery({kb}:{kb:KnowledgeBase}){
  return <AgentAnalysis kind="risk" kb={kb}/>;
}
