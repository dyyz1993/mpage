export default function (cli) {
  const site = cli.createSite({
    name: 'js-plugin',
    url: 'https://example.com',
  });

  site.command('ping', {
    description: 'Ping',
    handler: async () => ({
      success: true,
      data: { pong: true },
      message: '',
      tips: ['pong'],
    }),
  });
};
