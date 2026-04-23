# douban.yaml

## 原始结构

```
#anony-nav-banner: [l:1 t:1]
  #douban-logo: [l:1]
#anony-reg-new: [l:2 t:1 1KB→92B]
  .login: [div]
  .app: [l:2 t:1]
    .app-qr: [l:1 t:1]
      #expand-qr: [a]
      .app-qr-expand: [div]
#anony-sns: [t:39 8.4KB→1.4KB]
  .side: [t:25 3.5KB→888B]
    .mod: [l:6 t:2 1.1KB→309B]
      .mod-header: [l:1 t:2]
      .rumor-links: [list l:5 t:5]
  .main: [t:14 4.7KB→578B]
    .mod: [t:11 ×3 4.5KB→578B]
      .doulist-item: [l:5 t:4 1.4KB→172B]
        .mod: [l:5 t:3 1.3KB→172B]
          .bd doulist-note: [l:5 t:4 1.3KB→172B]
            .pic: [l:1]
              .pic-wrap: [l:1]
            .note-fl: [l:4 t:2]
              .meta: [l:2]
              .title: [l:1]
              .meta: [l:1 t:3]
#anony-group: [t:59 11.1KB→1.6KB]
  .side-links nav-anon: [2KB→473B]
  .side: [div]
  .main: [t:38 8.9KB→1.1KB]
    .group-list list: [8.6KB→1.1KB]
#anony-movie: [t:18 7KB→1.1KB]
  .side-links nav-anon: [l:5]
    .site-nav-bt: [l:1]
  .apps-list: [div]
  .side: [t:2 1.2KB→328B]
    .mod: [t:12 1.2KB→328B]
      .list1 movie-charts: [l:10]
  .main: [t:10 5KB→659B]
    .movie-list list: [t:16 4.8KB→592B]
#anony-book: [t:67 11.4KB→2.4KB]
  .mod: [l:7 t:7]
    .side-links nav-anon: [l:6]
  .side: [t:55 4.7KB→1.4KB]
    .mod: [t:8 4.7KB→1.4KB]
      .book-cate-mod: [t:53 ×6 4.4KB→1.3KB]
        .cate book-cate: [l:9 t:1]
  .main: [t:12 ×2 5.8KB→825B]
    .mod: [t:10 2.7KB→391B]
      .book-list list: [t:4 2.4KB→324B]
#anony-music: [t:75 14.2KB→2.6KB]
  .side-links nav-anon: [l:2]
  .apps-list: [l:2 t:1]
  .side: [t:62 5.9KB→1.6KB]
    .mod: [t:5 5.9KB→1.6KB]
      .music-cate-mod: [t:60 ×3 5.6KB→1.5KB]
        .cate book-cate: [t:1 1.9KB→524B]
  .main: [t:10 7.5KB→944B]
    .album-list list: [t:19 7.2KB→876B]
#anony-market: [t:14 7.4KB→890B]
  .side: [l:6 t:3 ×2 2.6KB→387B]
    .mod: [l:2 t:1]
      .market-topics: [list l:2]
  .main: [l:9 t:10 2.9KB→349B]
    .market-spu-list: [l:8 ×4 2.6KB→282B]
      .main-sku: [l:2 t:2]
        .market-spu-footer: [l:1]
#anony-events: [t:11 7.4KB→1.5KB]
  .side-links nav-anon: [l:3]
  .apps-list: [div]
  .side: [t:1 3.3KB→828B]
    .mod: [t:32 ×5 3.3KB→828B]
      .cate events-cate: [l:5]
  .main: [l:9 t:6 3.4KB→618B]
    .events-list list: [l:8 t:12 3.2KB→544B]
#anony-time: [t:3 5.7KB→997B]
  .side: [div]
  .main: [t:2 5.5KB→973B]
    .time-list: [t:20 5.2KB→906B]
#ft: [t:15 2.1KB→406B]
  #icp: [l:9 t:10 1.6KB→295B]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

- `#anony-nav-banner` - 顶部导航栏（豆瓣logo）
- `#anony-reg-new .login` - 登录表单
- `#anony-sns .main .doulist-item` - 豆瓣广播内容
- `#anony-group .main .group-list` - 小组列表
- `#anony-movie .main .movie-list` - 电影列表
- `#anony-book .main .book-list` - 读书列表
- `#anony-music .main .album-list` - 音乐专辑列表
- `#anony-market .main .market-spu-list` - 豆瓣市集商品列表
- `#anony-events .main .events-list` - 同城活动列表
- `#anony-time .main .time-list` - 豆瓣时间列表
- `#ft #icp` - 页脚版权信息

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `#anony-reg-new .app` | 豆瓣App推广区域，含二维码，属于推广弹窗性质 |
| `.app-qr-expand` | 展开的App下载二维码容器 |
| `#anony-movie .apps-list` | 电影区App推广列表 |
| `#anony-events .apps-list` | 同城活动App推广列表 |
| `.side-links nav-anon` | 重复的侧边导航链接（各区块都有） |
| `.side .mod` | 侧边栏各类排行榜/分类模块（信息密度低） |
| `.book-cate-mod` | 读书分类侧边栏模块 |
| `.music-cate-mod` | 音乐分类侧边栏模块 |
| `.market-topics` | 市集话题侧边栏 |

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `#anony-*` (前缀) | 匿名首页ID命名，结构可能变化 |
| `.mod` (通用名) | 被多处复用的模块类名，容易冲突 |
| `.doulist-item` | 豆瓣清单项目，可复用结构 |
| `.meta` | 元信息标签，多处出现，语义模糊 |

### 过滤后的结构树

```
#anony-nav-banner
  #douban-logo (logo链接)

#anony-reg-new
  .login (登录表单)

#anony-sns
  .main
    .doulist-item ×N
      .bd
        .pic (图片)
        .note-fl
          .title (标题)
          .meta (元信息)

#anony-group
  .main
    .group-list (小组列表)

#anony-movie
  .main
    .movie-list (电影列表)

#anony-book
  .main
    .mod
      .book-list (图书列表)

#anony-music
  .main
    .album-list (专辑列表)

#anony-market
  .main
    .market-spu-list ×N
      .main-sku (商品项)

#anony-events
  .main
    .events-list (活动列表)

#anony-time
  .main
    .time-list (时间线列表)

#ft
  #icp (版权信息)
```

**总结**: 豆瓣首页以内容列表为主，侧边栏信息价值较低。建议保留核心内容流（电影/图书/音乐/小组/市集/活动/时间），删除App推广、侧边分类模块。HTML压缩比普遍较高(5:1~10:1)，说明DOM中含大量装饰性元素和冗余层级。
