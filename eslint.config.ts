import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config'
import neostandard from 'neostandard'

export default defineConfig([
  { files: ['**/*.{js,mjs,cjs,ts,mts,cts}'], plugins: { js }, extends: ['js/recommended'], languageOptions: { globals: globals.browser } },
  { files: ['**/*.js'], languageOptions: { sourceType: 'script' } },
  tseslint.configs.recommended,
  neostandard({
    ts: true,
    env: ['browser', 'es2015'],
  }),
  {
    rules: {
      camelcase: 'off',
      eqeqeq: 'off',
      'no-undef': 'off',
      'no-redeclare': 'off',
      'no-unused-vars': 'off',
      'no-fallthrough': 'off',
      'no-empty': 'off',
      'no-var': 'off',

      // Reduce noise from stylistic strictness
      '@stylistic/no-tabs': 'off',
      '@stylistic/indent': 'off',
      '@stylistic/no-mixed-spaces-and-tabs': 'off',

      // TS duplicates
      '@typescript-eslint/no-unused-vars': 'off',
      
      
    }
  }
])
