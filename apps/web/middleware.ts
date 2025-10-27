// TEMP: fully disable middleware so it can't touch /api or anything else
export function middleware() {}
export const config = { matcher: [] };
