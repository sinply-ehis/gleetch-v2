import { clamp } from '../../core/color.js';
import { lerpBuffer } from '../../core/blend.js';

// Pixel sort v2 — banded threshold sort, distinct params from original pixelSort
export function pixelSort2(buf,W,H,intensity,channel,rng){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const full=new Uint8ClampedArray(buf);
  const thresh= 90 + rng()*80;
  const vertical = rng()<0.5;
  const bands = 3 + Math.floor(rng()*4);
  const bandH = Math.floor(H / bands);
  for(let b=0;b<bands;b++){
    const y0=b*bandH, y1=b===bands-1?H:y0+bandH;
    if(!vertical){
      for(let y=y0;y<y1;y++){
        // collect active run per row within band
        const row=[]; 
        for(let x=0;x<W;x++){ const i=(y*W+x)*4; const v=channel==='r'?buf[i]:channel==='g'?buf[i+1]:channel==='b'?buf[i+2]:buf[i]*0.3+buf[i+1]*0.59+buf[i+2]*0.11; if(v>thresh) row.push([buf[i],buf[i+1],buf[i+2],v]); }
        row.sort((a,b)=>a[3]-b[3]);
        let outIdx=0;
        for(let x=0;x<W;x++){ const i=(y*W+x)*4; const v=channel==='r'?buf[i]:channel==='g'?buf[i+1]:channel==='b'?buf[i+2]:buf[i]*0.3+buf[i+1]*0.59+buf[i+2]*0.11; if(v>thresh && outIdx<row.length){ full[i]=row[outIdx][0]; full[i+1]=row[outIdx][1]; full[i+2]=row[outIdx][2]; outIdx++; } }
      }
    } else {
      for(let x=0;x<W;x++){
        const col=[]; for(let y=y0;y<y1;y++){ const i=(y*W+x)*4; const v=buf[i]*0.3+buf[i+1]*0.59+buf[i+2]*0.11; if(v>thresh) col.push([buf[i],buf[i+1],buf[i+2],v]); }
        col.sort((a,b)=>a[3]-b[3]);
        let oi=0; for(let y=y0;y<y1;y++){ const i=(y*W+x)*4; const v=buf[i]*0.3+buf[i+1]*0.59+buf[i+2]*0.11; if(v>thresh && oi<col.length){ full[i]=col[oi][0]; full[i+1]=col[oi][1]; full[i+2]=col[oi][2]; oi++; } }
      }
    }
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

// Databend — corrupt raw bytes concept: jagged row slices
export function databend(buf,W,H,intensity,rng){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const full=new Uint8ClampedArray(buf);
  const n=Math.floor(intensity*18)+2;
  for(let k=0;k<n;k++){
    const y=Math.floor(rng()*H);
    const len= Math.floor(W * (0.12 + rng()*0.5));
    const shift=Math.floor((rng()*2-1)*W*0.35);
    const sx= clamp(0,W-len-1);
    for(let x=0;x<len;x++){
      const dx= clamp(x+shift,0,W-1);
      const si=(y*W+sx+x)*4, di=(y*W+dx)*4;
      full[di]= buf[si]; full[di+1]=buf[si+1]; full[di+2]=buf[si+2];
      // bit jitter
      if(rng()<0.12) full[di + Math.floor(rng()*3)] ^= 1 << Math.floor(rng()*5);
    }
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export function channelTear(buf,W,H,intensity,rng){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const full=new Uint8ClampedArray(buf.length);
  const tear=Math.floor(intensity*W*0.18);
  const offR=Math.floor((rng()*2-1)*tear), offB=Math.floor((rng()*2-1)*tear);
  const jitter=intensity*W*0.04;
  for(let y=0;y<H;y++){
    const jy= Math.floor(Math.sin(y*0.12 + rng()*0.5)*jitter*0.2);
    for(let x=0;x<W;x++){
      const i=(y*W+x)*4;
      const rx= clamp(x+offR + Math.floor(Math.sin(y*0.07)*jitter),0,W-1);
      const bx= clamp(x+offB + Math.floor(Math.cos(y*0.09)*jitter),0,W-1);
      full[i]= buf[(y*W+rx)*4];
      full[i+1]= buf[i+1];
      full[i+2]= buf[( (clamp(y+jy,0,H-1))*W + bx)*4+2];
      full[i+3]=255;
    }
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export function macroblockRot(buf,W,H,intensity){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const full=new Uint8ClampedArray(buf.length);
  const bs=8;
  // base block copy with ghost offset
  for(let by=0; by<H; by+=bs) for(let bx=0;bx<W;bx+=bs){
    const avgR=(buf[(by*W+bx)*4]+buf[(Math.min(H-1,by+bs-1)*W+Math.min(W-1,bx+bs-1))*4])/2;
    const ghost = avgR>128 ? 0.18 : -0.12;
    for(let y=by;y<Math.min(H,by+bs);y++) for(let x=bx;x<Math.min(W,bx+bs);x++){
      const i=(y*W+x)*4;
      for(let c=0;c<3;c++) full[i+c]= clamp(buf[i+c] + ghost*40,0,255);
      full[i+3]=255;
    }
  }
  // block-edge ghost duplication
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    if(x%bs===0 || y%bs===0){
      const i=(y*W+x)*4;
      const si=(clamp(y+1,0,H-1)*W+ clamp(x+1,0,W-1))*4;
      for(let c=0;c<3;c++) full[i+c]= clamp(full[i+c]*0.55 + buf[si+c]*0.45,0,255);
    }
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export function scanlineWarp(buf,W,H,intensity,rng){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const full=new Uint8ClampedArray(buf.length);
  const bands= 6 + Math.floor(rng()*6);
  const bandH=Math.floor(H/bands);
  for(let b=0;b<bands;b++){
    const y0=b*bandH, y1=b===bands-1?H:y0+bandH;
    const shift=Math.floor((rng()*2-1)*W*0.08*intensity*2.5);
    const roll= rng()<0.22;
    for(let y=y0;y<y1;y++){
      for(let x=0;x<W;x++){
        const si=(y*W+ ((x-shift)%W+W)%W)*4, di=(y*W+x)*4;
        if(roll && y===y0){ full[di]= clamp(buf[si]+ 40,0,255); full[di+1]=buf[si+1]; full[di+2]=buf[si+2]; }
        else { full[di]=buf[si]; full[di+1]=buf[si+1]; full[di+2]=buf[si+2]; }
        full[di+3]=255;
      }
      // tear line
      if(roll){
        for(let x=0;x<W;x++){ const i=(y0*W+x)*4; full[i]= full[i+1]= full[i+2]= clamp(full[i]+ 60,0,255); }
      }
    }
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export function ghostTrail(buf,W,H,intensity,rng){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const echoes= 2 + Math.floor(intensity*4);
  const full=new Uint8ClampedArray(buf);
  full.set(buf);
  for(let e=1;e<=echoes;e++){
    const ox=Math.floor(e*W*0.06* (rng()<0.5?1:-1));
    const alpha= (0.22 - e*0.03)*intensity;
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      const sx=clamp(x+ox,0,W-1), si=(y*W+sx)*4, di=(y*W+x)*4;
      for(let c=0;c<3;c++) full[di+c]= clamp(full[di+c] + buf[si+c]*alpha,0,255);
    }
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export function staticBloom(buf,W,H,intensity,rng){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const full=new Uint8ClampedArray(buf.length);
  const amt=intensity*0.65;
  for(let i=0;i<buf.length;i+=4){
    if(rng()< amt){
      const v= rng()<0.5?0:255;
      const mix= 0.55 + rng()*0.35;
      full[i]= buf[i]*(1-mix)+v*mix;
      full[i+1]= buf[i+1]*(1-mix)+v*mix;
      full[i+2]= buf[i+2]*(1-mix)+v*mix;
    } else {
      full[i]=buf[i]; full[i+1]=buf[i+1]; full[i+2]=buf[i+2];
    }
    full[i+3]=255;
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export const CORRUPTION2_EFFECTS=[
  {id:'pixelSort2', label:'PIXEL SORT II', hint:'banded threshold melt', category:'corruption', mediaTypes:['image','video'], needsChannel:true, fn: pixelSort2},
  {id:'databend', label:'DATABEND', hint:'jagged byte-corruption slices', category:'corruption', mediaTypes:['image','video'], fn: databend},
  {id:'channelTear', label:'CHANNEL TEAR', hint:'extreme RGB tear + jitter', category:'corruption', mediaTypes:['image','video'], fn: channelTear},
  {id:'macroblockRot', label:'MACROBLOCK ROT', hint:'re-compression block ghosts', category:'corruption', mediaTypes:['image','video'], fn: macroblockRot},
  {id:'scanlineWarp', label:'SCANLINE WARP', hint:'VHS rolling bands + tear', category:'corruption', mediaTypes:['image','video'], fn: scanlineWarp},
  {id:'ghostTrail', label:'GHOST TRAIL', hint:'sideways motion-blur echoes', category:'corruption', mediaTypes:['image','video'], fn: ghostTrail},
  {id:'staticBloom', label:'STATIC BLOOM', hint:'half-dissolve into TV static', category:'corruption', mediaTypes:['image','video'], fn: staticBloom},
];
