import type { LogPort } from '../ports/log';

export const loggerAdapter: LogPort = {
  info(message) {
    console.log(message);
  },
  error(message) {
    console.error(message);
  },
};
