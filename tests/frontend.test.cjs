const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

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

test('site includes absolute canonical and social preview metadata',()=>{
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
 assert.match(html,/button\.disabled=true;button\.classList\.add\("is-loading"\)/);
 assert.match(html,/button\.textContent="שולחים"/);
 assert.match(html,/button\.disabled=false;button\.classList\.remove\("is-loading"\)/);
 assert.match(html,/button\.textContent="שלח לי הצעה"/);
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
 assert.match(html,/url\.searchParams\.set\("utm_source","share"\)/);
 assert.match(html,/url\.searchParams\.set\("utm_campaign","trip_share"\)/);
 assert.match(html,/new URL\("\/",window\.location\.origin\)/);
});


test('affiliate integrations keep verified tracking identifiers',()=>{
 assert.match(html,/camref:"1110lQPq2"/);
 assert.match(html,/creativeref:"1100l68075"/);
 assert.match(html,/adref:"PZTkjr__Gt"/);
 assert.match(html,/partner_id=GJ3WGHV/);
 assert.match(html,/a_aid=Nadavavitan050/);
 assert.match(html,/rel="sponsored noopener"/);
});


test('expanded destination coverage includes Cyprus and Thailand resorts',()=>{
 assert.match(html,/city:"איה נאפה",en:"Ayia Napa",country:"קפריסין"/);
 assert.match(html,/city:"פרוטארס",en:"Protaras",country:"קפריסין"/);
 assert.match(html,/city:"קוסמוי",en:"Koh Samui",country:"תאילנד"/);
 assert.match(html,/city:"צ׳יאנג מאי",en:"Chiang Mai",country:"תאילנד"/);
 assert.match(html,/function destinationScore\(d,q\)/);
 assert.match(html,/slice\(0,14\)/);
});



test('structured search no longer includes a budget field',()=>{
 assert.doesNotMatch(html,/id="budget"/);
 assert.doesNotMatch(html,/<label>תקציב<\/label>/);
 assert.match(html,/יעד, תאריכים ונוסעים/);
});


test('country-only structured search asks for a city or region',()=>{
 assert.match(html,/function exactCountryMatches\(q\)/);
 assert.match(html,/בחר עיר או אזור מתוך/);
 assert.match(html,/renderSuggestions\(\);/);
});


test('SEO files are generated from the active host',()=>{
 const vercel=fs.readFileSync(path.join(root,'vercel.json'),'utf8');
 const sitemapApi=fs.readFileSync(path.join(root,'api','sitemap.js'),'utf8');
 const robotsApi=fs.readFileSync(path.join(root,'api','robots.js'),'utf8');
 assert.match(vercel,/"source": "\/sitemap\.xml"/);
 assert.match(vercel,/"source": "\/robots\.txt"/);
 assert.match(sitemapApi,/req\.headers\.host/);
 assert.match(robotsApi,/req\.headers\.host/);
 assert.doesNotMatch(sitemapApi,/take-me-v7-full\.vercel\.app/);
 assert.doesNotMatch(robotsApi,/take-me-v7-full\.vercel\.app/);
});


test('lead submission has timeout and analytics diagnostics',()=>{
 assert.match(html,/AbortSignal\.timeout\(15000\)/);
 assert.match(html,/lead_submit_success/);
 assert.match(html,/lead_submit_error/);
 assert.match(html,/delivery_formspree/);
 assert.match(html,/delivery_sheets/);
});


test('destination SEO guides are linked and included in sitemap',()=>{
 for(const slug of ['cyprus','thailand','dubai','greece','italy','spain','prague','budapest','barcelona','marbella']){
  assert.ok(html.includes('/'+slug+'.html'));
 }
 const sitemapApi=fs.readFileSync(path.join(root,'api','sitemap.js'),'utf8');
 for(const slug of ['cyprus','thailand','dubai','greece','italy','spain','prague','budapest','barcelona','marbella']){
  assert.ok(sitemapApi.includes('/'+slug+'.html'));
 }
});


test('destination hub is linked and indexed in sitemap',()=>{
 assert.ok(html.includes('/destinations.html'));
 const sitemapApi=fs.readFileSync(path.join(root,'api','sitemap.js'),'utf8');
 assert.ok(sitemapApi.includes('/destinations.html'));
});


test('conversion funnel distinguishes attempts, successful results and CTA sources',()=>{
 assert.match(html,/trackEvent\("search_attempt"/);
 assert.match(html,/trackEvent\("vacation_search"/);
 assert.match(html,/trackEvent\("trip_result_view"/);
 assert.match(html,/trackEvent\("lead_cta_click"/);
 assert.match(html,/trackEvent\("lead_submit_attempt"/);
 assert.match(html,/let lastLeadSource="unknown"/);
 assert.match(html,/lead_cta_source:lastLeadSource/);
 assert.match(html,/id="resultLeadCta">קבל הצעה אישית</);
});


test('homepage keeps the simplified flow and matching FAQ content',()=>{
 assert.match(html,/id="howItWorks"/);
 assert.match(html,/איך זה עובד\?/);
 assert.match(html,/האם ההזמנה מתבצעת בתוך TAKE ME/);
 assert.match(html,/אפשר לחפש כל יעד בעולם/);
});


test('outbound partner clicks are tracked by provider and service',()=>{
 assert.match(html,/function outboundPartnerMeta\(id\)/);
 for(const id of ['resExpediaFlights','resExpediaHotels','resBookingHotels','resAgodaHotels','packageLive','gyg','car','esim']){
  assert.ok(html.includes('"'+id+'"'));
 }
 assert.match(html,/trackEvent\("outbound_click"/);
 assert.match(html,/trackEvent\("outbound_"\+meta\.provider/);
 for(const provider of ['discovercars','getyourguide','airalo']){
  assert.ok(html.includes(provider));
 }
});


test('AI recommendations preserve useful metadata and can feed the main search funnel',()=>{
 const plan=fs.readFileSync(path.join(root,'api','plan.js'),'utf8');
 assert.ok(plan.includes('vibe:clean(x.vibe)'));
 assert.ok(plan.includes('estimatedBudget:clean(x.estimatedBudget)'));
 assert.match(html,/function aiRecommendationMeta\(d\)/);
 assert.match(html,/class="btn brown ai-use-destination"/);
 assert.match(html,/trackEvent\("ai_destination_selected"/);
 assert.match(html,/trackEvent\("ai_results_view"/);
 assert.match(html,/trackEvent\("ai_outbound_click"/);
});


test('homepage omits popular destination chips',()=>{
 assert.doesNotMatch(html,/hero-destinations/);
 assert.doesNotMatch(html,/יעדים פופולריים/);
});


test('AI can infer traveler counts and keep country-scoped discovery inside one country',()=>{
 const plan=fs.readFileSync(path.join(root,'api','plan.js'),'utf8');
 assert.match(html,/function findCountryMention\(raw\)/);
 assert.match(html,/function inferAiTravelers\(raw\)/);
 assert.match(html,/countryHint:countryMention/);
 assert.ok(plan.includes('const countryHint = String(body.countryHint'));
 assert.ok(plan.includes('אם נמסרה מדינה בלבד'));
 assert.ok(plan.includes('recommendations = recommendations.filter'));
});


test('Expedia flight link carries route dates and passengers into search',()=>{
 assert.match(html,/go\/flight\/search\/Roundtrip/);
 assert.match(html,/FromAirport/);
 assert.match(html,/ToAirport/);
 assert.match(html,/NumAdult/);
 assert.match(html,/NumChild/);
 assert.match(html,/Child"\+\(i\+1\)\+"Age/);
});


test('Expedia hotel and package links keep trip details',()=>{
 assert.match(html,/go\/hotel\/search\/Destination/);
 assert.match(html,/CityName/);
 assert.match(html,/NumAdult-Room1/);
 assert.match(html,/NumChild-Room1/);
 assert.match(html,/go\/package\/search\/FlightHotel/);
 assert.ok(html.includes('params.set("FromTime","362")'));
 assert.ok(html.includes('params.set("ToTime","362")'));
});


test('Google Flights and Agoda links preserve trip context',()=>{
 assert.match(html,/function googleFlightLink\(d\)/);
 assert.match(html,/round trip flights from/);
 assert.match(html,/curr:"ILS"/);
 assert.match(html,/function agodaHotelsLink\(place\)/);
 assert.match(html,/textToSearch:place/);
 assert.match(html,/checkIn:\$\("from"\)\.value/);
 assert.match(html,/checkOut:\$\("to"\)\.value/);
});


test('trip search state is saved locally without storing lead contact details',()=>{
 assert.match(html,/const TRIP_STORAGE_KEY="take_me_trip_v1"/);
 assert.match(html,/function saveTripState\(\)/);
 assert.match(html,/function restoreSavedTrip\(\)/);
 assert.match(html,/localStorage\.setItem\(TRIP_STORAGE_KEY/);
 assert.match(html,/restoreSavedTrip\(\);/);
 const saveBlock=html.slice(html.indexOf('function saveTripState()'),html.indexOf('function queueTripSave()'));
 assert.doesNotMatch(saveBlock,/leadName|leadPhone|leadEmail/);
});


test('PWA service worker is registered and avoids caching API traffic',()=>{
 assert.match(html,/navigator\.serviceWorker\.register\("\/sw\.js"\)/);
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.ok(sw.includes('url.pathname.startsWith("/api/")'));
 assert.ok(sw.includes('"/offline.html"'));
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
 assert.equal(manifest.display,'standalone');
 assert.ok(Array.isArray(manifest.shortcuts)&&manifest.shortcuts.length>=3);
});


test('restored trip state is explained to the user and measured',()=>{
 assert.match(html,/const restoredSavedTrip=restoreSavedTrip\(\)/);
 assert.match(html,/החיפוש האחרון שלך נטען אוטומטית/);
 assert.match(html,/trackEvent\("trip_state_restored"/);
});


test('main search supports labels, autocomplete semantics and keyboard submit',()=>{
 assert.match(html,/label for="origin"/);
 assert.match(html,/label for="dest"/);
 assert.match(html,/aria-autocomplete="list"/);
 assert.match(html,/role="listbox"/);
 assert.match(html,/role="option"/);
 assert.match(html,/\$\("dest"\)\.addEventListener\("keydown"/);
 assert.match(html,/e\.key==="ArrowDown"/);
 assert.match(html,/method:"keyboard"/);
});


test('trip results expose three primary comparison categories',()=>{
 for(const step of ['flights','hotels','car'])assert.match(html,new RegExp('data-compare="'+step+'"'));
 for(const id of ['compareFlightsDrawer','compareHotelsDrawer','compareCarDrawer','resultCar'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/data-next-step="hotels"/);
 assert.match(html,/data-next-step="car"/);
 assert.match(html,/travelMode==="israel"\?\["hotels","car"\]/);
 assert.match(html,/resultCar:\{provider:/);
 assert.match(html,/data-compare="attractions"/);
 assert.match(html,/id="resultAttractionsMaps"/);
 assert.match(html,/אטרקציות ביעד · שירות משלים/);
});


test('trip result keeps one clear build flow and site sharing',()=>{
 assert.match(html,/id="build">בנה לי חופשה/);
 assert.match(html,/id="shareSite"/);
 assert.match(html,/id="shareTrip">שתף את החופשה/);
 assert.match(html,/function openCompareDrawer\(type\)/);
 assert.match(html,/trackEvent\("trip_builder_complete"/);
});


test('AI and lead submission show reliable loading states',()=>{
 assert.match(html,/classList\.add\("is-loading"\)/);
 assert.match(html,/setAttribute\("aria-busy","true"\)/);
 assert.match(html,/document\.querySelectorAll\("\.ai-chip"\)\.forEach\(chip=>chip\.disabled=true\)/);
 assert.match(html,/document\.querySelectorAll\("\.ai-chip"\)\.forEach\(chip=>chip\.disabled=false\)/);
 assert.match(html,/החיפוש התארך מהרגיל/);
 assert.doesNotMatch(html,/החיפוש התארך מעבר ל־10 שניות/);
});


test('mobile comparison shows four tabs and keeps destination guide collapsed by default',()=>{
 assert.match(html,/\.result\.show \.trip-steps\{display:grid!important;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(html,/data-compare="attractions"/);
 assert.match(html,/<details class="destination-info" id="destinationInfo">/);
 assert.match(html,/<summary class="destination-info-toggle">/);
 assert.match(html,/if\(info\)info\.open=true/);
});
