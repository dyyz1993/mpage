import * as path from 'path';
import {
  ScaffoldEngine,
  BASE_CLI_TEMPLATE,
  MINIMAL_PLUGIN_TEMPLATE,
  BROWSER_APP_TEMPLATE,
} from '@dyyz1993/xcli-core';
import type { PromptResult } from './prompts.js';

export function createEngine(): ScaffoldEngine {
  const engine = new ScaffoldEngine();
  engine.registerTemplate(BASE_CLI_TEMPLATE);
  engine.registerTemplate(MINIMAL_PLUGIN_TEMPLATE);
  engine.registerTemplate(BROWSER_APP_TEMPLATE);
  return engine;
}

export async function generateProject(
  promptResult: PromptResult,
  targetBase?: string
): Promise<{
  projectDir: string;
  files: string[];
  skipped: string[];
}> {
  const engine = createEngine();

  const result = await engine.generate(promptResult.template, promptResult.projectName, {
    targetDir: targetBase ? path.join(targetBase, promptResult.projectName) : undefined,
    variables: promptResult.variables,
  });

  return {
    projectDir: result.projectDir,
    files: result.files,
    skipped: result.skipped,
  };
}
