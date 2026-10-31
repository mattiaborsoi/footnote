/** The name to show: the walker's language, then English, then the international name, then the local one. */
export function displayName(tags: Record<string, string>, language: string): { name: string; localName: string | null } {
  const lang = language.toLowerCase().split("-")[0];
  const candidates = [tags[`name:${lang}`], tags["name:en"], tags.int_name, tags.name].filter((n): n is string => !!n && n.trim().length > 0);
  const name = candidates[0] ?? "";
  const local = tags.name && tags.name !== name ? tags.name : null;
  return { name, localName: local };
}
