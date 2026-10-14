import {afterEach,expect,test,vi} from 'vitest';
import {exportProject} from './exportApi';
afterEach(()=>vi.unstubAllGlobals());
test.each(['pdf','docx'] as const)('%s export binds the captured workspace and returns an actual blob',async format=>{
 const type=format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
 const fetch=vi.fn().mockResolvedValue(new Response('report bytes',{headers:{'content-type':type,'content-disposition':`attachment; filename="report.${format}"`}}));vi.stubGlobal('fetch',fetch);
 const result=await exportProject('a'.repeat(32),format);expect(result.filename).toBe(`report.${format}`);expect(result.blob.size).toBe(12);expect(result.blob.type).toBe(type);expect(fetch.mock.calls[0][0]).toContain('a'.repeat(32));expect(fetch.mock.calls[0][1].headers).toEqual({'X-Workspace-ID':'a'.repeat(32)});
});
test('export error preserves backend explanation and makes no retry',async()=>{
 const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({detail:'No saved project analysis is available.'}),{status:409}));vi.stubGlobal('fetch',fetch);await expect(exportProject('legacy','pdf')).rejects.toThrow('No saved project analysis');expect(fetch).toHaveBeenCalledTimes(1);
});
test('a successful JSON or HTML response is not saved as a fake PDF',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('<html>error</html>',{headers:{'content-type':'text/html'}})));await expect(exportProject('legacy','pdf')).rejects.toThrow('requested report format');
});
