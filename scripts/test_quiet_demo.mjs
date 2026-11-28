import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {assertStandaloneDemoRetired,retiredDemoRoutes} from './build_quiet_demo.mjs';
import {withStandaloneDemoRetired} from './standalone_demo_retirement_test_helpers.mjs';

test('the three dedicated demo routes and all navigation or sitemap references are gone',()=>{
  assert.deepEqual(retiredDemoRoutes,['demo.html','ja/demo.html','zh/demo.html']);
  assert.doesNotThrow(assertStandaloneDemoRetired);
});

test('the inline home simulation and its controls are retained for each locale',()=>{
  for(const prefix of ['','ja/','zh/']){
    const html=readFileSync(new URL('../'+prefix+'index.html',import.meta.url),'utf8');
    for(const token of ['id="imsDemoRoot"','id="demoOperationForm"','demo-v1.js','quiet-form.js']) assert.ok(html.includes(token),prefix+token);
  }
});

test('the historical fixture adapter cannot hide another route or control change',()=>{
  const other='<a href="license.html#comparison">Terms</a><button disabled>Preserve</button><a href="/demo.html-other">Other route</a>';
  assert.equal(withStandaloneDemoRetired('index.html','<a href="demo.html">Demo</a>'+other),other);
  assert.equal(withStandaloneDemoRetired('contact.html','<a href="demo.html">Demo</a>'),'<a href="demo.html">Demo</a>');
});
