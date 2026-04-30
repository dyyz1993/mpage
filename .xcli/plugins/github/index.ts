import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: 'github',
    url: 'https://github.com',
    description: 'GitHub SEO 外链 - Profile / README / Gist',
    requiresLogin: true,
  });

  site.command('update-profile', {
    description: '更新 GitHub 个人资料页（Bio、网站、公司等）',
    scope: 'browser',
    parameters: z.object({
      bio: z.string().optional().describe('个人简介'),
      blog: z.string().optional().describe('网站 URL'),
      company: z.string().optional().describe('公司'),
      location: z.string().optional().describe('地点'),
      name: z.string().optional().describe('显示名称'),
      hireable: z.boolean().optional().describe('是否开放招聘'),
    }),
    examples: [
      {
        cmd: 'xcli github update-profile --bio "Full-stack developer" --blog "https://example.com"',
        description: '更新简介和网站链接',
      },
    ],
    handler: async (params, ctx) => {
      if (!ctx.page) throw new Error('需要浏览器页面上下文');

      await ctx.page.goto('https://github.com/settings/profile', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      await ctx.page.waitForTimeout(2000);

      const fields: Record<string, string> = {
        'user[profile_bio]': params.bio || '',
        'user[profile_blog]': params.blog || '',
        'user[profile_company]': params.company || '',
        'user[profile_location]': params.location || '',
        'user[profile_name]': params.name || '',
      };

      for (const [name, value] of Object.entries(fields)) {
        if (!value) continue;
        const selector = `[name="${name}"]`;
        const el = ctx.page.locator(selector).first();
        const exists = await el.isVisible().catch(() => false);
        if (exists) {
          await el.fill(value);
          await ctx.page.waitForTimeout(300);
        }
      }

      if (params.hireable !== undefined) {
        const checkbox = ctx.page.locator('#user_profile_hireable');
        const isChecked = await checkbox.isChecked().catch(() => false);
        if (params.hireable !== isChecked) {
          await checkbox.click();
        }
      }

      const submitBtn = ctx.page.locator('button[type="submit"], input[type="submit"]').first();
      await submitBtn.click();
      await ctx.page.waitForTimeout(2000);

      const currentUrl = ctx.page.url();
      const saved = !currentUrl.includes('error');

      return {
        data: {
          url: currentUrl,
          saved,
          updatedFields: Object.entries(fields)
            .filter(([, v]) => v)
            .map(([k]) => k),
        },
        tips: [saved ? 'Profile 更新成功' : 'Profile 更新可能失败，请检查页面'],
      };
    },
  });

  site.command('add-social-link', {
    description: '添加社交链接到 GitHub Profile',
    scope: 'browser',
    parameters: z.object({
      url: z.string().describe('社交链接 URL'),
    }),
    examples: [
      {
        cmd: 'xcli github add-social-link --url "https://twitter.com/yourname"',
        description: '添加 Twitter 链接',
      },
    ],
    handler: async (params, ctx) => {
      if (!ctx.page) throw new Error('需要浏览器页面上下文');

      await ctx.page.goto('https://github.com/settings/profile', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      await ctx.page.waitForTimeout(2000);

      const socialInputs = ctx.page.locator('[name="user[profile_social_accounts][][url]"]');
      const count = await socialInputs.count();

      let filled = false;
      for (let i = 0; i < count; i++) {
        const input = socialInputs.nth(i);
        const value = await input.inputValue();
        if (!value) {
          await input.fill(params.url);
          filled = true;
          break;
        }
      }

      if (!filled) {
        const addBtn = ctx.page.locator('button:has-text("Add"), button.js-add-social-account');
        await addBtn
          .first()
          .click()
          .catch(() => {});
        await ctx.page.waitForTimeout(500);
        const newInputs = ctx.page.locator('[name="user[profile_social_accounts][][url]"]');
        const lastIdx = (await newInputs.count()) - 1;
        if (lastIdx >= 0) {
          await newInputs.nth(lastIdx).fill(params.url);
          filled = true;
        }
      }

      const submitBtn = ctx.page.locator('button[type="submit"], input[type="submit"]').first();
      await submitBtn.click();
      await ctx.page.waitForTimeout(2000);

      return {
        data: { url: params.url, filled, saved: true },
        tips: [filled ? `已添加社交链接: ${params.url}` : '没有可用的社交链接空位'],
      };
    },
  });

  site.command('create-gist', {
    description: '创建 GitHub Gist（带外链）',
    scope: 'browser',
    parameters: z.object({
      filename: z.string().default('readme.md').describe('文件名'),
      content: z.string().describe('Gist 内容（支持 Markdown）'),
      description: z.string().optional().describe('Gist 描述'),
      public: z.boolean().optional().default(true).describe('是否公开'),
    }),
    examples: [
      {
        cmd: 'xcli github create-gist --filename "seo.md" --content "# My Project\\nhttps://example.com" --description "Project info"',
        description: '创建带外链的 Gist',
      },
    ],
    handler: async (params, ctx) => {
      if (!ctx.page) throw new Error('需要浏览器页面上下文');

      await ctx.page.goto('https://gist.github.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      await ctx.page.waitForTimeout(2000);

      const descInput = ctx.page.locator('[name="gist[description]"]').first();
      await descInput.fill(params.description || '');

      const nameInput = ctx.page.locator('[name="gist[contents][][name]"]').first();
      await nameInput.fill(params.filename);

      const contentArea = ctx.page.locator('.CodeMirror').first();
      if (await contentArea.isVisible().catch(() => false)) {
        await contentArea.click();
        await ctx.page.keyboard.type(params.content, { delay: 10 });
      } else {
        const textarea = ctx.page.locator('[name="gist[contents][][content]"]').first();
        await textarea.fill(params.content);
      }

      if (!params.public) {
        const secretBtn = ctx.page.locator('button:has-text("Create secret gist")').first();
        await secretBtn.click();
      } else {
        const publicBtn = ctx.page.locator('button:has-text("Create public gist")').first();
        await publicBtn.click();
      }

      await ctx.page.waitForTimeout(3000);
      const gistUrl = ctx.page.url();

      return {
        data: {
          gistUrl,
          filename: params.filename,
          public: params.public,
        },
        tips: [
          gistUrl.includes('gist.github.com')
            ? `Gist 创建成功: ${gistUrl}`
            : 'Gist 创建可能失败，请检查',
        ],
      };
    },
  });

  site.command('get-profile', {
    description: '获取当前 GitHub Profile 信息',
    scope: 'browser',
    parameters: z.object({
      username: z.string().optional().describe('GitHub 用户名，不填则获取自己的'),
    }),
    examples: [{ cmd: 'xcli github get-profile', description: '获取 Profile 信息' }],
    handler: async (params, ctx) => {
      if (!ctx.page) throw new Error('需要浏览器页面上下文');

      let profileUrl: string;
      if (params.username) {
        profileUrl = `https://github.com/${params.username}`;
      } else {
        await ctx.page.goto('https://github.com/', {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });
        await ctx.page.waitForTimeout(1500);
        const userLink = await ctx.page
          .locator('a[data-hovercard-type="user"], a[aria-label="View profile"]')
          .first()
          .getAttribute('href')
          .catch(() => '');
        if (userLink) {
          profileUrl = `https://github.com${userLink}`;
        } else {
          const html = await ctx.page.content();
          const match = html.match(/"login"\s*:\s*"([^"]+)"/);
          profileUrl = match ? `https://github.com/${match[1]}` : 'https://github.com/';
        }
      }

      await ctx.page.goto(profileUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      await ctx.page.waitForTimeout(2000);

      const profile = await ctx.page.evaluate(() => {
        const get = (sel: string) => document.querySelector(sel)?.textContent?.trim() || '';

        const bio = get('.p-note .js-user-profile-bio');
        const name = get('.vcard-fullname');
        const username =
          get('.vcard-username') ||
          document.querySelector('[data-scope-id]')?.getAttribute('data-scope-id') ||
          '';
        const location = get('[itemprop="homeLocation"]');
        const company = get('[itemprop="worksFor"]');
        const website = document.querySelector('[itemprop="url"] a')?.getAttribute('href') || '';
        const socialLinks = Array.from(
          document.querySelectorAll('.js-profile-editable-area a[href]')
        )
          .map((a) => a.getAttribute('href') || '')
          .filter((h) => h.startsWith('http'));

        const avatar = document.querySelector('.js-user-profile-avatar')?.getAttribute('src') || '';

        return { bio, name, username, location, company, website, socialLinks, avatar };
      });

      return {
        data: profile,
        tips: [`Profile: ${profile.name} (@${profile.username})`],
      };
    },
  });

  site.login(async (ctx) => {
    if (!ctx.page) return;
    await ctx.page.goto('https://github.com/login');
    await ctx.storage.set('github_login', { at: Date.now() });
  });

  site.logout(async (ctx) => {
    await ctx.storage.delete('github_login');
  });
}
