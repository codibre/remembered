#!/usr/bin/env node

/**
 * Cross-platform commit message examples and validation
 * Shows examples using commitlint's own validation
 */

const { execSync } = require('child_process');

const examples = [
  { message: 'feat: add user authentication', description: '✅ New feature' },
  { message: 'fix(api): resolve timeout issue', description: '✅ Bug fix with scope' },
  { message: 'docs: update README with examples', description: '✅ Documentation update' },
  { message: 'feat: remove support for Node.js 14\n\n[BREAKING CHANGE] Node.js 14 is no longer supported', description: '✅ Breaking change' },
  { message: 'Add user authentication', description: '❌ Missing type prefix' },
  { message: 'FIX: resolve issue', description: '❌ Uppercase type' },
];

console.log('🔍 Conventional Commits Examples\n');
console.log('Format: type(optional-scope): description\n');

examples.forEach(({ message, description }) => {
  console.log(`${description}`);
  console.log(`   "${message}"`);

  try {
    execSync(`echo "${message}" | pnpm exec commitlint`, { stdio: 'pipe' });
    console.log('   → Valid format\n');
  } catch (error) {
    console.log('   → Invalid format\n');
  }
});

console.log('Valid types: feat, fix, docs, style, refactor, perf, test, chore, build, ci, revert');
console.log('\n💡 Test your message: echo "your message" | pnpm exec commitlint');
