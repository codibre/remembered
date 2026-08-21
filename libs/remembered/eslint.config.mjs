// Re-export the root ESLint config for standalone use by turbo/eslint.
// NOTE: this file must repeat its own ignores because a per-lib config loaded
// standalone does NOT inherit the root's `ignores`, causing build output to be linted.
import rules from '../../eslint.config.mjs';

export default [
    ...rules,
    {
        ignores: [
            '**/dist/**/*',
            '**/build/**/*',
            'eslint.config.mjs',
            '**/.release-it.js',
            '**/jest.config.js',
            '**/*.d.ts',
        ],
    },
];
