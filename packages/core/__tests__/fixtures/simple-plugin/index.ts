export default function (cli: any): void {
  const site = cli.createSite({
    name: 'simple-plugin',
    url: 'https://example.com',
  });

  site.command('hello', {
    description: 'Say hello',
    handler: async () => {
      return {
        success: true,
        data: { message: 'Hello from plugin!' },
        message: '',
        tips: ['Hello command executed'],
      };
    },
  });

  site.command('greet', {
    description: 'Greet someone',
    handler: async () => {
      return {
        success: true,
        data: { message: 'Greetings!' },
        message: '',
        tips: ['Greet command executed'],
      };
    },
  });
}
