"""Regenerates sample_flowcharts/ (needs Pillow and reportlab). Usage: python scripts/create_flowchart_samples.py sample_flowcharts

Draws an order-processing flowchart as PNG, transparent PNG and PDF, with two deliberate flaws:
 - the "Payment valid?" decision has only a Yes branch
 - "Retry upload" loops onto itself with no exit
"""
from PIL import Image, ImageDraw, ImageFont
import math, sys
OUT = sys.argv[1]
def load_font(size):
    for candidate in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'C:/Windows/Fonts/arial.ttf', '/System/Library/Fonts/Helvetica.ttc'):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default(size)
f = load_font(17); fb = load_font(15)
NODES = {  # id: (cx, cy, w, h, shape, text)
 'N1': (300, 50, 150, 54, 'oval', 'Start'),
 'N2': (300, 150, 220, 60, 'rect', 'Receive customer order'),
 'N3': (300, 270, 190, 100, 'diamond', 'Payment valid?'),
 'N4': (300, 400, 220, 60, 'rect', 'Reserve stock'),
 'N5': (300, 510, 220, 60, 'rect', 'Generate shipping label'),
 'N6': (600, 510, 190, 60, 'rect', 'Retry upload'),
 'N7': (300, 620, 220, 60, 'rect', 'Ship order'),
 'N8': (300, 720, 150, 54, 'oval', 'End'),
}
EDGES = [('N1','N2',''),('N2','N3',''),('N3','N4','Yes'),('N4','N5',''),('N5','N7','Label OK'),('N5','N6','Upload fails'),('N6','N6b',''),('N7','N8','')]
def draw(path_png, bg, fg):
    im = Image.new('RGBA', (760, 790), bg); d = ImageDraw.Draw(im)
    for k,(x,y,w,h,s,t) in NODES.items():
        box=[x-w/2,y-h/2,x+w/2,y+h/2]
        if s=='oval': d.ellipse(box,outline=fg,width=3)
        elif s=='rect': d.rectangle(box,outline=fg,width=3)
        else: d.polygon([(x,y-h/2),(x+w/2,y),(x,y+h/2),(x-w/2,y)],outline=fg,width=3)
        tw=d.textlength(t,font=f); d.text((x-tw/2,y-10),t,fill=fg,font=f)
    def arrow(p,q,label=''):
        d.line([p,q],fill=fg,width=3); a=math.atan2(q[1]-p[1],q[0]-p[0])
        d.polygon([q,(q[0]-12*math.cos(a-.4),q[1]-12*math.sin(a-.4)),(q[0]-12*math.cos(a+.4),q[1]-12*math.sin(a+.4))],fill=fg)
        if label: d.text(((p[0]+q[0])/2+8,(p[1]+q[1])/2-10),label,fill=fg,font=fb)
    arrow((300,77),(300,120)); arrow((300,180),(300,220)); arrow((300,320),(300,370),'Yes')
    arrow((300,430),(300,480)); arrow((300,540),(300,590),'Label OK'); arrow((410,510),(505,510)); d.text((412,484),'Upload fails',fill=fg,font=fb)
    # Retry loop: N6 back into itself (no exit)
    d.line([(695,497),(742,497),(742,527),(702,527)],fill=fg,width=3); d.polygon([(695,527),(707,521),(707,533)],fill=fg)
    arrow((300,650),(300,693))
    im.save(path_png)
draw(OUT+'/order_flow.png',(255,255,255,255),(20,20,20,255))
draw(OUT+'/order_flow_transparent.png',(0,0,0,0),(20,20,20,255))
# vector PDF with real text
from reportlab.pdfgen import canvas
c=canvas.Canvas(OUT+'/order_flow.pdf',pagesize=(760,790)); c.setLineWidth(2); c.setFont('Helvetica',13)
H=790
for k,(x,y,w,h,s,t) in NODES.items():
    yy=H-y
    if s=='oval': c.ellipse(x-w/2,yy-h/2,x+w/2,yy+h/2)
    elif s=='rect': c.rect(x-w/2,yy-h/2,w,h)
    else:
        p=c.beginPath(); p.moveTo(x,yy+h/2); p.lineTo(x+w/2,yy); p.lineTo(x,yy-h/2); p.lineTo(x-w/2,yy); p.close(); c.drawPath(p)
    c.drawCentredString(x,yy-5,t)
for a,b in [((300,77),(300,120)),((300,180),(300,220)),((300,320),(300,370)),((300,430),(300,480)),((300,540),(300,590)),((410,510),(505,510)),((300,650),(300,693))]:
    c.line(a[0],H-a[1],b[0],H-b[1])
c.showPage(); c.save()
# bad inputs
Image.new('RGB',(800,600),(255,255,255)).save(OUT+'/blank.png')
open(OUT+'/corrupt.png','wb').write(open(OUT+'/order_flow.png','rb').read()[:900])
im=Image.new('RGB',(800,300),'white'); d=ImageDraw.Draw(im); d.text((30,120),'Quarterly sales report - notes only, no diagram',fill='black',font=f); im.save(OUT+'/not_a_flowchart.png')
open(OUT+'/fake.png','wb').write(b'MZ this is not an image')
print('made')
