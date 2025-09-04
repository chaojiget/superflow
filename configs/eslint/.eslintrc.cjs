module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: './src/flow/src',
            from: './src',
            except: ['./src/flow/**'],
            message: '禁止跨包引用 flow 内部实现',
          },
          {
            target: './src/nodes/src',
            from: './src',
            except: ['./src/nodes/**'],
            message: '禁止跨包引用 nodes 内部实现',
          },
          {
            target: './src/planner/src',
            from: './src',
            except: ['./src/planner/**'],
            message: '禁止跨包引用 planner 内部实现',
          },
          {
            target: './src/run-center/src',
            from: './src',
            except: ['./src/run-center/**'],
            message: '禁止跨包引用 run-center 内部实现',
          },
          {
            target: './src/utils/src',
            from: './src',
            except: ['./src/utils/**'],
            message: '禁止跨包引用 utils 内部实现',
          },
          {
            target: './src/components/src',
            from: './src',
            except: ['./src/components/**'],
            message: '禁止跨包引用 components 内部实现',
          },
          {
            target: './src/components/nodes/src',
            from: './src',
            except: ['./src/components/nodes/**'],
            message: '禁止跨包引用 components/nodes 内部实现',
          },
          {
            target: './src/ideas/src',
            from: './src',
            except: ['./src/ideas/**'],
            message: '禁止跨包引用 ideas 内部实现',
          },
        ],
      },
    ],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    'prefer-const': 'error',
    'no-console': 'error',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
};
