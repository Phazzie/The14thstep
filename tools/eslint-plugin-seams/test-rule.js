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
    {
      code: "import helper from '../../../server/helper';",
      filename: "/app/src/lib/utils/non-core.js",
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
    {
      code: "import fs from 'node:fs';",
      filename: "/app/src/lib/core/io-node-prefix.js",
      errors: [{ messageId: 'noNodeIO' }],
    },
    {
      code: "import db from '../../../server/database/adapter';",
      filename: "/app/src/lib/core/impure-relative.js",
      errors: [{ messageId: 'noServerImport' }],
    },
  ],
});

console.log('ESLint rule tests passed!');
