import { lerpBuffer } from '../../core/blend.js';

function lumaAt(buf,i){ return buf[i]*0.299+buf[i+1]*0.587+buf[i+2]*0.114; }

export function cyanotype(buf,W,H,intensity){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const full=new Uint8ClampedArray(buf.length);
  for(let i=0;i<buf.length;i+=4){
    const lum=lumaAt(buf,i)/255;
    // classic cyanotype: deep prussian blue shadows -> pale cyan highlights
    const r = 12 + lum* (90 - 12);
    const g = 40 + lum* (150 - 40);
    const b = 80 + lum* (220 - 80);
    // preserve contrast a bit with curve
    const k = Math.pow(lum,0.9);
    full[i]= r*k + buf[i]*(1-k)*0.08;
    full[i+1]= g*k + buf[i+1]*(1-k)*0.08;
    full[i+2]= b*k + buf[i+2]*(1-k)*0.08;
    full[i+3]=255;
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export function duotoneGrade(buf,W,H,intensity, rng, params){
  if(intensity<=0) return new Uint8ClampedArray(buf);
  const mode=params?.pair ?? 'midnight';
  const pairs={
    midnight: [[18,22,48],[255,107,107]],
    ember: [[24,16,12],[255,220,80]],
    aqua: [[6,30,34],[0,229,255]],
    blush: [[42,12,28],[255,180,210]],
  };
  const [c0,c1]=pairs[mode]||pairs.midnight;
  const full=new Uint8ClampedArray(buf.length);
  for(let i=0;i<buf.length;i+=4){
    const lum=lumaAt(buf,i)/255;
    // smooth misuse
    const t= lum <0.5 ? 2*lum*lum : 1 - Math.pow(-2*lum+2,2)/2;
    full[i]= c0[0]*(1-t)+c1[0]*t;
    full[i+1]= c0[1]*(1-t)+c1[1]*t;
    full[i+2]= c0[2]*(1-t)+c1[2]*t;
    full[i+3]=255;
  }
  if(intensity>=1) return full;
  return lerpBuffer(buf, full, intensity);
}

export const PHOTO_TONE_EFFECTS=[
  {id:'cyanotype', label:'CYANOTYPE', hint:'deep-blue monochrome photographic print', category:'color-tone', mediaTypes:['image','video'], fn: cyanotype},
  {id:'duotoneGrade', label:'DUOTONE GRADE', hint:'two-color tonal mapping, moody grade', category:'color-tone', mediaTypes:['image','video'], stableAcrossFrames:true, fn: duotoneGrade, params:[
    {key:'pair', type:'select', label:'PAIR', default:'midnight', options:[{value:'midnight', label:'Midnight'}, {value:'ember', label:'Ember'}, {value:'aqua', label:'Aqua'}, {value:'blush', label:'Blush'}]},
  ]},
];
