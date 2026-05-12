import { z } from 'zod/v4';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

const jobSchema = z.object({
  title: z.string(),
  company: z.string(),
  salary: z.string().optional(),
  city: z.string().optional(),
  experience: z.string().optional(),
  education: z.string().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
});

const jobSiteResultSchema = z.object({
  totalJobs: z.number(),
  jobs: z.array(jobSchema),
  searchedKeyword: z.string().optional(),
});

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '26-job-site',
    url: crawlerUrl('26-job-site'),
  });

  site.command('scrape', {
    description: '采集职位列表数据，提取职位名称/薪资/城市/公司等信息',
    scope: 'page',
    parameters: z.object({
      keyword: z.string().optional().describe('搜索关键词'),
    }),
    result: z.object({
      data: z.array(jobSiteResultSchema),
      tips: z.array(z.string()).optional().default([]),
    }),
    handler: async (params, ctx) => {
      if (!ctx.page) return fail('需要浏览器页面');
      try {
        const page = ctx.page;
        await safeGoto(page, site.url);
        await page.waitForSelector('#job-container', { timeout: 8000 });

        const tips: string[] = [];

        if (params.keyword) {
          const searchInput = page.locator('.search-input, #search-input');
          if ((await searchInput.count()) > 0) {
            await searchInput.fill(params.keyword);
            const searchBtn = page
              .locator('button:has-text("搜索"), .search-btn, #search-btn')
              .first();
            if ((await searchBtn.count()) > 0) {
              await searchBtn.click();
              await page.waitForTimeout(1000);
            }
            tips.push(`搜索关键词: ${params.keyword}`);
          }
        }

        // Try clicking "load more" if present
        const loadMoreBtn = page.locator('.load-more, #load-more');
        if ((await loadMoreBtn.count()) > 0) {
          try {
            await loadMoreBtn.click();
            await page.waitForTimeout(800);
            tips.push('已点击加载更多');
          } catch {
            tips.push('加载更多按钮不可点击');
          }
        }

        // Extract all job cards
        const jobs = await page.evaluate(() => {
          const container = document.getElementById('job-container');
          if (!container) return [];

          const cards = container.querySelectorAll('.job-card, .job-item, .job');
          return Array.from(cards).map((card) => {
            const titleEl =
              card.querySelector('.job-title, .title, h3, h4') ??
              card.querySelector('[class*="title"]');
            const companyEl =
              card.querySelector('.company, .company-name, [class*="company"]') ??
              card.querySelectorAll('span, div')[1];
            const salaryEl =
              card.querySelector('.salary, [class*="salary"]') ??
              card.querySelector('[class*="pay"]');
            const cityEl = card.querySelector('.city, [class*="city"], [class*="location"]');
            const expEl = card.querySelector('.experience, [class*="exp"]');
            const eduEl = card.querySelector('.education, [class*="edu"]');
            const descEl = card.querySelector('.description, .desc, p');

            const tagEls = card.querySelectorAll('.tag, .tags span, [class*="tag"] span');
            const tags = Array.from(tagEls)
              .map((t) => t.textContent?.trim() ?? '')
              .filter(Boolean);

            return {
              title: titleEl?.textContent?.trim() ?? '',
              company: companyEl?.textContent?.trim() ?? '',
              salary: salaryEl?.textContent?.trim() ?? undefined,
              city: cityEl?.textContent?.trim() ?? undefined,
              experience: expEl?.textContent?.trim() ?? undefined,
              education: eduEl?.textContent?.trim() ?? undefined,
              tags: tags.length > 0 ? tags : undefined,
              description: descEl?.textContent?.trim() ?? undefined,
            };
          });
        });

        tips.push(`采集到 ${jobs.length} 个职位`);

        // Try to get the first job's detail
        if (jobs.length > 0) {
          const firstCard = page.locator('.job-card, .job-item, .job').first();
          if ((await firstCard.count()) > 0) {
            try {
              await firstCard.click();
              await page.waitForTimeout(800);

              const modalData = await page.evaluate(() => {
                const modal =
                  document.getElementById('job-modal') ??
                  document.querySelector('.modal, .detail-modal, .job-detail');
                if (!modal) return null;

                const detailText = modal.textContent?.trim() ?? '';
                const detailDesc = modal.querySelector('.description, .detail-desc, .job-desc');
                const detailReq = modal.querySelector('.requirements, .detail-req');

                return {
                  detailDescription: detailDesc?.textContent?.trim() ?? '',
                  detailRequirements: detailReq?.textContent?.trim() ?? '',
                  rawText: detailText.substring(0, 500),
                };
              });

              if (modalData) {
                tips.push(`已打开第一个职位详情`);
                if (jobs[0]) {
                  jobs[0] = {
                    ...jobs[0],
                    description:
                      modalData.detailDescription || modalData.rawText || jobs[0].description,
                  };
                }
              }
            } catch {
              tips.push('职位详情弹窗未出现');
            }
          }
        }

        return ok([{ totalJobs: jobs.length, jobs, searchedKeyword: params.keyword }], tips);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return fail(msg);
      }
    },
  });

  site.command('verify', {
    description: '验证职位列表页面可达且数据正确',
    scope: 'page',
    parameters: z.object({}),
    result: z.object({
      status: z.enum(['pass', 'fail']),
      data: z.array(jobSiteResultSchema),
      errors: z.array(z.object({ field: z.string(), expected: z.string(), actual: z.string() })),
      tips: z.array(z.string()).optional().default([]),
    }),
    handler: async (_params, ctx) => {
      if (!ctx.page) {
        return {
          status: 'fail' as const,
          data: [],
          errors: [{ field: 'page', expected: '浏览器页面', actual: '无' }],
          tips: [],
        };
      }
      try {
        const page = ctx.page;
        await safeGoto(page, site.url);
        await page.waitForSelector('#job-container', { timeout: 8000 });

        const data = await page.evaluate(() => {
          const container = document.getElementById('job-container');
          const cards = container?.querySelectorAll('.job-card, .job-item, .job') ?? [];
          const firstCard = cards[0];
          const firstTitle =
            firstCard?.querySelector('.job-title, .title, h3, h4')?.textContent?.trim() ?? '';

          return {
            hasContainer: !!container,
            cardCount: cards.length,
            firstTitle,
          };
        });

        const errors: Array<{ field: string; expected: string; actual: string }> = [];
        if (!data.hasContainer)
          errors.push({ field: 'jobContainer', expected: '存在', actual: '未找到' });
        if (data.cardCount === 0) errors.push({ field: 'jobs', expected: '>0', actual: '0' });
        if (data.cardCount !== 8)
          errors.push({ field: 'jobCount', expected: '8', actual: String(data.cardCount) });

        const status = errors.length === 0 ? ('pass' as const) : ('fail' as const);
        const tips =
          status === 'pass'
            ? [`验证通过: ${data.cardCount}个职位, 首个: ${data.firstTitle}`]
            : [`问题: ${errors.map((e) => `${e.field}(${e.actual})`).join(', ')}`];

        return { status, data: [], errors, tips };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          status: 'fail' as const,
          data: [],
          errors: [{ field: 'page', expected: '加载成功', actual: msg }],
          tips: [],
        };
      }
    },
  });
}
