# 07-lazy-load 插件验证报告

## 基本信息

- **插件名称**: 07-lazy-load
- **验证时间**: 2026-04-22
- **状态**: 验证完成

---

## 0. 插件 Help

### 0.1 --help 输出

```bash
npx tsx xcli/bin/xcli.ts 07-lazy-load --help
```

```
07-lazy-load - No URL

Commands:
  scrape          采集懒加载新闻数据

Use --json for JSON output

```

---

## 1. scrape 命令

### 1.1 默认输出 (YAML)

```bash
npx tsx xcli/bin/xcli.ts 07-lazy-load scrape --base_url "https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/07-lazy-load.html"
```

```yaml
data:
  total: 50
  pages: 5
  news:
    -
      title: 苹果发布M3芯片：性能提升30% - 新闻 1
      source: 科技日报
      time: 1小时前
      views: 1179
    -
      title: 特斯拉自动驾驶技术再突破 - 新闻 2
      source: 汽车之家
      time: 1小时前
      views: 1630
    -
      title: ChatGPT-5即将发布：细节透露 - 新闻 3
      source: AI前线
      time: 2小时前
      views: 8523
    -
      title: 华为鸿蒙系统突破4亿用户 - 新闻 4
      source: 数码圈
      time: 2小时前
      views: 5195
    -
      title: 小米汽车SU7首发预订火爆 - 新闻 5
      source: 互联网周刊
      time: 3小时前
      views: 1735
    -
      title: 英伟达市值突破2万亿美元 - 新闻 6
      source: 科技日报
      time: 3小时前
      views: 4978
    -
      title: SpaceX星舰第三次试飞圆满成功 - 新闻 7
      source: 汽车之家
      time: 4小时前
      views: 7171
    -
      title: 国产大飞机C919开启商业运营 - 新闻 8
      source: AI前线
      time: 4小时前
      views: 5766
    -
      title: 量子计算领域取得重大进展 - 新闻 9
      source: 数码圈
      time: 5小时前
      views: 8162
    -
      title: 虚拟现实技术在医疗领域的应用 - 新闻 10
      source: 互联网周刊
      time: 5小时前
      views: 2080
    -
      title: 苹果发布M3芯片：性能提升30% - 新闻 11
      source: 科技日报
      time: 6小时前
      views: 2062
    -
      title: 特斯拉自动驾驶技术再突破 - 新闻 12
      source: 汽车之家
      time: 6小时前
      views: 4946
    -
      title: ChatGPT-5即将发布：细节透露 - 新闻 13
      source: AI前线
      time: 7小时前
      views: 6574
    -
      title: 华为鸿蒙系统突破4亿用户 - 新闻 14
      source: 数码圈
      time: 7小时前
      views: 5076
    -
      title: 小米汽车SU7首发预订火爆 - 新闻 15
      source: 互联网周刊
      time: 8小时前
      views: 4846
    -
      title: 英伟达市值突破2万亿美元 - 新闻 16
      source: 科技日报
      time: 8小时前
      views: 9428
    -
      title: SpaceX星舰第三次试飞圆满成功 - 新闻 17
      source: 汽车之家
      time: 9小时前
      views: 4615
    -
      title: 国产大飞机C919开启商业运营 - 新闻 18
      source: AI前线
      time: 9小时前
      views: 5394
    -
      title: 量子计算领域取得重大进展 - 新闻 19
      source: 数码圈
      time: 10小时前
      views: 2509
    -
      title: 虚拟现实技术在医疗领域的应用 - 新闻 20
      source: 互联网周刊
      time: 10小时前
      views: 10898
    -
      title: 苹果发布M3芯片：性能提升30% - 新闻 21
      source: 科技日报
      time: 11小时前
      views: 3730
    -
      title: 特斯拉自动驾驶技术再突破 - 新闻 22
      source: 汽车之家
      time: 11小时前
      views: 4513
    -
      title: ChatGPT-5即将发布：细节透露 - 新闻 23
      source: AI前线
      time: 12小时前
      views: 3482
    -
      title: 华为鸿蒙系统突破4亿用户 - 新闻 24
      source: 数码圈
      time: 12小时前
      views: 8819
    -
      title: 小米汽车SU7首发预订火爆 - 新闻 25
      source: 互联网周刊
      time: 13小时前
      views: 1594
    -
      title: 英伟达市值突破2万亿美元 - 新闻 26
      source: 科技日报
      time: 13小时前
      views: 7888
    -
      title: SpaceX星舰第三次试飞圆满成功 - 新闻 27
      source: 汽车之家
      time: 14小时前
      views: 6217
    -
      title: 国产大飞机C919开启商业运营 - 新闻 28
      source: AI前线
      time: 14小时前
      views: 10184
    -
      title: 量子计算领域取得重大进展 - 新闻 29
      source: 数码圈
      time: 15小时前
      views: 10430
    -
      title: 虚拟现实技术在医疗领域的应用 - 新闻 30
      source: 互联网周刊
      time: 15小时前
      views: 7784
    -
      title: 苹果发布M3芯片：性能提升30% - 新闻 31
      source: 科技日报
      time: 16小时前
      views: 10256
    -
      title: 特斯拉自动驾驶技术再突破 - 新闻 32
      source: 汽车之家
      time: 16小时前
      views: 6313
    -
      title: ChatGPT-5即将发布：细节透露 - 新闻 33
      source: AI前线
      time: 17小时前
      views: 3480
    -
      title: 华为鸿蒙系统突破4亿用户 - 新闻 34
      source: 数码圈
      time: 17小时前
      views: 2280
    -
      title: 小米汽车SU7首发预订火爆 - 新闻 35
      source: 互联网周刊
      time: 18小时前
      views: 6343
    -
      title: 英伟达市值突破2万亿美元 - 新闻 36
      source: 科技日报
      time: 18小时前
      views: 2658
    -
      title: SpaceX星舰第三次试飞圆满成功 - 新闻 37
      source: 汽车之家
      time: 19小时前
      views: 2897
    -
      title: 国产大飞机C919开启商业运营 - 新闻 38
      source: AI前线
      time: 19小时前
      views: 6330
    -
      title: 量子计算领域取得重大进展 - 新闻 39
      source: 数码圈
      time: 20小时前
      views: 1389
    -
      title: 虚拟现实技术在医疗领域的应用 - 新闻 40
      source: 互联网周刊
      time: 20小时前
      views: 5550
    -
      title: 苹果发布M3芯片：性能提升30% - 新闻 41
      source: 科技日报
      time: 21小时前
      views: 2425
    -
      title: 特斯拉自动驾驶技术再突破 - 新闻 42
      source: 汽车之家
      time: 21小时前
      views: 1729
    -
      title: ChatGPT-5即将发布：细节透露 - 新闻 43
      source: AI前线
      time: 22小时前
      views: 8000
    -
      title: 华为鸿蒙系统突破4亿用户 - 新闻 44
      source: 数码圈
      time: 22小时前
      views: 10220
    -
      title: 小米汽车SU7首发预订火爆 - 新闻 45
      source: 互联网周刊
      time: 23小时前
      views: 9064
    -
      title: 英伟达市值突破2万亿美元 - 新闻 46
      source: 科技日报
      time: 23小时前
      views: 8738
    -
      title: SpaceX星舰第三次试飞圆满成功 - 新闻 47
      source: 汽车之家
      time: 24小时前
      views: 3462
    -
      title: 国产大飞机C919开启商业运营 - 新闻 48
      source: AI前线
      time: 24小时前
      views: 4688
    -
      title: 量子计算领域取得重大进展 - 新闻 49
      source: 数码圈
      time: 25小时前
      views: 2550
    -
      title: 虚拟现实技术在医疗领域的应用 - 新闻 50
      source: 互联网周刊
      time: 25小时前
      views: 10960
💡 采集完成，共 5 次 50 条数据

```

### 1.2 JSON 输出

```bash
npx tsx xcli/bin/xcli.ts 07-lazy-load scrape --base_url "https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/07-lazy-load.html" --json
```

```json
{
  "data": {
    "total": 50,
    "pages": 5,
    "news": [
      {
        "title": "苹果发布M3芯片：性能提升30% - 新闻 1",
        "source": "科技日报",
        "time": "1小时前",
        "views": 9776
      },
      {
        "title": "特斯拉自动驾驶技术再突破 - 新闻 2",
        "source": "汽车之家",
        "time": "1小时前",
        "views": 10303
      },
      {
        "title": "ChatGPT-5即将发布：细节透露 - 新闻 3",
        "source": "AI前线",
        "time": "2小时前",
        "views": 9513
      },
      {
        "title": "华为鸿蒙系统突破4亿用户 - 新闻 4",
        "source": "数码圈",
        "time": "2小时前",
        "views": 9901
      },
      {
        "title": "小米汽车SU7首发预订火爆 - 新闻 5",
        "source": "互联网周刊",
        "time": "3小时前",
        "views": 4489
      },
      {
        "title": "英伟达市值突破2万亿美元 - 新闻 6",
        "source": "科技日报",
        "time": "3小时前",
        "views": 8371
      },
      {
        "title": "SpaceX星舰第三次试飞圆满成功 - 新闻 7",
        "source": "汽车之家",
        "time": "4小时前",
        "views": 3549
      },
      {
        "title": "国产大飞机C919开启商业运营 - 新闻 8",
        "source": "AI前线",
        "time": "4小时前",
        "views": 8128
      },
      {
        "title": "量子计算领域取得重大进展 - 新闻 9",
        "source": "数码圈",
        "time": "5小时前",
        "views": 6305
      },
      {
        "title": "虚拟现实技术在医疗领域的应用 - 新闻 10",
        "source": "互联网周刊",
        "time": "5小时前",
        "views": 2378
      },
      {
        "title": "苹果发布M3芯片：性能提升30% - 新闻 11",
        "source": "科技日报",
        "time": "6小时前",
        "views": 5057
      },
      {
        "title": "特斯拉自动驾驶技术再突破 - 新闻 12",
        "source": "汽车之家",
        "time": "6小时前",
        "views": 5797
      },
      {
        "title": "ChatGPT-5即将发布：细节透露 - 新闻 13",
        "source": "AI前线",
        "time": "7小时前",
        "views": 6347
      },
      {
        "title": "华为鸿蒙系统突破4亿用户 - 新闻 14",
        "source": "数码圈",
        "time": "7小时前",
        "views": 4307
      },
      {
        "title": "小米汽车SU7首发预订火爆 - 新闻 15",
        "source": "互联网周刊",
        "time": "8小时前",
        "views": 7053
      },
      {
        "title": "英伟达市值突破2万亿美元 - 新闻 16",
        "source": "科技日报",
        "time": "8小时前",
        "views": 2889
      },
      {
        "title": "SpaceX星舰第三次试飞圆满成功 - 新闻 17",
        "source": "汽车之家",
        "time": "9小时前",
        "views": 2960
      },
      {
        "title": "国产大飞机C919开启商业运营 - 新闻 18",
        "source": "AI前线",
        "time": "9小时前",
        "views": 4998
      },
      {
        "title": "量子计算领域取得重大进展 - 新闻 19",
        "source": "数码圈",
        "time": "10小时前",
        "views": 10851
      },
      {
        "title": "虚拟现实技术在医疗领域的应用 - 新闻 20",
        "source": "互联网周刊",
        "time": "10小时前",
        "views": 5684
      },
      {
        "title": "苹果发布M3芯片：性能提升30% - 新闻 21",
        "source": "科技日报",
        "time": "11小时前",
        "views": 8083
      },
      {
        "title": "特斯拉自动驾驶技术再突破 - 新闻 22",
        "source": "汽车之家",
        "time": "11小时前",
        "views": 7761
      },
      {
        "title": "ChatGPT-5即将发布：细节透露 - 新闻 23",
        "source": "AI前线",
        "time": "12小时前",
        "views": 4389
      },
      {
        "title": "华为鸿蒙系统突破4亿用户 - 新闻 24",
        "source": "数码圈",
        "time": "12小时前",
        "views": 10199
      },
      {
        "title": "小米汽车SU7首发预订火爆 - 新闻 25",
        "source": "互联网周刊",
        "time": "13小时前",
        "views": 5003
      },
      {
        "title": "英伟达市值突破2万亿美元 - 新闻 26",
        "source": "科技日报",
        "time": "13小时前",
        "views": 2540
      },
      {
        "title": "SpaceX星舰第三次试飞圆满成功 - 新闻 27",
        "source": "汽车之家",
        "time": "14小时前",
        "views": 3121
      },
      {
        "title": "国产大飞机C919开启商业运营 - 新闻 28",
        "source": "AI前线",
        "time": "14小时前",
        "views": 10625
      },
      {
        "title": "量子计算领域取得重大进展 - 新闻 29",
        "source": "数码圈",
        "time": "15小时前",
        "views": 5581
      },
      {
        "title": "虚拟现实技术在医疗领域的应用 - 新闻 30",
        "source": "互联网周刊",
        "time": "15小时前",
        "views": 6271
      },
      {
        "title": "苹果发布M3芯片：性能提升30% - 新闻 31",
        "source": "科技日报",
        "time": "16小时前",
        "views": 6027
      },
      {
        "title": "特斯拉自动驾驶技术再突破 - 新闻 32",
        "source": "汽车之家",
        "time": "16小时前",
        "views": 4013
      },
      {
        "title": "ChatGPT-5即将发布：细节透露 - 新闻 33",
        "source": "AI前线",
        "time": "17小时前",
        "views": 9898
      },
      {
        "title": "华为鸿蒙系统突破4亿用户 - 新闻 34",
        "source": "数码圈",
        "time": "17小时前",
        "views": 4388
      },
      {
        "title": "小米汽车SU7首发预订火爆 - 新闻 35",
        "source": "互联网周刊",
        "time": "18小时前",
        "views": 6700
      },
      {
        "title": "英伟达市值突破2万亿美元 - 新闻 36",
        "source": "科技日报",
        "time": "18小时前",
        "views": 10326
      },
      {
        "title": "SpaceX星舰第三次试飞圆满成功 - 新闻 37",
        "source": "汽车之家",
        "time": "19小时前",
        "views": 6625
      },
      {
        "title": "国产大飞机C919开启商业运营 - 新闻 38",
        "source": "AI前线",
        "time": "19小时前",
        "views": 6496
      },
      {
        "title": "量子计算领域取得重大进展 - 新闻 39",
        "source": "数码圈",
        "time": "20小时前",
        "views": 3201
      },
      {
        "title": "虚拟现实技术在医疗领域的应用 - 新闻 40",
        "source": "互联网周刊",
        "time": "20小时前",
        "views": 1572
      },
      {
        "title": "苹果发布M3芯片：性能提升30% - 新闻 41",
        "source": "科技日报",
        "time": "21小时前",
        "views": 10861
      },
      {
        "title": "特斯拉自动驾驶技术再突破 - 新闻 42",
        "source": "汽车之家",
        "time": "21小时前",
        "views": 3663
      },
      {
        "title": "ChatGPT-5即将发布：细节透露 - 新闻 43",
        "source": "AI前线",
        "time": "22小时前",
        "views": 2969
      },
      {
        "title": "华为鸿蒙系统突破4亿用户 - 新闻 44",
        "source": "数码圈",
        "time": "22小时前",
        "views": 8416
      },
      {
        "title": "小米汽车SU7首发预订火爆 - 新闻 45",
        "source": "互联网周刊",
        "time": "23小时前",
        "views": 7899
      },
      {
        "title": "英伟达市值突破2万亿美元 - 新闻 46",
        "source": "科技日报",
        "time": "23小时前",
        "views": 2952
      },
      {
        "title": "SpaceX星舰第三次试飞圆满成功 - 新闻 47",
        "source": "汽车之家",
        "time": "24小时前",
        "views": 7209
      },
      {
        "title": "国产大飞机C919开启商业运营 - 新闻 48",
        "source": "AI前线",
        "time": "24小时前",
        "views": 8891
      },
      {
        "title": "量子计算领域取得重大进展 - 新闻 49",
        "source": "数码圈",
        "time": "25小时前",
        "views": 2070
      },
      {
        "title": "虚拟现实技术在医疗领域的应用 - 新闻 50",
        "source": "互联网周刊",
        "time": "25小时前",
        "views": 9901
      }
    ]
  },
  "tips": [
    "采集完成，共 5 次 50 条数据"
  ]
}

```

### 1.3 --help 输出

```bash
npx tsx xcli/bin/xcli.ts 07-lazy-load scrape --help
```

```
📌 scrape - 采集懒加载新闻数据

采集懒加载新闻数据

⚙️  Parameters (Zod):
--base_url [string] (optional)
    目标URL
--limit [any] (optional)
    每次加载数量

📤 Result (Zod):
  data: [object] { total, pages, news }

📝 Examples:
  $ xcli 07-lazy-load scrape --base_url "https://..."

    data:
      total: 50
      pages: 5
      news:
        - title: "苹果发布M3芯片：性能提升30%"
          source: "科技日报"
          time: "2小时前"
          views: 3456
        - ...
    💡 采集完成，共 5 次 50 条数据

```

---

## 2. verify 命令

### 2.1 默认输出 (YAML)

```bash
npx tsx xcli/bin/xcli.ts 07-lazy-load verify
```

```yaml
Available: scrape

```

### 2.2 --help 输出

```bash
npx tsx xcli/bin/xcli.ts 07-lazy-load verify --help
```

```
Available: scrape

```

---

## 3. 结论

**状态**: ✅ 验证完成

---
*此文档由自动化脚本生成*
