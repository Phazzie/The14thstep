module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that code in src/lib/core/ is pure and does not import I/O modules',
      category: 'Architecture',
      recommended: true,
    },
    messages: {
      noServerImport: "Core logic in 'src/lib/core/' must remain pure. Do not import from 'src/lib/server/'.",
      noNodeIO: "Core logic must remain pure. Do not import Node I/O modules ({{module}}).",
    },
    schema: [],
  },

  create(context) {
    // Only apply this rule to files inside src/lib/core/
    const filename = context.getFilename();
    const isCoreFile = filename.includes('/src/lib/core/') || filename.includes('\\src\\lib\\core\\');

    if (!isCoreFile) {
      return {};
    }

    const BANNED_NODE_MODULES = new Set([
      'fs', 'fs/promises', 'net', 'child_process', 'http', 'https', 'crypto', 'path'
    ]);

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;

        // Check for server imports
        if (
          importPath.includes('src/lib/server') ||
          importPath.includes('$lib/server') ||
          importPath.includes('../server') ||
          importPath.includes('../../server')
        ) {
          context.report({
            node,
            messageId: 'noServerImport',
          });
        }

        // Check for Node I/O imports
        if (BANNED_NODE_MODULES.has(importPath) || importPath.startsWith('node:')) {
          context.report({
            node,
            messageId: 'noNodeIO',
            data: {
              module: importPath
            }
          });
        }
      }
    };
  }
};
