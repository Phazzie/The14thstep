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

  try {
    const raw = fs.readFileSync(REGISTRY_PATH, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.seams)) {
      console.error(
        chalk.red(
          `Error: Invalid seam registry at ${REGISTRY_PATH}. Expected an object with a "seams" array.`
        )
      );
      process.exit(1);
    }

    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: Failed to parse seam registry at ${REGISTRY_PATH}: ${message}`));
    process.exit(1);
  }
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
         const baseName = path.basename(fixturePath, '.json').replace(/[^a-zA-Z0-9]/g, '_');
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

    registry.seams.forEach((seam) => {
      if (!seam.io) return;

      if (typeof seam.freshnessDays !== 'number' || !Number.isFinite(seam.freshnessDays) || seam.freshnessDays <= 0) {
        console.log(chalk.red(`[STALE] ${seam.id}: Invalid configuration. "freshnessDays" must be a positive number.`));
        hasStale = true;
        return;
      }

      if (!Array.isArray(seam.freshnessFixtures) || seam.freshnessFixtures.length === 0) {
        console.log(chalk.red(`[STALE] ${seam.id}: Invalid configuration. "freshnessFixtures" must be a non-empty array.`));
        hasStale = true;
        return;
      }

      const thresholdMs = seam.freshnessDays * 24 * 60 * 60 * 1000;

      seam.freshnessFixtures.forEach((fixturePath) => {
        if (typeof fixturePath !== 'string' || fixturePath.trim().length === 0) {
          console.log(chalk.red(`[STALE] ${seam.id}: Fixture path must be a non-empty string.`));
          hasStale = true;
          return;
        }

        const fullPath = path.join(REPO_ROOT, fixturePath);
        if (!fs.existsSync(fullPath)) {
          console.log(chalk.red(`[STALE] ${seam.id}: Fixture missing at ${fixturePath}`));
          hasStale = true;
          return;
        }

        const stats = fs.statSync(fullPath);
        const ageMs = now - stats.mtimeMs;
        const ageDays = (ageMs / (1000 * 60 * 60 * 24)).toFixed(1);

        if (ageMs > thresholdMs) {
          console.log(chalk.red(`[STALE] ${seam.id}: Fixture ${path.basename(fixturePath)} is ${ageDays} days old (limit: ${seam.freshnessDays} days).`));
          hasStale = true;
          return;
        }

        console.log(chalk.green(`[FRESH] ${seam.id}: Fixture ${path.basename(fixturePath)} is ${ageDays} days old.`));
      });
    });

    if (hasStale) {
      console.log(chalk.red('\nSome seams have stale fixtures. Run "seam record <seamId>" to update them.'));
      process.exit(1);
    } else {
      console.log(chalk.green('\nAll seams are fresh!'));
    }
  });

program.parse(process.argv);
