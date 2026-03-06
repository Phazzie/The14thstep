const { RuleTester } = require('eslint');
const rule = require('./lib/rules/no-impure-core');

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
});

ruleTester.run('no-impure-core', rule, {
  valid: [
    {
      code: "import { SeamResult } from '$lib/core/seam';",
      filename: "/app/src/lib/core/index.js",
    },
    {
      code: "import fs from 'fs';",
      filename: "/app/src/lib/server/adapter.js",
    },
  ],
  invalid: [
    {
      code: "import db from '$lib/server/database/adapter';",
      filename: "/app/src/lib/core/impure.js",
      errors: [{ messageId: 'noServerImport' }],
    },
    {
      code: "import fs from 'fs';",
      filename: "/app/src/lib/core/io.js",
      errors: [{ messageId: 'noNodeIO' }],
    },
  ],
});

console.log('ESLint rule tests passed!');
