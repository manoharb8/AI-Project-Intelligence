export type ExportFormat='pdf'|'docx';
/** Download only server-saved results belonging to the captured workspace. */
export async function exportProject(workspaceId:string,format:ExportFormat,signal?:AbortSignal){
  const response=await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/export?format=${format}`,{headers:{'X-Workspace-ID':workspaceId},signal});
  if(!response.ok){let detail='Export failed. Your project data has not been changed.';try{const body=await response.json();if(typeof body.detail==='string')detail=body.detail;}catch{/* Non-JSON failure */}throw new Error(detail);}
  const contentType=response.headers.get('content-type')??'';
  if(!contentType.includes(format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))throw new Error('The server did not return the requested report format.');
  const blob=await response.blob();
  const filename=response.headers.get('content-disposition')?.match(/filename="([^"/\\]+)"/)?.[1]??`project-report.${format}`;
  return {blob,filename};
}
