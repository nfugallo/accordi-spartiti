export function formatArtistDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.startsWith("(")) {
    return trimmed;
  }

  const theSuffix = trimmed.match(/^(.+?)\s+\(The\)$/i);
  if (theSuffix) {
    return `The ${theSuffix[1]}`;
  }

  const disambiguation = trimmed.match(/^(.+?)\s+\(([^)]+)\)$/);
  if (!disambiguation) {
    return trimmed;
  }

  const [, surname, firstName] = disambiguation;
  if (firstName.toLowerCase() === "the") {
    return trimmed;
  }

  return `${firstName} ${surname}`;
}
