const FORM_URL = "https://formspry.com/f/cmuis5rb60001lk5lrdh5pr9b";
export default async function handler(req,res){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({ok:false,error:"Method not allowed"});}
 try{
  const {name,phone,email="",summary,consent}=req.body||{};
  if(typeof name!=="string"||!name.trim()||name.length>100||typeof phone!=="string"||!/^0\d{8,9}$/.test(phone)||typeof summary!=="string"||!summary.trim()||summary.length>10000||consent!==true||typeof email!=="string"||email.length>254||email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({ok:false,error:"פרטי הפנייה אינם תקינים"});
  const data=new URLSearchParams({"f_rap1nfs":name.trim(),"f_q4syj98":phone,"f_bidqjnv":email.trim(),"f_rtf0u3a":summary});
  const response=await fetch(FORM_URL,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json"},body:data.toString(),redirect:"manual",signal:AbortSignal.timeout(10000)});
  const type=response.headers.get("content-type")||"";
  const body=type.includes("json")?await response.json().catch(()=>null):null;
  // Formspry has no verified public submission contract. Never treat a redirect or HTML page as proof of storage.
  if(!response.ok||!body||body.success!==true)return res.status(502).json({ok:false,error:"לא התקבל אישור קליטה מהשירות"});
  return res.status(200).json({ok:true});
 }catch{return res.status(502).json({ok:false,error:"שירות הפניות אינו זמין כרגע"});}
}
