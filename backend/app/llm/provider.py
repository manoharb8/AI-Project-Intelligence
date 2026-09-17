"""Local extraction or a configurable OpenAI-compatible chat-completions API."""
import json
import os
from urllib.parse import urlparse
import httpx
from app.llm.base import ProviderError, ProviderStatus
from app.agents.schemas import CATEGORIES
from app.agents.extraction import classify, statements
from app.agents.prompts import messages

class ExtractiveProvider:
    status=ProviderStatus('Local extractive analysis','extractive',True,
        'Uses explicit source statements and conservative rules. No generative LLM is running.')

    def generate(self,kind,query,evidence):
        findings=[]
        for item in evidence:
            for quote in statements(item['text']):
                for category in CATEGORIES[kind]:
                    if category in classify(quote):
                        findings.append(dict(category=category,evidence_id=item['id'],quote=quote))
        return {'findings':findings[:60]}

class UnavailableProvider:
    def __init__(self,message):
        self.status=ProviderStatus('Provider unavailable','unavailable',False,message)
    def generate(self,*args):
        raise ProviderError(self.status.message)

class ChatCompletionsProvider:
    def __init__(self,base_url,model,api_key='',timeout=45,transport=None):
        parsed=urlparse(base_url)
        local=parsed.hostname in ('127.0.0.1','localhost','::1')
        if not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError('Set a valid LLM_BASE_URL without credentials, query parameters, or fragments.')
        if parsed.scheme!='https' and not (parsed.scheme=='http' and local):
            raise ValueError('Use HTTPS for a remote LLM endpoint, or HTTP for a local endpoint.')
        if not model.strip():
            raise ValueError('Set LLM_MODEL for the configured provider.')
        self.url=base_url.rstrip('/')+'/chat/completions'
        self.model=model
        self.api_key=api_key
        self.timeout=timeout
        self.transport=transport
        self.status=ProviderStatus('Configured LLM','llm',True,
            'Selected evidence will be sent to the configured model endpoint. Connectivity is checked when analysis runs.')

    def generate(self,kind,query,evidence):
        headers={'Authorization':f'Bearer {self.api_key}'} if self.api_key else {}
        try:
            with httpx.Client(timeout=httpx.Timeout(self.timeout,connect=10),follow_redirects=False,transport=self.transport) as client:
                with client.stream('POST',self.url,headers=headers,json={
                    'model':self.model,'messages':messages(kind,query,evidence),
                    'response_format':{'type':'json_object'},'stream':False}) as response:
                    response.raise_for_status()
                    data=bytearray()
                    for piece in response.iter_bytes():
                        data.extend(piece)
                        if len(data)>1024*1024:
                            raise ProviderError('The model response exceeded the supported size.')
            payload=json.loads(data)
            content=payload['choices'][0]['message']['content']
            if not isinstance(content,str):raise ValueError('Missing response text')
            return json.loads(content)
        except httpx.TimeoutException as exc:
            raise ProviderError('The model request timed out. Please try again.') from exc
        except httpx.HTTPError as exc:
            raise ProviderError('The model endpoint could not complete the request. Check the provider configuration.') from exc
        except (ValueError,KeyError,IndexError,TypeError) as exc:
            raise ProviderError('The model did not return valid structured JSON.') from exc


def build_provider():
    name=os.getenv('LLM_PROVIDER','extractive').strip().lower()
    if name=='extractive':return ExtractiveProvider()
    if name=='openai_compatible':
        try:
            return ChatCompletionsProvider(os.getenv('LLM_BASE_URL',''),os.getenv('LLM_MODEL',''),os.getenv('LLM_API_KEY',''))
        except ValueError as exc:
            return UnavailableProvider(str(exc))
    return UnavailableProvider('Unknown LLM_PROVIDER. Choose extractive or openai_compatible.')
