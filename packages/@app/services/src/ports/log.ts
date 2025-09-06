export interface LogPort {
  info(message: string): void;
  error(message: string): void;
}
