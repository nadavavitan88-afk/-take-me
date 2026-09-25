const {test} = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/plan.js');

test('family ages reach Gemini; invalid ages never call it', async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-only';
  const calls = [];
  global.fetch = async (_, options) => {
    calls.push(JSON.parse(options.body));
    return {ok:true,status:200,text:async()=>JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({recommendations:[{city:'רומא',country:'איטליה'}]})}]}}]})};
  };
  const iso = d => d.toISOString().slice(0,10);
  const from = new Date(Date.now()+7*86400000);
  const to = new Date(Date.now()+12*86400000);
  const run = async extra => {
    const res = {setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
    await handler({method:'POST',body:{prompt:'חופשה משפחתית ברומא',from:iso(from),to:iso(to),destination:'רומא',...extra}},res);
    return res;
  };
  try {
    assert.equal((await run({children:2,childAges:[0,7]})).code,200);
    assert.match(calls[0].contents[0].parts[0].text,/0, 7/);
    for (const ages of [undefined,[7],[0,18],[0,-1],[0,3.5],[0,'7']]) {
      assert.equal((await run({children:2,childAges:ages})).code,400);
    }
    assert.equal(calls.length,1);
    assert.equal((await run({children:0})).code,200);
  } finally {
    global.fetch=originalFetch;
    if(originalKey===undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY=originalKey;
  }
});
