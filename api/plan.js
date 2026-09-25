module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") return res.status(405).json({error:"Method not allowed"});
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(500).json({ error: "Gemini is not configured" });
  }

  const body = req.body || {};
  const userPrompt = String(body.prompt || "").trim().slice(0, 1800);
  const children = Number(body.children ?? 0);
  const ages = body.childAges;
  const adults = Number(body.adults ?? 2);
  if (!Number.isInteger(adults) || adults < 1 || adults > 6 || adults + children < 1 || adults + children > 6) {
    return res.status(400).json({error:"יש לבחור בין נוסע אחד לשישה נוסעים בסך הכול"});
  }
  if (!Number.isInteger(children) || children < 0 || children > 5 ||
      (children > 0 && (!Array.isArray(ages) || ages.length !== children ||
        ages.some(age => !Number.isInteger(age) || age < 0 || age > 17)))) {
    return res.status(400).json({ error: "נא לבחור גיל תקין לכל ילד" });
  }

  const from = String(body.from || ""), to = String(body.to || "");
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  const dateParts = Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Jerusalem",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).map(p=>[p.type,p.value]));
  const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  if (!validDate(from) || !validDate(to) || from < today || to <= from) {
    return res.status(400).json({error:"יש לבחור תאריכי יציאה וחזרה עתידיים ותקינים"});
  }
  if (typeof body.destination === "string" && body.destination.length > 100) {
    return res.status(400).json({error:"יעד לא תקין"});
  }

  if (userPrompt.length < 5) {
    return res.status(400).json({ error: "נא לתאר את החופשה בכמה מילים" });
  }

  const systemPrompt = `
אתה מנוע תכנון החופשות של TAKE ME עבור קהל ישראלי.
ענה בעברית בלבד.

כלל חשוב מאוד:
- אם המשתמש ציין יעד ספציפי וברור, למשל "דובאי", "רומא", "לימסול" או כל עיר/אי/אזור אחר — אל תציע יעדים חלופיים.
- במקרה כזה החזר המלצה אחת בלבד לאותו יעד בדיוק, מותאמת לבקשה שלו.
- אם המשתמש לא ציין יעד ספציפי — הצע בדיוק 3 יעדים שונים שמתאימים לבקשה.

אל תטען שיש לך מחירי טיסות, מלונות או זמינות בזמן אמת.
טווח תקציב הוא הערכת תכנון בלבד.
החזר JSON תקין בלבד, בלי Markdown ובלי טקסט מחוץ ל-JSON.

המבנה המדויק:
{
  "summary": "משפט קצר בעברית שמסכם מה חיפש המשתמש",
  "recommendations": [
    {
      "city": "שם העיר בעברית",
      "country": "שם המדינה בעברית",
      "why": "משפט או שניים קצרים למה היעד מתאים",
      "vibe": "3-4 מאפיינים קצרים",
      "estimatedBudget": "טווח תכנון משוער בשקלים, עם המילה משוער",
      "hotels": [{"name":"שם מלון אמיתי באנגלית","why":"למה מתאים לבקשה"}],
      "attractions": [{"name":"שם אטרקציה אמיתית","why":"למה מתאימה לבקשה"}]
    }
  ]
}

כללים:
- כאשר צוין יעד מפורש: המלצה אחת בלבד, באותו יעד בדיוק.
- כאשר לא צוין יעד מפורש: בדיוק 3 המלצות שונות.
- לכל יעד הצע 3 מלונות אמיתיים באותו יעד ו-3 אטרקציות באותו יעד. אלה הצעות לבדיקה בלבד; אין לטעון שהמלון זמין או מתאים לתקציב בוודאות. אל תמציא שמות.\n- תעדף יעדים פרקטיים מישראל כאשר זה מתאים.
- התחשב בתקציב, הרכב נוסעים, תאריכים, חופים, חיי לילה, משפחות, זוגות, קניות וכשרות אם הוזכרו.
- אל תמציא זמינות, מחיר חי, מבצע או טיסה ספציפית.
`;

  const context = `
בקשת המשתמש: ${userPrompt}
יעד מפורש שאומת בטופס (אם ריק, זהה מתוך הבקשה): ${String(body.destination || "").slice(0,100)}
כאשר נמסר יעד מפורש, השדה city חייב להיות זהה לו.
נקודת יציאה: ${String(body.origin || "תל אביב")}
תאריך יציאה: ${String(body.from || "לא צוין")}
תאריך חזרה: ${String(body.to || "לא צוין")}
תקציב מהטופס: ${body.budget ? "₪" + String(body.budget) : "לא צוין"}
מבוגרים: ${adults}
ילדים: ${String(body.children || 0)}
גילאי הילדים בשנים (0 = פחות משנה): ${children ? ages.join(", ") : "אין ילדים"}
`;

  try {
    // Use Google's native generateContent API rather than the OpenAI compatibility route.
    const models = ["gemini-3.5-flash-lite", "gemini-3.5-flash"];
    let result;
    let lastStatus = 0;
    let lastReason = "upstream";
    let lastDetail = "";
    for (const model of models) {
      for (let attempt=0; attempt<1; attempt++) {
        let response;
        try { response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent",
          {
            method:"POST",
            signal:AbortSignal.timeout(8000),
            headers:{"x-goog-api-key":apiKey,"Content-Type":"application/json"},
            body:JSON.stringify({
              systemInstruction:{parts:[{text:systemPrompt}]},
              contents:[{role:"user",parts:[{text:context}]}],
              generationConfig:{responseMimeType:"application/json",temperature:0.5}
            })
          }
        );
        } catch (networkError) {
          lastReason=networkError?.name==="TimeoutError"?"timeout":"network";
          console.warn("Gemini request failed",{model,reason:lastReason,attempt:attempt+1});
          continue;
        }
        lastStatus=response.status;
        const raw=await response.text();
        let payload;
        try {payload=JSON.parse(raw);} catch {payload={};}
        if (!response.ok) {
          lastReason=String(payload?.error?.status || "upstream");
          lastDetail=String(payload?.error?.message || "").replace(/AIza[\w-]+/g,"[redacted]").slice(0,260);
          console.error("Gemini native API error",{status:response.status,reason:lastReason,model,message:String(payload?.error?.message || "").slice(0,300)});
          if ([401,403,429].includes(response.status)) return res.status(502).json({error:"שירות ההמלצות אינו זמין כרגע",code:"GEMINI_"+response.status,reason:response.status===429?"quota":"authentication"});
          if (response.status===404) break;
          if ([500,502,503,504].includes(response.status) && attempt===0) {await new Promise(resolve=>setTimeout(resolve,350));continue;}
          break;
        }
        const answer=(payload?.candidates?.[0]?.content?.parts || []).map(p=>p.text||"").join("").trim();
        if (!answer) {lastReason=payload?.candidates?.[0]?.finishReason || "empty";break;}
        try {result=JSON.parse(answer);} catch {lastReason="invalid_json";break;}
        if (Array.isArray(result?.recommendations) && result.recommendations.length) break;
        result=null;lastReason="no_recommendations";
        break;
      }
      if (result) break;
    }
    if (!result) return res.status(502).json({error:"שירות ההמלצות לא הצליח להשיב. נסו שוב מאוחר יותר.",code:"GEMINI_"+lastStatus,reason:lastReason});

    if (!Array.isArray(result.recommendations) || result.recommendations.length < 1) {
      return res.status(502).json({ error: "לא התקבלה המלצה", code:"NO_RECOMMENDATIONS" });
    }

    const requested = typeof body.destination === "string" ? body.destination.trim().slice(0,100) : "";
    const clean = value => typeof value === "string" ? value.trim().slice(0,500) : "";
    const items = value => Array.isArray(value) ? value.slice(0,3).map(x => ({
      name: clean(x?.name), why: clean(x?.why)
    })).filter(x => x.name) : [];
    let recommendations = result.recommendations.filter(x => x && clean(x.city));
    if (requested) {
      recommendations = recommendations.filter(x => clean(x.city).normalize("NFKC").replace(/[\u200e\u200f\s\u05f3\u05f4]/g,"").toLocaleLowerCase() === requested.normalize("NFKC").replace(/[\u200e\u200f\s\u05f3\u05f4]/g,"").toLocaleLowerCase()).slice(0,1);
    } else recommendations = recommendations.slice(0,3);
    if (!recommendations.length) return res.status(502).json({error:"לא התקבלו המלצות ליעד שביקשת. נסו שוב.",code:"DESTINATION_MISMATCH"});
    result = {recommendations: recommendations.map(x => ({
      city:clean(x.city),country:clean(x.country),why:clean(x.why),
      hotels:items(x.hotels),attractions:items(x.attractions)
    }))};
    return res.status(200).json(result);
  } catch (error) {
    console.error("TAKE ME AI error", {name:error?.name || "Error",message:error?.message || "unknown"});
    return res.status(500).json({ error: "תקלה זמנית במנוע ה-AI", code: error?.name==="TimeoutError"?"AI_TIMEOUT":"AI_SERVER_ERROR" });
  }
};
