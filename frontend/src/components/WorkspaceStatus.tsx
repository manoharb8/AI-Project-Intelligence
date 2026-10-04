import {useEffect, useRef, useState} from 'react';
import {Activity, CheckCircle2, CircleAlert, Database, RefreshCw} from 'lucide-react';
import {useSession} from '../SessionContext';

export default function WorkspaceStatus() {
  const {kb, provider, providerError, refreshing, refresh, uploading, uploadMessage, uploadError} = useSession();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const processing = kb?.documents.filter(document => document.status === 'processing').length ?? 0;
  const failed = kb?.documents.filter(document => document.status === 'error').length ?? 0;
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {setOpen(false); trigger.current?.focus();}
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape);};
  }, [open]);
  return <div className="workspace-tools">
    <button className="icon-button topbar-refresh" disabled={refreshing || uploading} aria-label="Refresh source status" title="Refresh source status" onClick={() => void refresh()}><RefreshCw size={17}/></button>
    <div ref={menu} className="workspace-status-menu" onBlur={event => {if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);}}>
      <button ref={trigger} className="workspace-status-trigger" aria-label="Workspace status" aria-expanded={open} aria-controls="workspace-status-content" onClick={() => setOpen(!open)}>
        <Activity size={17}/><span>Status</span>{(failed > 0 || uploadError || providerError || provider?.ready === false) && <span className="status-attention" aria-label="Needs review"/>}
      </button>
      {open && <div id="workspace-status-content" className="workspace-status-content" role="region" aria-label="Workspace status details">
        <h2>Workspace status</h2>
        <p><Database size={17}/><span>{kb ? `${kb.indexed_documents} indexed sources · ${kb.chunk_count} passages` : 'Connecting to project sources'}</span></p>
        <p>{provider?.ready && !providerError ? <CheckCircle2 size={17}/> : <CircleAlert size={17}/>}<span>{providerError ? 'Analysis availability could not be checked.' : provider?.ready ? 'Analysis available' : provider?.message ?? 'Checking analysis availability'}</span></p>
        {processing > 0 && <p>{processing} documents processing</p>}
        {failed > 0 && <p>{failed} documents need review in Documents.</p>}
        {uploadMessage && <p className="status-event">{uploadMessage}</p>}
        {uploadError && <p className="file-error">{uploadError}</p>}
        <small>Shows actual source and operation status for this session.</small>
      </div>}
    </div>
  </div>;
}
