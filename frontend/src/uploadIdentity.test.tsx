import {webcrypto} from 'node:crypto';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {SessionProvider, useSession} from './SessionContext';
import {api} from './api';
import {uploadIdentity} from './uploadIdentity';
import type {ProjectDocument} from './types';

vi.mock('./api', () => ({api: {summary:vi.fn(), agentStatus:vi.fn(), analyze:vi.fn(), upload:vi.fn(), query:vi.fn()}}));
function file(text: string, name = 'progress.txt') {
  const value = new File([text], name);
  // Use Node's BufferSource realm when exercising real WebCrypto in jsdom.
  Object.defineProperty(value, 'arrayBuffer', {value:async()=>new TextEncoder().encode(text).buffer});
  return value;
}
function Harness() {
  const session = useSession();
  return <><input aria-label="Files" type="file" multiple onChange={e=>session.selectFiles(Array.from(e.target.files ?? []))}/>
    <button disabled={session.uploading} onClick={()=>void session.upload()}>Upload</button>
    <output data-testid="revision">{session.revision}</output><output data-testid="sources">{session.kb?.indexed_documents}</output>
    <div role="status">{session.uploadMessage}</div><div>{session.uploadError}</div>
    {session.queueMessages.map(message=><p key={message}>{message}</p>)}
  </>;
}
let sources: ProjectDocument[];
beforeEach(()=>{
  vi.resetAllMocks(); vi.stubGlobal('crypto', webcrypto); sources=[];
  vi.mocked(api.summary).mockImplementation(async()=>({document_count:sources.length,indexed_documents:sources.filter(d=>d.indexed).length,chunk_count:sources.filter(d=>d.indexed).length,retrieval_ready:sources.some(d=>d.indexed),supported_formats:['pdf','docx','txt','csv'],documents:[...sources]}));
  vi.mocked(api.agentStatus).mockResolvedValue({provider:'Extractive',mode:'extractive',ready:true,message:'Ready',agents:[]});
  vi.mocked(api.upload).mockImplementation(async files=>{
    const documents=files.map((value,index)=>({id:`${sources.length}-${index}`,filename:value.name,document_type:value.name.split('.').pop()!,size_bytes:value.size,uploaded_at:'2026-10-02T10:00:00Z',status:'indexed' as const,chunk_count:1,indexed:true,error:null}));
    sources.push(...documents);return {documents};
  });
});
afterEach(()=>vi.unstubAllGlobals());
async function show(){render(<SessionProvider><Harness/></SessionProvider>);await waitFor(()=>expect(screen.getByTestId('sources')).toHaveTextContent('0'));}
async function upload(files: File[]) {
  fireEvent.change(screen.getByLabelText('Files'),{target:{files}});fireEvent.click(screen.getByRole('button',{name:'Upload'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Upload'})).toBeEnabled());
}
test('content identity distinguishes changed bytes, ignores renamed copies and respects formats',async()=>{
  expect(await uploadIdentity(file('a'))).toEqual(await uploadIdentity(file('a','renamed.TXT')));
  expect(await uploadIdentity(file('a'))).not.toEqual(await uploadIdentity(file('b')));
  expect(await uploadIdentity(file('a','same.csv'))).not.toEqual(await uploadIdentity(file('a')));
});
test('exact content already indexed in this session is skipped without changing sources or revision',async()=>{
  await show();await upload([file('First content')]);const revision=screen.getByTestId('revision').textContent;
  await upload([file('First content','renamed.txt')]);
  expect(api.upload).toHaveBeenCalledTimes(1);expect(screen.getByTestId('sources')).toHaveTextContent('1');expect(screen.getByTestId('revision')).toHaveTextContent(revision!);
  expect(screen.getByText(/No new files were sent/)).toBeInTheDocument();
});
test('same filename and size with different contents is a valid incremental source',async()=>{
  await show();await upload([file('aaa')]);await upload([file('bbb')]);
  expect(api.upload).toHaveBeenCalledTimes(2);expect(screen.getByTestId('sources')).toHaveTextContent('2');expect(sources.map(d=>d.filename)).toEqual(['progress.txt','progress.txt']);
});
test('renamed duplicates within a batch upload once',async()=>{
  await show();await upload([file('same','a.txt'),file('same','b.txt')]);
  expect(vi.mocked(api.upload).mock.calls[0][0]).toHaveLength(1);expect(screen.getByText(/b.txt: identical content/)).toBeInTheDocument();
});
test('a rejected upload is not remembered as indexed and remains retryable',async()=>{
  vi.mocked(api.upload).mockRejectedValueOnce(new Error('Network unavailable'));await show();await upload([file('retry')]);
  expect(screen.getByText(/Network unavailable/)).toBeInTheDocument();await upload([file('retry')]);
  expect(api.upload).toHaveBeenCalledTimes(2);expect(screen.getByTestId('sources')).toHaveTextContent('1');
});
test('when secure hashing is unavailable uploads proceed without guessing duplicates',async()=>{
  vi.stubGlobal('crypto',{});expect(await uploadIdentity(file('same'))).toBeNull();
  await show();await upload([file('same')]);await upload([file('same')]);expect(api.upload).toHaveBeenCalledTimes(2);
});
