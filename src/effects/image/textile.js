import { clamp } from '../../core/color.js';
import { lerpBuffer } from '../../core/blend.js';

export function crossStitch(buf,W,H,intensity){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const block=Math.max(6, Math.round(10));
  const full=new Uint8ClampedArray(buf.length);
  full.fill(255);
  for(let by=0; by<H; by+=block){
    for(let bx=0; bx<W; bx+=block){
      const bw=Math.min(block,W-bx), bh=Math.min(block,H-by);
      let r=0,g=0,b=0,cnt=0;
      for(let y=0;y<bh;y++) for(let x=0;x<bw;x++){ const i=((by+y)*W+bx+x)*4; r+=buf[i]; g+=buf[i+1]; b+=buf[i+2]; cnt++; }
      r/=cnt; g/=cnt; b/=cnt;
      // stitch: X shape via two diagonals + dot center
      for(let y=0;y<bh;y++) for(let x=0;x<bw;x++){
        const px=bx+x, py=by+y;
        const i=(py*W+px)*4;
        const onDiag = Math.abs(x-y) < 1.6 || Math.abs(x+y-bw) < 1.6;
        const center = Math.hypot(x-bw/2+0.5, y-bh/2+0.5) < 1.2;
        if(onDiag || center){ full[i]=r; full[i+1]=g; full[i+2]=b; full[i+3]=255; }
        else { full[i]= 255*0.92; full[i+1]=255*0.92; full[i+2]=255*0.92; full[i+3]=255; }
      }
    }
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export function wovenTapestry(buf,W,H,intensity){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const full=new Uint8ClampedArray(buf.length);
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      const i=(y*W+x)*4;
      const warp = Math.sin(x*0.9)*0.5+0.5;
      const weft = Math.sin(y*0.9 + (x%2)*Math.PI)*0.5+0.5;
      const weave = warp*0.45 + weft*0.45 + 0.1;
      const shade = 0.78 + weave*0.28;
      full[i]= clamp(buf[i]*shade,0,255);
      full[i+1]= clamp(buf[i+1]*shade*0.98,0,255);
      full[i+2]= clamp(buf[i+2]*shade,0,255);
      full[i+3]=255;
    }
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export const TEXTILE_EFFECTS=[
  {id:'crossStitch', label:'CROSS STITCH', hint:'chunky thread-like stitched blocks', category:'stylize', mediaTypes:['image','video'], fn: crossStitch},
  {id:'wovenTapestry', label:'WOVEN TAPESTRY', hint:'thread-weave texture overlay', category:'stylize', mediaTypes:['image','video'], fn: wovenTapestry},
];
