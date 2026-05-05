import {
  parseCliArgs,
  printBanner,
  printTemplates,
  printSuccess,
  colorize,
} from '../src/prompts.js';
import { createEngine, generateProject } from '../src/generator.js';
import type { PromptResult } from '../src/prompts.js';

const DEFAULT_TEMPLATE = 'base';

async function main(): Promise<void> {
  printBanner();

  const { projectName, template } = parseCliArgs(process.argv);

  if (!projectName) {
    console.error(colorize('Error: Project name is required', 'red'));
    console.log(`\nUsage: ${colorize('npx create-xcli <project-name>', 'cyan')}`);
    console.log(
      `       ${colorize('npx create-xcli <project-name> --template <template>', 'cyan')}\n`
    );
    process.exit(1);
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(projectName)) {
    console.error(
      colorize(
        'Error: Project name can only contain letters, numbers, hyphens, and underscores',
        'red'
      )
    );
    process.exit(1);
  }

  const engine = createEngine();
  const templates = engine.listTemplates();
  const templateName = template || DEFAULT_TEMPLATE;

  printTemplates(templates, DEFAULT_TEMPLATE);

  const selectedTemplate = engine.getTemplate(templateName);
  if (!selectedTemplate) {
    console.error(colorize(`Error: Template "${templateName}" not found`, 'red'));
    console.log(`Available: ${templates.map((t) => colorize(t.name, 'cyan')).join(', ')}\n`);
    process.exit(1);
  }

  const variables: Record<string, string> = {};
  for (const v of selectedTemplate.variables) {
    if (v.default !== undefined) {
      variables[v.name] = v.default;
    }
  }

  const promptResult: PromptResult = {
    projectName,
    template: templateName,
    variables,
  };

  try {
    const result = await generateProject(promptResult);
    printSuccess(projectName, result.projectDir, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(colorize(`Error: ${message}`, 'red'));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(colorize(`Unexpected error: ${err}`, 'red'));
  process.exit(1);
});
