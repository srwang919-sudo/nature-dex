const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'native/pages/reveal/index.wxss'), 'utf8');
const wxml = fs.readFileSync(path.join(root, 'native/pages/reveal/index.wxml'), 'utf8');

test('the reveal paints the plate in stages instead of popping a card', () => {
  assert.ok(wxml.includes("'arrive painting'"), 'painting stage is gated by the same motion condition as arrive');
  assert.ok(css.includes('@keyframes plate-sketch'), 'outline/pencil stage');
  assert.ok(css.includes('@keyframes plate-wash'), 'watercolour wash stage');
  const sketch = css.slice(css.indexOf('@keyframes plate-sketch'), css.indexOf('@keyframes plate-wash'));
  assert.ok(sketch.includes('grayscale(1)'), 'starts desaturated like a pencil outline');
  assert.ok(sketch.includes('contrast(1.22)'), 'pencil linework reads through contrast');
  const wash = css.slice(css.indexOf('@keyframes plate-wash'));
  assert.ok(wash.indexOf('filter:none') >= 0 && wash.indexOf('filter:none') < wash.indexOf('}', wash.indexOf('@keyframes plate-wash') + 40) + 400, 'wash ends on the true colours');
  assert.ok(!/@keyframes plate-(sketch|wash)\{[^;]*scale\(1\.[3-9]/.test(css), 'no bouncy pop, the motion stays quiet');
});

test('the staged paint is fully disabled under reduced motion', () => {
  assert.ok(/\.reduce-motion \.hero-card\.painting\{animation:none;filter:none\}/.test(css));
  assert.ok(css.includes('prefers-reduced-motion:reduce'));
  const media = /@media\(prefers-reduced-motion:reduce\)\{([^}]*\})[^}]*/.exec(css);
  assert.ok(media && media[0].includes('.hero-card.painting'), 'system preference also disables it');
});

test('the reveal state machine still decides when the card opens', () => {
  const { createRevealMachine } = require('../native/lib/reveal-machine');
  const stages = [];
  const m = createRevealMachine({ reducedMotion: false, onStage: s => stages.push(s), setTimeout: fn => fn() });
  m.start();
  assert.deepEqual(stages, ['sealed', 'split', 'lift', 'settled'], 'opening still walks explicit stages');
});
