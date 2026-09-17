import {useRef, useState} from 'react';
import {UploadCloud, Upload, X, FileText, RefreshCw, Search} from 'lucide-react';
import type {KnowledgeBase} from '../types';
import {Busy, DocumentTable, Empty, ErrorNotice, FileSize, Notice, PageHeading, StatusBadge} from '../components/UI';
import {useSession} from '../SessionContext';
import {fileKey} from '../fileQueue';

export default function Documents({kb, refresh}: {kb: KnowledgeBase; refresh: () => Promise<void>}) {
  const session = useSession();
  const {files, uploading, selectFiles, removeFile, upload, queueMessages, uploadError, uploadMessage, uploadHasFailures, uploadResults, refreshing, documentSearch, setDocumentSearch, documentStatus, setDocumentStatus, documentSort, setDocumentSort} = session;
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const documents = kb.documents.filter(doc => doc.filename.toLowerCase().includes(documentSearch.toLowerCase()) && (documentStatus === 'all' || doc.status === documentStatus)).sort((a, b) => documentSort === 'name' ? a.filename.localeCompare(b.filename) : documentSort === 'oldest' ? Date.parse(a.uploaded_at) - Date.parse(b.uploaded_at) : Date.parse(b.uploaded_at) - Date.parse(a.uploaded_at));

  return <>
    <PageHeading eyebrow="Sources & Search" title="Documents" description="Bring your project sources together. Upload files and track their indexing status."/>
    <section className="panel upload-panel" aria-labelledby="upload-title">
      <div className={`dropzone ${dragging && !uploading ? 'drag-over' : ''}`} onDragEnter={event => {event.preventDefault(); dragDepth.current++; if (!uploading) setDragging(true);}} onDragOver={event => {event.preventDefault(); event.dataTransfer.dropEffect = uploading ? 'none' : 'copy';}} onDragLeave={event => {event.preventDefault(); if (--dragDepth.current <= 0) {dragDepth.current = 0; setDragging(false);}}} onDrop={event => {event.preventDefault(); dragDepth.current = 0; setDragging(false); selectFiles(Array.from(event.dataTransfer.files));}}>
        <div className="upload-icon"><UploadCloud size={30}/></div><h2 id="upload-title">{dragging && !uploading ? 'Drop to add files to your queue' : 'Add your project documents'}</h2><p>Drag files here, or choose them from your computer.</p><button className="button secondary" disabled={uploading} onClick={() => input.current?.click()}>Choose files</button><input ref={input} type="file" aria-label="Choose project documents" multiple accept=".pdf,.docx,.txt,.csv" disabled={uploading} className="sr-only" tabIndex={-1} onChange={event => {selectFiles(Array.from(event.target.files ?? [])); event.target.value = '';}}/><small>PDF, DOCX, TXT, CSV <span>·</span> Up to 10 MB each <span>·</span> 20 files per upload</small>
      </div>
      {files.length > 0 && <div className="selection"><div className="queue-heading"><h3>Upload queue <span className="count">{files.length} / 20</span></h3><span className="muted">{uploading ? 'Upload in progress' : 'Add more files or remove any below'}</span></div><ul className="file-queue">{files.map(file => <li key={fileKey(file)}><FileText size={19}/><div><strong>{file.name}</strong><small><FileSize bytes={file.size}/> · {uploading ? 'Uploading / indexing' : 'Queued'}</small></div><button className="icon-button" disabled={uploading} aria-label={`Remove ${file.name}`} onClick={() => removeFile(fileKey(file))}><X size={18}/></button></li>)}</ul><div className="queue-action"><p>Files are processed and indexed after you upload.</p><button className="button" disabled={uploading} onClick={() => void upload()}><Upload size={17}/>{uploading ? 'Upload & index in progress…' : `Upload & index ${files.length} ${files.length === 1 ? 'file' : 'files'}`}</button></div></div>}
      {queueMessages.length > 0 && <Notice tone="warning"><ul className="message-list">{queueMessages.map((message, index) => <li key={index}>{message}</li>)}</ul></Notice>}
      {uploading && <Busy>Extracting text and indexing your documents… This may take a moment.</Busy>}
      {uploadError && <ErrorNotice>{uploadError}</ErrorNotice>}
      {uploadMessage && <Notice tone={uploadHasFailures ? 'warning' : 'success'}>{uploadMessage}</Notice>}
      {uploadResults.length > 0 && <section aria-label="Upload results" className="upload-results"><h3>Last upload</h3><ul className="file-queue" tabIndex={0} aria-label="Uploaded files">{uploadResults.map(document => <li key={document.id}><FileText size={19}/><div><strong>{document.filename}</strong><small><FileSize bytes={document.size_bytes}/></small>{document.error && <p className="file-error">{document.error}</p>}</div><StatusBadge status={document.status}/></li>)}</ul></section>}
    </section>
    <section className="panel"><div className="section-heading"><div><h2>Document library <span className="count">{kb.document_count}</span></h2><p className="muted">{kb.indexed_documents} indexed · {kb.chunk_count} source passages</p></div><button className="button secondary" disabled={refreshing} onClick={() => void refresh()}><RefreshCw size={16} className={refreshing ? 'spin' : ''}/>{refreshing ? 'Refreshing…' : 'Refresh list'}</button></div>
      {kb.documents.length > 0 && <div className="table-toolbar"><div className="field search-filter"><label htmlFor="document-search">Find a document</label><div className="input-with-icon"><Search size={17}/><input id="document-search" type="search" placeholder="Search filenames…" value={documentSearch} onChange={event => setDocumentSearch(event.target.value)}/></div></div><div className="field"><label htmlFor="document-status">Status</label><select id="document-status" value={documentStatus} onChange={event => setDocumentStatus(event.target.value)}><option value="all">All statuses</option><option value="indexed">Indexed</option><option value="processing">Processing</option><option value="error">Failed</option></select></div><div className="field"><label htmlFor="document-sort">Sort by</label><select id="document-sort" value={documentSort} onChange={event => setDocumentSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Filename A–Z</option></select></div></div>}
      {kb.documents.length > 0 && documents.length === 0 ? <Empty title="No matching documents" action={<button className="button secondary" onClick={() => {setDocumentSearch(''); setDocumentStatus('all');}}>Clear filters</button>}>Try a different filename or status filter.</Empty> : <DocumentTable documents={documents}/>}
      {kb.documents.some(doc => doc.status === 'error') && <div className="table-help"><FileText size={17}/><p>For a failed file, review its error, correct or export a readable supported source, then choose it again above.</p></div>}
    </section>
  </>;
}
