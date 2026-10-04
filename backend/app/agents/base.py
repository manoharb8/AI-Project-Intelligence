"""Bounded targeted retrieval -> provider -> validation -> structured evidence."""
from datetime import datetime,timezone
import re
from app.agents.schemas import AnalysisResult, CATEGORIES, Coverage
from app.agents.grounding import validate_findings
from app.llm.base import AnalysisProvider

MAX_EVIDENCE=12
MAX_EVIDENCE_CHARACTERS=14000

class GroundedAgent:
    kind: str
    retrieval_queries: tuple[str,...]

    def __init__(self,knowledge_base,provider:AnalysisProvider):
        self.kb=knowledge_base
        self.provider=provider

    def retrieve(self,focus):
        # First focus query plus complementary facet queries. Each call uses M1
        # semantic retrieval. Never load/dump the complete vector collection.
        queries=[focus,*self.retrieval_queries]
        first=self.kb.query(focus,top_k=5)['results']
        broad=bool(re.fullmatch(r'review (?:the )?(?:uploaded )?project documents[.!]?',focus.strip(),re.I))
        if not first and not broad:
            return [],False
        lists=[first,*[self.kb.query(q,top_k=5)['results'] for q in self.retrieval_queries]]
        seen=set();selected=[];length=0;limited=False
        # Round robin prevents the first facet from consuming the entire budget.
        for rank in range(5):
            for hits in lists:
                if rank>=len(hits):continue
                e=hits[rank]
                if e['id'] in seen:continue
                seen.add(e['id'])
                if len(selected)>=MAX_EVIDENCE or length+len(e['text'])>MAX_EVIDENCE_CHARACTERS:
                    limited=True
                    continue
                selected.append(e);length+=len(e['text'])
        return selected,limited

    def run(self,query):
        evidence,limited=self.retrieve(query)
        raw=self.provider.generate(self.kind,query,evidence) if evidence else {'findings':[]}
        findings=validate_findings(raw,evidence,self.kind)
        coverage=[]
        for category in CATEGORIES[self.kind]:
            matches=[f for f in findings if f.category==category]
            state='missing' if not matches else ('unclear' if any(f.information_state=='unclear' for f in matches) else 'known')
            coverage.append(Coverage(category=category,state=state,count=len(matches)))
        state='insufficient_information' if not findings else ('partial' if limited or any(c.state!='known' for c in coverage) else 'ok')
        used={f.evidence_id for f in findings}
        note='No supported findings were found in the retrieved evidence.' if not findings else 'Findings are quoted from retrieved project evidence. Missing details remain unknown.'
        warnings=['Missing means not established in this retrieved evidence, not necessarily absent from every document.']
        if self.provider.status.mode=='extractive':
            warnings.append('Local extractive mode uses fixed English-language rules; it is not a generative LLM and may miss indirect wording.')
        if limited:warnings.append('The evidence budget was reached. Narrow the analysis focus for more targeted coverage.')
        if self.kind=='risk':warnings.append('Delivery outlook is limited to explicit source statements. No delivery date or probability is predicted.')
        return AnalysisResult(agent=self.kind,status=state,message=note,query=query,provider=self.provider.status.name,
            generated_at=datetime.now(timezone.utc).isoformat(),findings=findings,evidence=[e for e in evidence if e['id'] in used],
            coverage=coverage,retrieved_count=len(evidence),evidence_limited=limited,warnings=warnings)
