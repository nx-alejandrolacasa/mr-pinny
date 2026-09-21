const COUNTRY_CODE_TLD_LENGTH = 2;
const SHORT_SECOND_LEVEL_LENGTH = 3;

export function isSameSite(hostA: string, hostB: string, subdomainsAreSameSite: boolean): boolean {
  if (!subdomainsAreSameSite) return hostA === hostB;
  return registrableDomain(hostA) === registrableDomain(hostB);
}

// Without a public-suffix list, keep two labels ("example.com") or three when
// the host looks like "example.co.uk": a 2-letter TLD under a short label.
export function registrableDomain(host: string): string {
  const labels = host.toLowerCase().split(".");
  if (labels.length <= 2) return labels.join(".");
  const tld = labels.at(-1) ?? "";
  const secondLevel = labels.at(-2) ?? "";
  const looksLikeCountrySuffix =
    tld.length === COUNTRY_CODE_TLD_LENGTH && secondLevel.length <= SHORT_SECOND_LEVEL_LENGTH;
  return labels.slice(looksLikeCountrySuffix ? -3 : -2).join(".");
}
