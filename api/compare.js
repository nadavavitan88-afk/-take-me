export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 const originHeader=String(req.headers?.origin||"");
 const host=String(req.headers?.host||"");
 if(originHeader){
  try{
   if(new URL(originHeader).host!==host)return res.status(403).json({ok:false,error:"Origin not allowed"});
  }catch{return res.status(403).json({ok:false,error:"Origin not allowed"});}
 }
 if(req.method!=="POST")return res.status(405).json({ok:false,error:"Method not allowed"});

 const token=String(process.env.TRAVELPAYOUTS_TOKEN||"").trim();
 if(!token)return res.status(200).json({ok:true,connected:false,source:"travelpayouts",sources:[],fares:[]});

 const body=req.body&&typeof req.body==="object"?req.body:{};
 const origin=String(body.origin||"").trim().toUpperCase();
 const destination=String(body.destination||"").trim().toUpperCase();
 const departure=String(body.departure||"").trim();
 const returnDate=String(body.returnDate||"").trim();

 if(!/^[A-Z]{3}$/.test(origin)||!/^[A-Z]{3}$/.test(destination))return res.status(400).json({ok:false,error:"Invalid route"});
 if(!/^\d{4}-\d{2}-\d{2}$/.test(departure)||!/^\d{4}-\d{2}-\d{2}$/.test(returnDate))return res.status(400).json({ok:false,error:"Invalid dates"});

 try{
  const params=new URLSearchParams({
   origin,
   destination,
   departure_at:departure,
   return_at:returnDate,
   unique:"false",
   sorting:"price",
   direct:"false",
   currency:"ils",
   limit:"10",
   page:"1",
   one_way:"false"
  });
  const upstream=await fetch("https://api.travelpayouts.com/aviasales/v3/prices_for_dates?"+params.toString(),{
   headers:{"X-Access-Token":token}
  });
  if(!upstream.ok)return res.status(200).json({ok:true,connected:true,source:"travelpayouts",sources:[{id:"travelpayouts_data",type:"flight_reference",status:"connected",fares:[]}],fares:[],upstreamStatus:upstream.status});

  const payload=await upstream.json();
  const rows=Array.isArray(payload?.data)?payload.data:[];
  const exact=rows.filter(x=>{
   const d=String(x.departure_at||x.depart_date||"").slice(0,10);
   const r=String(x.return_at||x.return_date||"").slice(0,10);
   return d===departure&&r===returnDate;
  });
  const sourceRows=exact;
  const fares=sourceRows
   .map(x=>({
    price:Number(x.price??x.value),
    airline:String(x.airline||""),
    transfers:Number(x.transfers??x.number_of_changes??0),
    returnTransfers:Number(x.return_transfers??0),
    departureAt:String(x.departure_at||x.depart_date||""),
    returnAt:String(x.return_at||x.return_date||""),
    foundAt:String(x.found_at||"")
   }))
   .filter(x=>Number.isFinite(x.price)&&x.price>0)
   .sort((a,b)=>a.price-b.price)
   .slice(0,5);

  const sources=[{
   id:"travelpayouts_data",
   type:"flight_reference",
   status:"connected",
   freshness:"cached_last_48_hours",
   fares
  }];

  return res.status(200).json({
   ok:true,
   connected:true,
   source:"travelpayouts",
   freshness:"cached_last_48_hours",
   sources,
   priceBasis:"per_person_reference",
   fares
  });
 }catch(error){
  console.error("TAKE ME compare error",{name:error?.name||"Error",message:error?.message||"unknown"});
  return res.status(200).json({ok:true,connected:true,source:"travelpayouts",sources:[{id:"travelpayouts_data",type:"flight_reference",status:"error",fares:[]}],fares:[]});
 }
}
