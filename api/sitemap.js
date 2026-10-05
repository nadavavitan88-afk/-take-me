module.exports = function handler(req,res){
 const proto=String(req.headers["x-forwarded-proto"]||"https").split(",")[0].trim()||"https";
 const host=String(req.headers.host||"").trim();
 if(!host)return res.status(400).send("Missing host");
 const base=proto+"://"+host;
 const updated="2026-10-06";
 const urls=[
  {path:"/",priority:"1.0",changefreq:"weekly"},
  {path:"/privacy.html",priority:"0.3"},
  {path:"/destinations.html",priority:"0.9",changefreq:"weekly"},
  {path:"/terms.html",priority:"0.3"},
  {path:"/accessibility.html",priority:"0.3"},
  {path:"/cyprus.html",priority:"0.8",changefreq:"weekly"},
  {path:"/thailand.html",priority:"0.8",changefreq:"weekly"},
  {path:"/dubai.html",priority:"0.8",changefreq:"weekly"},
  {path:"/greece.html",priority:"0.8",changefreq:"weekly"},
  {path:"/italy.html",priority:"0.8",changefreq:"weekly"},
  {path:"/spain.html",priority:"0.8",changefreq:"weekly"},
  {path:"/prague.html",priority:"0.8",changefreq:"weekly"},
  {path:"/budapest.html",priority:"0.8",changefreq:"weekly"},
  {path:"/barcelona.html",priority:"0.8",changefreq:"weekly"},
  {path:"/marbella.html",priority:"0.8",changefreq:"weekly"}
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