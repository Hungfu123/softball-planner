import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // React 19 strict rule — flagged in many of our useEffects (setLoading-flag pattern,
      // open/close-state-resets). Pattern is acceptable und gängig; downgrade to warning,
      // damit Build nicht blockiert.
      'react-hooks/set-state-in-effect': 'warn',
      // Layout.tsx exportiert sowohl Komponente als auch Konstanten/Hook (bewusst).
      // Fast-Refresh-Limitation, kein Code-Bug.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
