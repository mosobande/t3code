const SAFE_PROJECT_NOTE_LINK_SCHEMES = new Set(["http:", "https:", "mailto:", "sms:", "tel:"]);

export function isSafeProjectNoteLinkUrl(url: string): boolean {
  const scheme = url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1];
  return scheme === undefined || SAFE_PROJECT_NOTE_LINK_SCHEMES.has(`${scheme.toLowerCase()}:`);
}
