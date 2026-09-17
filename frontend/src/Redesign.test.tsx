import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import App from './App';
import {SessionProvider, useSession} from './SessionContext';
import {api} from './api';
import type {AgentResult, KnowledgeBase, QueryResult} from './types';

vi.mock('./api', () => ({api: {summary: vi.fn(), agentStatus: vi.fn(), analyze: vi.fn(), upload: vi.fn(), query: vi.fn()}}));
// These isolated test fixtures are never imported by the application.
const sourceDoc = {id: 'a', filename: 'notes.txt', document_type: 'txt', size_bytes: 100, uploaded_at: '2026-09-10', status: 'indexed' as const, chunk_count: 2, indexed: true, error: null};
const kb: KnowledgeBase = {document_count: 1, indexed_documents: 1, chunk_count: 2, supported_formats: ['pdf', 'docx', 'txt', 'csv'], retrieval_ready: true, documents: [sourceDoc]};
const available = {provider: 'Local extractive analysis', mode: 'extractive' as const, ready: true, message: 'No generative LLM is running.', agents: ['scope', 'risk', 'blockers']};
const passage = {id: 'a:chunk-1', document_id: 'a', filename: 'notes.txt', document_type: 'txt', chunk_number: 1, location: 'Text section 1', text: 'Action item: arrange a review.', similarity: 0.4};
const searchResult: QueryResult = {status: 'ok', message: 'Relevant source passages.', query: 'review', results: [passage]};
const analysis: AgentResult = {agent: 'blockers', status: 'partial', message: 'Missing details remain unknown.', query: 'Review pending decisions', provider: available.provider, generated_at: '2026-09-12T10:00:00Z', findings: [{category: 'action_items', evidence_id: passage.id, quote: passage.text, information_state: 'unclear', owner: null, due_date: null, dates: [], source_status: null, severity: null, confidence: 'explicit_source_statement'}], evidence: [passage], coverage: [{category: 'action_items', state: 'unclear', count: 1}], retrieved_count: 2, evidence_limited: false, warnings: []};
function deferred<T>() {let resolve!: (value: T) => void; const promise = new Promise<T>(done => {resolve = done;}); return {promise, resolve};}
function show(path = '/documents') {return render(<MemoryRouter initialEntries={[path]}><App/></MemoryRouter>);}
function nav(name: string) {fireEvent.click(within(screen.getByRole('navigation', {name: 'Main navigation'})).getByRole('link', {name}));}
async function run() {const button = await screen.findByRole('button', {name: /Run analysis/}); await waitFor(() => expect(button).toBeEnabled()); fireEvent.click(button);}
function select(input: HTMLElement, files: File[]) {fireEvent.change(input, {target: {files}});}
beforeEach(() => {vi.resetAllMocks(); vi.mocked(api.summary).mockResolvedValue(kb); vi.mocked(api.agentStatus).mockResolvedValue(available);});
afterEach(() => {vi.unstubAllGlobals();});

test('queue appends browse and drop selections, removes files, and prevents duplicate entries', async () => {
  show(); const input = await screen.findByLabelText('Choose project documents');
  const first = new File(['a'], 'first.txt', {lastModified: 1});
  const second = new File(['b'], 'second.csv', {lastModified: 2});
  select(input, [first]); select(input, [second]);
  const dropzone = screen.getByRole('heading', {name: 'Add your project documents'}).parentElement!;
  fireEvent.dragEnter(dropzone); expect(dropzone).toHaveClass('drag-over');
  fireEvent.drop(dropzone, {dataTransfer: {files: [first]}});
  expect(dropzone).not.toHaveClass('drag-over');
  expect(screen.getByText(/already in your queue/)).toBeInTheDocument();
  expect(screen.getAllByRole('button', {name: /^Remove /})).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', {name: 'Remove first.txt'}));
  expect(screen.getByRole('button', {name: /Upload & index 1 file/})).toBeEnabled();
  nav('Overview'); nav('Documents');
  expect(screen.getByRole('button', {name: 'Remove second.csv'})).toBeInTheDocument();
});

test.each(['browse', 'drop'])('%s applies format, 10 MB, and 20-file queue rules consistently', async method => {
  show(); const input = await screen.findByLabelText('Choose project documents');
  const valid = Array.from({length: 20}, (_, index) => new File(['x'], `${index}.txt`));
  const tooBig = new File(['x'], 'large.pdf'); Object.defineProperty(tooBig, 'size', {value: 10 * 1024 * 1024 + 1});
  const incoming = [...valid, new File(['x'], 'overflow.docx'), new File(['x'], 'script.exe'), tooBig];
  if (method === 'browse') select(input, incoming);
  else fireEvent.drop(screen.getByRole('heading', {name: 'Add your project documents'}).parentElement!, {dataTransfer: {files: incoming}});
  expect(screen.getAllByRole('button', {name: /^Remove /})).toHaveLength(20);
  expect(screen.getByText(/queue is full/)).toBeInTheDocument();
  expect(screen.getByText(/unsupported format/)).toBeInTheDocument();
  expect(screen.getByText(/exceeds 10 MB/)).toBeInTheDocument();
  expect(api.upload).not.toHaveBeenCalled();
});

test('an upload stays pending across navigation and duplicate clicks do not submit again', async () => {
  const pending = deferred<{documents: typeof sourceDoc[]}>(); vi.mocked(api.upload).mockReturnValue(pending.promise);
  show(); select(await screen.findByLabelText('Choose project documents'), [new File(['x'], 'pending.txt')]);
  const upload = screen.getByRole('button', {name: /Upload & index/}); fireEvent.click(upload); fireEvent.click(upload);
  nav('Overview'); expect(await screen.findByText(/Documents are uploading and indexing/)).toBeInTheDocument(); nav('Documents');
  expect(screen.getByRole('button', {name: /Upload & index/})).toBeDisabled(); expect(api.upload).toHaveBeenCalledTimes(1);
  await act(async () => pending.resolve({documents: [sourceDoc]}));
  expect(await screen.findByText(/1 of 1 documents indexed/)).toBeInTheDocument();
});

test('evidence search is disabled until indexed evidence is ready, including direct form submission', async () => {
  vi.mocked(api.summary).mockResolvedValue({...kb, retrieval_ready: false, document_count: 0, indexed_documents: 0, chunk_count: 0, documents: []});
  show('/retrieval'); const input = await screen.findByLabelText('What would you like to find?');
  fireEvent.change(input, {target: {value: 'review'}}); fireEvent.submit(input.closest('form')!);
  expect(screen.getByRole('button', {name: /Find evidence/})).toBeDisabled();
  expect(screen.getByRole('link', {name: /Open Documents/})).toHaveAttribute('href', '/documents');
  expect(api.query).not.toHaveBeenCalled();
});

test('search query and completed evidence survive navigation, while failed retries retain useful results', async () => {
  vi.mocked(api.query).mockResolvedValueOnce(searchResult).mockRejectedValueOnce(new Error('Search unavailable'));
  show('/retrieval'); fireEvent.change(await screen.findByLabelText('What would you like to find?'), {target: {value: 'review'}});
  fireEvent.click(screen.getByRole('button', {name: /Find evidence/})); await screen.findByText(passage.text);
  fireEvent.change(screen.getByLabelText('What would you like to find?'), {target: {value: 'new focus'}});
  nav('Overview'); nav('Evidence Search');
  expect(screen.getByLabelText('What would you like to find?')).toHaveValue('new focus'); expect(screen.getByText(passage.text)).toBeInTheDocument();
  expect(screen.getByText(/Results for “review”/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: /Find evidence/}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Search unavailable'); expect(screen.getByText(passage.text)).toBeInTheDocument();
});

test('search requests cannot duplicate during navigation and pending responses remain tied to their query', async () => {
  const pending = deferred<QueryResult>(); vi.mocked(api.query).mockReturnValue(pending.promise);
  show('/retrieval'); const input = await screen.findByLabelText('What would you like to find?');
  fireEvent.change(input, {target: {value: 'review'}}); fireEvent.submit(input.closest('form')!); fireEvent.submit(input.closest('form')!);
  nav('Overview'); nav('Evidence Search');
  expect(screen.getByLabelText('What would you like to find?')).toBeDisabled(); expect(api.query).toHaveBeenCalledTimes(1);
  await act(async () => pending.resolve(searchResult)); expect(screen.getByText(passage.text)).toBeInTheDocument();
});

test('each agent retains its own focus and result, without automatically generating dashboard results', async () => {
  vi.mocked(api.analyze).mockResolvedValue(analysis); show('/blockers');
  fireEvent.change(await screen.findByLabelText('Analysis focus'), {target: {value: analysis.query}}); await run();
  await screen.findByText('Analysis complete · partial information');
  expect(screen.getByText(/Generated/).querySelector('time')).toHaveAttribute('datetime', analysis.generated_at);
  nav('Scope & Deliverables'); expect(screen.queryByText('Analysis complete · partial information')).not.toBeInTheDocument();
  nav('Blockers & Actions'); expect(screen.getByLabelText('Analysis focus')).toHaveValue(analysis.query);
  expect(screen.getByText('Analysis complete · partial information')).toBeInTheDocument();
  nav('Overview'); expect(screen.getByText('1 finding')).toBeInTheDocument(); expect(api.analyze).toHaveBeenCalledTimes(1);
});

test('a result finishing after new sources are indexed is marked outdated until an explicit rerun', async () => {
  const pending = deferred<AgentResult>(); vi.mocked(api.analyze).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(analysis);
  const addedSource = {...sourceDoc, id: 'added-source', filename: 'source.txt'};
  vi.mocked(api.upload).mockImplementation(async () => {
    vi.mocked(api.summary).mockResolvedValue({...kb, document_count: 2, indexed_documents: 2, chunk_count: 4, documents: [sourceDoc, addedSource]});
    return {documents: [addedSource]};
  }); show('/blockers'); await run();
  nav('Documents'); select(await screen.findByLabelText('Choose project documents'), [new File(['source'], 'source.txt')]);
  fireEvent.click(screen.getByRole('button', {name: /Upload & index/})); await screen.findByText(/1 of 1 documents indexed/);
  await act(async () => pending.resolve(analysis)); nav('Blockers & Actions');
  expect(screen.getByText(/These findings may be out of date/)).toBeInTheDocument(); expect(api.analyze).toHaveBeenCalledTimes(1);
  await run(); await waitFor(() => expect(screen.queryByText(/These findings may be out of date/)).not.toBeInTheDocument());
  expect(api.analyze).toHaveBeenCalledTimes(2);
});

test('provider failure has no contradictory ready state and can be checked again', async () => {
  vi.mocked(api.agentStatus).mockRejectedValueOnce(new Error('Availability unavailable')).mockResolvedValueOnce(available);
  show('/risks'); expect(await screen.findByRole('alert')).toHaveTextContent('Availability unavailable');
  expect(screen.queryByText('Not analyzed yet')).not.toBeInTheDocument(); expect(screen.getByRole('button', {name: /Run analysis/})).toBeDisabled();
  fireEvent.click(screen.getByRole('button', {name: 'Check availability again'}));
  await waitFor(() => expect(screen.getByRole('button', {name: /Run analysis/})).toBeEnabled()); expect(api.analyze).not.toHaveBeenCalled();
});

test('document filters and sorting use loaded data and survive navigation', async () => {
  const failed = {...sourceDoc, id: 'b', filename: 'failed.pdf', status: 'error' as const, indexed: false, error: 'Unreadable PDF', chunk_count: 0};
  vi.mocked(api.summary).mockResolvedValue({...kb, document_count: 2, documents: [sourceDoc, failed]});
  show(); fireEvent.change(await screen.findByLabelText('Status', {selector: 'select'}), {target: {value: 'error'}});
  expect(screen.queryByText('notes.txt', {selector: 'strong'})).not.toBeInTheDocument(); expect(screen.getByText('failed.pdf')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Sort by'), {target: {value: 'name'}}); nav('Overview'); nav('Documents');
  expect(screen.getByLabelText('Status', {selector: 'select'})).toHaveValue('error'); expect(screen.getByLabelText('Sort by')).toHaveValue('name');
  expect(api.summary).toHaveBeenCalledTimes(1);
});

function mobileMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({matches, media: query, onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn()})));
}

test('mobile navigation traps focus, closes with Escape or backdrop, and restores focus', async () => {
  mobileMedia(true); show('/retrieval'); await screen.findByLabelText('What would you like to find?');
  const open = screen.getByRole('button', {name: 'Open navigation'});
  expect(screen.queryByRole('navigation', {name: 'Main navigation'})).not.toBeInTheDocument();
  fireEvent.click(open); const dialog = screen.getByRole('dialog', {name: 'Workspace navigation'});
  expect(dialog).toHaveAttribute('aria-modal', 'true'); expect(open).toHaveAttribute('aria-expanded', 'true');
  const close = within(dialog).getByRole('button', {name: 'Close navigation'}); expect(close).toHaveFocus();
  fireEvent.keyDown(document, {key: 'Tab', shiftKey: true}); const last = within(dialog).getByRole('link', {name: 'Blockers & Actions'}); expect(last).toHaveFocus();
  fireEvent.keyDown(document, {key: 'Tab'}); expect(close).toHaveFocus();
  expect(open.closest('.main-wrap')).toHaveAttribute('inert');
  fireEvent.keyDown(document, {key: 'Escape'}); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(open).toHaveFocus(); expect(open).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(open); fireEvent.click(screen.getByRole('button', {name: 'Dismiss navigation'})); expect(open).toHaveFocus();
  expect(screen.queryByRole('navigation', {name: 'Main navigation'})).not.toBeInTheDocument(); expect(document.body.style.overflow).toBe('');
});

test('following a mobile navigation link dismisses the dialog and restores focus', async () => {
  mobileMedia(true); show('/retrieval'); await screen.findByLabelText('What would you like to find?');
  const open = screen.getByRole('button', {name: 'Open navigation'}); fireEvent.click(open); nav('Documents');
  expect(await screen.findByRole('heading', {name: 'Documents'})).toBeInTheDocument(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(open).toHaveFocus();
});


test('an older knowledge-base response cannot replace a newer refresh', async () => {
  const older = deferred<KnowledgeBase>();
  vi.mocked(api.summary).mockReturnValueOnce(older.promise).mockResolvedValueOnce({...kb, document_count: 2});
  function RefreshProbe() {
    const session = useSession();
    return <><button onClick={() => void session.refresh()}>Refresh knowledge</button><output aria-label="Document count">{session.kb?.document_count ?? 'Waiting'}</output></>;
  }
  render(<SessionProvider><RefreshProbe/></SessionProvider>);
  fireEvent.click(screen.getByRole('button', {name: 'Refresh knowledge'}));
  await waitFor(() => expect(screen.getByLabelText('Document count')).toHaveTextContent('2'));
  await act(async () => older.resolve(kb));
  expect(screen.getByLabelText('Document count')).toHaveTextContent('2');
});

test('failed upload details remain visible when filters exclude them and list refresh fails', async () => {
  const failed = {...sourceDoc, id: 'failed-upload', filename: 'unreadable.pdf', indexed: false, status: 'error' as const, chunk_count: 0, error: 'No readable text found.'};
  vi.mocked(api.upload).mockImplementation(async () => {
    vi.mocked(api.summary).mockRejectedValue(new Error('List refresh unavailable'));
    return {documents: [failed]};
  });
  show(); fireEvent.change(await screen.findByLabelText('Status', {selector: 'select'}), {target: {value: 'indexed'}});
  fireEvent.change(screen.getByLabelText('Find a document'), {target: {value: 'notes'}});
  select(screen.getByLabelText('Choose project documents'), [new File(['bad'], 'unreadable.pdf')]);
  fireEvent.click(screen.getByRole('button', {name: /Upload & index/}));
  const feedback = await screen.findByRole('region', {name: 'Upload results'});
  expect(within(feedback).getByText('unreadable.pdf')).toBeInTheDocument();
  expect(within(feedback).getByText('No readable text found.')).toBeInTheDocument();
  nav('Overview'); nav('Documents');
  expect(within(screen.getByRole('region', {name: 'Upload results'})).getByText('No readable text found.')).toBeInTheDocument();
  expect(screen.getByLabelText('Status', {selector: 'select'})).toHaveValue('indexed');
});

test('refreshing after an interrupted upload marks results outdated when new indexed sources are observed', async () => {
  vi.mocked(api.analyze).mockResolvedValue(analysis);
  vi.mocked(api.upload).mockImplementation(async () => {
    vi.mocked(api.summary).mockResolvedValue({...kb, document_count: 2, indexed_documents: 2, chunk_count: 4, documents: [sourceDoc, {...sourceDoc, id: 'new-source', filename: 'new.txt'}]});
    throw new Error('Upload connection interrupted');
  });
  show('/blockers'); await run(); await screen.findByText('Analysis complete · partial information');
  nav('Documents'); select(screen.getByLabelText('Choose project documents'), [new File(['x'], 'new.txt')]);
  fireEvent.click(screen.getByRole('button', {name: /Upload & index/}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Upload connection interrupted');
  const refreshButton = screen.getByRole('button', {name: 'Refresh list'});
  await waitFor(() => expect(refreshButton).toBeEnabled()); fireEvent.click(refreshButton);
  await screen.findByText('new.txt', {selector: '.filename strong'});
  nav('Blockers & Actions');
  expect(screen.getByText(/These findings may be out of date/)).toBeInTheDocument();
  expect(api.analyze).toHaveBeenCalledTimes(1);
});
