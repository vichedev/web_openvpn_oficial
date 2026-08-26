import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      // Sin este plugin, no-unused-vars no ve el uso de un componente dentro de
      // JSX y marcaba como "no usados" motion, Link, etc. (11 falsos positivos).
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      // El proyecto no usa PropTypes ni TypeScript: la validacion se hace en los
      // generadores (rosSafe.js), no en la frontera de cada componente.
      'react/prop-types': 'off',
    },
  },
  {
    // Los contextos exportan el provider y su hook desde el mismo archivo, que
    // es el patron habitual de React. Solo cuesta un refresco completo al
    // editarlos en caliente, asi que se permite explicitamente.
    files: ['src/context/*.jsx'],
    rules: {
      'react-refresh/only-export-components': [
        'error',
        { allowExportNames: ['useSession', 'useTheme'] },
      ],
    },
  },
  {
    // Los tests corren en Node, no en el navegador.
    files: ['tests/**/*.js'],
    languageOptions: { globals: globals.node },
  },
])
