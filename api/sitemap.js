module.exports = function handler(req,res){
 const proto=String(req.headers["x-forwarded-proto"]||"https").split(",")[0].trim()||"https";
 const host=String(req.headers.host||"").trim();
 if(!host)return res.status(400).send("Missing host");
 const base=proto+"://"+host;
 const updated="2026-09-30";
 const urls=[
  {path:"/",priority:"1.0",changefreq:"weekly"},
  {path:"/privacy.html",priority:"0.3"},
  {path:"/terms.html",priority:"0.3"}
 ];
 const body='<?xml version="1.0" encoding="UTF-8"?>\n'
  +'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  +urls.map(x=>'  <url><loc>'+base+x.path+'</loc><lastmod>'+updated+'</lastmod>'
    +(x.changefreq?'<changefreq>'+x.changefreq+'</changefreq>':'')
    +'<priority>'+x.priority+'</priority></url>').join("\n")
  +'\n</urlset>\n';
 res.setHeader("Content-Type","application/xml; charset=utf-8");
 res.setHeader("Cache-Control","public, max-age=0, s-maxage=3600");
 return res.status(200).send(body);
};