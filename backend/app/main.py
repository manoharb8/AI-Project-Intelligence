import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.api.router import router
from app.api.agents import router as agents_router
from app.llm.provider import build_provider
from app.core.config import DATA_DIR
from app.services.embeddings import WordLlamaEmbeddings
from app.services.knowledge_base import KnowledgeBaseService


def create_app(service=None, provider=None):
    @asynccontextmanager
    async def lifespan(app):
        app.state.kb = service if service is not None else KnowledgeBaseService(DATA_DIR, WordLlamaEmbeddings())
        app.state.provider = provider if provider is not None else build_provider()
        yield

    app = FastAPI(title='AI Project Intelligence & Risk Advisor', version='0.2.0', lifespan=lifespan)
    app.include_router(router)
    app.include_router(agents_router)

    @app.exception_handler(Exception)
    async def unhandled(request: Request, exc: Exception):
        logging.getLogger(__name__).exception('Request failed', exc_info=exc)
        return JSONResponse(status_code=500, content={'detail': 'The operation could not be completed. Please try again.'})

    return app

app = create_app()
