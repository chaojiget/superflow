/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: ['node_modules'] },
    includeOnly: ['^src', '^packages'],
    reporterOptions: { dot: { theme: 'default' } },
  },
  forbidden: [
    // 基础：禁止循环依赖
    { name: 'no-cycles', severity: 'error', from: {}, to: { circular: true } },

    // 分层：core 不得依赖 app 或 src
    {
      name: 'core-no-upward',
      severity: 'error',
      from: { path: '^packages/@core' },
      to: { path: '^(packages/@app|src)/' },
    },

    // 分层：data 不得依赖 app 或 src
    {
      name: 'data-no-upward',
      severity: 'error',
      from: { path: '^packages/@data' },
      to: { path: '^(packages/@app|src)/' },
    },

    // 分层：packages 代码不得反向依赖 src（应用层）
    {
      name: 'packages-no-depend-on-src',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^src/' },
    },
  ],
};
