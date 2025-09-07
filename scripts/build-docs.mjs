import { cpSync, rmSync } from 'fs';
import { join } from 'path';

const source = join(process.cwd(), 'docs');
const dest = join(process.cwd(), 'dist', 'docs');

rmSync(dest, { recursive: true, force: true });
cpSync(source, dest, { recursive: true });
console.log('文档已构建到', dest);
