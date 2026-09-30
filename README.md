# TAKE ME

אתר תכנון חופשות בעברית עם חיפוש מובנה, המלצות AI, קישורי הזמנה ושירותים משלימים.

## קבצים פעילים

- `index.html` — האתר הראשי היחיד.
- `api/plan.js` — מנוע המלצות AI.
- `api/lead.js` — קליטת לידים ושליחה ל־Formspree / Google Sheets.
- `privacy.html` — מדיניות פרטיות.
- `terms.html` — תנאי שימוש וגילוי נאות.
- `thank-you.html` — עמוד תודה, noindex.
- `404.html` — עמוד שגיאה ממותג, noindex.
- `manifest.json`, `favicon.svg`, `robots.txt`, `sitemap.xml` — קבצי אתר ו־SEO.
- `tests/` — בדיקות אוטומטיות.
- `.github/workflows/test.yml` — CI שרץ בכל push.
- `vercel.json` — הגדרות Vercel.

## תשתיות מחוברות

- Vercel — פריסה אוטומטית מ־main.
- Google Analytics 4 — מדידת חיפושים, לידים וקליקים.
- Google Sheets — CRM / דשבורד לידים / ביצועי שיווק.
- Expedia Creator — קישורי שותפים פעילים.
- Booking / Agoda / Airalo / GetYourGuide / DiscoverCars — קישורים קיימים לפי מצב החיבור של כל תוכנית.

## כללי עבודה

1. עורכים רק את `index.html` כעמוד הראשי.
2. לא מוסיפים עותקי index חלופיים לרוט.
3. כל שינוי פונקציונלי צריך לעבור את `node --test tests/*.test.cjs`.
4. פרטי התחברות, מפתחות API ופרטי בנק לא נשמרים בקוד.
5. קישורי קמפיין מנוהלים מגיליון TAKE ME — ניהול לידים.

## מצב נוכחי

האתר כולל:
- חיפוש ישראל / חו"ל.
- טיסות ומלונות מתוך תוצאת החיפוש.
- TAKE ME AI.
- שיתוף חופשה ושחזור חופשה מקישור.
- טופס ליד מובנה עם שיוך מקור / קמפיין.
- דשבורד תפעולי ושיווקי בגוגל שיטס.
- עיצוב מובייל, SEO בסיסי, Manifest ועמודי מערכת ממותגים.
