import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { 
    ignores: [
      'dist',
      'android/**',
      'ios/**',
      'node_modules/**',
      'build/**',
      '*.config.ts',
      'capacitor.config.ts'
    ] 
  },
  // Server-side files (Node.js environment)
  {
    files: ['server/**/*.js', 'drizzle.config.js', 'shared/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.node },
      sourceType: 'module',
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  // Client-side files (Browser environment)
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react/prop-types': 'off', // Desabilitado - TypeScript seria mais adequado
      'react/no-unescaped-entities': 'off', // Desabilitado - aspas duplas em JSX são aceitáveis
      'react/no-unknown-property': 'off', // Desabilitado - permite propriedades customizadas (cmdk-*, etc)
      'react/no-children-prop': 'warn', // Warning em vez de error
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-useless-catch': 'warn', // Warning em vez de error
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]
