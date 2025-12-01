// list from https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.txt
const blocked = new Set(["10minutemail.com", "mailinator.com", "tempmail.org", "guerrillamail.com"]);

export function isDisposable(email) {
  const domain = email.split("@")[1]?.toLowerCase();
  return blocked.has(domain);
}