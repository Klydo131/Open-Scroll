import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the logo is one picture, kept identical wherever it is used', () => {
  const logo = read('src/assets/logo.svg');
  assert.equal(read('public/favicon.svg'), logo, 'tab icon');
  assert.equal(read('docs/images/logo.svg'), logo, 'README logo');
  assert.match(logo, /aria-label="Open Scroll"/);
  assert.doesNotMatch(logo, /<script|href=|xlink|<image|<style|onload/i, 'a logo is plain shapes only');
});

test('the page points at icons that exist', () => {
  const html = read('index.html');
  for (const [, href] of html.matchAll(/<link rel="(?:icon|apple-touch-icon)"[^>]*href="\/([^"]+)"/g)) {
    assert.ok(existsSync(new URL(`../public/${href}`, import.meta.url)), `${href} is in public/`);
  }
  assert.match(html, /rel="icon"/);
  assert.match(html, /rel="apple-touch-icon"/);
});

test('every picture the README shows is in the repository', () => {
  const readme = read('README.md');
  const shown = [...readme.matchAll(/src="(docs\/images\/[^"]+)"/g)].map(m => m[1]);
  assert.ok(shown.length >= 8, 'the README has its pictures');
  for (const path of shown) assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), `${path} exists`);
});
