const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** Short link ids: 10 characters from an alphabet without look-alikes, about 50 bits. */
export function newId(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export const ID_PATTERN = /^[a-z0-9]{6,16}$/;
/** The browser-made session id in beacons and claims. */
export const SESSION_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
/** A city id as the scout layer names it. */
export const CITY_ID_PATTERN = /^[a-z0-9-]{2,60}$/;
