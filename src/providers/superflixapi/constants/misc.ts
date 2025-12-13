// Expiration time for cached stream URLs (6 hours)
export const EXPIRES_AT = () => new Date(Date.now() + 6 * 60 * 60 * 1000);
