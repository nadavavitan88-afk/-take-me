const {test} = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/plan.js');

test('family ages reach the model; invalid ages never call it', async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-only';
  let calls = [];
  global.fetch = async (_, options) => {
    calls.push(JSON.parse(options.body));
    return {ok:true, json:async()=>({choices:[{message:{content:JSON.stringify({recommendations:[{city:'רומא',country:'איטליה'}]})}}]})};
  };
  const run = async (extra) => {
    const res = {setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
    await handler({method:'POST',body:{prompt:'חופשה משפחתית ברומא',...extra}},res);
    return res;
  };
  try {
    assert.equal((await run({children:2,childAges:[0,7]})).code,200);
    assert.match(calls[0].messages[1].content,/0, 7/);
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
