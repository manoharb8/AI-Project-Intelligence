"""Portable PDF and Word renderers share the same evidence-preserving content."""
from io import BytesIO
from pathlib import Path
from threading import Lock
from xml.sax.saxutils import escape
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from app.exports.report import Report

FONT_DIR = Path(__file__).with_name('fonts')
FONT_LOCK = Lock()


def word_bytes(report: Report) -> bytes:
    document = Document()
    section = document.sections[0]
    section.page_width, section.page_height = Inches(8.27), Inches(11.69)
    section.top_margin = section.bottom_margin = Inches(.7)
    section.left_margin = section.right_margin = Inches(.8)
    for name in ('Normal','Title','Subtitle','Heading 1','Heading 2','Heading 3','Quote','Caption'):
        style = document.styles[name]
        style.font.name = 'Calibri'
        style.font.color.rgb = RGBColor.from_string('182C42') if name.startswith('Heading') else RGBColor.from_string('18202C')
    document.styles['Normal'].font.size = Pt(10)
    document.styles['Normal'].paragraph_format.space_after = Pt(6)
    document.styles['Normal'].paragraph_format.line_spacing = 1.12
    # Do not inherit decorative borders from an installed python-docx template.
    for style in document.styles:
        for border in list(style.element.iter(qn('w:pBdr'))):
            border.getparent().remove(border)
    document.styles['Title'].font.size = Pt(25)
    document.styles['Title'].font.bold = True
    document.styles['Subtitle'].font.italic = False
    document.styles['Caption'].font.bold = False
    document.styles['Caption'].font.size = Pt(8.5)
    document.styles['Caption'].paragraph_format.keep_with_next = True
    document.styles['Heading 1'].font.size = Pt(17)
    document.styles['Heading 2'].font.size = Pt(13)
    document.styles['Quote'].font.italic = False
    document.styles['Quote'].paragraph_format.left_indent = Inches(.16)
    mapping = {'title':'Title','subtitle':'Subtitle','heading':'Heading 1','subheading':'Heading 2','item':'Heading 3','quote':'Quote','caption':'Caption'}
    for block in report.blocks:
        paragraph = document.add_paragraph(block.text, mapping.get(block.kind,'Normal'))
        # Long exact quotations may span pages; don't force whole entries together.
        paragraph.paragraph_format.widow_control = True
        if block.kind in ('quote','body','note','caption'):
            paragraph.paragraph_format.keep_together = False
        if block.kind == 'note':
            for run in paragraph.runs:
                run.font.size = Pt(9)
    footer = section.footer.paragraphs[0]
    footer.add_run('Project evidence report  |  ')
    field = OxmlElement('w:fldSimple'); field.set(qn('w:instr'),'PAGE'); footer._p.append(field)
    document.core_properties.title = f'{report.workspace} — Project evidence report'
    document.core_properties.subject = 'Saved evidence-grounded project results'
    document.core_properties.author = 'Project Intelligence & Risk Advisor'
    buffer = BytesIO(); document.save(buffer); return buffer.getvalue()


def pdf_bytes(report: Report) -> bytes:
    with FONT_LOCK:
        if 'ProjectReport' not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont('ProjectReport', str(FONT_DIR / 'DejaVuSans.ttf')))
            pdfmetrics.registerFont(TTFont('ProjectReportBold', str(FONT_DIR / 'DejaVuSans-Bold.ttf')))
    regular = pdfmetrics.getFont('ProjectReport').face.charToGlyph
    bold = pdfmetrics.getFont('ProjectReportBold').face.charToGlyph
    for block in report.blocks:
        chars = bold if block.kind in ('title','heading','subheading','item') else regular
        if any(ord(char) not in chars for char in block.text if not char.isspace()):
            raise ValueError('PDF cannot render one or more source characters with the bundled font. Download Word to preserve the original text.')
    buffer = BytesIO()
    pdf = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=48, leftMargin=48, topMargin=44, bottomMargin=46,
                           title=f'{report.workspace} — Project evidence report', author='Project Intelligence & Risk Advisor')
    normal = ParagraphStyle('Body', fontName='ProjectReport', fontSize=9, leading=13, spaceAfter=6, textColor=colors.HexColor('#18202C'), splitLongWords=True)
    styles = {'body':normal,'note':ParagraphStyle('Note', parent=normal,fontSize=8,leading=11,textColor=colors.HexColor('#485568')),
              'caption':ParagraphStyle('Caption',parent=normal,fontSize=7.5,leading=10,textColor=colors.HexColor('#485568')),
              'quote':ParagraphStyle('Quotation',parent=normal,leftIndent=10,borderPadding=5,backColor=colors.HexColor('#F4F6F8'),spaceBefore=3,spaceAfter=8),
              'title':ParagraphStyle('Title',parent=normal,fontName='ProjectReportBold',fontSize=22,leading=28,spaceAfter=12,keepWithNext=True),
              'subtitle':ParagraphStyle('Subtitle',parent=normal,fontSize=14,leading=18,spaceAfter=18,keepWithNext=True)}
    for kind,size in [('heading',16),('subheading',11),('item',9)]:
        styles[kind]=ParagraphStyle(kind,parent=normal,fontName='ProjectReportBold',fontSize=size,leading=size+5,spaceBefore=16 if kind=='heading' else 8,spaceAfter=6,keepWithNext=True)
    story=[]
    for block in report.blocks:
        # Escape source HTML/XML, preserve literal line breaks. Never truncate evidence.
        story.append(Paragraph(escape(block.text).replace('\n','<br/>'), styles[block.kind]))
    def footer(canvas, doc):
        canvas.saveState(); canvas.setFont('ProjectReport',8); canvas.setFillColor(colors.HexColor('#485568'))
        canvas.drawString(48,25,'Project evidence report'); canvas.drawRightString(A4[0]-48,25,f'Page {doc.page}'); canvas.restoreState()
    pdf.build(story,onFirstPage=footer,onLaterPages=footer)
    return buffer.getvalue()
