// Re-export the root ESLint config for standalone use by turbo/eslint.
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
    // Legacy TS 4.x code with pre-existing any usage — don't block CI
    {
        files: ['src/**/*.ts', 'test/**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unnecessary-type-assertion': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
        },
    },
];
