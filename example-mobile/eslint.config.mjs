import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import boundaries from 'eslint-plugin-boundaries';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{js,jsx,ts,tsx}'],

    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      boundaries,
    },

    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    settings: {
      react: {
        version: 'detect',
      },

      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      },
    },

    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Architecture boundary rules apply only to src/ to keep root
  // bootstrap and config files outside the enforced boundary model.
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],

    plugins: {
      boundaries,
    },

    settings: {
      'boundaries/elements': [
        // Must be first so index files are classified as public API,
        // not as internal files of the feature folder.
        {
          type: 'feature-public',
          mode: 'file',
          pattern: 'src/features/*/index.*',
          capture: ['featureName'],
        },

        {
          type: 'feature-internal',
          pattern: 'src/features/*',
          mode: 'folder',
          capture: ['featureName'],
        },

        {
          type: 'shared',
          pattern: 'src/shared/**',
        },

        {
          type: 'navigation',
          pattern: 'src/navigation/**',
        },
      ],
    },

    rules: {
      'boundaries/no-unknown': 'error',

      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',

          rules: [
            // Shared and navigation modules can be imported by any element.
            {
              from: { type: '*' },
              allow: {
                to: [{ type: 'shared' }, { type: 'navigation' }],
              },
            },

            // Navigation can import from feature public APIs.
            {
              from: { type: 'navigation' },
              allow: { to: { type: 'feature-public' } },
            },

            // Within the same feature, internal files can import each other freely.
            {
              from: { type: 'feature-internal' },
              allow: {
                to: {
                  type: 'feature-internal',
                  captured: {
                    featureName: '{{from.captured.featureName}}',
                  },
                },
              },
            },

            // Different feature internals forbidden
            {
              from: { type: 'feature-internal' },
              disallow: {
                to: {
                  type: 'feature-internal',
                  captured: {
                    featureName: '!{{from.captured.featureName}}',
                  },
                },
              },
              message:
                'Architecture violation: features may depend on other features only through their public API. Feature "{{from.captured.featureName}}" cannot import internal files from feature "{{to.captured.featureName}}". Replace the deep import with an import from src/features/{{to.captured.featureName}}/index.ts',
            },

            // A feature can only import from another feature through its public API (index.ts).
            {
              from: { type: 'feature-internal' },
              allow: { to: { type: 'feature-public' } },
            },

            // Public API files can import their own feature's internals to re-export them.
            {
              from: { type: 'feature-public' },
              allow: {
                to: {
                  type: 'feature-internal',
                  captured: {
                    featureName: '{{from.captured.featureName}}',
                  },
                },
              },
            },

            // Public API files can import from other features' public APIs.
            {
              from: { type: 'feature-public' },
              allow: { to: { type: 'feature-public' } },
            },
          ],
        },
      ],
    },
  },

  {
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      '.bundle/**',
      'vendor/**',

      // config files
      '.prettierrc.js',
      'babel.config.js',
      'jest.config.js',
      'metro.config.js',
    ],
  },

  eslintConfigPrettier,
);
