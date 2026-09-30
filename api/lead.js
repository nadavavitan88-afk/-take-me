const FORM_URL = "https://formspree.io/f/mrpbyjar";
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbyw-gK7cevf8cRPDTO9Kg23n31ieqhe9kwhoTt-1ay5u6CvBQpl6hap1uGeNy0xHYRq/exec";

export default async function handler(req,res){
 res.setHeader("Content-Type","application/json; charset=utf-8");
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST"){
  res.setHeader("Allow","POST");
  return res.status(405).json({ok:false,error:"Method not allowed"});
 }

 try{
  const {name,phone,email="",fax="",summary,consent,attribution={}}=req.body||{};

  // Honeypot: bots often fill every field. Return success without forwarding.
  if(typeof fax==="string"&&fax.trim()){
   return res.status(200).json({ok:true});
  }

  if(
   typeof name!=="string"||!name.trim()||name.length>100||
   typeof phone!=="string"||!/^05\d{8}$/.test(phone)||
   typeof summary!=="string"||!summary.trim()||summary.length>10000||
   consent!==true||
   typeof email!=="string"||email.length>254||
   (email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ){
   return res.status(400).json({ok:false,error:"פרטי הפנייה אינם תקינים"});
  }

  const safeAttribution={
   traffic_source:typeof attribution?.traffic_source==="string"?attribution.traffic_source.slice(0,120):"direct",
   traffic_medium:typeof attribution?.traffic_medium==="string"?attribution.traffic_medium.slice(0,120):"none",
   traffic_campaign:typeof attribution?.traffic_campaign==="string"?attribution.traffic_campaign.slice(0,160):"none",
   click_id:typeof attribution?.click_id==="string"?attribution.click_id.slice(0,240):""
  };

  const payload={
   name:name.trim(),
   phone,
   email:email.trim(),
   message:summary,
   summary,
   consent:"Yes",
   ...safeAttribution,
   _subject:"TAKE ME — בקשת חופשה חדשה"
  };

  const [formspreeResult,sheetsResult] = await Promise.allSettled([
   fetch(FORM_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json","Accept":"application/json"},
    body:JSON.stringify(payload),
    signal:AbortSignal.timeout(10000)
   }),
   fetch(SHEETS_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json","Accept":"application/json"},
    body:JSON.stringify(payload),
    signal:AbortSignal.timeout(10000)
   })
  ]);

  let formspreeOk=false;
  let formspreeRateLimited=false;
  if(formspreeResult.status==="fulfilled"){
   const response=formspreeResult.value;
   formspreeRateLimited=response.status===429;
   const type=response.headers.get("content-type")||"";
   const body=type.includes("json")?await response.json().catch(()=>null):null;
   formspreeOk=response.ok&&body?.ok===true;
  }

  let sheetsOk=false;
  if(sheetsResult.status==="fulfilled"){
   const response=sheetsResult.value;
   const type=response.headers.get("content-type")||"";
   const body=type.includes("json")?await response.json().catch(()=>null):null;
   sheetsOk=response.ok&&body?.ok===true;
  }

  // Do not lose a lead if one delivery channel has a temporary problem.
  if(formspreeOk||sheetsOk){
   return res.status(200).json({
    ok:true,
    channels:{formspree:formspreeOk,sheets:sheetsOk}
   });
  }

  return res.status(formspreeRateLimited?429:502).json({
   ok:false,
   error:formspreeRateLimited
    ?"יותר מדי פניות כרגע. נסו שוב בעוד דקה."
    :"שירות הפניות אינו זמין כרגע"
  });
 }catch{
  return res.status(502).json({ok:false,error:"שירות הפניות אינו זמין כרגע"});
 }
}
