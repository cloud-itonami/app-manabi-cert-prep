// Test helpers — strip comments before substring assertions so that
// "DELIBERATELY ABSENT" documentation blocks don't trigger false positives.

export function stripCComments(src: string): string {
  // /* ... */ block comments
  let s = src.replace(/\/\*[\s\S]*?\*\//g, "");
  // // line comments
  s = s.replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  return s;
}

export function stripHtmlComments(src: string): string {
  return src.replace(/<!--[\s\S]*?-->/g, "");
}

export function stripCssComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "");
}
