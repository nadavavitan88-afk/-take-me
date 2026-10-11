const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const source=fs.readFileSync(path.join(__dirname,"../api/hotels.js"),"utf8");
const handlerPromise=import("data:text/javascript;base64,"+Buffer.from(source).toString("base64")).then(m=>m.default);
function mockRes(){
 return {code:200,body:null,setHeader(){},status(code){this.code=code;return this;},json(data){this.body=data;return this;}};
}
const valid={destination:"Dubai, UAE",checkin:"2026-12-10",checkout:"2026-12-14",adults:2,children:[5]};
test("no supplier feed means no prices",async()=>{
 const handler=await handlerPromise,res=mockRes();
 const prev=process.env.HOTEL_OFFERS_ENDPOINT;delete process.env.HOTEL_OFFERS_ENDPOINT;
 try{await handler({method:"POST",headers:{host:"example.com"},body:valid},res);assert.equal(res.code,200);assert.equal(res.body.connected,false);assert.deepEqual(res.body.offers,[]);}
 finally{if(prev!==undefined)process.env.HOTEL_OFFERS_ENDPOINT=prev;}
});
test("invalid dates and guests are rejected",async()=>{
 const handler=await handlerPromise,res=mockRes();
 await handler({method:"POST",headers:{host:"example.com"},body:{...valid,checkout:valid.checkin}},res);
 assert.equal(res.code,400);
});
test("supplier offers are validated, sorted, and limited to five",async()=>{
 const handler=await handlerPromise,prevUrl=process.env.HOTEL_OFFERS_ENDPOINT,prevFetch=global.fetch;
 process.env.HOTEL_OFFERS_ENDPOINT="https://partner.example.com/search";
 const now=new Date().toISOString();
 const offers=Array.from({length:7},(_,i)=>({hotel:"Hotel "+i,provider:"Supplier",totalPrice:700-i*50,currency:"ILS",bookingUrl:"https://partner.example.com/book/"+i,quotedAt:now}));
 offers.push({hotel:"Stale",provider:"Supplier",totalPrice:1,currency:"ILS",bookingUrl:"https://partner.example.com/book/stale",quotedAt:"2020-01-01T00:00:00Z"});
 global.fetch=async()=>({ok:true,json:async()=>({...valid,currency:"ILS",offers})});
 try{
  const res=mockRes();await handler({method:"POST",headers:{host:"example.com"},body:valid},res);
  assert.equal(res.code,200);assert.equal(res.body.offers.length,5);
  assert.equal(res.body.offers[0].totalPrice,400);
  assert.equal(res.body.offers[4].totalPrice,600);
  assert.equal(res.body.priceBasis,"total_stay");
 }finally{global.fetch=prevFetch;if(prevUrl===undefined)delete process.env.HOTEL_OFFERS_ENDPOINT;else process.env.HOTEL_OFFERS_ENDPOINT=prevUrl;}
});
test("mismatched supplier dates are never displayed",async()=>{
 const handler=await handlerPromise,prevUrl=process.env.HOTEL_OFFERS_ENDPOINT,prevFetch=global.fetch;
 process.env.HOTEL_OFFERS_ENDPOINT="https://partner.example.com/search";
 global.fetch=async()=>({ok:true,json:async()=>({...valid,checkin:"2026-12-11",currency:"ILS",offers:[{hotel:"Example",provider:"Supplier",totalPrice:500,currency:"ILS",bookingUrl:"https://partner.example.com/book",quotedAt:new Date().toISOString()}]})});
 try{const res=mockRes();await handler({method:"POST",headers:{host:"example.com"},body:valid},res);assert.deepEqual(res.body.offers,[]);assert.equal(res.body.status,"search_mismatch");}
 finally{global.fetch=prevFetch;if(prevUrl===undefined)delete process.env.HOTEL_OFFERS_ENDPOINT;else process.env.HOTEL_OFFERS_ENDPOINT=prevUrl;}
});
