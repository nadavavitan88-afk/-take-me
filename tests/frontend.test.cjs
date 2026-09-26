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
