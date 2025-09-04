import type { LogPort } from '../ports/log';

export const loggerAdapter: LogPort = {
  info(message) {
    // eslint-disable-next-line no-console
    console.log(message);
  },
  error(message) {
    // eslint-disable-next-line no-console
    console.error(message);
  },
};
