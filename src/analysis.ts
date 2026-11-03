export type RecordItem={url:string;title?:string;date?:string;source:string;kind?:string;text?:string;price?:string;visitCount?:number};
export type Insight={label:string;score:number;count:number;examples:string[];category:string};
const groups:Record<string,string[]>={Technology:['technology','tech','software','developer','laptop','phone','computer','ai','camera','headphones'],Home:['home','furniture','kitchen','decor','appliance','garden','mattress'],Fashion:['fashion','clothing','shoes','sneaker','beauty','skincare','style'],Outdoor:['outdoor','hiking','camping','running','cycling','travel','fitness'],Food:['recipe','coffee','food','restaurant','cook','grocery'],Shopping:['amazon','walmart','target','bestbuy','ebay','shop','store','price','review','product']};
const tendencies:Record<string,RegExp>={'Price sensitivity':/price|cheap|budget|sale|discount|coupon|deal|affordable|under\s*\$/i,'Novelty seeking':/new release|new launch|latest|upcoming|trending|new arrival/i,'Brand exploration':/\bvs\.?\b|compare|alternatives|versus|head.to.head/i,'Convenience orientation':/delivery|pickup|same.day|subscription|auto.renew|shipping/i,'Research intensity':/review|comparison|specification|\bspecs\b|ratings|pros and cons/i,'Premium or value cues':/premium|luxury|high.end|flagship|professional|budget|cheap|value|affordable|discount/i};
const sensitive=/health|medical|clinic|hospital|religion|church|mosque|synagogue|politic|election|party|sexual|dating|abortion|addiction/;
const visits=(r:RecordItem)=>Math.max(1,Number.isFinite(r.visitCount)?Number(r.visitCount):1);

export function analyze(records:RecordItem[]){
  const safe=records.filter(r=>{try{const u=new URL(r.url);return ['http:','https:'].includes(u.protocol)&&!sensitive.test(`${u.hostname} ${r.title||''} ${r.text||''}`)}catch{return false}});
  const buckets=new Map<string,RecordItem[]>();
  for(const r of safe){const hay=`${r.url} ${r.title||''} ${r.text||''}`.toLowerCase();for(const [g,words] of Object.entries(groups)){if(words.some(w=>hay.includes(w))){if(!buckets.has(g))buckets.set(g,[]);buckets.get(g)!.push(r)}}}
  const interests:Insight[]=[...buckets].map(([label,rs])=>{const count=rs.reduce((n,r)=>n+visits(r),0);return{label,score:Math.min(98,Math.round(26+Math.log2(count+1)*17)),count,category:label,examples:[...new Set(rs.slice(0,3).map(r=>{try{return new URL(r.url).hostname}catch{return r.title||'record'}}))]}}).sort((a,b)=>b.count-a.count);
  const domains=Object.entries(safe.reduce<Record<string,number>>((acc,r)=>{try{const d=new URL(r.url).hostname.replace(/^www\./,'');if(d)acc[d]=(acc[d]||0)+visits(r)}catch{}return acc},{})).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const tendencyResults=Object.entries(tendencies).map(([label,pattern])=>{const matched=safe.filter(r=>pattern.test(`${r.url} ${r.title||''}`));const count=matched.reduce((n,r)=>n+visits(r),0);const threshold=label==='Novelty seeking'?3:label==='Brand exploration'?3:label==='Convenience orientation'?3:label==='Research intensity'?3:4;return{label,count,threshold,score:count>=threshold?Math.min(95,Math.round(35+count/threshold*15)):null,status:count>=threshold?'tentative signal':'INSUFFICIENT DATA',examples:[...new Set(matched.slice(0,3).map(r=>{try{return new URL(r.url).hostname}catch{return ''}}))]}});return{records:safe,excluded:records.length-safe.length,interests,domains,tendencies:tendencyResults,days:new Set(safe.map(r=>r.date?.slice(0,10)).filter(Boolean)).size};
}

function normalizeDate(value:any):string|undefined{if(value===undefined||value===null||value==='')return undefined;let d:Date;if(typeof value==='number'){d=new Date(value>1e14?value/1000:value>1e11?value:value*1000)}else d=new Date(value);return Number.isNaN(d.getTime())?undefined:d.toISOString()}
function parseDelimited(text:string,delimiter:string){const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c}else if(c==='"'&&cell==='')quoted=true;else if(c===delimiter){row.push(cell);cell=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);cell='';if(row.some(x=>x!==''))rows.push(row);row=[]}else cell+=c}if(cell!==''||row.length){row.push(cell);rows.push(row)}return rows}
function itemVisitCount(item:any){const n=Number(item.visitCount||item.visit_count||item.visits||1);return Number.isFinite(n)&&n>0?n:1}

export function parseImport(fileName:string,text:string):RecordItem[]{
  const ext=fileName.toLowerCase().split('.').pop();
  if(ext==='json'||ext==='jsonl'){
    const data:any=ext==='jsonl'?text.split(/\r?\n/).filter(Boolean).map(x=>JSON.parse(x)):JSON.parse(text);
    const arr=Array.isArray(data)?data:(data.history||data.records||data.items||data.conversations||[]);
    return arr.flatMap((x:any)=>{
      if(x.mapping)return Object.values(x.mapping).flatMap((n:any)=>{const m=n?.message;if(!m||m.author?.role!=='user')return[];const content=m.content?.parts?.filter((p:any)=>typeof p==='string').join(' ')||'';return content?[{url:'https://chatgpt.com/',title:'User conversation',text:content,date:normalizeDate(m.create_time),source:fileName,kind:'conversation'}]:[]});
      const url=x.url||x.URL||x.link||x.uri||x.product_url||x.productUrl||x.titleUrl;
      const product=!!(x.price||x.salePrice||x.current_price||/product|catalog/i.test(fileName));
      return url?[{url,title:x.title||x.name||x.product_name,date:normalizeDate(x.date||x.time||x.timestamp||x.visitTime||x.time_usec),source:fileName,kind:product?'product':undefined,price:x.price||x.salePrice||x.current_price,visitCount:itemVisitCount(x)}]:[];
    });
  }
  if(ext==='csv'||ext==='tsv'){
    const rows=parseDelimited(text,ext==='tsv'?'\t':',');
    const head=rows.shift()?.map(x=>x.trim().toLowerCase())||[];
    return rows.map(row=>{const o=Object.fromEntries(head.map((h,i)=>[h,row[i]||'']));return{url:o.url||o.link||o.uri||o.product_url||'',title:o.title||o.product_name,date:normalizeDate(o.date||o.timestamp||o.time||o.time_usec),source:fileName,kind:(o.price||/product|catalog/i.test(fileName))?'product':undefined,price:o.price||o.sale_price||o.current_price,visitCount:itemVisitCount({visitCount:o.visitcount||o.visit_count||o.visits})}}).filter(r=>r.url);
  }
  throw new Error('Choose a CSV, JSON or JSONL export.');
}
