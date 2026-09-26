const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');

test('every inline browser script parses',()=>{
 const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(x=>x.trim());
 assert.ok(scripts.length>=3);
 scripts.forEach((script,i)=>assert.doesNotThrow(()=>new vm.Script(script,{filename:'index-inline-'+i+'.js'})));
});
test('travel planner retains required end-to-end controls',()=>{
 for(const id of ['modeIsrael','modeAbroad','dest','from','to','adults','children','aiPrompt','aiBuild','aiAnswer','leadSummary','copyLead','packageLive'])
   assert.match(html,new RegExp('id="'+id+'"'));
 assert.ok(html.includes('bookingHotelsLink(h.name+", "+place)'));
 assert.match(html,/activeAiController\.abort\(\)/);
});

test('native lead form collects details once and sends summary to server',()=>{
 for(const id of ['nativeLeadForm','leadName','leadPhone','leadEmail','leadConsent','leadSubmit','nativeLeadStatus'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/fetch\("\/api\/lead",\{method:"POST"/);
 assert.match(html,/summary:\$\("leadSummary"\)\.textContent/);
 assert.doesNotMatch(html,/<iframe[^>]*formspry/i);
});

test('successful lead submission hides form and shows accessible thank-you',()=>{
 assert.match(html,/\.lead-form form\[hidden\]\{display:none!important\}/);
 assert.match(html,/form\.reset\(\);form\.hidden=true;/);
 assert.match(html,/status\.setAttribute\("tabindex","-1"\);status\.focus\(\)/);
 assert.match(html,/תודה! בקשת החופשה התקבלה בהצלחה/);
});

test('share button offers native sharing and clipboard fallback',()=>{
 assert.match(html,/id="shareSite"/);
 assert.match(html,/navigator\.share/);
 assert.match(html,/navigator\.clipboard\.writeText\(url\)/);
 assert.match(html,/error\.name!=="AbortError"/);
});

test('failed lead submission keeps entered values and shows error state',()=>{
 assert.match(html,/status\.dataset\.state="error"/);
 assert.match(html,/הפרטים שמילאת נשמרו בטופס/);
 assert.match(html,/\.lead-form #nativeLeadStatus\[data-state="error"\]/);
});

test('new lead request resets confirmation and restores form',()=>{
 for(const id of ['newLeadRequest','leadFallback'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/\$\("newLeadRequest"\)\.addEventListener\("click"/);
 assert.match(html,/\$\("nativeLeadForm"\)\.hidden=false/);
 assert.match(html,/\$\("leadFallback"\)\.hidden=true/);
 assert.match(html,/\$\("newLeadRequest"\)\.hidden=false/);
});

test('lead phone input normalizes local and international mobile formats',()=>{
 assert.match(html,/pattern="05\[0-9\]\{8\}"/);
 assert.match(html,/phoneField\.value=phoneField\.value\.replace/);
 assert.match(html,/replace\(\/\^\\\+9720\?\//);
});

test('site includes canonical and social preview metadata',()=>{
 assert.match(html,/<link rel="canonical" href="https:\/\/take-me-v7-full\.vercel\.app\/"/);
 for(const key of ['og:title','og:description','og:image','og:url'])assert.ok(html.includes('property="'+key+'"'));
 assert.match(html,/<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg">/);
});

test('trip sharing uses the current summary and supports clipboard fallback',()=>{
 assert.match(html,/id="shareTrip"/);
 assert.match(html,/\$\("shareTrip"\)\.addEventListener\("click"/);
 assert.match(html,/const summary=\$\("leadSummary"\)\.textContent/);
 assert.match(html,/navigator\.share\(\{title:"תכנון החופשה שלי/);
 assert.match(html,/navigator\.clipboard\.writeText\(summary/);
});

test('WhatsApp sharing encodes itinerary and uses direct handoff',()=>{
 assert.match(html,/id="whatsappTrip"/);
 assert.match(html,/https:\/\/wa\.me\/\?text=/);
 assert.match(html,/encodeURIComponent\(summary\)/);
 assert.match(html,/window\.location\.href=link/);
 assert.doesNotMatch(html,/window\.open\(link,"_blank","noopener,noreferrer"\)/);
});

test('lead submit is guarded against duplicate requests',()=>{
 assert.match(html,/if\(button\.disabled\)return/);
 assert.match(html,/button\.disabled=true;button\.textContent="שולחים…"/);
 assert.match(html,/finally\{button\.disabled=false;button\.textContent="שלח לי הצעה"/);
});
