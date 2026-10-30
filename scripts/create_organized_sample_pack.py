"""Generate three organized, valid sample-document collections without touching runtime data."""
from __future__ import annotations
import csv, io, struct
from pathlib import Path
from docx import Document
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'sample_documents'
CORE, MEET, FLOW = [PACK / name for name in ('01_Sample_Documents', '02_Meeting_Notes', '03_Flowcharts')]
for folder in (CORE, MEET, FLOW): folder.mkdir(parents=True, exist_ok=True)
PROJECT = 'Atlas Citizen Services Portal'
PID = 'ATL-26'


def make_doc(path, title, paragraphs, tables=()):
    doc = Document(); doc.core_properties.title = title
    doc.add_heading(title, 0)
    doc.add_paragraph(f'Project: {PROJECT} ({PID}) | Snapshot date: 2026-10-29')
    for heading, paragraph in paragraphs:
        if heading: doc.add_heading(heading, 1)
        doc.add_paragraph(paragraph)
    for headers, rows in tables:
        table = doc.add_table(rows=1, cols=len(headers)); table.style = 'Light Shading Accent 1'
        for c, v in zip(table.rows[0].cells, headers): c.text = v
        for row in rows:
            for c, v in zip(table.add_row().cells, row): c.text = v
    doc.save(path)


def make_text_pdf(path, title, lines):
    c = canvas.Canvas(str(path), pagesize=letter); w, h = letter; y = h - 58
    c.setTitle(title); c.setFont('Helvetica-Bold', 16); c.drawString(54, y, title); y -= 30
    c.setFont('Helvetica', 10)
    for line in lines:
        for offset in range(0, len(line), 95):
            if y < 58: c.showPage(); y = h - 58; c.setFont('Helvetica', 10)
            c.drawString(54, y, line[offset:offset+95]); y -= 14
        y -= 4
    c.save()

proposal = [
 ('Executive summary', 'Deliver a responsive resident portal for submitting service requests and tracking status.'),
 ('Scope', 'Resident sign-in, request creation, tracking, notifications, staff triage, audit history, and accessibility review. Payment processing is out of scope.'),
 ('Milestones and ownership', 'Baseline beta: 2026-11-13; no revised delivery date is approved. Sponsor Maya Chen; product owner Amina Patel; engineering lead Daniel Reed; QA lead Priya Nair; UX review Elena Torres.'),
 ('Budget', 'Approved delivery ceiling INR 9,50,000. Latest forecast INR 8,90,000; contingency assumptions still need review.'),
 ('Dependencies', 'Security approval for staging API credentials was requested 2026-10-20 and remains pending as of 2026-10-29. Staging end-to-end integration is blocked.'),
 ('Release gates', 'At least 80% automated test coverage, accessibility sign-off, API integration, and a rehearsed rollback before release approval.'),
 ('Evidence gap', 'The owner of the performance/load-test script and the peak-load target are not recorded. Do not assume these are assigned or agreed.')]
make_doc(CORE/'Project_Proposal.docx', 'Project Proposal — Atlas Citizen Services Portal', proposal)
make_text_pdf(CORE/'Requirements.pdf', 'Requirements Specification — ATL-26', [
 'Project ATL-26 — Snapshot 2026-10-29', 'REQ-01: Residents can create a request and receive a tracking ID.',
 'REQ-02: Residents can view request status and notification history.', 'REQ-03: Staff can triage requests; every status change creates an audit event.',
 'REQ-04: The release candidate must achieve at least 80% automated test coverage.',
 'REQ-05: The main resident flow must pass keyboard and screen-reader review.',
 'REQ-06: Staging deployment must demonstrate a rollback before release approval.',
 'Dependency: Security approval for staging API credentials remains pending; end-to-end integration is blocked.',
 'Open clarification: performance test ownership, peak-load target, and response-time baseline are not recorded.' ])
risks = [
 ['R-01','Staging credentials pending','High','High','High','Open','Daniel Reed','Requested 2026-10-20; still pending 2026-10-29.','Escalate to Security by 2026-10-30.'],
 ['R-02','Automated coverage below gate','Medium','High','High','Open','Priya Nair','Current coverage 54%; gate is 80%.','Add service-path tests and publish report by 2026-11-06.'],
 ['R-03','Accessibility sign-off pending','Medium','Medium','Medium','Open','Elena Torres','Keyboard/screen-reader review is not signed off.','Complete review by 2026-11-04.'],
 ['R-04','Rollback not rehearsed','Low','High','Medium','Open','Daniel Reed','Steps are documented but no rehearsal evidence is stored.','Rehearse rollback by 2026-11-09.'],
 ['R-05','Performance test owner missing','Medium','Medium','Medium','Open','Not recorded','Owner and peak-load target are missing from current records.','Assign an owner and confirm the target by 2026-10-31.'],
 ['R-06','Budget contingency needs review','Low','Medium','Low','Open','Amina Patel','Forecast INR 8,90,000 vs ceiling INR 9,50,000.','Review assumptions before release planning.']]
with (CORE/'Risk_Register.csv').open('w', newline='', encoding='utf-8-sig') as f:
    writer = csv.writer(f); writer.writerow(['Risk_ID','Risk_Title','Probability','Impact','Severity','Status','Owner','Evidence','Mitigation']); writer.writerows(risks)
(CORE/'Sprint_Update.txt').write_text('''Atlas Citizen Services Portal — Sprint Update
Project: ATL-26 | Snapshot: 2026-10-29

Resident request creation and staff triage are implemented in development. Staging API integration is blocked because Security approval for staging credentials is still pending. The request was logged on 2026-10-20; no approval is recorded as of this update.

Automated test coverage is 54%; the release gate is 80%. Priya Nair owns the improvement plan and targets 2026-11-06. Accessibility review is pending with Elena Torres. Rollback steps are documented but no rehearsal has run; Daniel Reed owns the rehearsal by 2026-11-09.

The performance/load-test script has no recorded owner and the expected peak-load target is unspecified. Security response is requested by 2026-10-30; product owner to assign the load-test owner and confirm target by 2026-10-31.

Baseline beta remains 2026-11-13. No revised delivery date is approved, so the baseline is not a confirmed forecast.
''', encoding='utf-8')
tasks = [
 ['T-01','Confirm staging credentials','Daniel Reed','Blocked','2026-10-30','Security approval','R-01'],
 ['T-02','Complete API end-to-end integration','Daniel Reed','Blocked','2026-11-03','T-01','R-01'],
 ['T-03','Raise automated coverage to 80%','Priya Nair','In progress','2026-11-06','Service-path tests','R-02'],
 ['T-04','Complete accessibility review','Elena Torres','In progress','2026-11-04','Resident request flow','R-03'],
 ['T-05','Assign load-test owner and target','Not recorded','Unassigned','2026-10-31','Product owner decision','R-05'],
 ['T-06','Rehearse staging rollback','Daniel Reed','Not started','2026-11-09','Staging environment','R-04'],
 ['T-07','Review budget and contingency','Amina Patel','In progress','2026-11-02','Latest estimate','R-06'],
 ['T-08','Prepare beta candidate','Maya Chen','Not started','2026-11-13','T-02; T-03; T-04; T-06','R-01; R-02; R-03; R-04']]
with (CORE/'Task_List.csv').open('w', newline='', encoding='utf-8-sig') as f:
    writer=csv.writer(f); writer.writerow(['Task_ID','Task','Owner','Status','Due_Date','Dependency','Linked_Risk_IDs']); writer.writerows(tasks)
make_doc(CORE/'Architecture_Notes.docx', 'Architecture Notes — ATL-26', [
 ('Components','Resident UI is React/TypeScript. The API is FastAPI. PostgreSQL stores request/audit data; a background worker sends email notifications.'),
 ('Request path','Resident submits form → API validates fields → request and audit event are stored atomically → tracking ID is returned → notification worker sends status update.'),
 ('Environments','Development uses synthetic records. Staging secrets must be stored in the secret manager and never committed to source control.'),
 ('Integration status','Staging credentials remain pending, so end-to-end integration is blocked. Coverage is 54% against the 80% release gate.'),
 ('Missing evidence','The load-test owner, peak-load target, measured staging response-time baseline, and rollback rehearsal result are not recorded.')])

# Chronological notes: each meeting carries forward unresolved items without inventing closure.
meeting_data = [
 ('Meeting_Notes_01.docx','Initial Project Review — 2026-10-07',[
  ('Purpose','Agree the ATL-26 scope, ownership, and baseline beta target of 2026-11-13.'),
  ('Decisions','REST API and React web client selected. Resident request creation, tracking, staff triage, notifications, and audit history are in scope.'),
  ('Owners','Maya Chen sponsor; Amina Patel product owner; Daniel Reed engineering lead; Priya Nair QA; Elena Torres UX review.'),
  ('New risk R-01','Security approval is required before staging API integration. The credential request has not yet been submitted in this meeting record; Daniel Reed will submit it.'),
  ('Actions','Daniel Reed: submit staging credential request by 2026-10-20. Product owner: confirm load-test target and owner before test planning.')]),
 ('Meeting_Notes_02.docx','Progress Review and Blockers — 2026-10-21',[
  ('Status','Development request creation and staff triage are working; the staging API integration cannot proceed.'),
  ('Existing risk R-01 update','Credential approval was requested 2026-10-20 and is still pending. This is a continuation of R-01, not a new risk.'),
  ('New risk R-02','Automated test coverage is 54%, below the 80% release gate. Priya Nair owns the improvement plan due 2026-11-06.'),
  ('New risk R-03','Accessibility sign-off is pending with Elena Torres; target 2026-11-04.'),
  ('Actions','Daniel Reed to follow up with Security by 2026-10-30. Product owner to assign load-test ownership and confirm peak-load target; owner remains unrecorded at this meeting.')]),
 ('Meeting_Notes_03.docx','Readiness Review — 2026-10-27',[
  ('Current readiness','Staging credentials remain pending; R-01 is unresolved. Test coverage remains 54% against the 80% gate; R-02 is unresolved.'),
  ('Existing risk updates','Accessibility review is not signed off (R-03). Rollback instructions exist but the rehearsal has not run (R-04).'),
  ('New risk R-05','The performance/load-test script still has no recorded owner and the peak-load target is missing.'),
  ('Delivery outlook','Baseline beta remains 2026-11-13; no revised delivery date has been approved. The baseline is not a confirmed forecast.'),
  ('Decisions and actions','Do not approve release until the API integration, test coverage, accessibility review, and rollback gates are evidenced. Amina Patel to assign test ownership and confirm the load target by 2026-10-31.')])]
for filename, title, entries in meeting_data: make_doc(MEET/filename, title, entries)

# Clear, vector-like image examples. The broken example intentionally has a one-way decision and a self-loop.
def font(size, bold=False):
    paths = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
             'C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf']
    for name in paths:
        if Path(name).exists(): return ImageFont.truetype(name, size)
    return ImageFont.load_default()

def flow_image(title, broken=False):
    im=Image.new('RGB',(1200,820),'#f8fbff'); d=ImageDraw.Draw(im)
    d.text((40,20),title,font=font(29,True),fill='#15324f')
    def label_center(box, text, size=21, color='#183653'):
        x1,y1,x2,y2=box; f=font(size,True); bb=d.textbbox((0,0),text,font=f)
        d.text(((x1+x2-(bb[2]-bb[0]))/2,(y1+y2-(bb[3]-bb[1]))/2-3),text,font=f,fill=color)
    start=(410,80,790,135); validate=(330,185,870,255); save=(330,475,870,545); done=(410,675,790,735)
    d.rounded_rectangle(start,radius=25,fill='#e5f8fc',outline='#14839a',width=4); label_center(start,'Start: Submit request')
    d.rounded_rectangle(validate,radius=14,fill='#e5f8fc',outline='#14839a',width=4); label_center(validate,'Validate required fields')
    # The decision shape is a real diamond, not a labelled rectangle.
    diamond=[(600,290),(790,365),(600,440),(410,365)]
    d.polygon(diamond,fill='#fff4d7',outline='#bd8b24',width=4); label_center((440,335,760,395),'Fields valid?',19)
    d.rounded_rectangle(save,radius=14,fill='#e5f8fc',outline='#14839a',width=4); label_center(save,'Save request')
    d.rounded_rectangle(done,radius=25,fill='#e5f8fc',outline='#14839a',width=4); label_center(done,'End: Show tracking ID')
    def arrow(points, color='#14839a', width=4):
        d.line(points,fill=color,width=width,joint='curve')
        x0,y0=points[-2]; x1,y1=points[-1]
        if abs(x1-x0)>abs(y1-y0):
            pts=[(x1-12,y1-8),(x1-12,y1+8),(x1,y1)] if x1>x0 else [(x1+12,y1-8),(x1+12,y1+8),(x1,y1)]
        else:
            pts=[(x1-8,y1-12),(x1+8,y1-12),(x1,y1)] if y1>y0 else [(x1-8,y1+12),(x1+8,y1+12),(x1,y1)]
        d.polygon(pts,fill=color)
    arrow([(600,135),(600,185)]); arrow([(600,255),(600,290)])
    if not broken:
        arrow([(600,440),(600,475)]); d.text((615,445),'Yes',font=font(18,True),fill='#147d92')
        arrow([(600,545),(600,675)])
        revise=(850,320,1140,390); edit=(850,465,1140,535)
        d.rounded_rectangle(revise,radius=12,fill='#eaf6ea',outline='#38814c',width=4); label_center(revise,'Show validation errors',17)
        d.rounded_rectangle(edit,radius=12,fill='#eaf6ea',outline='#38814c',width=4); label_center(edit,'Edit request',18)
        arrow([(790,365),(850,355)]); d.text((800,330),'No',font=font(18,True),fill='#38814c')
        arrow([(995,390),(995,465)])
        arrow([(1140,500),(1170,500),(1170,220),(870,220)],'#38814c',4)
        d.text((895,555),'No branch retries via validation',font=font(15),fill='#38814c')
    else:
        # The missing No edge is intentional. A separate retry action also has a self-loop with no exit.
        arrow([(600,440),(600,475)]); d.text((615,445),'Yes',font=font(18,True),fill='#147d92')
        arrow([(600,545),(600,675)])
        retry=(900,500,1135,565)
        d.rounded_rectangle(retry,radius=10,fill='#fff0ef',outline='#c0394b',width=4); label_center(retry,'Retry upload',19,'#8f2331')
        arrow([(1135,532),(1170,532),(1170,595),(900,595),(900,565)],'#c0394b',5)
        d.text((815,420),'Missing No branch',font=font(18,True),fill='#a5263a')
        d.text((835,620),'Self-loop has no exit',font=font(18,True),fill='#a5263a')
    return im

valid = flow_image('Valid resident request flow')
broken = flow_image('Flowchart with intentional logic issues', True)
valid.save(FLOW/'valid_flowchart.png')
broken.save(FLOW/'logic_issues_flowchart.jpg', quality=92)
valid.save(FLOW/'valid_flowchart.webp', quality=90)
# Two-page PDF for page-by-page PDF analysis.
pdf_path = FLOW/'flowchart_examples_multipage.pdf'
c=canvas.Canvas(str(pdf_path),pagesize=letter); w,h=letter
for im,title in [(valid,'Page 1 — Normal flow'),(broken,'Page 2 — Intentional logic issues')]:
    c.setTitle('ATL-26 Flowchart Examples')
    c.setFont('Helvetica-Bold',14); c.drawString(42,h-36,title)
    buff=io.BytesIO(); im.save(buff,format='PNG'); buff.seek(0)
    c.drawImage(ImageReader(buff),30,90,width=w-60,height=h-150,preserveAspectRatio=True,anchor='c',mask='auto')
    c.showPage()
c.save()

# Minimal valid PSD v1: raw planar RGB merged composite with readable text.
psd = Image.new('RGB',(1200,760),'#f8fbff'); d=ImageDraw.Draw(psd)
d.text((50,50),'ATL-26 REQUEST FLOW',font=font(42,True),fill='#183653')
d.rounded_rectangle((170,170,1030,300),radius=22,fill='#e5f8fc',outline='#14839a',width=5)
d.text((250,215),'STAGING API CREDENTIALS PENDING',font=font(29,True),fill='#183653')
d.rounded_rectangle((170,380,1030,510),radius=22,fill='#fff0e8',outline='#b85625',width=5)
d.text((235,425),'END-TO-END INTEGRATION BLOCKED',font=font(29,True),fill='#7a3216')
channels=psd.split(); h,w=psd.height,psd.width
header=b'8BPS'+struct.pack('>H',1)+bytes(6)+struct.pack('>HIIHH',3,h,w,8,3)
sections=struct.pack('>III',0,0,0)
composite=b'\x00\x00'+b''.join(ch.tobytes() for ch in channels)
(CORE/'Architecture_Flow.psd').write_bytes(header+sections+composite)

(CORE/'README.txt').write_text('Optional PSD sample: Architecture_Flow.psd is a genuine PSD v1 merged-composite file with legible labels. The application extracts the composite and runs Tesseract OCR. Install Tesseract OCR on Windows to enable PSD text indexing.\n',encoding='utf-8')
# Pack README is maintained separately and is not placed inside the upload folder.
(CORE/'README.txt').unlink(missing_ok=True)
print('Organized sample pack created:')
for folder in (CORE,MEET,FLOW):
    print(f'  {folder.relative_to(ROOT)}: {len([x for x in folder.iterdir() if x.is_file()])} files')
