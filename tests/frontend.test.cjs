const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');

test('every inline browser script parses',()=>{
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
   .filter(m=>!/application\/ld\+json/i.test(m[1]))
   .map(m=>m[2]).filter(x=>x.trim());
 assert.ok(scripts.length>=2);
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
 assert.match(html,/navigator\.clipboard\.writeText\(message/);
});

test('single trip share button provides restorable link',()=>{
 assert.match(html,/id="shareTrip">שתף את החופשה/);
 assert.doesNotMatch(html,/id="whatsappTrip"/);
 assert.match(html,/navigator\.share\(\{title:"תכנון החופשה שלי/);
 assert.match(html,/tripShareUrl\(\)/);
 assert.match(html,/text:summary,url/);
});

test('lead submit is guarded against duplicate requests',()=>{
 assert.match(html,/if\(button\.disabled\)return/);
 assert.match(html,/button\.disabled=true;button\.textContent="שולחים…"/);
 assert.match(html,/finally\{button\.disabled=false;button\.textContent="שלח לי הצעה"/);
});

test('shared itinerary links restore travel details',()=>{
 assert.match(html,/function tripShareUrl\(\)/);
 assert.match(html,/function restoreSharedTrip\(\)/);
 assert.match(html,/url\.searchParams\.set\(key,value\)/);
 assert.match(html,/restoreSharedTrip\(\);/);
 assert.match(html,/tripShareUrl\(\)/);
 assert.match(html,/new URLSearchParams\(window\.location\.search\)/);
});

test('valid shared itinerary immediately builds result and invalid dates require correction',()=>{
 assert.match(html,/if\(validTravelDates\(\)&&validChildAges\(\)&&Number\(\$\("adults"\)\.value\)>=1&&Number\(\$\("adults"\)\.value\)\+Number\(\$\("children"\)\.value\)<=6\)/);
 assert.match(html,/buildTrip\(\);\s*\$\("status"\)\.textContent="החופשה ששותפה נטענה/);
 assert.match(html,/יש לעדכן תאריכים או גילאי ילדים/);
});

test('sharing accepts free-text destinations but rejects missing destination, invalid dates and incomplete child ages',()=>{
 assert.match(html,/if\(!resolveDestination\(\$\("dest"\)\.value\)\)/);
 assert.match(html,/if\(!validTravelDates\(\)\)/);
 assert.match(html,/if\(!validChildAges\(\)\|\|Number\(\$\("adults"\)\.value\)<1\|\|Number\(\$\("adults"\)\.value\)\+Number\(\$\("children"\)\.value\)>6\)/);
 assert.match(html,/כדי לשתף חופשה, יש לכתוב יעד/);
 assert.match(html,/function resolveDestination\(q\)/);
 assert.match(html,/בכל העולם — גם אם היעד לא ברשימה/);
});

test('shared trips restore explicit mode and reject zero adults',()=>{
 assert.match(html,/setTravelMode\(params\.get\("mode"\)\)/);
 assert.match(html,/Number\(\$\("adults"\)\.value\)>=1/);
 assert.match(html,/Number\(\$\("adults"\)\.value\)<1/);
});

test('shared trip reveals results and highlights details needing correction',()=>{
 assert.match(html,/\$\("result"\)\.scrollIntoView\(\{behavior:"smooth",block:"start"\}\)/);
 assert.match(html,/\$\("status"\)\.classList\.add\("error"\)/);
});


test('lead form includes privacy consent and anti-spam honeypot',()=>{
 assert.match(html,/href="\/privacy\.html"/);
 assert.match(html,/id="leadFax"/);
 assert.match(html,/fax:\$\("leadFax"\)\.value\.trim\(\)/);
});

test('marketing attribution is attached to shared links',()=>{
 assert.match(html,/utm_source=share/);
 assert.match(html,/url\.searchParams\.set\("utm_campaign","trip_share"\)/);
});


test('affiliate integrations keep verified tracking identifiers',()=>{
 assert.match(html,/data-camref="1101l6tkXW"/);
 assert.match(html,/data-network="pz"/);
 assert.match(html,/partner_id=GJ3WGHV/);
 assert.match(html,/a_aid=Nadavavitan050/);
 assert.match(html,/Allianceid=10594354&SID=331399748&trip_sub1=take_me_site/);
});
