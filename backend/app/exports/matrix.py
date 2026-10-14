"""High-resolution print graphic from stated ratings, no inferred risk scores."""
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from app.exports.risks import ticks

FONT=Path(__file__).with_name('fonts')
COLORS={'critical':'#A33242','high':'#B86611','moderate':'#186C83','low':'#37734D'}


def matrix_png(payload):
    modes,points=payload
    image=Image.new('RGB',(2100,1370),'white');draw=ImageDraw.Draw(image)
    def font(size,bold=False):return ImageFont.truetype(str(FONT/('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')),size)
    navy='#182C42';muted='#4B5C6C';left,top,right,bottom=225,165,1930,1050
    draw.text((left,30),'Probability × Impact',font=font(48,True),fill=navy)
    # Neutral zones indicate axis intervals, never a computed severity classification.
    for i in range(5):
        y0=top+(bottom-top)*i/5;y1=top+(bottom-top)*(i+1)/5
        draw.rectangle((left,y0,right,y1),fill='#F0F6F7' if i%2==0 else '#F8FAFB')
    for p,label in ticks(modes[0],'probability'):
        x=left+p*(right-left);draw.line((x,top,x,bottom),fill='#D3DEE4',width=2)
        text='Moderate' if label=='Moderate' else label
        draw.text((x,bottom+28),text,font=font(34),fill=muted,anchor='mt')
    for p,label in ticks(modes[1],'impact'):
        y=bottom-p*(bottom-top);draw.line((left,y,right,y),fill='#D3DEE4',width=2)
        draw.text((left-22,y),label,font=font(34),fill=muted,anchor='rm')
    draw.line((left,top,left,bottom,right,bottom),fill=navy,width=3)
    draw.text(((left+right)/2,bottom+85),'Probability / Likelihood',font=font(38,True),fill=navy,anchor='mt')
    draw.text((left,top-48),'Impact',font=font(36,True),fill=navy)
    occupied=[]; placements=[]
    def overlaps(a,b):return a[0]<b[2]+8 and a[2]>b[0]-8 and a[1]<b[3]+8 and a[3]>b[1]-8
    true_points=[(left+x*(right-left),bottom-y*(bottom-top)) for _,x,y in points]
    for n,(risk,px,py) in enumerate(points):
        x,y=true_points[n];label=risk.source_id
        if len(label)>26:label=label[:25]+'…'
        tw=draw.textlength(label,font=font(36,True));width=tw+70;height=60
        choices=[]
        for radius in (0,70,140,210,280,350,420):
            for dx,dy in ((radius,-radius),(radius,radius),(-radius,-radius),(-radius,radius),(0,-radius),(0,radius),(radius,0),(-radius,0)):
                cx=max(left+width/2+8,min(right-width/2-8,x+dx));cy=max(top+height/2+8,min(bottom-height/2-8,y+dy))
                box=(cx-width/2,cy-height/2,cx+width/2,cy+height/2)
                if any(overlaps(box,b) for b in occupied):continue
                # Do not hide another source coordinate behind this label.
                penalty=sum(1 for i,(tx,ty) in enumerate(true_points) if box[0]-12<tx<box[2]+12 and box[1]-12<ty<box[3]+12)
                choices.append((penalty*1e8+(cx-x)**2+(cy-y)**2,cx,cy,box))
            if choices and min(c[0] for c in choices)<1e8:break
        if not choices:
            raise ValueError('Too many colliding labels for this risk graph. Reduce the report focus and try again.')
        _,cx,cy,box=min(choices,key=lambda c:c[0]);occupied.append(box)
        color=COLORS.get((risk.severity or '').lower(),'#617081')
        placements.append((x,y,cx,cy,box,label,color))
    for x,y,cx,cy,box,label,color in placements:
        draw.line((x,y,cx,cy),fill=color,width=3)
        draw.ellipse((x-9,y-9,x+9,y+9),fill=color)
    for x,y,cx,cy,box,label,color in placements:
        draw.rounded_rectangle(box,radius=10,fill='white',outline=color,width=3)
        draw.ellipse((box[0]+15,cy-10,box[0]+35,cy+10),fill=color)
        draw.text((box[0]+45,cy),label,font=font(36,True),fill=navy,anchor='lm')
    x=left
    for label,color in [('Critical',COLORS['critical']),('High',COLORS['high']),('Moderate',COLORS['moderate']),('Low',COLORS['low']),('Other / Not stated','#617081')]:
        draw.ellipse((x,1224,x+20,1244),fill=color);draw.text((x+32,1234),label,font=font(30),fill=muted,anchor='lm');x+=draw.textlength(label,font=font(30))+86
    draw.text((left,1290),'Leader lines retain exact source positions. Marker colour shows stated severity only.',font=font(28),fill=muted)
    buffer=BytesIO();image.save(buffer,'PNG',dpi=(300,300));return buffer.getvalue()
