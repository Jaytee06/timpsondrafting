import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync(new URL('../../src/viewer/cesiumNavigation.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {canReachSiteSurface,siteSlideCandidates,droneDisplacement}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('outdoor terrain does not strand an elevated or buried authored spawn',()=>{
 assert.equal(canReachSiteSurface(undefined,1500,.75,.6),true);
 assert.equal(canReachSiteSurface(1503,1500,.75,.6),false);
 assert.equal(canReachSiteSurface(1500.18,1500,.75,.6),true);
 assert.equal(canReachSiteSurface(1498,1500,.75,.6),false);
});
test('blocked diagonal motion can slide without speeding up or reversing',()=>{
 assert.deepEqual(siteSlideCandidates(.2,.1),[[.2,.1],[.2,0],[0,.1]]);
 assert.deepEqual(siteSlideCandidates(-.1,-.2),[[-.1,-.2],[0,-.2],[-.1,0]]);
 assert.deepEqual(siteSlideCandidates(0,.2),[[0,.2]]);
});
test('drone flies toward elevated aim and independently rises/descends',()=>{
 const aimed=droneDisplacement(1,0,0,0,Math.PI/4,5);
 assert.ok(Math.abs(aimed.north-5/Math.sqrt(2))<1e-8);
 assert.ok(Math.abs(aimed.up-5/Math.sqrt(2))<1e-8);
 assert.equal(droneDisplacement(0,0,-1,0,0,5).up,-5);
 assert.equal(droneDisplacement(0,0,1,0,0,5).up,5);
 const diagonal=droneDisplacement(1,1,1,Math.PI/2,.3,5);
 assert.ok(Math.abs(Math.hypot(diagonal.north,diagonal.east,diagonal.up)-5)<1e-8);
});
