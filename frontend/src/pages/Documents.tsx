import {useRef,useState} from 'react';
import {UploadCloud,Upload,X} from 'lucide-react';
import {api} from '../api';
import type {KnowledgeBase} from '../types';
import {Busy,DocumentTable,ErrorNotice,PageHeading} from '../components/UI';
export default function Documents({kb,refresh}:{kb:KnowledgeBase;refresh:()=>Promise<void>}) {
 const [selected,setSelected]=useState<File[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const input=useRef<HTMLInputElement>(null);
 function select(files:File[]){setError('');setMessage('');if(files.length>20){setError('Choose up to 20 files at once.');return;}if(files.some(f=>f.size>10*1024*1024)){setError('Each file must be 10 MB or smaller.');return;}setSelected(files);}
 async function upload(){if(!selected.length)return;setBusy(true);setError('');setMessage('');const polling=setInterval(()=>void refresh(),1000);try{const result=await api.upload(selected);const passed=result.documents.filter(d=>d.indexed).length;setMessage(`${passed} of ${result.documents.length} documents indexed. ${passed<result.documents.length?'Review failed files below.':'Ready for retrieval.'}`);setSelected([]);if(input.current)input.current.value='';await refresh();}catch(e){setError(e instanceof Error?e.message:'Upload failed. Please try again.');}finally{clearInterval(polling);setBusy(false);}}
 return <><PageHeading eyebrow="PROJECT SOURCES" title="Documents" description="Bring scattered project knowledge into one place."/>
 <section className="panel upload-panel"><div className="dropzone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy)select(Array.from(e.dataTransfer.files));}}><div className="upload-icon"><UploadCloud size={26}/></div><h2>Add your project documents</h2><p>Drop files here, or browse from your computer.</p><button className="button secondary" disabled={busy} onClick={()=>input.current?.click()}>Choose files</button><input ref={input} type="file" aria-label="Choose project documents" multiple accept=".pdf,.docx,.csv,.txt" disabled={busy} className="sr-only" onChange={e=>select(Array.from(e.target.files??[]))}/><small>PDF, DOCX, CSV, TXT · Up to 10 MB each · 20 files per upload</small></div>
 {selected.length>0&&<div className="selection"><div>{selected.map((f,i)=><span key={`${f.name}-${i}`} className="selected-file">{f.name}<button disabled={busy} aria-label={`Remove ${f.name}`} onClick={()=>setSelected(selected.filter((_,j)=>j!==i))}><X size={14}/></button></span>)}</div><button className="button" disabled={busy} onClick={upload}><Upload size={16}/>Upload & index {selected.length} {selected.length===1?'file':'files'}</button></div>}
 {busy&&<Busy>Extracting text and indexing your documents…</Busy>}{error&&<ErrorNotice>{error}</ErrorNotice>}{message&&<div className="notice success" role="status">{message}</div>}</section>
 <section className="panel"><div className="section-heading"><h2>Document library <span className="count">{kb.document_count}</span></h2><span className="muted">{kb.indexed_documents} indexed</span></div><DocumentTable documents={kb.documents}/></section></>;
}
