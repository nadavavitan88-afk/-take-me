module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
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
      "estimatedBudget": "טווח תכנון משוער בשקלים, עם המילה משוער"
    }
  ]
}

כללים:
- כאשר צוין יעד מפורש: המלצה אחת בלבד, באותו יעד בדיוק.
- כאשר לא צוין יעד מפורש: בדיוק 3 המלצות שונות.
- תעדף יעדים פרקטיים מישראל כאשר זה מתאים.
- התחשב בתקציב, הרכב נוסעים, תאריכים, חופים, חיי לילה, משפחות, זוגות, קניות וכשרות אם הוזכרו.
- אל תמציא זמינות, מחיר חי, מבצע או טיסה ספציפית.
`;

  const context = `
בקשת המשתמש: ${userPrompt}
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
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gemini-3.8-flash",
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
      console.error("Gemini API error", geminiResponse.status, payload);
      return res.status(502).json({ error: "שירות ה-AI לא זמין כרגע" });
    }

    const text = payload?.choices?.[0]?.message?.content;
    if (!text) {
      return res.status(502).json({ error: "לא התקבלה תשובה מה-AI" });
    }

    let result;
    try {
      result = JSON.parse(text);
    } catch (error) {
      console.error("AI JSON parse error", text);
      return res.status(502).json({ error: "תשובת AI לא תקינה" });
    }

    if (!Array.isArray(result.recommendations) || result.recommendations.length < 1) {
      return res.status(502).json({ error: "לא התקבלה המלצה" });
    }

    // When the user names a destination, never leak recommendations for other destinations.
    // The model sometimes returns extra destinations despite the instruction, so enforce it here.
    const destinationAliases = [
      ["דובאי", ["דובאי", "Dubai"]],
      ["אבו דאבי", ["אבו דאבי", "Abu Dhabi"]],
      ["רומא", ["רומא", "Rome"]],
      ["לימסול", ["לימסול", "Limassol"]],
      ["ברצלונה", ["ברצלונה", "Barcelona"]],
      ["מרבלה", ["מרבלה", "Marbella"]],
      ["פריז", ["פריז", "Paris"]],
      ["לונדון", ["לונדון", "London"]],
      ["אתונה", ["אתונה", "Athens"]],
      ["פאפוס", ["פאפוס", "Paphos"]]
    ];
    const requestText = JSON.stringify(body);
    const requestedDestination = destinationAliases.find(([, aliases]) =>
      aliases.some((alias) => requestText.toLowerCase().includes(alias.toLowerCase()))
    );
    if (requestedDestination) {
      const aliases = requestedDestination[1];
      const matching = result.recommendations.filter((recommendation) =>
        aliases.some((alias) => JSON.stringify(recommendation).toLowerCase().includes(alias.toLowerCase()))
      );
      result.recommendations = (matching.length ? matching : [result.recommendations[0]]).slice(0, 1);
      result.recommendations[0].city = requestedDestination[0];
    } else {
      result.recommendations = result.recommendations.slice(0, 3);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("TAKE ME AI error", error);
    return res.status(500).json({ error: "תקלה זמנית במנוע ה-AI" });
  }
};
