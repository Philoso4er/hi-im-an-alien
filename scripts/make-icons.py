# Regenerates PWA icons from the peek-wave GIF. Run from the repo root: python3 scripts/make-icons.py
from PIL import Image, ImageDraw, ImageFilter
import math
src=Image.open('public/aliens/peek-wave.gif'); src.seek(0); a=src.convert('RGBA')
# crop: head + waving hand, alien peeks from right edge
crop=a.crop((40,80,222,262))  # 182x182
def bg(size):
    im=Image.new('RGBA',(size,size),(5,6,15,255))
    d=ImageDraw.Draw(im)
    cx,cy=size*0.45,size*0.5
    for r in range(int(size*0.75),0,-2):
        t=r/(size*0.75)
        c=(int(8+30*(1-t)),int(10+60*(1-t)**2),int(25+70*(1-t)**2),255)
        d.ellipse((cx-r,cy-r,cx+r,cy+r),fill=c)
    # stars
    import random; random.seed(4)
    for _ in range(int(size/6)):
        x,y=random.random()*size,random.random()*size
        s=max(1,size/260)*random.choice([0.6,1,1.4])
        d.ellipse((x-s,y-s,x+s,y+s),fill=(200,230,255,random.randint(90,220)))
    return im
def make(size, scale, glow=True):
    im=bg(size)
    s=int(size*scale)
    al=crop.resize((s,s),Image.LANCZOS)
    ox=size-s
    oy=(size-s)//2 if scale>0.9 else size-s
    if glow:
        g=Image.new('RGBA',(size,size),(0,0,0,0))
        mask=al.split()[3].filter(ImageFilter.GaussianBlur(size/40))
        col=Image.new('RGBA',(s,s),(34,211,238,170))
        g.paste(col,(ox,oy),mask)
        im=Image.alpha_composite(im,g.filter(ImageFilter.GaussianBlur(size/50)))
    layer=Image.new('RGBA',(size,size),(0,0,0,0)); layer.paste(al,(ox,oy),al)
    return Image.alpha_composite(im,layer)
for n in [48,72,96,128,144,152,192,256,384,512]:
    make(n,1.0).convert('RGB').save(f'public/icons/icon-{n}.png',optimize=True)
for n in [192,512]:
    make(n,0.8).convert('RGB').save(f'public/icons/maskable-{n}.png',optimize=True)
make(180,1.0).convert('RGB').save('public/apple-touch-icon.png',optimize=True)
make(64,1.0).convert('RGB').save('public/favicon.png',optimize=True)
make(32,1.0).save('public/favicon.ico',sizes=[(16,16),(32,32)])
