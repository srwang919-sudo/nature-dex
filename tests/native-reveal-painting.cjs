const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'native/pages/reveal/index.wxss'), 'utf8');
const wxml = fs.readFileSync(path.join(root, 'native/pages/reveal/index.wxml'), 'utf8');

test('the reveal uses a quiet 320ms specimen reveal without reward effects', () => {
 assert.ok(wxml.includes("'arrive painting'"));
 assert.ok(css.includes('@keyframes plate-reveal'));
 assert.ok(css.includes('.32s ease-out'));
 assert.ok(!css.includes('@keyframes badge-burst'));
 assert.ok(!wxml.includes('discovery-stars'));
});
test('the specimen reveal respects application and system reduced motion', () => {
 assert.match(css,/\.reduce-motion \.hero-card[^{]*\{animation:none/);
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
});

test('the reveal state machine still decides when the card opens', () => {
  const { createRevealMachine } = require('../native/lib/reveal-machine');
  const stages = [];
  const m = createRevealMachine({ reducedMotion: false, onStage: s => stages.push(s), setTimeout: fn => fn() });
  m.start();
  assert.deepEqual(stages, ['sealed', 'split', 'lift', 'settled'], 'opening still walks explicit stages');
});
