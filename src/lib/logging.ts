/**
 * Simple logger for server-side code.
 * Use for server-auth and other libs that need a logger interface.
 */
const noop = () => {};
export const logger = {
  debug: process.env.NODE_ENV === 'development' ? console.debug.bind(console) : noop,
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};
