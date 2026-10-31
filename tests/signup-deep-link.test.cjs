'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'wathiqati-app.html'), 'utf8');

test('signup deep link opens registration for signed-out visitors', () => {
  assert.match(html, /new URLSearchParams\(window\.location\.search\)\.get\('screen'\) === 'signup'/);
  assert.match(html, /if \(OPEN_SIGNUP_FROM_LINK\)\s*\{[\s\S]*?showScreen\('signup'\);[\s\S]*?showOfferReferralBanner\('signup'\);/);
});

test('normal signed-out visits retain the existing login entry point', () => {
  assert.match(html, /console\.log\('ℹ️ عرض شاشة الدخول'\);\s*showLoginAfterAuthChange\(\);/);
});

test('authenticated visitors continue through the existing session restoration flow', () => {
  assert.match(html, /if \(!user\)\s*\{[\s\S]*?return;\s*\}\s*SESSION_RESTORE_IN_PROGRESS = true;/);
});
