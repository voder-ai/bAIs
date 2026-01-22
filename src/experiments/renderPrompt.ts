export type PromptVars = Readonly<Record<string, string | number>>;

export function renderPrompt(template: string, vars: PromptVars): string {
  return template.replaceAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (full, key: string) => {
    const value = vars[key];
    if (value === undefined) return full;
    return String(value);
  });
}
