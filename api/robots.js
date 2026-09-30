module.exports = function handler(req,res){
 const proto=String(req.headers["x-forwarded-proto"]||"https").split(",")[0].trim()||"https";
 const host=String(req.headers.host||"").trim();
 if(!host)return res.status(400).send("Missing host");
 const base=proto+"://"+host;
 const body="User-agent: *\nAllow: /\n\nSitemap: "+base+"/sitemap.xml\n";
 res.setHeader("Content-Type","text/plain; charset=utf-8");
 res.setHeader("Cache-Control","public, max-age=0, s-maxage=3600");
 return res.status(200).send(body);
};