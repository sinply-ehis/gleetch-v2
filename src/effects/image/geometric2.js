import { clamp } from '../../core/color.js';
import { lerpBuffer } from '../../core/blend.js';

// Low-poly facet — flat triangulated planes (jittered grid split into 2 tris per cell)
export function lowPoly(buf, W, H, intensity) {
  if (intensity <= 0) return new Uint8ClampedArray(buf);
  const full = new Uint8ClampedArray(buf.length);
  const cell = Math.max(18, Math.round(42 - intensity * 18)); // larger cell at low? but we lerp so keep full at ~24
  const actualCell = 28;
  void cell;
  for (let by = 0; by < H; by += actualCell) {
    for (let bx = 0; bx < W; bx += actualCell) {
      const bw = Math.min(actualCell, W - bx), bh = Math.min(actualCell, H - by);
      // tri 1: top-left, top-right, bottom-left ; tri2: top-right, bottom-right, bottom-left
      const tris = [
        [[bx, by], [bx + bw, by], [bx, by + bh]],
        [[bx + bw, by], [bx + bw, by + bh], [bx, by + bh]],
      ];
      for (const tri of tris) {
        let r=0,g=0,b=0,cnt=0;
        const minX = Math.min(tri[0][0], tri[1][0], tri[2][0]), maxX=Math.max(tri[0][0], tri[1][0], tri[2][0]);
        const minY = Math.min(tri[0][1], tri[1][1], tri[2][1]), maxY=Math.max(tri[0][1], tri[1][1], tri[2][1]);
        // average color inside triangle bbox sample
        for(let y=minY;y<maxY;y++) for(let x=minX;x<maxX;x++){
          // barycentric
          const d1=(tri[1][0]-tri[0][0])*(y-tri[0][1]) - (tri[1][1]-tri[0][1])*(x-tri[0][0]);
          const d2=(tri[2][0]-tri[1][0])*(y-tri[1][1]) - (tri[2][1]-tri[1][1])*(x-tri[1][0]);
          const d3=(tri[0][0]-tri[2][0])*(y-tri[2][1]) - (tri[0][1]-tri[2][1])*(x-tri[2][0]);
          const hasNeg=(d1<0)||(d2<0)||(d3<0), hasPos=(d1>0)||(d2>0)||(d3>0);
          if(hasNeg&&hasPos) continue;
          if(y<0||y>=H||x<0||x>=W) continue;
          const i=(y*W+x)*4; r+=buf[i]; g+=buf[i+1]; b+=buf[i+2]; cnt++;
        }
        if(!cnt) continue;
        r/=cnt; g/=cnt; b/=cnt;
        for(let y=minY;y<maxY;y++) for(let x=minX;x<maxX;x++){
          const d1=(tri[1][0]-tri[0][0])*(y-tri[0][1]) - (tri[1][1]-tri[0][1])*(x-tri[0][0]);
          const d2=(tri[2][0]-tri[1][0])*(y-tri[1][1]) - (tri[2][1]-tri[1][1])*(x-tri[1][0]);
          const d3=(tri[0][0]-tri[2][0])*(y-tri[2][1]) - (tri[0][1]-tri[2][1])*(x-tri[2][0]);
          const hasNeg=(d1<0)||(d2<0)||(d3<0), hasPos=(d1>0)||(d2>0)||(d3>0);
          if(hasNeg&&hasPos) continue;
          if(y<0||y>=H||x<0||x>=W) continue;
          const i=(y*W+x)*4; full[i]=r; full[i+1]=g; full[i+2]=b; full[i+3]=255;
        }
      }
    }
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

// Mandala symmetry — kaleidoscope-mirrored radial
export function mandala(buf, W, H, intensity, rng) {
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const segs = 8 + Math.floor(rng()*3)*2; // 8,10,12
  const cx=W/2, cy=H/2;
  const full=new Uint8ClampedArray(buf.length);
  const segAngle=(Math.PI*2)/segs;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const dx=x-cx, dy=y-cy;
    let ang=Math.atan2(dy,dx); if(ang<0) ang+=Math.PI*2;
    const r=Math.sqrt(dx*dx+dy*dy);
    const seg=Math.floor(ang/segAngle);
    const local=ang - seg*segAngle;
    const mirrored= seg%2===0 ? local : segAngle - local;
    const sx=clamp(Math.round(cx + Math.cos(mirrored)*r),0,W-1);
    const sy=clamp(Math.round(cy + Math.sin(mirrored)*r),0,H-1);
    const si=(sy*W+sx)*4, di=(y*W+x)*4;
    full[di]=buf[si]; full[di+1]=buf[si+1]; full[di+2]=buf[si+2]; full[di+3]=255;
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

// Leaded stained glass — bold lead lines, large panes (distinct from voronoi)
export function leadedGlass(buf, W, H, intensity) {
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const cell= Math.max(36, Math.min(90, 56));
  const cols=Math.max(1,Math.ceil(W/cell)), rows=Math.max(1,Math.ceil(H/cell));
  // pane color = average of pane
  const full=new Uint8ClampedArray(buf.length);
  full.set(buf);
  // first fill panes
  for(let gy=0;gy<rows;gy++) for(let gx=0;gx<cols;gx++){
    const x0=gx*cell, y0=gy*cell, x1=Math.min(W, x0+cell), y1=Math.min(H, y0+cell);
    let r=0,g=0,b=0,cnt=0;
    for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++){ const i=(y*W+x)*4; r+=buf[i]; g+=buf[i+1]; b+=buf[i+2]; cnt++; }
    r/=cnt; g/=cnt; b/=cnt;
    // slight posterize per pane
    r=Math.round(r/20)*20; g=Math.round(g/20)*20; b=Math.round(b/20)*20;
    for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++){ const i=(y*W+x)*4; full[i]=r; full[i+1]=g; full[i+2]=b; }
  }
  const lead= Math.max(3, Math.round(4 + intensity*3));
  // draw lead lines (black) over grid
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const onV = (x % cell) < lead || (x % cell) > cell - lead;
    const onH = (y % cell) < lead || (y % cell) > cell - lead;
    if(onV || onH){ const i=(y*W+x)*4; full[i]=0; full[i+1]=0; full[i+2]=0; }
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export const GEOMETRIC2_EFFECTS=[
  {id:'lowPoly', label:'LOW POLY', hint:'faceted triangulated planes', category:'distortion', mediaTypes:['image','video'], fn: lowPoly},
  {id:'mandala', label:'MANDALA', hint:'kaleidoscope radial symmetry', category:'distortion', mediaTypes:['image','video'], stableAcrossFrames:true, fn: mandala},
  {id:'leadedGlass', label:'LEADED GLASS', hint:'bold lead lines, large panes', category:'stylize', mediaTypes:['image','video'], fn: leadedGlass},
];
