// Optional authorized hotel feed. Never invent prices.
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 const origin=String(req.headers?.origin||""),host=String(req.headers?.host||"");
 if(origin){try{if(new URL(origin).host!==host)return res.status(403).json({ok:false,error:"Origin not allowed"});}catch{return res.status(403).json({ok:false,error:"Origin not allowed"});}}
 if(req.method!=="POST")return res.status(405).json({ok:false,error:"Method not allowed"});
 const body=req.body&&typeof req.body==="object"?req.body:{};
 const destination=String(body.destination||"").trim().slice(0,140);
 const checkin=String(body.checkin||""),checkout=String(body.checkout||"");
 const adults=Number(body.adults),children=Array.isArray(body.children)?body.children:[];
 const validDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+"T00:00:00Z"));
 if(!destination||!validDate(checkin)||!validDate(checkout)||checkout<=checkin||!Number.isInteger(adults)||adults<1||adults>6||children.length>5||adults+children.length>6||!children.every(n=>Number.isInteger(n)&&n>=0&&n<=17))
  return res.status(400).json({ok:false,error:"Invalid hotel search"});
 const endpoint=String(process.env.HOTEL_OFFERS_ENDPOINT||"").trim();
 if(!endpoint)return res.status(200).json({ok:true,connected:false,offers:[]});
 let url;
 try{url=new URL(endpoint);if(url.protocol!=="https:"||url.username||url.password||/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname))throw Error("Unsafe endpoint");}
 catch{return res.status(200).json({ok:true,connected:false,offers:[]});}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
 try{
  const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",...(process.env.HOTEL_OFFERS_API_KEY?{"Authorization":"Bearer "+process.env.HOTEL_OFFERS_API_KEY}:{})},body:JSON.stringify({destination,checkin,checkout,adults,children,currency:"ILS",rooms:1}),signal:controller.signal,redirect:"error"});
  if(!response.ok)return res.status(200).json({ok:true,connected:true,offers:[],status:"upstream_unavailable"});
  const payload=await response.json();
  if(payload?.checkin!==checkin||payload?.checkout!==checkout||Number(payload?.adults)!==adults||JSON.stringify(payload?.children||[])!==JSON.stringify(children)||payload?.currency!=="ILS")
   return res.status(200).json({ok:true,connected:true,offers:[],status:"search_mismatch"});
  const seen=new Set();
  const offers=(Array.isArray(payload.offers)?payload.offers:[]).map(item=>{
   const hotel=String(item?.hotel||"").trim().slice(0,120),provider=String(item?.provider||"").trim().slice(0,70),totalPrice=Number(item?.totalPrice),currency=String(item?.currency||""),quotedAt=String(item?.quotedAt||"");
   let bookingUrl="";
   try{const u=new URL(String(item?.bookingUrl||""));if(u.protocol==="https:"&&!u.username&&!u.password)bookingUrl=u.toString();}catch{}
   const age=Date.now()-Date.parse(quotedAt);
   if(!hotel||!provider||!bookingUrl||currency!=="ILS"||!Number.isFinite(totalPrice)||totalPrice<=0||!Number.isFinite(age)||age<0||age>30*60*1000)return null;
   return {hotel,provider,totalPrice:Math.round(totalPrice),currency:"ILS",bookingUrl,quotedAt};
  }).filter(Boolean).sort((a,b)=>a.totalPrice-b.totalPrice).filter(item=>{const key=item.hotel.toLowerCase()+"|"+item.provider.toLowerCase();if(seen.has(key))return false;seen.add(key);return true;}).slice(0,5);
  return res.status(200).json({ok:true,connected:true,offers,status:offers.length?"quotes_available":"no_quotes",priceBasis:"total_stay",currency:"ILS"});
 }catch(error){console.error("TAKE ME hotel feed unavailable",error?.name||"Error");return res.status(200).json({ok:true,connected:true,offers:[],status:"upstream_unavailable"});}
 finally{clearTimeout(timer);}
}
