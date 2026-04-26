module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      paths: [
        {
          name: 'playwright',
          message: 'Daemon 层禁止直接 import playwright。浏览器操作由 Worker 子进程执行。',
        },
        {
          name: 'playwright-core',
          message: 'Daemon 层禁止直接 import playwright-core。浏览器操作由 Worker 子进程执行。',
        },
      ],
    }],
  },
};
