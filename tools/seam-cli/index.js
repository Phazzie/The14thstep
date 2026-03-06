#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');
const REGISTRY_PATH = path.join(REPO_ROOT, 'seam-registry.json');

const program = new Command();

program
  .name('seam')
  .description('Continuous Seam-Driven Development CLI')
  .version('1.0.0');

// Load registry
function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error(chalk.red(`Error: seam-registry.json not found at ${REGISTRY_PATH}`));
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
}

program
  .command('registry')
  .description('Show the parsed seam-registry.json')
  .action(() => {
    const registry = loadRegistry();
    console.log(chalk.green(`Loaded registry version ${registry.version} with ${registry.seams.length} seams.`));
    registry.seams.forEach(seam => {
      console.log(`- ${chalk.cyan(seam.id)} ${seam.io ? '(I/O)' : ''}`);
    });
  });

program
  .command('record <seamId>')
  .description('Run the probe for a seam and capture output to fixtures')
  .action((seamId) => {
    const registry = loadRegistry();
    const seam = registry.seams.find(s => s.id === seamId);
    if (!seam) {
      console.error(chalk.red(`Error: Seam ${seamId} not found in registry.`));
      process.exit(1);
    }
    if (!seam.probe) {
      console.error(chalk.red(`Error: Seam ${seamId} has no probe defined in registry.`));
      process.exit(1);
    }
    console.log(chalk.blue(`Recording probe for seam: ${seamId}...`));
    try {
      let execCmd = seam.probe;
      if (seam.probe.endsWith('.js') || seam.probe.endsWith('.mjs') || seam.probe.endsWith('.ts')) {
         execCmd = seam.probe.endsWith('.ts') ? `npx tsx ${seam.probe}` : `node ${seam.probe}`;
      }
      execSync(execCmd, { cwd: REPO_ROOT, stdio: 'inherit' });
      console.log(chalk.green(`Probe recorded successfully for ${seamId}.`));
    } catch (e) {
      console.error(chalk.red(`Probe failed for ${seamId}: ${e.message}`));
      process.exit(1);
    }
  });

program
  .command('automock <seamId>')
  .description('Generate a mock.ts from recorded fixtures')
  .action((seamId) => {
    const registry = loadRegistry();
    const seam = registry.seams.find(s => s.id === seamId);
    if (!seam) {
      console.error(chalk.red(`Error: Seam ${seamId} not found.`));
      process.exit(1);
    }
    if (!seam.freshnessFixtures || seam.freshnessFixtures.length === 0) {
      console.error(chalk.yellow(`Warning: No fixtures defined for ${seamId}. Cannot automock.`));
      process.exit(0);
    }

    console.log(chalk.blue(`Generating automock for ${seamId}...`));

    let mockContent = `// AUTO-GENERATED MOCK BY seam-cli automock\n`;
    mockContent += `import type { SeamResult } from '$lib/core/seam';\n\n`;

    seam.freshnessFixtures.forEach(fixturePath => {
       const fullPath = path.join(REPO_ROOT, fixturePath);
       if (fs.existsSync(fullPath)) {
         console.log(chalk.gray(`Reading fixture: ${fixturePath}`));
         const baseName = path.basename(fixturePath, '.json').replace(/[^a-zA-Z0-A]/g, '_');
         mockContent += `// From ${fixturePath}\n`;
         mockContent += `// To use this, create functions matching the contract that return these payloads.\n\n`;
       }
    });

    if (seam.contract) {
       console.log(chalk.green(`Automock template generated (preview):\n`));
       console.log(mockContent);
       console.log(chalk.yellow(`(Note: writing automock files is skipped in this prototype to avoid overwriting hand-written mocks)`));
    }
  });

program
  .command('freshness')
  .description('Check all seams to ensure probes have been run within freshnessDays')
  .action(() => {
    const registry = loadRegistry();
    const now = Date.now();
    let hasStale = false;

    console.log(chalk.blue('Checking seam fixture freshness...'));

    registry.seams.forEach(seam => {
      if (seam.io && seam.freshnessDays && seam.freshnessFixtures) {
         const thresholdMs = seam.freshnessDays * 24 * 60 * 60 * 1000;

         seam.freshnessFixtures.forEach(fixturePath => {
           const fullPath = path.join(REPO_ROOT, fixturePath);
           if (!fs.existsSync(fullPath)) {
             console.log(chalk.red(`[STALE] ${seam.id}: Fixture missing at ${fixturePath}`));
             hasStale = true;
           } else {
             const stats = fs.statSync(fullPath);
             const ageMs = now - stats.mtimeMs;
             const ageDays = (ageMs / (1000 * 60 * 60 * 24)).toFixed(1);

             if (ageMs > thresholdMs) {
                console.log(chalk.red(`[STALE] ${seam.id}: Fixture ${path.basename(fixturePath)} is ${ageDays} days old (limit: ${seam.freshnessDays} days).`));
                hasStale = true;
             } else {
                console.log(chalk.green(`[FRESH] ${seam.id}: Fixture ${path.basename(fixturePath)} is ${ageDays} days old.`));
             }
           }
         });
      }
    });

    if (hasStale) {
      console.log(chalk.red('\nSome seams have stale fixtures. Run "seam record <seamId>" to update them.'));
      process.exit(1);
    } else {
      console.log(chalk.green('\nAll seams are fresh!'));
    }
  });



// Visualize Command
program
  .command('visualize')
  .description('Generate a Mermaid.js diagram of the current architecture and seams')
  .action(() => {
    const registry = loadRegistry();
    console.log(chalk.blue('Generating Mermaid.js Architecture Diagram...'));

    let mermaid = `graph TD\n`;
    mermaid += `    subgraph "Core Business Logic (Pure)"\n`;
    mermaid += `        core[src/lib/core]\n`;
    mermaid += `    end\n\n`;

    mermaid += `    subgraph "I/O Seams (Impure)"\n`;
    registry.seams.filter(s => s.io).forEach(seam => {
      mermaid += `        seam_${seam.id.replace(/-/g, '_')}[${seam.id}]\n`;
    });
    mermaid += `    end\n\n`;

    mermaid += `    subgraph "Utility Seams (Impure/External)"\n`;
    registry.seams.filter(s => !s.io).forEach(seam => {
       mermaid += `        seam_${seam.id.replace(/-/g, '_')}[${seam.id}]\n`;
    });
    mermaid += `    end\n\n`;

    registry.seams.forEach(seam => {
       mermaid += `    core --> seam_${seam.id.replace(/-/g, '_')}\n`;
    });

    const outputPath = path.join(REPO_ROOT, 'SEAM_ARCHITECTURE.md');
    const mdContent = `# Application Architecture\n\nGenerated by \`seam-cli visualize\`.\n\n\`\`\`mermaid\n${mermaid}\`\`\`\n`;
    fs.writeFileSync(outputPath, mdContent);

    console.log(chalk.green(`Architecture visualization written to ${outputPath}`));
  });




// Doctor Command
program
  .command('doctor')
  .description('Audit seam-registry.json against the filesystem to ensure SDD integrity')
  .action(() => {
    const registry = loadRegistry();
    console.log(chalk.blue('Running seam-cli doctor...'));
    let errors = 0;

    registry.seams.forEach(seam => {
      console.log(chalk.cyan(`Auditing seam: ${seam.id}`));

      // 1. Check contract
      if (seam.contract) {
        if (!fs.existsSync(path.join(REPO_ROOT, seam.contract))) {
           console.log(chalk.red(`  [ERROR] Contract file missing: ${seam.contract}`));
           errors++;
        } else {
           console.log(chalk.gray(`  [OK] Contract found.`));
        }
      } else {
         console.log(chalk.yellow(`  [WARN] No contract defined.`));
      }

      // 2. Check probe
      if (seam.io) {
        if (!seam.probe) {
          console.log(chalk.red(`  [ERROR] I/O Seam missing probe definition.`));
          errors++;
        } else if (!seam.probe.includes('node_modules') && !seam.probe.startsWith('node ') && !seam.probe.startsWith('npx ')) {
           const probePath = seam.probe.split(' ')[0]; // crude naive path extract if not prefixed
           if (!fs.existsSync(path.join(REPO_ROOT, probePath)) && !seam.probe.includes('probes/')) {
               console.log(chalk.yellow(`  [WARN] Probe target "${probePath}" might not exist.`));
           } else {
               console.log(chalk.gray(`  [OK] Probe definition present.`));
           }
        }

        // 3. Check fixtures
        if (seam.freshnessFixtures && seam.freshnessFixtures.length > 0) {
           seam.freshnessFixtures.forEach(f => {
              if (!fs.existsSync(path.join(REPO_ROOT, f))) {
                  console.log(chalk.red(`  [ERROR] Declared fixture missing: ${f}`));
                  errors++;
              } else {
                  console.log(chalk.gray(`  [OK] Fixture ${path.basename(f)} found.`));
              }
           });
        } else {
           console.log(chalk.yellow(`  [WARN] No freshnessFixtures defined for I/O seam.`));
        }
      }
    });

    if (errors > 0) {
       console.log(chalk.red(`\nDoctor found ${errors} error(s) that need fixing.`));
       process.exit(1);
    } else {
       console.log(chalk.green(`\nDoctor found 0 errors. Your seams are perfectly structured!`));
    }
  });

program.parse(process.argv);
