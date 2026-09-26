const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
test('changing travelers removes old booking results and ignores an in-flight AI response',async()=>{
 const elements=new Map();
 const get=id=>{
  if(!elements.has(id)){
   const classes=new Set();
   elements.set(id,{value:'',textContent:'',innerHTML:'',listeners:{},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},querySelectorAll:()=>[],closest:()=>null,focus(){}});
  }
  return elements.get(id);
 };
 let resolveFetch;
 const document={getElementById:get,querySelectorAll:()=>[],addEventListener(){}};
 const script=fs.readFileSync('index.html','utf8').match(/<script>\s*(\(function\(\)\{[\s\S]*?\}\)\(\);)\s*<\/script>/)[1];
 vm.runInNewContext(script,{document,URLSearchParams,AbortSignal,Intl,Date,console,fetch:()=>new Promise(r=>resolveFetch=r)});
 get('adults').value='2';get('children').value='0';get('aiPrompt').value='חופשה ברומא';
 get('result').classList.add('show');
 const pending=get('aiBuild').listeners.click[0]();
 for(let i=0;i<20 && !resolveFetch;i++)await new Promise(r=>setImmediate(r));
 assert.equal(typeof resolveFetch,'function','AI request should reach fetch');
 get('adults').value='3';
 get('adults').listeners.input[0]();
 assert.equal(get('result').classList.contains('show'),false);
 resolveFetch({ok:true,json:async()=>({recommendations:[{city:'רומא',country:'איטליה'}]})});
 await pending;
 assert.equal(get('aiAnswer').classList.contains('show'),false);
 assert.equal(get('aiAnswer').innerHTML,'');
 assert.equal(get('aiBuild').disabled,false);
});
