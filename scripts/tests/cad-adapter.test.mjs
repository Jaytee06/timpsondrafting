import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import { localCadPlugin } from '../cad/vite-cad-plugin.mjs';
async function request({body=Buffer.from('invalid'),origin,remote='127.0.0.1',method='POST'}={}) {
 let middleware;localCadPlugin().configureServer({middlewares:{use:(_path,fn)=>{middleware=fn;}}});
 const req=Readable.from([body]);req.socket={remoteAddress:remote};req.method=method;req.headers={host:'127.0.0.1:5173',origin};
 const res=new EventEmitter();res.setHeader=()=>{};let resolve;const result=new Promise(r=>{resolve=r;});res.end=text=>resolve({status:res.statusCode,body:JSON.parse(text)});
 await middleware(req,res);return result;
}
test('local decoder refuses remote requests and cross-origin uploads',async()=>{
 assert.equal((await request({remote:'192.0.2.1'})).status,403);
 assert.equal((await request({origin:'https://example.org'})).status,403);
});
test('local decoder validates method, signature and size before invoking WASM',async()=>{
 assert.equal((await request({method:'GET'})).status,405);
 assert.equal((await request()).status,400);
 assert.equal((await request({body:Buffer.alloc(20*1024*1024+1)})).status,413);
});
