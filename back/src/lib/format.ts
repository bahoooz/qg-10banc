export function formatSlug(str: string) {
  return str.replaceAll(" ", "-").toLowerCase();
}