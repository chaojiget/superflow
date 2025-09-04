module.exports = {
  forbidden: [
    {
      name: 'no-deep-imports-flow',
      comment: '禁止跨包引用 flow 内部实现',
      severity: 'error',
      from: { path: '^src/(?!flow/).*' },
      to: { path: '^src/flow/src' },
    },
    {
      name: 'no-deep-imports-nodes',
      comment: '禁止跨包引用 nodes 内部实现',
      severity: 'error',
      from: { path: '^src/(?!nodes/).*' },
      to: { path: '^src/nodes/src' },
    },
    {
      name: 'no-deep-imports-planner',
      comment: '禁止跨包引用 planner 内部实现',
      severity: 'error',
      from: { path: '^src/(?!planner/).*' },
      to: { path: '^src/planner/src' },
    },
    {
      name: 'no-deep-imports-run-center',
      comment: '禁止跨包引用 run-center 内部实现',
      severity: 'error',
      from: { path: '^src/(?!run-center/).*' },
      to: { path: '^src/run-center/src' },
    },
    {
      name: 'no-deep-imports-utils',
      comment: '禁止跨包引用 utils 内部实现',
      severity: 'error',
      from: { path: '^src/(?!utils/).*' },
      to: { path: '^src/utils/src' },
    },
    {
      name: 'no-deep-imports-components',
      comment: '禁止跨包引用 components 内部实现',
      severity: 'error',
      from: { path: '^src/(?!components/).*' },
      to: { path: '^src/components/src' },
    },
    {
      name: 'no-deep-imports-components-nodes',
      comment: '禁止跨包引用 components/nodes 内部实现',
      severity: 'error',
      from: { path: '^src/(?!components/).*' },
      to: { path: '^src/components/nodes/src' },
    },
    {
      name: 'no-deep-imports-ideas',
      comment: '禁止跨包引用 ideas 内部实现',
      severity: 'error',
      from: { path: '^src/(?!ideas/).*' },
      to: { path: '^src/ideas/src' },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
  },
};
