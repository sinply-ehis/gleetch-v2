import { clamp } from '../../core/color.js';
import { lerpBuffer } from '../../core/blend.js';

function lumaAt(buf,i){ return buf[i]*0.3+buf[i+1]*0.59+buf[i+2]*0.11; }

// True ASCII — stylized dot version (user correction): not literal characters,
// larger stylized dots density-mapped (bigger/denser where dark), like ASCII
// density but rendered as dots of varying size, not garbled text.
export function trueAscii(buf,W,H,intensity,rng, params){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const dotColorMode=params?.dotMode ?? 'luma';
  const dotSize=params?.dotSize ?? 1.0;
  const full=new Uint8ClampedArray(buf.length);
  full.fill(255);
  // light paper
  for(let i=0;i<full.length;i+=4){ full[i]=248; full[i+1]=248; full[i+2]=245; full[i+3]=255; }
  const cell=Math.max(5, Math.round(9 - intensity*3)); // 9→6
  const maxR = cell*0.42 * dotSize;
  const minR = cell*0.08;
  for(let by=0; by<H; by+=cell){
    for(let bx=0; bx<W; bx+=cell){
      const bw=Math.min(cell,W-bx), bh=Math.min(cell,H-by);
      let lum=0,cnt=0, r=0,g=0,b=0;
      for(let y=0;y<bh;y++) for(let x=0;x<bw;x++){ const i=((by+y)*W+bx+x)*4; lum+=lumaAt(buf,i); r+=buf[i]; g+=buf[i+1]; b+=buf[i+2]; cnt++; }
      lum/=cnt; r/=cnt; g/=cnt; b/=cnt;
      const dark=(1 - lum/255);
      if(dark<0.06) continue; // near white = leave paper
      const radius= minR + dark*(maxR-minR);
      // stylized dot: soft edge falloff, slightly bigger than literal '.'
      const cx=bx+bw/2, cy=by+bh/2;
      let cr,cg,cb;
      if(dotColorMode==='mono'){ cr=cg=cb=20; }
      else if(dotColorMode==='color'){ cr=r; cg=g; cb=b; }
      else { // luma tint
        const t=dark; cr=r*t + 20*(1-t); cg=g*t+20*(1-t); cb=b*t+20*(1-t);
      }
      for(let y=0;y<bh;y++) for(let x=0;x<bw;x++){
        const px=bx+x, py=by+y;
        const d=Math.hypot(px-cx, py-cy);
        if(d<=radius){
          const fade= 1 - Math.pow(d/radius,2)*0.18; // soft
          const i=(py*W+px)*4;
          full[i]= clamp(cr*fade + 248*(1-fade),0,255);
          full[i+1]= clamp(cg*fade + 248*(1-fade),0,255);
          full[i+2]= clamp(cb*fade + 245*(1-fade),0,255);
        }
      }
    }
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export function blueprint(buf,W,H,intensity){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const full=new Uint8ClampedArray(buf.length);
  // blueprint blue ground
  for(let i=0;i<full.length;i+=4){ full[i]=11; full[i+1]=38; full[i+2]=92; full[i+3]=255; }
  const gray=new Float32Array(W*H);
  for(let i=0,p=0;i<buf.length;i+=4,p++) gray[p]=lumaAt(buf,i);
  for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++){
    const gx= gray[y*W+x+1]-gray[y*W+x-1], gy=gray[(y+1)*W+x]-gray[(y-1)*W+x];
    const mag=Math.sqrt(gx*gx+gy*gy);
    if(mag>18){
      const i=(y*W+x)*4;
      const a= clamp(mag/80,0,1);
      full[i]= clamp(11*(1-a)+ 160*a,0,255);
      full[i+1]= clamp(38*(1-a)+ 210*a,0,255);
      full[i+2]= clamp(92*(1-a)+ 255*a,0,255);
    }
  }
  // grid
  for(let y=0;y<H;y++) if(y%64===0) for(let x=0;x<W;x++){ const i=(y*W+x)*4; full[i]=clamp(full[i]+18,0,255); full[i+1]=clamp(full[i+1]+24,0,255); }
  for(let x=0;x<W;x++) if(x%64===0) for(let y=0;y<H;y++){ const i=(y*W+x)*4; full[i]=clamp(full[i]+18,0,255); full[i+1]=clamp(full[i+1]+24,0,255); }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export function woodcut(buf,W,H,intensity){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const full=new Uint8ClampedArray(buf.length);
  full.fill(255);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const i=(y*W+x)*4;
    const lum=lumaAt(buf,i)/255;
    // cross-hatch density
    const h1= (x%6===0) ? 1 : 0;
    const h2= (y%6===0) ? 1 : 0;
    const d= Math.floor((x+y)/6)%2;
    let ink=0;
    if(lum<0.2) ink=1;
    else if(lum<0.4) ink= h1||h2 ? 1 : 0;
    else if(lum<0.6) ink= h1 ? 1 : 0;
    else if(lum<0.78) ink= d && h1 ? 1 : 0;
    else ink=0;
    if(ink){ full[i]=0; full[i+1]=0; full[i+2]=0; } else { full[i]=255; full[i+1]=255; full[i+2]=255; }
    full[i+3]=255;
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export function voronoiMosaic2(buf,W,H,intensity,rng){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const seeds= 24 + Math.floor(rng()*24);
  const pts=[];
  for(let i=0;i<seeds;i++) pts.push([Math.floor(rng()*W), Math.floor(rng()*H)]);
  const full=new Uint8ClampedArray(buf.length);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    let best=0, bd=Infinity;
    for(let k=0;k<pts.length;k++){ const dx=x-pts[k][0], dy=y-pts[k][1]; const d=dx*dx+dy*dy; if(d<bd){bd=d; best=k;} }
    // color = average around seed
    const sx=pts[best][0], sy=pts[best][1];
    const si=(clamp(sy,0,H-1)*W+ clamp(sx,0,W-1))*4;
    const r=buf[si], g=buf[si+1], b=buf[si+2];
    const i=(y*W+x)*4;
    // edge darken
    let edge=false;
    for(let dy=-1;dy<=1&&!edge;dy++) for(let dx=-1;dx<=1;dx++){
      const nx=x+dx, ny=y+dy; if(nx<0||nx>=W||ny<0||ny>=H) continue;
      let b2=0,bd2=Infinity; for(let k=0;k<pts.length;k++){ const ddx=nx-pts[k][0], ddy=ny-pts[k][1]; const d=ddx*ddx+ddy*ddy; if(d<bd2){bd2=d; b2=k;}} if(b2!==best) edge=true;
    }
    if(edge){ full[i]=0; full[i+1]=0; full[i+2]=0; } else { full[i]=r; full[i+1]=g; full[i+2]=b; }
    full[i+3]=255;
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export function topographic(buf,W,H,intensity){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const full=new Uint8ClampedArray(buf.length);
  const levels= Math.max(6, Math.round(10 + intensity*8));
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const i=(y*W+x)*4;
    const lum=lumaAt(buf,i)/255;
    const band=Math.floor(lum*levels);
    const edge= Math.abs(lum*levels - band - 0.5) < 0.06;
    if(edge){ full[i]=30; full[i+1]=30; full[i+2]=30; }
    else { const v= Math.floor(band/levels*255); full[i]= 20 + v*0.12; full[i+1]= 60 + v*0.45; full[i+2]= 140 + v*0.35; }
    full[i+3]=255;
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export function circuitTrace(buf,W,H,intensity){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const full=new Uint8ClampedArray(buf.length);
  full.fill(8);
  for(let i=0;i<full.length;i+=4){ full[i]=8; full[i+1]=12; full[i+2]=16; }
  const gray=new Float32Array(W*H);
  for(let i=0,p=0;i<buf.length;i+=4,p++) gray[p]=lumaAt(buf,i);
  for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++){
    const gx=gray[y*W+x+1]-gray[y*W+x-1], gy=gray[(y+1)*W+x]-gray[(y-1)*W+x];
    const mag=Math.sqrt(gx*gx+gy*gy);
    if(mag>26){
      const i=(y*W+x)*4;
      full[i]=0; full[i+1]=229; full[i+2]=255; full[i+3]=255;
      // node every ~12 along edge
      if((x%12===0 && y%12===0) || mag>70){
        for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++){
          const nx=clamp(x+dx,0,W-1), ny=clamp(y+dy,0,H-1);
          if(Math.hypot(dx,dy)<=1.8){ const ni=(ny*W+nx)*4; full[ni]=255; full[ni+1]=255; full[ni+2]=180; }
        }
      }
    }
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export function constellation(buf,W,H,intensity, rng){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const full=new Uint8ClampedArray(buf.length);
  full.fill(0);
  for(let i=0;i<full.length;i+=4){ full[i]=2; full[i+1]=4; full[i+2]=12; full[i+3]=255; }
  const pts=[];
  for(let y=0;y<H;y+=4) for(let x=0;x<W;x+=4){
    const i=(y*W+x)*4;
    const lum=lumaAt(buf,i);
    if(lum> 140 + rng()*40) pts.push([x,y]);
    if(pts.length>220) break;
  }
  // draw stars
  for(const [x,y] of pts){
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
      const nx=clamp(x+dx,0,W-1), ny=clamp(y+dy,0,H-1);
      const i=(ny*W+nx)*4; full[i]=255; full[i+1]=255; full[i+2]=255;
    }
  }
  // connect nearest neighbors within threshold
  for(let a=0;a<pts.length;a++) {
    let best=-1, bd=Infinity;
    for(let b=0;b<pts.length;b++) if(a!==b){
      const dx=pts[a][0]-pts[b][0], dy=pts[a][1]-pts[b][1]; const d=dx*dx+dy*dy;
      if(d<bd && d < (W*H*0.015)) { bd=d; best=b; }
    }
    if(best!==-1){
      const [x0,y0]=pts[a], [x1,y1]=pts[best];
      const steps=Math.max(Math.abs(x1-x0), Math.abs(y1-y0));
      for(let s=0;s<=steps;s++){
        const t=steps? s/steps:0;
        const x=Math.round(x0*(1-t)+x1*t), y=Math.round(y0*(1-t)+y1*t);
        const i=(y*W+x)*4;
        full[i]= clamp(full[i]+ 120,0,255); full[i+1]= clamp(full[i+1]+160,0,255); full[i+2]=255;
      }
    }
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export function thermalCraft(buf,W,H,intensity){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const grad=[
    [0,0,90],[0,0,180],[0,160,220],[0,200,80],[240,240,0],[255,80,0],[255,255,255]
  ];
  const full=new Uint8ClampedArray(buf.length);
  for(let i=0;i<buf.length;i+=4){
    const n= lumaAt(buf,i)/255;
    const pos=n*(grad.length-1), lo=Math.floor(pos), hi=Math.min(grad.length-1, lo+1);
    const t=pos-lo;
    for(let c=0;c<3;c++) full[i+c]= grad[lo][c]*(1-t)+grad[hi][c]*t;
    full[i+3]=255;
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export const CRAFT_EFFECTS=[
  {id:'trueAscii', label:'TRUE ASCII', hint:'stylized dot-density, not garbled chars', category:'stylize', mediaTypes:['image','video'], fn: trueAscii, params:[
    {key:'dotMode', type:'select', label:'MODE', default:'luma', options:[{value:'luma',label:'Luma Tint'},{value:'color',label:'Full Color'},{value:'mono',label:'Mono'}]},
    {key:'dotSize', type:'range', label:'DOT SIZE', default:1.0, min:0.6, max:1.6, step:0.1},
  ]},
  {id:'blueprint', label:'BLUEPRINT', hint:'cyan linework on blueprint blue', category:'stylize', mediaTypes:['image','video'], fn: blueprint},
  {id:'woodcut', label:'WOODCUT', hint:'cross-hatch engraving density', category:'stylize', mediaTypes:['image','video'], fn: woodcut},
  {id:'voronoiMosaic2', label:'VORONOI MOSAIC', hint:'seed-shattered stained glass', category:'stylize', mediaTypes:['image','video'], realtimeSafe:false, fn: voronoiMosaic2},
  {id:'topographic', label:'TOPOGRAPHIC', hint:'contour elevation bands', category:'stylize', mediaTypes:['image','video'], fn: topographic},
  {id:'circuitTrace', label:'CIRCUIT TRACE', hint:'PCB traces + nodes from edges', category:'stylize', mediaTypes:['image','video'], fn: circuitTrace},
  {id:'constellation', label:'CONSTELLATION', hint:'star-map points + connections', category:'stylize', mediaTypes:['image','video'], fn: constellation},
  {id:'thermal', label:'THERMAL', hint:'infrared false-color heat map', category:'color-tone', mediaTypes:['image','video'], fn: thermalCraft},
];
