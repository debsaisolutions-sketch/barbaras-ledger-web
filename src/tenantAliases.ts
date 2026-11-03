/**
 * Names that are one person. Add a group here; balance math only asks
 * samePersonName, so a new spelling does not need a special case.
 */
export const TENANT_NAME_ALIASES: readonly (readonly string[])[] = [
  ["Connie Pryor", "Connie Williams"],
];

export function normalizePersonName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function samePersonName(a: string, b: string): boolean {
  const left = normalizePersonName(a);
  const right = normalizePersonName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return TENANT_NAME_ALIASES.some((group) => {
    const names = group.map(normalizePersonName);
    return names.includes(left) && names.includes(right);
  });
}

/** Alias spellings share one key so their balances stay together. */
export function personKey(name: string): string {
  const key = normalizePersonName(name);
  const group = TENANT_NAME_ALIASES.find((names) => names.map(normalizePersonName).includes(key));
  return group ? `alias:${normalizePersonName(group[0])}` : key;
}

/** Use the spelling on the current lease when one of the names matches. */
export function preferredPersonName(name: string, preferred: string[]): string {
  const match = preferred.find((item) => samePersonName(item, name));
  return (match || name).trim();
}
