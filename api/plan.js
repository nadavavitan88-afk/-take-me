module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(500).json({ error: "Gemini is not configured" });
  }

  const body = req.body || {};
  const userPrompt = String(body.prompt || "").trim().slice(0, 1800);

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
מבוגרים: ${String(body.adults || 2)}
ילדים: ${String(body.children || 0)}
`;

  try {
    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        signal: AbortSignal.timeout(45000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: context }
          ],
          response_format: { type: "json_object" }
        })
      }
    );

    const payload = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini API error", geminiResponse.status, payload?.error?.status || "upstream_error");
      return res.status(502).json({ error: "שירות ההמלצות לא זמין כרגע. נסו שוב מאוחר יותר.", code: "GEMINI_" + geminiResponse.status });
    }

    const text = payload?.choices?.[0]?.message?.content;
    if (!text) {
      return res.status(502).json({ error: "לא התקבלה תשובה מה-AI" });
    }

    let result;
    try {
      result = JSON.parse(text);
    } catch (error) {
      console.error("AI JSON parse error");
      return res.status(502).json({ error: "תשובת AI לא תקינה" });
    }

    if (!Array.isArray(result.recommendations) || result.recommendations.length < 1) {
      return res.status(502).json({ error: "לא התקבלה המלצה" });
    }

    const requested = typeof body.destination === "string" ? body.destination.trim().slice(0,100) : "";
    const clean = value => typeof value === "string" ? value.trim().slice(0,500) : "";
    const items = value => Array.isArray(value) ? value.slice(0,3).map(x => ({
      name: clean(x?.name), why: clean(x?.why)
    })).filter(x => x.name) : [];
    let recommendations = result.recommendations.filter(x => x && clean(x.city));
    if (requested) {
      recommendations = recommendations.filter(x => clean(x.city).toLowerCase() === requested.toLowerCase()).slice(0,1);
    } else recommendations = recommendations.slice(0,3);
    if (!recommendations.length) return res.status(502).json({error:"לא התקבלו המלצות ליעד שביקשת. נסו שוב."});
    result = {recommendations: recommendations.map(x => ({
      city:clean(x.city),country:clean(x.country),why:clean(x.why),
      hotels:items(x.hotels),attractions:items(x.attractions)
    }))};
    return res.status(200).json(result);
  } catch (error) {
    console.error("TAKE ME AI error", error?.name || "Error");
    return res.status(500).json({ error: "תקלה זמנית במנוע ה-AI" });
  }
};
