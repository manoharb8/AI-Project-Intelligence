from fastapi import APIRouter, Request, UploadFile, File, HTTPException
from starlette.concurrency import run_in_threadpool
from app.api.schemas import DocumentRecord, UploadResult, KnowledgeBase, Query, QueryResult, Health
from app.core.config import MAX_FILE_BYTES, MAX_BATCH_FILES

router = APIRouter(prefix='/api')

@router.get('/health', response_model=Health)
def health():
    return dict(status='ready', embedding_model='WordLlama l2_supercat / 256 dimensions', vector_store='ChromaDB persistent')

@router.get('/documents', response_model=list[DocumentRecord])
def documents(request: Request):
    return request.app.state.kb.list_documents()

@router.post('/documents/upload', response_model=UploadResult)
async def upload(request: Request, files: list[UploadFile] = File(...)):
    if len(files) > MAX_BATCH_FILES:
        raise HTTPException(422, f'Upload no more than {MAX_BATCH_FILES} files at once.')
    results = []
    for file in files:
        try:
            data = await file.read(MAX_FILE_BYTES + 1)
            error = 'File exceeds the 10 MB limit.' if len(data) > MAX_FILE_BYTES else None
            results.append(await run_in_threadpool(request.app.state.kb.ingest, file.filename or 'unnamed', data, error))
        finally:
            await file.close()
    return dict(documents=results)

@router.get('/knowledge-base', response_model=KnowledgeBase)
def knowledge_base(request: Request):
    return request.app.state.kb.summary()

@router.post('/retrieval/query', response_model=QueryResult)
def query(body: Query, request: Request):
    return request.app.state.kb.query(body.query, body.top_k)
