"""태양계 천체 11종을 정사영 구체로 렌더링해 256px WebP(투명 배경)로 만든다.
원본: NASA 3D Resources(명왕성·금성, 퍼블릭 도메인), Solar System Scope 2K 텍스처(그 외, CC BY 4.0)"""
import numpy as np, sys, os
from PIL import Image, ImageFilter, ImageEnhance
T=sys.argv[1]; OUT=sys.argv[2]; S=256; SS=2  # 2배로 그려 줄임(안티앨리어싱)
N=S*SS
def tex(p): return np.asarray(Image.open(p).convert('RGB'),dtype=np.float32)/255
def sphere(img, lon0=0.0, tilt=0.0, light=(-0.55,-0.45,0.70), emissive=False, R=1.0, clouds=None, atm=None):
    H,W,_=img.shape
    y,x=np.mgrid[0:N,0:N]; u=(x+.5)/N*2-1; v=(y+.5)/N*2-1
    u/=R; v/=R
    rr=u*u+v*v; m=rr<=1
    z=np.sqrt(np.clip(1-rr,0,1))
    # 기울기(축) 회전: x축 기준
    ct,st=np.cos(tilt),np.sin(tilt)
    X=u; Y=-v*ct - z*st; Z=-v*(-st)*-1 + z*ct
    Y=-v*ct+z*st; Z=v*st+z*ct
    lat=np.arcsin(np.clip(Y,-1,1)); lon=np.arctan2(X,Z)+lon0
    tx=((lon/(2*np.pi)+.5)%1)*(W-1); ty=(.5-lat/np.pi)*(H-1)
    col=img[ty.astype(int),tx.astype(int)]
    if clouds is not None:
        ch,cw,_=clouds.shape;cc=clouds[(ty/(H-1)*(ch-1)).astype(int),(tx/(W-1)*(cw-1)).astype(int)].mean(axis=2,keepdims=True)
        col=col*(1-cc*.85)+cc*.85
    L=np.array(light);L=L/np.linalg.norm(L)
    nx,ny,nz=u,-v,z
    if emissive:
        shade=(0.62+0.38*z**0.5)[...,None]
        col=np.clip(col*1.15*shade+0.04,0,1)
    else:
        lam=np.clip(nx*L[0]+ny*(-L[1])+nz*L[2],0,1)
        shade=(0.13+0.92*lam**0.9)[...,None]
        col=col*shade
        rim=(1-z)**3
        if atm is not None: col=col+np.array(atm)*rim[...,None]*0.9*(0.35+lam[...,None])
    a=np.clip((1-np.sqrt(rr))*N*R/1.5,0,1)*m
    return np.dstack([np.clip(col,0,1),a])
def down(arr): 
    im=Image.fromarray((arr*255).astype(np.uint8),'RGBA');return im.resize((S,S),Image.LANCZOS)
def save(im,name): im.save(os.path.join(OUT,name+'.webp'),'WEBP',quality=86,method=6); print(name,os.path.getsize(os.path.join(OUT,name+'.webp')))
P=lambda f:os.path.join(T,f)
SSS=lambda f:P('ss/public/textures/'+f)
NA=lambda f:P('n3d/Images and Textures/'+f)
# 1 명왕성: 하트(톰보 지역)가 보이게
save(down(sphere(tex(NA('Pluto/Pluto.jpg')),lon0=4.32,tilt=0.2)),'01-pluto')
# 2 달: 앞면(바다)
save(down(sphere(tex(SSS('2k_moon.jpg')),lon0=0.0,tilt=0.05)),'02-moon')
# 3 수성
save(down(sphere(tex(SSS('2k_mercury.jpg')),lon0=1.2,tilt=0.1)),'03-mercury')
# 4 화성: 마리네리스 협곡 쪽
save(down(sphere(tex(SSS('2k_mars.jpg')),lon0=-1.3,tilt=0.25,atm=(0.9,0.5,0.35))),'04-mars')
# 5 금성: 레이더 지도를 크림색 구름처럼 부드럽게
v=Image.open(NA('Venus/Venus.jpg')).convert('RGB').filter(ImageFilter.GaussianBlur(9))
v=ImageEnhance.Contrast(v).enhance(0.55);va=np.asarray(v,dtype=np.float32)/255
lum=va.mean(axis=2,keepdims=True);cream=np.array([0.96,0.84,0.55]);va=np.clip(cream*(0.72+0.5*(lum-lum.mean()))+0.04,0,1)
yy=np.linspace(0,np.pi*6,va.shape[0])[:,None,None];va=np.clip(va*(0.96+0.04*np.sin(yy)),0,1)
save(down(sphere(va,lon0=0.6,tilt=0.1,atm=(1.0,0.9,0.6))),'05-venus')
# 6 지구: 구름 + 대기
save(down(sphere(tex(SSS('2k_earth_daymap.jpg')),lon0=2.3,tilt=0.35,clouds=tex(SSS('2k_earth_clouds.jpg')),atm=(0.35,0.6,1.0))),'06-earth')
# 7 해왕성(대암점 보이게)
save(down(sphere(tex(SSS('2k_neptune.jpg')),lon0=0.0,tilt=0.15,atm=(0.4,0.55,1.0))),'07-neptune')
# 8 천왕성: 밋밋해서 약간의 줄무늬 대비
ur=tex(SSS('2k_uranus.jpg'));ur=np.clip((ur-ur.mean())*2.2+ur.mean(),0,1)
save(down(sphere(ur,lon0=0.0,tilt=0.5,atm=(0.6,0.95,1.0))),'08-uranus')
# 10 목성: 대적점
save(down(sphere(tex(SSS('2k_jupiter.jpg')),lon0=5.9,tilt=-0.12)),'10-jupiter')
# 11 태양
save(down(sphere(tex(SSS('2k_sun.jpg')),emissive=True)),'11-sun')
# 9 토성 + 고리 (고리 바깥 반지름 = 원 반지름)
body=0.46; ring_in,ring_out=1.20,2.17  # 토성 반지름 단위
sat=sphere(tex(SSS('2k_saturn.jpg')),lon0=0.0,tilt=0.47,R=body)
ringtex=np.asarray(Image.open(SSS('2k_saturn_ring_alpha.png')).convert('RGBA'),dtype=np.float32)/255
prof=ringtex.mean(axis=0)  # 반지름 방향 색·투명도
y,x=np.mgrid[0:N,0:N]; u=(x+.5)/N*2-1; v=(y+.5)/N*2-1
inc=0.42; rot=-0.32  # 고리 기울기, 화면 회전
cu,su=np.cos(rot),np.sin(rot); U=u*cu+v*su; V=-u*su+v*cu
rr=np.sqrt(U**2+(V/np.sin(inc))**2)/body  # 토성 반지름 단위
t=(rr-ring_in)/(ring_out-ring_in); inr=(t>=0)&(t<=1)
idx=np.clip((t*(prof.shape[0]-1)).astype(int),0,prof.shape[0]-1)
rc=np.clip(prof[idx,:3]*1.35*np.array([1.08,1.0,0.86])+0.06,0,1); ra=np.clip(prof[idx,3]*1.2,0,1)*inr
# 토성 그림자가 고리 뒤쪽에 드리움 / 고리 앞쪽은 행성을 가림
front=V>0
# 뒤쪽 고리
out=np.zeros((N,N,4),np.float32)
back=inr&~front
out[...,:3]=rc*ra[...,None]*back[...,None]; out[...,3]=ra*back
# 행성 덮기
sa=sat[...,3:4]; out[...,:3]=sat[...,:3]*sa+out[...,:3]*(1-sa); out[...,3]=sa[...,0]+out[...,3]*(1-sa[...,0])
# 앞쪽 고리(행성 위) — 행성의 고리 그림자
fa=(ra*front)[...,None]; out[...,:3]=rc*fa+out[...,:3]*(1-fa); out[...,3]=fa[...,0]+out[...,3]*(1-fa[...,0])
save(down(np.clip(out,0,1)),'09-saturn')
