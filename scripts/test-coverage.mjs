import { spawn } from 'node:child_process';

// 从命令行参数中提取 coverage reporter，并移除 `--reporter` 选项
const args = process.argv.slice(2);
let reporter = 'text';
const passThrough = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--reporter')) {
    const [, value] = arg.split('=');
    if (value) {
      reporter = value;
    } else {
      reporter = args[i + 1];
      i++;
    }
  } else {
    passThrough.push(arg);
  }
}

const vitestArgs = [
  'run',
  '--coverage',
  `--coverage.reporter=${reporter}`,
  '--reporter=basic',
  ...passThrough,
];

const proc = spawn('vitest', vitestArgs, { stdio: 'inherit' });
proc.on('exit', (code) => process.exit(code));
