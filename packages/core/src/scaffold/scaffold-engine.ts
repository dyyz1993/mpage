import * as fs from 'fs';
import * as path from 'path';

export interface TemplateFile {
  path: string;
  content: string;
  skipIfExists?: boolean;
  mode?: number;
}

export interface TemplateVariable {
  name: string;
  description: string;
  default?: string;
  required?: boolean;
  validate?: (value: string) => boolean | string;
}

export interface ScaffoldTemplate {
  name: string;
  description: string;
  variables: TemplateVariable[];
  files: TemplateFile[];
  postGenerate?: (projectDir: string, variables: Record<string, string>) => Promise<void>;
}

export interface ScaffoldOptions {
  targetDir?: string;
  variables?: Record<string, string>;
  force?: boolean;
  skipPostGenerate?: boolean;
}

export interface ScaffoldResult {
  projectDir: string;
  files: string[];
  skipped: string[];
  overwritten: string[];
}

export class ScaffoldEngine {
  private templates: Map<string, ScaffoldTemplate> = new Map();

  registerTemplate(template: ScaffoldTemplate): void {
    this.templates.set(template.name, template);
  }

  getTemplate(name: string): ScaffoldTemplate | undefined {
    return this.templates.get(name);
  }

  listTemplates(): Array<{ name: string; description: string }> {
    return Array.from(this.templates.values()).map((t) => ({
      name: t.name,
      description: t.description,
    }));
  }

  async generate(
    templateName: string,
    projectName: string,
    options: ScaffoldOptions = {}
  ): Promise<ScaffoldResult> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(
        `Template not found: ${templateName}. Available: ${Array.from(this.templates.keys()).join(', ')}`
      );
    }

    const variables = this.resolveVariables(template, projectName, options.variables);

    for (const v of template.variables) {
      if (v.required && !variables[v.name]) {
        throw new Error(`Required variable '${v.name}' is missing: ${v.description}`);
      }
      if (v.validate && variables[v.name]) {
        const result = v.validate(variables[v.name]);
        if (typeof result === 'string') {
          throw new Error(`Validation failed for '${v.name}': ${result}`);
        }
        if (!result) {
          throw new Error(`Validation failed for '${v.name}'`);
        }
      }
    }

    const projectDir = options.targetDir || path.join(process.cwd(), projectName);

    const generated: string[] = [];
    const skipped: string[] = [];
    const overwritten: string[] = [];

    for (const file of template.files) {
      const filePath = this.interpolate(file.path, variables);
      const fullPath = path.join(projectDir, filePath);
      const content = this.interpolate(file.content, variables);

      if (fs.existsSync(fullPath)) {
        if (file.skipIfExists && !options.force) {
          skipped.push(filePath);
          continue;
        }
        overwritten.push(filePath);
      } else {
        generated.push(filePath);
      }

      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf-8');

      if (file.mode) {
        fs.chmodSync(fullPath, file.mode);
      }
    }

    if (template.postGenerate && !options.skipPostGenerate) {
      await template.postGenerate(projectDir, variables);
    }

    return { projectDir, files: generated, skipped, overwritten };
  }

  private resolveVariables(
    template: ScaffoldTemplate,
    projectName: string,
    provided?: Record<string, string>
  ): Record<string, string> {
    const resolved: Record<string, string> = {
      projectName,
      ProjectName: this.toPascalCase(projectName),
      'project-name': this.toKebabCase(projectName),
      year: new Date().getFullYear().toString(),
      date: new Date().toISOString().split('T')[0],
    };

    for (const v of template.variables) {
      resolved[v.name] = provided?.[v.name] || v.default || '';
    }

    return resolved;
  }

  private interpolate(tpl: string, variables: Record<string, string>): string {
    return tpl.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
      return variables[key] ?? match;
    });
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }
}
