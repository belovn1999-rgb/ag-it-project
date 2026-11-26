import {readRecords, writeRecords, moveRecord, norm} from './auto1-engine.mjs?v=20260922-table-borders';

const BASE_WIDTH=594.96, BASE_HEIGHT=841.92;
const section=/MAIN CAR DETAILS|TEST DRIVE INFORMATION|VEHICLE CONDITION|DAMAGE SUMMARY|CAR EQUIPMENT|CAR SERVICE DETAILS|TECHNICAL INSPECTION|CAR DATA ACCORDING/i;
const logistics=/Delivery to my address|Delivery to closest pickup|Pickup at car location|Delivery or pick up process|Enjoy free parking|Delivery time is shown/i;
const promotion=/Premium Return Right|Stock number|Save cash|Export advantage|watchlist|high demand|Minimum bid|Bid Agent|Your bid includes|Purchase now|auction fee|VAT rate|^€/i;
const legalRow=/^(?:Copyright\s*©?\s*\d{4}\s+Auto1\.com|Privacy|Terms and Conditions|Imprint)(?:\s+(?:Privacy|Terms and Conditions|Imprint))*$/i;
const videoTimer=/^\d+:\d+\s*\/\s*\d+:\d+$/;
const italyNote=/^OTHER NOTES\s+Some content has been automatically translated\. Show original\s+"Italian traders:.*VAT margin scheme\..*registration failure in Italy\."$/i;
const auctionLeftover=/Premium Return Right|Stock number|Minimum bid|Bid Agent|watchlist|Save cash|Export advantage|Delivery to my address|Delivery to closest pickup|Pickup at car location|Total Pictures|\b\d+:\d+\s*\/\s*\d+:\d+\b/i;

// Auction, logistics, player and footer text is never client content, wherever
// on the page it lands.
function junkRow(row) {return promotion.test(row.text)||logistics.test(row.text)||videoTimer.test(row.text)||legalRow.test(row.text);}
function rowText(rows) {return rows.flatMap(r=>r.items.map(i=>i.text));}

export function textRows(textContent) {
  const rows=[];
  for(const item of textContent.items.filter(i=>norm(i.str)).sort((a,b)=>b.transform[5]-a.transform[5]||a.transform[4]-b.transform[4])) {
    const [x,y]=item.transform.slice(4);let row=rows.find(r=>Math.abs(r.y-y)<.8);
    if(!row){row={y,items:[]};rows.push(row);}row.items.push({x,y,width:item.width,height:item.height||Math.hypot(item.transform[2],item.transform[3]),text:norm(item.str)});
  }
  return rows.flatMap(row=>{
    row.items.sort((a,b)=>a.x-b.x);
    const groups=[];
    for(const item of row.items) {
      let group=groups.at(-1),last=group?.at(-1);
      if(!last||item.x-last.x-last.width>Math.max(24,item.height*2.5)){group=[];groups.push(group);}
      group.push(item);
    }
    return groups.map(items=>({y:items[0].y,items,text:norm(items.map(i=>i.text).join(' ')),x:items[0].x,right:Math.max(...items.map(i=>i.x+i.width)),height:Math.max(...items.map(i=>i.height))}));
  }).sort((a,b)=>b.y-a.y);
}

function nearRow(r,row,x0=row.x-2,x1=row.right+2) {return r.kind==='text'&&Math.abs(r.anchor[1]-row.y)<1.2&&r.anchor[0]>=x0&&r.anchor[0]<=x1;}
function rgb(r) {const line=r.style.rg||r.style.RG||'';return line.split(' ').slice(0,3).map(Number);}
function grey(r) {const c=rgb(r);return c.length===3&&c.every(Number.isFinite)&&Math.max(...c)-Math.min(...c)<.015&&c[0]>.75&&c[0]<.98;}
function rail(r,m) {const [x,y,x1,y1]=r.box,w=x1-x,h=y1-y;return r.kind!=='text'&&x>=m.width*.952&&w<m.width*.045&&h>m.height*.04;}
function frame(r,m) {
  if(r.kind!=='path'||!grey(r))return false;
  const [x,y,x1,y1]=r.box,w=x1-x,h=y1-y;
  // Only the browser card's own edges, which run into both page margins; a
  // table's border stops short of them and stays (the wheel table's bottom rule).
  return (w<1.6&&h>30&&(x<m.width*.06||x>m.width*.945))||(h<1.6&&x<m.width*.06&&x1>m.width*.945);
}
function leadingIcon(r,row) {
  const [x,y,x1,y1]=r.box;
  return x1-x<20&&y1-y<20&&x1<=row.x+1&&x>=row.x-30&&y<row.y+row.height+6&&y1>row.y-6;
}
function realImage(r,m) {return r.kind==='image'&&!rail(r,m)&&r.box[2]-r.box[0]>20&&r.box[3]-r.box[1]>18;}
function mediaRecords(m,rows,cover=false) {
  return m.records.filter(r=>realImage(r,m)&&(!cover||r.box[3]<m.height-65*m.height/BASE_HEIGHT));
}
function mergeResources(a,b) {for(const [cat,dict] of Object.entries(b))Object.assign(a[cat] ||= {},dict);}

// AUTO1's title is one text object drawing each character with its own Tj and
// a horizontal Td advance, so it can be cut at a space into two objects
// without touching a glyph. Returns null for any other shape.
const GLYPH=/^<[0-9A-Fa-f]+>\s*Tj$/;
export function splitTitle(m,titleRows,maxWidth) {
  if(titleRows.length!==1)return null;
  const row=titleRows[0],texts=m.records.filter(r=>nearRow(r,row));
  if(texts.length!==1)return null;
  const record=texts[0],lines=record.body.split('\n');
  const start=lines.findIndex(line=>GLYPH.test(line));
  if(start<0||lines.slice(0,start).some(line=>/(?:T[jJ]|['"])$/.test(line)))return null;
  const tm=lines.slice(0,start).map(line=>line.match(/^(\S+) (\S+) (\S+) (\S+) \S+ \S+ Tm$/)).find(Boolean);
  if(!tm||Number(tm[2])!==0||Number(tm[3])!==0||record.matrix[1]!==0||record.matrix[2]!==0)return null;
  const glyphLines=[start],before=[0];
  let advance=0;
  for(let i=start+1;i<lines.length;i++) {
    if(GLYPH.test(lines[i])) {glyphLines.push(i);before.push(advance);continue;}
    const td=lines[i].match(/^(\S+) (\S+) Td$/);
    if(!td||Number(td[2])!==0||!Number.isFinite(Number(td[1])))return null;
    advance+=Number(td[1]);
  }
  if(glyphLines.length!==row.text.length)return null;
  const unit=record.matrix[0]*Number(tm[1]),total=row.right-row.x;
  let best=null;
  for(let k=1;k<row.text.length-1;k++) {
    if(row.text[k]!==' ')continue;
    const first=unit*before[k],secondStart=unit*before[k+1],widest=Math.max(first,total-secondStart);
    if(!best||widest<best.widest)best={k,first,secondStart,widest};
  }
  if(!best)return null;
  const scale=Math.min(1,maxWidth/best.widest);
  if(scale<.85)return null;
  const head=lines.slice(0,start);
  const firstLine={...record,body:lines.slice(0,glyphLines[best.k]).join('\n')};
  const secondLine={...record,anchor:[row.x+best.secondStart,row.y],
    body:[...head,`${before[best.k+1].toFixed(6)} 0 Td`,...lines.slice(glyphLines[best.k+1])].join('\n')};
  return {scale,parts:[{record:firstLine,left:row.x,width:best.first},{record:secondLine,left:row.x+best.secondStart,width:total-best.secondStart}]};
}

export function makeCover(models,data,titleHint) {
  const m=models[0],sx=m.width/BASE_WIDTH,sy=m.height/BASE_HEIGHT;
  const rows=data[0].rows;
  const build=rows.find(r=>/^Build year\s*:/i.test(r.text));
  if(!build)throw new Error('Nie rozpoznano pól pierwszej strony. Potrzebna jest kontrola pliku.');
  const rightX=build.x-3;
  // A long cover pushes the location past the gallery pages, so it is looked
  // for everywhere before the report proper begins.
  const sectionAt=data.findIndex((p,i)=>i>0&&section.test(p.text));
  let locationPage=-1,locationEntries=[],inline=false;
  for(let i=0;i<(sectionAt<0?Math.min(data.length,3):sectionAt);i++) {
    const ri=data[i].rows.findIndex(r=>/^Car location\b/i.test(r.text));
    if(ri>=0) {
      locationPage=i;const label=data[i].rows[ri];
      // Under the gallery AUTO1 prints the label and value on one line.
      if(/^Car location\s*:\s*\S/i.test(label.text)) {inline=true;locationEntries=[{row:label,pageIndex:i,offset:0}];break;}
      const sameRows=data[i].rows.filter(r=>r.y<=label.y+.8&&r.y>=label.y-40*sy&&r.x>=rightX-10&&!/\d+:\d+/.test(r.text));
      locationEntries=sameRows.map(row=>({row,pageIndex:i,offset:0}));
      // AUTO1 sometimes runs the "Car location" label to the very bottom of
      // the page, pushing its value (city/country) onto the next page. Pull
      // that overflow in the same way the field columns below are stitched.
      if(sameRows.length<2&&i+1<data.length) {
        const nextHeight=models[i+1].height,nextSy=nextHeight/BASE_HEIGHT;
        const contRows=data[i+1].rows.filter(r=>r.x>=rightX-10&&r.y>=nextHeight-40*nextSy&&!/\d+:\d+/.test(r.text));
        if(contRows.length) {
          const bottomHere=Math.min(...sameRows.map(r=>r.y));
          const offset=bottomHere-22*sy-Math.max(...contRows.map(r=>r.y));
          for(const row of contRows)locationEntries.push({row,pageIndex:i+1,offset});
        }
      }
      break;
    }
  }
  const locationRows=locationEntries.map(e=>e.row);
  if(locationPage<0||(!inline&&locationRows.length<2))throw new Error('Nie znaleziono pełnej lokalizacji auta. Potrzebna jest kontrola pliku.');
  // A long car name is centred and can start left of the value column even
  // though it still belongs to it; require it to reach the column instead.
  const titleCandidates=rows.filter(r=>r.y>build.y&&r.right>=rightX&&!promotion.test(r.text)&&!/^Build year/i.test(r.text));
  const titleRow=titleCandidates.find(r=>norm(r.text)===norm(titleHint))||titleCandidates.filter(r=>r.height>=12*sy).sort((a,b)=>b.height-a.height)[0];
  if(!titleRow)throw new Error('Nie rozpoznano nazwy samochodu. Potrzebna jest kontrola pliku.');
  const titleRows=titleCandidates.filter(r=>Math.abs(r.height-titleRow.height)<.5&&Math.abs(r.y-titleRow.y)<titleRow.height*2.5);
  const fields=[];
  let previousBottom=null;
  for(let pageIndex=0;pageIndex<=locationPage;pageIndex++) {
    const fieldRows=data[pageIndex].rows.filter(r=>r.x>=rightX&&(pageIndex!==0||r.y<=build.y+.8)&&(pageIndex!==locationPage||r.y>locationRows[0].y+1)&&!junkRow(r));
    if(fieldRows.some(r=>section.test(r.text)))throw new Error('Niejednoznaczny blok danych auta. Potrzebna jest kontrola pliku.');
    // The field column is contiguous: once a page carries none of it, the
    // pages that follow are gallery or logistics, not more fields.
    if(!fieldRows.length) {if(pageIndex>0)break;continue;}
    const pageTop=Math.max(...fieldRows.map(r=>r.y));
    const offset=previousBottom===null?0:previousBottom-22*sy-pageTop;
    for(const row of fieldRows)fields.push({row,pageIndex,offset});
    previousBottom=Math.min(...fieldRows.map(r=>r.y))+offset;
    mergeResources(m.resources,models[pageIndex].resources);
  }
  const records=mediaRecords(m,rows,true);
  if(!records.length)throw new Error('Nie rozpoznano oryginalnych zdjęć pierwszej strony.');
  const titleLeft=Math.min(...titleRows.map(r=>r.x)),titleRight=Math.max(...titleRows.map(r=>r.right));
  const titleTop=Math.max(...titleRows.map(r=>r.y));
  const titleScale=Math.min(1, (285*sx)/(titleRight-titleLeft));
  // Shrinking a long make/model/version makes it unreadable; two lines do not.
  const split=titleScale<.85?splitTitle(m,titleRows,285*sx):null;
  if(!split&&titleScale<.7)throw new Error('Nazwa samochodu nie mieści się w nagłówku.');
  let titleBottom;
  if(split) {
    const gap=titleRows[0].height*1.2*split.scale;
    split.parts.forEach((part,n)=>records.push(moveRecord(part.record,440*sx-part.width*split.scale/2-part.left,m.height-87.25*sy-n*gap-titleTop,split.scale,[part.left,titleTop])));
    titleBottom=m.height-87.25*sy-gap;
  } else {
    const titleX=440*sx-(titleRight-titleLeft)*titleScale/2;
    for(const r of m.records)if(titleRows.some(row=>nearRow(r,row)))records.push(moveRecord(r,titleX-titleLeft,m.height-87.25*sy-titleTop,titleScale,[titleLeft,titleTop]));
    titleBottom=m.height-87.25*sy-(titleTop-Math.min(...titleRows.map(r=>r.y)))*titleScale;
  }
  const buildTarget=Math.min(m.height-144*sy,titleBottom-45*sy);
  const fieldBottom=Math.min(...fields.map(f=>f.row.y+f.offset));
  const scale=Math.min(1,(buildTarget-(m.height-680*sy))/Math.max(1,build.y-fieldBottom));
  if(scale<.85)throw new Error('Parametry nie mieszczą się czytelnie na pierwszej stronie.');
  for(let pageIndex=0;pageIndex<=locationPage;pageIndex++) {
    const matches=fields.filter(f=>f.pageIndex===pageIndex);
    for(const r of models[pageIndex].records) {
      const match=matches.find(f=>nearRow(r,f.row));
      if(match)records.push(moveRecord(r,0,buildTarget-build.y+match.offset*scale,scale,[build.x,build.y]));
    }
  }
  // A one-line location joins the field list as its next row; the heading
  // form keeps its own block below the fields.
  const locationY=inline?buildTarget-(build.y-fieldBottom)*scale-22*sy*scale
    :Math.min(m.height-722.5*sy,buildTarget-(build.y-fieldBottom)*scale-54*sy);
  if(locationY<65*sy)throw new Error('Lokalizacja nie mieści się na pierwszej stronie.');
  const valueColumn=rows.find(r=>Math.abs(r.y-build.y)<1.2&&r.x>build.right);
  for(const entry of locationEntries) {
    mergeResources(m.resources,models[entry.pageIndex].resources);
    const colon=inline?entry.row.items.findIndex(item=>item.text.includes(':')):-1;
    const value=colon>=0?entry.row.items[colon+1]:null;
    for(const r of models[entry.pageIndex].records)if(nearRow(r,entry.row)) {
      const dx=value&&valueColumn&&r.anchor[0]>=value.x-1?valueColumn.x-value.x:build.x-locationRows[0].x;
      records.push(moveRecord(r,dx,locationY-locationRows[0].y+entry.offset));
    }
  }
  const locationContinuation=[...new Set(locationEntries.filter(e=>e.pageIndex!==locationPage).map(e=>e.pageIndex))]
    .map(pageIndex=>({pageIndex,rows:locationEntries.filter(e=>e.pageIndex===pageIndex).map(e=>e.row)}));
  return {records,orange:m.height-63*sy,blue:titleBottom-20*sy,requiredRows:[...titleRows,...fields.map(f=>f.row),...locationRows].flatMap(r=>r.items.map(i=>i.text)),locationContinuation};
}

// Printed from a narrow window, AUTO1 puts its logistics column beside the
// title, the gallery two photos wide below it, and the car's fields on pages of
// their own after the gallery. Such a report is laid out anew: the title and
// photos on the first pages (the main photo across the full width), then one
// page of fields, then the report itself.
const narrowTimer=/^\d[\d\s]*:\s*\d|^\d+$/;
export function makeNarrow(models,data,titleHint,firstSection) {
  const m=models[0];
  if(!m||firstSection<2)throw new Error('Nie rozpoznano układu raportu.');
  if(models.slice(0,firstSection).some(x=>!x))throw new Error('struktura strony');
  const isBuild=r=>/^Build year\s*:/i.test(r.text);
  if(data[0].rows.some(isBuild))throw new Error('Nie rozpoznano układu raportu.');
  const buildPage=data.findIndex((p,i)=>i>0&&i<firstSection&&p.rows.some(isBuild));
  if(buildPage<0)throw new Error('Nie rozpoznano pól auta. Potrzebna jest kontrola pliku.');
  const sx=m.width/BASE_WIDTH,sy=m.height/BASE_HEIGHT;
  const left=42.5*sx,width=510*sx,top=m.height-30*sy,bottom=30*sy;
  const compact=s=>norm(s).replace(/\s/g,'').toLowerCase();
  // Title: the car's name in the largest type on the first page.
  const candidates=data[0].rows.filter(r=>!junkRow(r)&&!narrowTimer.test(r.text)&&r.height>=12*sy);
  if(!candidates.length)throw new Error('Nie rozpoznano nazwy samochodu. Potrzebna jest kontrola pliku.');
  const byHint=titleHint?candidates.filter(r=>compact(titleHint).includes(compact(r.text))):[];
  let titleRows=byHint.length&&compact(byHint.map(r=>r.text).join(''))===compact(titleHint)?byHint:null;
  if(!titleRows) {
    const h=Math.max(...candidates.map(r=>r.height)),first=candidates.filter(r=>Math.abs(r.height-h)<.5).sort((a,b)=>b.y-a.y);
    titleRows=first.filter(r=>first[0].y-r.y<h*1.4*first.length);
  }
  titleRows=[...titleRows].sort((a,b)=>b.y-a.y);
  const titleLeft=Math.min(...titleRows.map(r=>r.x)),titleTop=titleRows[0].y;
  const titleWidth=Math.max(...titleRows.map(r=>r.right-r.x)),titleY=m.height-87.25*sy;
  const pageRecords=[[]];
  let titleBottom;
  const split=titleRows.length===1&&titleWidth>width?splitTitle(m,titleRows,width):null;
  if(split) {
    const gap=titleRows[0].height*1.2*split.scale;
    split.parts.forEach((part,n)=>pageRecords[0].push(moveRecord(part.record,left-part.left,titleY-n*gap-titleTop,split.scale,[part.left,titleTop])));
    titleBottom=titleY-gap;
  } else {
    const scale=Math.min(1,width/titleWidth);
    if(scale<.7)throw new Error('Nazwa samochodu nie mieści się w nagłówku.');
    for(const r of m.records)if(titleRows.some(row=>nearRow(r,row)))pageRecords[0].push(moveRecord(r,left-titleLeft,titleY-titleTop,scale,[titleLeft,titleTop]));
    titleBottom=titleY-(titleTop-titleRows.at(-1).y)*scale;
  }
  // Photos, in the order the report shows them.
  const photos=[];
  for(let i=0;i<firstSection;i++)
    for(const r of mediaRecords(models[i],data[i].rows,i===0))photos.push({r,i});
  if(!photos.length)throw new Error('Nie rozpoznano oryginalnych zdjęć pierwszej strony.');
  const area=r=>(r.box[2]-r.box[0])*(r.box[3]-r.box[1]);
  const main=photos.filter(p=>p.i===0).sort((a,b)=>area(b.r)-area(a.r))[0];
  if(!main)throw new Error('Nie rozpoznano oryginalnych zdjęć pierwszej strony.');
  const thumbs=photos.filter(p=>p!==main).sort((a,b)=>a.i-b.i||(Math.abs(a.r.box[3]-b.r.box[3])>2?b.r.box[3]-a.r.box[3]:a.r.box[0]-b.r.box[0]));
  const place=(r,x,yTop,scale)=>moveRecord(r,x-r.box[0],yTop-r.box[3],scale,[r.box[0],r.box[3]]);
  const [mx,,mx1]=main.r.box,mainW=mx1-mx,mainH=main.r.box[3]-main.r.box[1];
  const mainScale=Math.min(width/mainW,420*sy/mainH);
  let cursor=titleBottom-16*sy;
  pageRecords[0].push(place(main.r,left+(width-mainW*mainScale)/2,cursor,mainScale));
  cursor-=mainH*mainScale+8*sy;
  const gap=6*sx,cell=(width-3*gap)/4;
  for(let n=0;n<thumbs.length;n+=4) {
    const row=thumbs.slice(n,n+4).map(p=>({p,scale:cell/(p.r.box[2]-p.r.box[0])}));
    const rowHeight=Math.max(...row.map(({p,scale})=>(p.r.box[3]-p.r.box[1])*scale));
    if(cursor-rowHeight<bottom) {pageRecords.push([]);cursor=top;}
    row.forEach(({p,scale},k)=>{
      const h=(p.r.box[3]-p.r.box[1])*scale;
      pageRecords.at(-1).push(place(p.r,left+k*(cell+gap),cursor-(rowHeight-h)/2,scale));
    });
    cursor-=rowHeight+8*sy;
  }
  // Fields: from "Build year" to the car location, stitched across pages.
  const build=data[buildPage].rows.find(isBuild);
  const fields=[];let previousBottom=null;
  for(let i=buildPage;i<firstSection;i++) {
    const rows=data[i].rows.filter(r=>!junkRow(r)&&(i!==buildPage||r.y<=build.y+.8));
    if(rows.some(r=>section.test(r.text)))throw new Error('Niejednoznaczny blok danych auta. Potrzebna jest kontrola pliku.');
    if(!rows.length)continue;
    const pageTop=Math.max(...rows.map(r=>r.y));
    const offset=previousBottom===null?0:previousBottom-22*sy-pageTop;
    for(const row of rows)fields.push({row,i,offset});
    previousBottom=Math.min(...rows.map(r=>r.y))+offset;
  }
  if(!fields.some(f=>/^Car location\b/i.test(f.row.text)))throw new Error('Nie znaleziono pełnej lokalizacji auta. Potrzebna jest kontrola pliku.');
  const fieldTop=m.height-50*sy,fieldBottom=Math.min(...fields.map(f=>f.row.y+f.offset));
  const fieldScale=Math.min(1,(fieldTop-bottom)/Math.max(1,build.y-fieldBottom));
  if(fieldScale<.85)throw new Error('Parametry nie mieszczą się czytelnie na jednej stronie.');
  const fieldRecords=[];
  for(const f of fields)for(const r of models[f.i].records)
    if(nearRow(r,f.row))fieldRecords.push(moveRecord(r,0,fieldTop-build.y+f.offset*fieldScale,fieldScale,[build.x,build.y]));
  const resources={};
  for(let i=0;i<firstSection;i++)mergeResources(resources,models[i].resources);
  const model=i=>({width:models[i].width,height:models[i].height,resources});
  const pages=pageRecords.map((records,n)=>({model:model(0),records,sourcePage:1,reason:'narrow-photos',
    requiredRows:n?[]:rowText(titleRows),sourceImages:n?0:photos.length,outputImages:n?0:photos.length}));
  pages.push({model:model(buildPage),records:fieldRecords,sourcePage:buildPage+1,reason:'narrow-fields',requiredRows:rowText(fields.map(f=>f.row)),sourceImages:0,outputImages:0});
  return {pages,orange:m.height-63*sy};
}

// A page whose structure cannot be edited safely is copied verbatim instead.
function readModel(lib,source,page,index) {
  const crop=page.getCropBox(),media=page.getMediaBox();
  if(page.getRotation().angle%360||crop.x!==0||crop.y!==0||crop.width!==media.width||crop.height!==media.height)return null;
  try {return readRecords(lib,source,page,index);}catch{return null;}
}

// Without the rebuilt layout the cover still loses its whole auction block.
export function basicCover(m,rows) {
  const junk=new Set(rows.filter(junkRow));
  // A junk label takes the value printed after it on its line (Stock number: FU94669).
  for(const label of [...junk].filter(r=>r.text.endsWith(':')))
    for(const row of rows)if(Math.abs(row.y-label.y)<1.2&&row.x>label.x)junk.add(row);
  // Between the car's name and "Build year" AUTO1 prints only its bid, VAT,
  // offer and stock blocks, in whatever order and wrapping; all of it goes.
  const offer=rows.filter(r=>/Premium Return Right/i.test(r.text)),first=rows.find(r=>/^(?:Stock number|Build year)\b/i.test(r.text));
  const build=rows.find(r=>/^Build year\s*:/i.test(r.text));
  const sy=m.height/BASE_HEIGHT;
  let card=null;
  const title=build&&rows.filter(r=>r.y>build.y&&r.height>=14*sy&&!promotion.test(r.text)).sort((a,b)=>b.y-a.y)[0];
  if(build&&title) {
    for(const row of rows)if(row.y>build.y+.8&&row.y<title.y-1&&row.right>=build.x)junk.add(row);
    card=r=>r.kind!=='text'&&r.kind!=='image'&&r.box[0]>=build.x-40&&r.box[1]>build.y+5*sy&&r.box[3]<title.y-2*sy;
  } else if(offer.length&&first) {
    const top=Math.max(...offer.map(r=>r.y)),left=Math.min(...offer.map(r=>r.x))-20;
    for(const row of rows)if(row.y<=top+.8&&row.y>first.y+.8&&row.x>=left)junk.add(row);
    // The offer card's icon, radio button, frame and underline.
    card=r=>r.kind!=='text'&&r.kind!=='image'&&r.box[0]>=left-30&&r.box[1]>first.y+5*sy&&r.box[3]<=top+20*sy;
  }
  const records=m.records.filter(r=>!rail(r,m)&&!frame(r,m)&&![...junk].some(row=>nearRow(r,row))&&!card?.(r)
    // Account and menu icons in the top-right corner of the auction page.
    &&!(r.kind!=='text'&&r.box[1]>m.height-60*sy&&r.box[0]>m.width*.6));
  return {records,requiredRows:rowText(rows.filter(r=>!junk.has(r)))};
}

function cleanContent(m,d,text) {
  const counters=d.rows.filter(r=>/^Total Pictures\b|^No images were taken\./i.test(r.text));
  const notices=/CAR DATA ACCORDING TO IDENTIFICATION NUMBER/i.test(text)?d.rows.filter(r=>/^Some content has been automatically translated\.?$/i.test(r.text)):[];
  const photo=m.records.find(r=>realImage(r,m)&&r.box[2]-r.box[0]>m.width*.5);
  const damagePage=/\bDamages\b/.test(text)&&photo;
  const tracks=damagePage?m.records.filter(r=>r.kind==='path'&&r.style.cs==='/Pattern cs'&&r.box[2]-r.box[0]>m.width*.3&&r.box[3]-r.box[1]>5&&r.box[3]-r.box[1]<20&&r.box[3]<photo.box[1]):[];
  const blueLines=damagePage?m.records.filter(r=>{
    const c=rgb(r),w=r.box[2]-r.box[0],h=r.box[3]-r.box[1];
    return r.kind==='path'&&r.box[3]<photo.box[1]&&c.length===3&&Math.abs(c[0]-.2078)<.005&&Math.abs(c[1]-.549)<.005&&Math.abs(c[2]-.7961)<.005&&((h<1.6&&w>20)||(w<1.6&&h>15));
  }):[];
  const headerLineY=Math.max(...blueLines.filter(r=>r.box[3]-r.box[1]<1.6).map(r=>r.box[3]));
  const records=m.records.filter(r=>{
    if(rail(r,m)||frame(r,m)||[...counters,...notices].some(row=>nearRow(r,row)))return false;
    // Keep the header separator; remove only the selected-row outline.
    if(blueLines.includes(r)&&(r.box[3]-r.box[1]>=1.6||Math.abs(r.box[3]-headerLineY)>1))return false;
    if(damagePage&&r.kind==='path'&&r.box[3]<photo.box[1]) {
      const [x,y,x1,y1]=r.box;
      if(tracks.some(t=>x>=t.box[0]-1&&x1<=t.box[2]+1&&y>=t.box[1]-1&&y1<=t.box[3]+1)&&!(y1-y<1.6&&x1-x>m.width*.3))return false;
    }
    // Remove the counter's camera glyph, not the image below it.
    if(counters.length&&photo&&r.kind==='path'&&r.box[2]-r.box[0]<20&&r.box[3]-r.box[1]<20&&r.box[1]>photo.box[3]-22&&r.box[0]<photo.box[0]+30)return false;
    // The icon printed just left of a removed counter or notice goes with it.
    if(r.kind==='path'&&counters.some(row=>leadingIcon(r,row)))return false;
    return true;
  });
  return {records,requiredRows:rowText(d.rows.filter(row=>![...counters,...notices].includes(row)))};
}

// Pages are classified by what their rows say, never by where AUTO1 happened
// to break them: the same report prints at different wrap points every time.
export function planPage(i,m,d,cover,firstSection) {
  const images=mediaRecords(m,d.rows),text=norm(d.text);
  if(i===0)return cover?{records:cover.records,reason:'cover',requiredRows:cover.requiredRows}
    :{...basicCover(m,d.rows),reason:'cover-basic'};
  if(!images.length&&d.rows.length&&d.rows.every(r=>legalRow.test(r.text)))return {records:[],reason:'legal-only',requiredRows:[]};
  if(i<firstSection) {
    // Between the cover and the first section AUTO1 prints only its own
    // logistics and offer UI, so the photos are the sole client content.
    if(cover)return {records:images,reason:images.length?'gallery':'auction-block',requiredRows:[]};
    // The cover was not rebuilt, so fields spilled here still have to survive.
    const keep=d.rows.filter(r=>!junkRow(r));
    const records=m.records.filter(r=>images.includes(r)||keep.some(row=>nearRow(r,row)));
    return {records,reason:records.length?'gallery':'auction-block',requiredRows:rowText(keep)};
  }
  if(italyNote.test(text))return {records:[],reason:'italian-trader-notice',requiredRows:[]};
  return {...cleanContent(m,d,text),reason:'content'};
}

export async function buildAuto1Pdf(lib,source,pageData,onProgress=()=>{},keepOriginal=new Set()) {
  const data=pageData.map(p=>({...p,rows:textRows(p.textContent)}));
  const models=source.getPages().map((p,i)=>keepOriginal.has(i)?null:readModel(lib,source,p,i));
  const output=await lib.PDFDocument.create(), copier=lib.PDFObjectCopier.for(source.context,output.context);
  const report={pages:[],removedPages:0,removedObjects:0,requiredRows:[],review:[]};
  let cover=null;
  if(models[0])try {cover=makeCover(models,data,source.getTitle());}catch(error) {report.coverNote=error.message;}
  let firstSection=data.findIndex((p,i)=>i>0&&section.test(p.text));
  let narrow=null,start=0;
  if(!cover&&firstSection>1)try {narrow=makeNarrow(models,data,source.getTitle(),firstSection);}catch(error) {report.narrowNote=error.message;}
  if(narrow) {
    delete report.coverNote;
    for(const p of narrow.pages) {
      const page=writeRecords(lib,output,source,p.model,p.records,copier);
      if(p===narrow.pages[0]) {
        const sx=p.model.width/BASE_WIDTH;
        page.drawLine({start:{x:15*sx,y:narrow.orange},end:{x:584*sx,y:narrow.orange},thickness:.75,color:lib.rgb(1,.4,.1)});
      }
      report.requiredRows.push(...p.requiredRows);
      report.pages.push({sourcePage:p.sourcePage,outputPage:output.getPageCount(),reason:p.reason,requiredRows:p.requiredRows,sourceImages:p.sourceImages,outputImages:p.outputImages});
    }
    report.removedPages+=Math.max(0,firstSection-narrow.pages.length);
    start=firstSection;
    onProgress(start,models.length);
  }
  // An unfamiliar report keeps every page; only known artefacts are cleaned.
  if(firstSection<0)firstSection=1;
  for(let i=start;i<models.length;i++) {
    const m=models[i],d=data[i];
    let plan=null,note=m?'':'struktura strony';
    if(m)try {plan=planPage(i,m,d,cover,firstSection);}catch(error) {note=error.message;}
    if(!plan) {
      // Nothing recognised: ship the original page rather than the whole file.
      const [copied]=await output.copyPages(source,[i]);
      output.addPage(copied);
      const requiredRows=rowText(d.rows);
      report.requiredRows.push(...requiredRows);
      report.review.push({page:output.getPageCount(),sourcePage:i+1,note});
      report.pages.push({sourcePage:i+1,outputPage:output.getPageCount(),reason:'original',requiredRows,note,sourceImages:0,outputImages:0});
    } else if(!plan.records.length) {
      report.removedPages++;
      report.pages.push({sourcePage:i+1,outputPage:null,reason:plan.reason,requiredRows:[],sourceImages:m.records.filter(r=>realImage(r,m)).length,outputImages:0});
    } else {
      const page=writeRecords(lib,output,source,m,plan.records,copier);
      if(plan.reason==='cover') {
        const sx=m.width/BASE_WIDTH;
        page.drawLine({start:{x:15*sx,y:cover.orange},end:{x:584*sx,y:cover.orange},thickness:.75,color:lib.rgb(1,.4,.1)});
        page.drawLine({start:{x:262*sx,y:cover.blue},end:{x:536*sx,y:cover.blue},thickness:1,color:lib.rgb(.62,.75,.89)});
      }
      const sourceImages=m.records.filter(r=>realImage(r,m)).length,outputImages=plan.records.filter(r=>realImage(r,m)).length;
      if(plan.reason!=='cover'&&outputImages<sourceImages)report.review.push({page:output.getPageCount(),sourcePage:i+1,note:'zdjęcia'});
      report.requiredRows.push(...plan.requiredRows);
      report.removedObjects+=Math.max(0,m.records.length-plan.records.length);
      report.pages.push({sourcePage:i+1,outputPage:output.getPageCount(),reason:plan.reason,requiredRows:plan.requiredRows,sourceImages,outputImages});
    }
    onProgress(i+1,models.length);
  }
  return {pdfDoc:output,report};
}

// A second reader confirms that required text survived and that recognisable
// commercial blocks did not. It names the pages at fault instead of rejecting
// the whole file: a page that lost data is rebuilt from the original instead.
export function validateOutputText(pages,report) {
  const compact=s=>norm(s).replace(/\s/g,'').toLowerCase();
  const built=report.pages.filter(p=>p.outputPage!==null);
  if(!Array.isArray(pages)||pages.length!==built.length)return {lost:built.map(p=>p.sourcePage),auction:[]};
  const lost=[],auction=[];
  for(const page of built) {
    const output=compact(pages[page.outputPage-1]);
    const expected=new Map();
    for(const row of page.requiredRows) {
      const key=compact(row);if(key)expected.set(key,(expected.get(key)||0)+1);
    }
    for(const [key,count] of expected)if(output.split(key).length-1<count) {lost.push(page.sourcePage);break;}
    if(auctionLeftover.test(pages[page.outputPage-1]||''))auction.push(page.outputPage);
  }
  return {lost,auction};
}
