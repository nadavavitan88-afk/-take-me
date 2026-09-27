const FORM_URL = "https://formspree.io/f/mrpbyjar";
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbyw-gK7cevf8cRPDTO9Kg23n31ieqhe9kwhoTt-1ay5u6CvBQpl6hap1uGeNy0xHYRq/exec";

export default async function handler(req,res){
 if(req.method!=="POST"){
  res.setHeader("Allow","POST");
  return res.status(405).json({ok:false,error:"Method not allowed"});
 }

 try{
  const {name,phone,email="",summary,consent}=req.body||{};

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

  const payload={
   name:name.trim(),
   phone,
   email:email.trim(),
   message:summary,
   summary,
   consent:"Yes",
   _subject:"TAKE ME — בקשת חופשה חדשה"
  };

  const [formspreeResult] = await Promise.allSettled([
   fetch(FORM_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json","Accept":"application/json"},
    body:JSON.stringify(payload),
    signal:AbortSignal.timeout(10000)
   }),
   fetch(SHEETS_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload),
    signal:AbortSignal.timeout(10000)
   })
  ]);

  if(formspreeResult.status!=="fulfilled"){
   return res.status(502).json({ok:false,error:"שירות הפניות אינו זמין כרגע"});
  }

  const response=formspreeResult.value;
  const type=response.headers.get("content-type")||"";
  const body=type.includes("json")?await response.json().catch(()=>null):null;

  if(!response.ok||!body||body.ok!==true){
   return res.status(response.status===429?429:502).json({
    ok:false,
    error:response.status===429
     ?"יותר מדי פניות כרגע. נסו שוב בעוד דקה."
     :"לא התקבל אישור קליטה מהשירות"
   });
  }

  return res.status(200).json({ok:true});
 }catch{
  return res.status(502).json({ok:false,error:"שירות הפניות אינו זמין כרגע"});
 }
}
