const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/lead.js');

function makeRes(){
 return {
  headers:{},
  setHeader(k,v){this.headers[k]=v;},
  status(code){this.code=code;return this;},
  json(body){this.body=body;return this;}
 };
}
function response({ok=true,status=200,body={ok:true}}={}){
 return {
  ok,status,
  headers:{get:(k)=>String(k).toLowerCase()==='content-type'?'application/json':null},
  json:async()=>body
 };
}
function validBody(extra={}){
 return {
  name:'בדיקת TAKE ME',
  phone:'0501234567',
  email:'test@example.com',
  fax:'',
  summary:'בקשת בדיקה אוטומטית',
  consent:true,
  attribution:{traffic_source:'facebook',traffic_medium:'paid_social',traffic_campaign:'qa_campaign',click_id:'abc123'},
  ...extra
 };
}

test('lead API accepts a valid lead when at least one delivery channel succeeds',async()=>{
 const originalFetch=global.fetch;
 const calls=[];
 global.fetch=async(url,options)=>{
  calls.push({url,body:JSON.parse(options.body)});
  if(String(url).includes('formspree'))return response({ok:false,status:500,body:{ok:false}});
  return response();
 };
 try{
  const res=makeRes();
  await handler({method:'POST',headers:{host:'take-me.test',origin:'https://take-me.test'},body:validBody()},res);
  assert.equal(res.code,200);
  assert.equal(res.body.ok,true);
  assert.deepEqual(res.body.channels,{formspree:false,sheets:true});
  assert.equal(calls.length,2);
  for(const call of calls){
   assert.equal(call.body.traffic_source,'facebook');
   assert.equal(call.body.traffic_medium,'paid_social');
   assert.equal(call.body.traffic_campaign,'qa_campaign');
   assert.equal(call.body.click_id,'abc123');
   assert.equal(call.body.phone,'0501234567');
  }
 }finally{global.fetch=originalFetch;}
});

test('lead API blocks cross-origin browser requests',async()=>{
 const originalFetch=global.fetch;
 let called=false;
 global.fetch=async()=>{called=true;return response();};
 try{
  const res=makeRes();
  await handler({method:'POST',headers:{host:'take-me.test',origin:'https://evil.example'},body:validBody()},res);
  assert.equal(res.code,403);
  assert.equal(res.body.ok,false);
  assert.equal(called,false);
 }finally{global.fetch=originalFetch;}
});

test('lead API honeypot silently accepts bot submissions without forwarding',async()=>{
 const originalFetch=global.fetch;
 let called=false;
 global.fetch=async()=>{called=true;return response();};
 try{
  const res=makeRes();
  await handler({method:'POST',headers:{host:'take-me.test',origin:'https://take-me.test'},body:validBody({fax:'bot-value'})},res);
  assert.equal(res.code,200);
  assert.equal(res.body.ok,true);
  assert.equal(called,false);
 }finally{global.fetch=originalFetch;}
});

test('lead API rejects invalid contact details',async()=>{
 const originalFetch=global.fetch;
 let called=false;
 global.fetch=async()=>{called=true;return response();};
 try{
  const res=makeRes();
  await handler({method:'POST',headers:{host:'take-me.test',origin:'https://take-me.test'},body:validBody({phone:'123'})},res);
  assert.equal(res.code,400);
  assert.equal(res.body.ok,false);
  assert.equal(called,false);
 }finally{global.fetch=originalFetch;}
});

test('lead API returns 429 when Formspree rate-limits and Sheets also fails',async()=>{
 const originalFetch=global.fetch;
 global.fetch=async(url)=>{
  if(String(url).includes('formspree'))return response({ok:false,status:429,body:{ok:false}});
  return response({ok:false,status:500,body:{ok:false}});
 };
 try{
  const res=makeRes();
  await handler({method:'POST',headers:{host:'take-me.test',origin:'https://take-me.test'},body:validBody()},res);
  assert.equal(res.code,429);
  assert.equal(res.body.ok,false);
 }finally{global.fetch=originalFetch;}
});
