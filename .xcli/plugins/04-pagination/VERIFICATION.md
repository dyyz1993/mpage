# 04-pagination 插件验证报告

## 基本信息

- **插件名称**: 04-pagination
- **验证时间**: 2026-04-22
- **状态**: 验证完成

---

## 0. 插件 Help

### 0.1 --help 输出

```bash
npx tsx xcli/bin/xcli.ts 04-pagination --help
```

```
04-pagination - No URL

Commands:
  scrape          采集分页数据

Use --json for JSON output

```

---

## 1. scrape 命令

### 1.1 默认输出 (YAML)

```bash
npx tsx xcli/bin/xcli.ts 04-pagination scrape --url "https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/04-pagination.html"
```

```yaml
data:
  total_pages: 16
  threads:
    -
      page: 1
      author: 张三
      datetime: 2024-01-15 10:30
      replies: 14
      views: 3905
      id: 100
      title: 主题 #100
    -
      page: 1
      author: 李四
      datetime: 2024-01-15 9:30
      replies: 18
      views: 2036
      id: 99
      title: 主题 #99
    -
      page: 1
      author: 王五
      datetime: 2024-01-15 8:30
      replies: 104
      views: 3127
      id: 98
      title: 主题 #98
    -
      page: 1
      author: 赵六
      datetime: 2024-01-15 7:30
      replies: 54
      views: 5202
      id: 97
      title: 主题 #97
    -
      page: 1
      author: 孙七
      datetime: 2024-01-15 6:30
      replies: 79
      views: 4865
      id: 96
      title: 主题 #96
    -
      page: 1
      author: 周八
      datetime: 2024-01-15 5:30
      replies: 15
      views: 4744
      id: 95
      title: 主题 #95
    -
      page: 1
      author: 吴九
      datetime: 2024-01-15 4:30
      replies: 72
      views: 1508
      id: 94
      title: 主题 #94
    -
      page: 1
      author: 郑十
      datetime: 2024-01-15 3:30
      replies: 53
      views: 1819
      id: 93
      title: 主题 #93
    -
      page: 1
      author: 冯十一
      datetime: 2024-01-15 2:30
      replies: 32
      views: 4588
      id: 92
      title: 主题 #92
    -
      page: 1
      author: 陈十二
      datetime: 2024-01-15 1:30
      replies: 83
      views: 2994
      id: 91
      title: 主题 #91
    -
      page: 2
      author: 张三
      datetime: 2024-01-14 10:30
      replies: 20
      views: 3040
      id: 90
      title: 主题 #90
    -
      page: 2
      author: 李四
      datetime: 2024-01-14 9:30
      replies: 10
      views: 3448
      id: 89
      title: 主题 #89
    -
      page: 2
      author: 王五
      datetime: 2024-01-14 8:30
      replies: 51
      views: 3554
      id: 88
      title: 主题 #88
    -
      page: 2
      author: 赵六
      datetime: 2024-01-14 7:30
      replies: 104
      views: 3981
      id: 87
      title: 主题 #87
    -
      page: 2
      author: 孙七
      datetime: 2024-01-14 6:30
      replies: 70
      views: 2064
      id: 86
      title: 主题 #86
    -
      page: 2
      author: 周八
      datetime: 2024-01-14 5:30
      replies: 44
      views: 3385
      id: 85
      title: 主题 #85
    -
      page: 2
      author: 吴九
      datetime: 2024-01-14 4:30
      replies: 89
      views: 3258
      id: 84
      title: 主题 #84
    -
      page: 2
      author: 郑十
      datetime: 2024-01-14 3:30
      replies: 73
      views: 1277
      id: 83
      title: 主题 #83
    -
      page: 2
      author: 冯十一
      datetime: 2024-01-14 2:30
      replies: 84
      views: 1086
      id: 82
      title: 主题 #82
    -
      page: 2
      author: 陈十二
      datetime: 2024-01-14 1:30
      replies: 63
      views: 2281
      id: 81
      title: 主题 #81
    -
      page: 3
      author: 张三
      datetime: 2024-01-13 10:30
      replies: 73
      views: 1561
      id: 80
      title: 主题 #80
    -
      page: 3
      author: 李四
      datetime: 2024-01-13 9:30
      replies: 49
      views: 3274
      id: 79
      title: 主题 #79
    -
      page: 3
      author: 王五
      datetime: 2024-01-13 8:30
      replies: 19
      views: 4545
      id: 78
      title: 主题 #78
    -
      page: 3
      author: 赵六
      datetime: 2024-01-13 7:30
      replies: 52
      views: 1030
      id: 77
      title: 主题 #77
    -
      page: 3
      author: 孙七
      datetime: 2024-01-13 6:30
      replies: 10
      views: 4629
      id: 76
      title: 主题 #76
    -
      page: 3
      author: 周八
      datetime: 2024-01-13 5:30
      replies: 98
      views: 3532
      id: 75
      title: 主题 #75
    -
      page: 3
      author: 吴九
      datetime: 2024-01-13 4:30
      replies: 40
      views: 3904
      id: 74
      title: 主题 #74
    -
      page: 3
      author: 郑十
      datetime: 2024-01-13 3:30
      replies: 83
      views: 1432
      id: 73
      title: 主题 #73
    -
      page: 3
      author: 冯十一
      datetime: 2024-01-13 2:30
      replies: 81
      views: 5300
      id: 72
      title: 主题 #72
    -
      page: 3
      author: 陈十二
      datetime: 2024-01-13 1:30
      replies: 26
      views: 3026
      id: 71
      title: 主题 #71
    -
      page: 4
      author: 张三
      datetime: 2024-01-12 10:30
      replies: 48
      views: 1701
      id: 70
      title: 主题 #70
    -
      page: 4
      author: 李四
      datetime: 2024-01-12 9:30
      replies: 27
      views: 3531
      id: 69
      title: 主题 #69
    -
      page: 4
      author: 王五
      datetime: 2024-01-12 8:30
      replies: 21
      views: 696
      id: 68
      title: 主题 #68
    -
      page: 4
      author: 赵六
      datetime: 2024-01-12 7:30
      replies: 38
      views: 4258
      id: 67
      title: 主题 #67
    -
      page: 4
      author: 孙七
      datetime: 2024-01-12 6:30
      replies: 73
      views: 4970
      id: 66
      title: 主题 #66
    -
      page: 4
      author: 周八
      datetime: 2024-01-12 5:30
      replies: 60
      views: 1201
      id: 65
      title: 主题 #65
    -
      page: 4
      author: 吴九
      datetime: 2024-01-12 4:30
      replies: 71
      views: 3379
      id: 64
      title: 主题 #64
    -
      page: 4
      author: 郑十
      datetime: 2024-01-12 3:30
      replies: 103
      views: 4283
      id: 63
      title: 主题 #63
    -
      page: 4
      author: 冯十一
      datetime: 2024-01-12 2:30
      replies: 47
      views: 1212
      id: 62
      title: 主题 #62
    -
      page: 4
      author: 陈十二
      datetime: 2024-01-12 1:30
      replies: 27
      views: 4410
      id: 61
      title: 主题 #61
    -
      page: 5
      author: 张三
      datetime: 2024-01-11 10:30
      replies: 37
      views: 1127
      id: 60
      title: 主题 #60
    -
      page: 5
      author: 李四
      datetime: 2024-01-11 9:30
      replies: 20
      views: 4664
      id: 59
      title: 主题 #59
    -
      page: 5
      author: 王五
      datetime: 2024-01-11 8:30
      replies: 30
      views: 2456
      id: 58
      title: 主题 #58
    -
      page: 5
      author: 赵六
      datetime: 2024-01-11 7:30
      replies: 28
      views: 2337
      id: 57
      title: 主题 #57
    -
      page: 5
      author: 孙七
      datetime: 2024-01-11 6:30
      replies: 23
      views: 3574
      id: 56
      title: 主题 #56
    -
      page: 5
      author: 周八
      datetime: 2024-01-11 5:30
      replies: 106
      views: 3103
      id: 55
      title: 主题 #55
    -
      page: 5
      author: 吴九
      datetime: 2024-01-11 4:30
      replies: 10
      views: 1830
      id: 54
      title: 主题 #54
    -
      page: 5
      author: 郑十
      datetime: 2024-01-11 3:30
      replies: 14
      views: 1052
      id: 53
      title: 主题 #53
    -
      page: 5
      author: 冯十一
      datetime: 2024-01-11 2:30
      replies: 29
      views: 3629
      id: 52
      title: 主题 #52
    -
      page: 5
      author: 陈十二
      datetime: 2024-01-11 1:30
      replies: 71
      views: 2954
      id: 51
      title: 主题 #51
    -
      page: 6
      author: 张三
      datetime: 2024-01-10 10:30
      replies: 44
      views: 2358
      id: 50
      title: 主题 #50
    -
      page: 6
      author: 李四
      datetime: 2024-01-10 9:30
      replies: 88
      views: 3557
      id: 49
      title: 主题 #49
    -
      page: 6
      author: 王五
      datetime: 2024-01-10 8:30
      replies: 50
      views: 4836
      id: 48
      title: 主题 #48
    -
      page: 6
      author: 赵六
      datetime: 2024-01-10 7:30
      replies: 68
      views: 5240
      id: 47
      title: 主题 #47
    -
      page: 6
      author: 孙七
      datetime: 2024-01-10 6:30
      replies: 26
      views: 2248
      id: 46
      title: 主题 #46
    -
      page: 6
      author: 周八
      datetime: 2024-01-10 5:30
      replies: 94
      views: 1028
      id: 45
      title: 主题 #45
    -
      page: 6
      author: 吴九
      datetime: 2024-01-10 4:30
      replies: 100
      views: 3490
      id: 44
      title: 主题 #44
    -
      page: 6
      author: 郑十
      datetime: 2024-01-10 3:30
      replies: 90
      views: 2827
      id: 43
      title: 主题 #43
    -
      page: 6
      author: 冯十一
      datetime: 2024-01-10 2:30
      replies: 106
      views: 4996
      id: 42
      title: 主题 #42
    -
      page: 6
      author: 陈十二
      datetime: 2024-01-10 1:30
      replies: 75
      views: 4157
      id: 41
      title: 主题 #41
    -
      page: 7
      author: 张三
      datetime: 2024-01-9 10:30
      replies: 107
      views: 1896
      id: 40
      title: 主题 #40
    -
      page: 7
      author: 李四
      datetime: 2024-01-9 9:30
      replies: 108
      views: 4310
      id: 39
      title: 主题 #39
    -
      page: 7
      author: 王五
      datetime: 2024-01-9 8:30
      replies: 35
      views: 778
      id: 38
      title: 主题 #38
    -
      page: 7
      author: 赵六
      datetime: 2024-01-9 7:30
      replies: 16
      views: 2920
      id: 37
      title: 主题 #37
    -
      page: 7
      author: 孙七
      datetime: 2024-01-9 6:30
      replies: 96
      views: 3118
      id: 36
      title: 主题 #36
    -
      page: 7
      author: 周八
      datetime: 2024-01-9 5:30
      replies: 39
      views: 4404
      id: 35
      title: 主题 #35
    -
      page: 7
      author: 吴九
      datetime: 2024-01-9 4:30
      replies: 57
      views: 1298
      id: 34
      title: 主题 #34
    -
      page: 7
      author: 郑十
      datetime: 2024-01-9 3:30
      replies: 85
      views: 1630
      id: 33
      title: 主题 #33
    -
      page: 7
      author: 冯十一
      datetime: 2024-01-9 2:30
      replies: 83
      views: 2222
      id: 32
      title: 主题 #32
    -
      page: 7
      author: 陈十二
      datetime: 2024-01-9 1:30
      replies: 67
      views: 5380
      id: 31
      title: 主题 #31
    -
      page: 8
      author: 张三
      datetime: 2024-01-8 10:30
      replies: 45
      views: 2513
      id: 30
      title: 主题 #30
    -
      page: 8
      author: 李四
      datetime: 2024-01-8 9:30
      replies: 13
      views: 2996
      id: 29
      title: 主题 #29
    -
      page: 8
      author: 王五
      datetime: 2024-01-8 8:30
      replies: 27
      views: 1118
      id: 28
      title: 主题 #28
    -
      page: 8
      author: 赵六
      datetime: 2024-01-8 7:30
      replies: 54
      views: 4048
      id: 27
      title: 主题 #27
    -
      page: 8
      author: 孙七
      datetime: 2024-01-8 6:30
      replies: 32
      views: 2771
      id: 26
      title: 主题 #26
    -
      page: 8
      author: 周八
      datetime: 2024-01-8 5:30
      replies: 103
      views: 2323
      id: 25
      title: 主题 #25
    -
      page: 8
      author: 吴九
      datetime: 2024-01-8 4:30
      replies: 101
      views: 3162
      id: 24
      title: 主题 #24
    -
      page: 8
      author: 郑十
      datetime: 2024-01-8 3:30
      replies: 97
      views: 3468
      id: 23
      title: 主题 #23
    -
      page: 8
      author: 冯十一
      datetime: 2024-01-8 2:30
      replies: 101
      views: 966
      id: 22
      title: 主题 #22
    -
      page: 8
      author: 陈十二
      datetime: 2024-01-8 1:30
      replies: 109
      views: 3052
      id: 21
      title: 主题 #21
    -
      page: 9
      author: 张三
      datetime: 2024-01-7 10:30
      replies: 20
      views: 3568
      id: 20
      title: 主题 #20
    -
      page: 9
      author: 李四
      datetime: 2024-01-7 9:30
      replies: 28
      views: 813
      id: 19
      title: 主题 #19
    -
      page: 9
      author: 王五
      datetime: 2024-01-7 8:30
      replies: 11
      views: 883
      id: 18
      title: 主题 #18
    -
      page: 9
      author: 赵六
      datetime: 2024-01-7 7:30
      replies: 71
      views: 778
      id: 17
      title: 主题 #17
    -
      page: 9
      author: 孙七
      datetime: 2024-01-7 6:30
      replies: 65
      views: 2085
      id: 16
      title: 主题 #16
    -
      page: 9
      author: 周八
      datetime: 2024-01-7 5:30
      replies: 25
      views: 2973
      id: 15
      title: 主题 #15
    -
      page: 9
      author: 吴九
      datetime: 2024-01-7 4:30
      replies: 70
      views: 3731
      id: 14
      title: 主题 #14
    -
      page: 9
      author: 郑十
      datetime: 2024-01-7 3:30
      replies: 69
      views: 3363
      id: 13
      title: 主题 #13
    -
      page: 9
      author: 冯十一
      datetime: 2024-01-7 2:30
      replies: 44
      views: 1857
      id: 12
      title: 主题 #12
    -
      page: 9
      author: 陈十二
      datetime: 2024-01-7 1:30
      replies: 25
      views: 2854
      id: 11
      title: 主题 #11
    -
      page: 10
      author: 张三
      datetime: 2024-01-6 10:30
      replies: 90
      views: 1989
      id: 10
      title: 主题 #10
    -
      page: 10
      author: 李四
      datetime: 2024-01-6 9:30
      replies: 20
      views: 846
      id: 9
      title: 主题 #9
    -
      page: 10
      author: 王五
      datetime: 2024-01-6 8:30
      replies: 17
      views: 2694
      id: 8
      title: 主题 #8
    -
      page: 10
      author: 赵六
      datetime: 2024-01-6 7:30
      replies: 14
      views: 4269
      id: 7
      title: 主题 #7
    -
      page: 10
      author: 孙七
      datetime: 2024-01-6 6:30
      replies: 58
      views: 2670
      id: 6
      title: 主题 #6
    -
      page: 10
      author: 周八
      datetime: 2024-01-6 5:30
      replies: 12
      views: 4143
      id: 5
      title: 主题 #5
    -
      page: 10
      author: 吴九
      datetime: 2024-01-6 4:30
      replies: 20
      views: 929
      id: 4
      title: 主题 #4
    -
      page: 10
      author: 郑十
      datetime: 2024-01-6 3:30
      replies: 57
      views: 1028
      id: 3
      title: 主题 #3
    -
      page: 10
      author: 冯十一
      datetime: 2024-01-6 2:30
      replies: 107
      views: 2686
      id: 2
      title: 主题 #2
    -
      page: 10
      author: 陈十二
      datetime: 2024-01-6 1:30
      replies: 69
      views: 1799
      id: 1
      title: 主题 #1
    -
      page: 11
      author: 张三
      datetime: 2024-01-5 10:30
      replies: 53
      views: 2987
      id: 0
      title: 主题 #0
    -
      page: 11
      author: 李四
      datetime: 2024-01-5 9:30
      replies: 94
      views: 5206
      id: -1
      title: 主题 #-1
    -
      page: 11
      author: 王五
      datetime: 2024-01-5 8:30
      replies: 53
      views: 4213
      id: -2
      title: 主题 #-2
    -
      page: 11
      author: 赵六
      datetime: 2024-01-5 7:30
      replies: 44
      views: 3307
      id: -3
      title: 主题 #-3
    -
      page: 11
      author: 孙七
      datetime: 2024-01-5 6:30
      replies: 50
      views: 1871
      id: -4
      title: 主题 #-4
    -
      page: 11
      author: 周八
      datetime: 2024-01-5 5:30
      replies: 15
      views: 2725
      id: -5
      title: 主题 #-5
    -
      page: 11
      author: 吴九
      datetime: 2024-01-5 4:30
      replies: 16
      views: 2026
      id: -6
      title: 主题 #-6
    -
      page: 11
      author: 郑十
      datetime: 2024-01-5 3:30
      replies: 13
      views: 3974
      id: -7
      title: 主题 #-7
    -
      page: 11
      author: 冯十一
      datetime: 2024-01-5 2:30
      replies: 78
      views: 2818
      id: -8
      title: 主题 #-8
    -
      page: 11
      author: 陈十二
      datetime: 2024-01-5 1:30
      replies: 91
      views: 2919
      id: -9
      title: 主题 #-9
    -
      page: 12
      author: 张三
      datetime: 2024-01-4 10:30
      replies: 59
      views: 1416
      id: -10
      title: 主题 #-10
    -
      page: 12
      author: 李四
      datetime: 2024-01-4 9:30
      replies: 22
      views: 3694
      id: -11
      title: 主题 #-11
    -
      page: 12
      author: 王五
      datetime: 2024-01-4 8:30
      replies: 41
      views: 1788
      id: -12
      title: 主题 #-12
    -
      page: 12
      author: 赵六
      datetime: 2024-01-4 7:30
      replies: 109
      views: 5289
      id: -13
      title: 主题 #-13
    -
      page: 12
      author: 孙七
      datetime: 2024-01-4 6:30
      replies: 108
      views: 5059
      id: -14
      title: 主题 #-14
    -
      page: 12
      author: 周八
      datetime: 2024-01-4 5:30
      replies: 39
      views: 794
      id: -15
      title: 主题 #-15
    -
      page: 12
      author: 吴九
      datetime: 2024-01-4 4:30
      replies: 77
      views: 3414
      id: -16
      title: 主题 #-16
    -
      page: 12
      author: 郑十
      datetime: 2024-01-4 3:30
      replies: 101
      views: 4936
      id: -17
      title: 主题 #-17
    -
      page: 12
      author: 冯十一
      datetime: 2024-01-4 2:30
      replies: 23
      views: 2390
      id: -18
      title: 主题 #-18
    -
      page: 12
      author: 陈十二
      datetime: 2024-01-4 1:30
      replies: 43
      views: 1731
      id: -19
      title: 主题 #-19
    -
      page: 13
      author: 张三
      datetime: 2024-01-3 10:30
      replies: 13
      views: 5320
      id: -20
      title: 主题 #-20
    -
      page: 13
      author: 李四
      datetime: 2024-01-3 9:30
      replies: 58
      views: 4695
      id: -21
      title: 主题 #-21
    -
      page: 13
      author: 王五
      datetime: 2024-01-3 8:30
      replies: 18
      views: 3337
      id: -22
      title: 主题 #-22
    -
      page: 13
      author: 赵六
      datetime: 2024-01-3 7:30
      replies: 24
      views: 1796
      id: -23
      title: 主题 #-23
    -
      page: 13
      author: 孙七
      datetime: 2024-01-3 6:30
      replies: 46
      views: 5093
      id: -24
      title: 主题 #-24
    -
      page: 13
      author: 周八
      datetime: 2024-01-3 5:30
      replies: 35
      views: 3044
      id: -25
      title: 主题 #-25
    -
      page: 13
      author: 吴九
      datetime: 2024-01-3 4:30
      replies: 16
      views: 3977
      id: -26
      title: 主题 #-26
    -
      page: 13
      author: 郑十
      datetime: 2024-01-3 3:30
      replies: 10
      views: 1705
      id: -27
      title: 主题 #-27
    -
      page: 13
      author: 冯十一
      datetime: 2024-01-3 2:30
      replies: 92
      views: 940
      id: -28
      title: 主题 #-28
    -
      page: 13
      author: 陈十二
      datetime: 2024-01-3 1:30
      replies: 38
      views: 3175
      id: -29
      title: 主题 #-29
    -
      page: 14
      author: 张三
      datetime: 2024-01-2 10:30
      replies: 73
      views: 3498
      id: -30
      title: 主题 #-30
    -
      page: 14
      author: 李四
      datetime: 2024-01-2 9:30
      replies: 22
      views: 1987
      id: -31
      title: 主题 #-31
    -
      page: 14
      author: 王五
      datetime: 2024-01-2 8:30
      replies: 74
      views: 2180
      id: -32
      title: 主题 #-32
    -
      page: 14
      author: 赵六
      datetime: 2024-01-2 7:30
      replies: 75
      views: 4672
      id: -33
      title: 主题 #-33
    -
      page: 14
      author: 孙七
      datetime: 2024-01-2 6:30
      replies: 34
      views: 3980
      id: -34
      title: 主题 #-34
    -
      page: 14
      author: 周八
      datetime: 2024-01-2 5:30
      replies: 45
      views: 3623
      id: -35
      title: 主题 #-35
    -
      page: 14
      author: 吴九
      datetime: 2024-01-2 4:30
      replies: 103
      views: 4506
      id: -36
      title: 主题 #-36
    -
      page: 14
      author: 郑十
      datetime: 2024-01-2 3:30
      replies: 100
      views: 1413
      id: -37
      title: 主题 #-37
    -
      page: 14
      author: 冯十一
      datetime: 2024-01-2 2:30
      replies: 37
      views: 2330
      id: -38
      title: 主题 #-38
    -
      page: 14
      author: 陈十二
      datetime: 2024-01-2 1:30
      replies: 21
      views: 3680
      id: -39
      title: 主题 #-39
    -
      page: 15
      author: 张三
      datetime: 2024-01-1 10:30
      replies: 74
      views: 2157
      id: -40
      title: 主题 #-40
    -
      page: 15
      author: 李四
      datetime: 2024-01-1 9:30
      replies: 31
      views: 3807
      id: -41
      title: 主题 #-41
    -
      page: 15
      author: 王五
      datetime: 2024-01-1 8:30
      replies: 93
      views: 2237
      id: -42
      title: 主题 #-42
    -
      page: 15
      author: 赵六
      datetime: 2024-01-1 7:30
      replies: 80
      views: 4458
      id: -43
      title: 主题 #-43
    -
      page: 15
      author: 孙七
      datetime: 2024-01-1 6:30
      replies: 74
      views: 5252
      id: -44
      title: 主题 #-44
    -
      page: 15
      author: 周八
      datetime: 2024-01-1 5:30
      replies: 30
      views: 2963
      id: -45
      title: 主题 #-45
    -
      page: 15
      author: 吴九
      datetime: 2024-01-1 4:30
      replies: 100
      views: 2864
      id: -46
      title: 主题 #-46
    -
      page: 15
      author: 郑十
      datetime: 2024-01-1 3:30
      replies: 107
      views: 933
      id: -47
      title: 主题 #-47
    -
      page: 15
      author: 冯十一
      datetime: 2024-01-1 2:30
      replies: 85
      views: 4308
      id: -48
      title: 主题 #-48
    -
      page: 15
      author: 陈十二
      datetime: 2024-01-1 1:30
      replies: 91
      views: 2154
      id: -49
      title: 主题 #-49
    -
      page: 16
      author: 张三
      datetime: 2024-01-0 10:30
      replies: 22
      views: 3394
      id: -50
      title: 主题 #-50
    -
      page: 16
      author: 李四
      datetime: 2024-01-0 9:30
      replies: 50
      views: 5328
      id: -51
      title: 主题 #-51
    -
      page: 16
      author: 王五
      datetime: 2024-01-0 8:30
      replies: 70
      views: 3163
      id: -52
      title: 主题 #-52
    -
      page: 16
      author: 赵六
      datetime: 2024-01-0 7:30
      replies: 82
      views: 3040
      id: -53
      title: 主题 #-53
    -
      page: 16
      author: 孙七
      datetime: 2024-01-0 6:30
      replies: 86
      views: 3062
      id: -54
      title: 主题 #-54
    -
      page: 16
      author: 周八
      datetime: 2024-01-0 5:30
      replies: 27
      views: 2772
      id: -55
      title: 主题 #-55
💡 采集完成，共 16 页 156 条数据

```

### 1.2 JSON 输出

```bash
npx tsx xcli/bin/xcli.ts 04-pagination scrape --url "https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/04-pagination.html" --json
```

```json
{
  "data": {
    "total_pages": 16,
    "threads": [
      {
        "page": 1,
        "author": "张三",
        "datetime": "2024-01-15 10:30",
        "replies": 66,
        "views": 1185,
        "id": 100,
        "title": "主题 #100"
      },
      {
        "page": 1,
        "author": "李四",
        "datetime": "2024-01-15 9:30",
        "replies": 93,
        "views": 3007,
        "id": 99,
        "title": "主题 #99"
      },
      {
        "page": 1,
        "author": "王五",
        "datetime": "2024-01-15 8:30",
        "replies": 33,
        "views": 2391,
        "id": 98,
        "title": "主题 #98"
      },
      {
        "page": 1,
        "author": "赵六",
        "datetime": "2024-01-15 7:30",
        "replies": 26,
        "views": 2713,
        "id": 97,
        "title": "主题 #97"
      },
      {
        "page": 1,
        "author": "孙七",
        "datetime": "2024-01-15 6:30",
        "replies": 77,
        "views": 5377,
        "id": 96,
        "title": "主题 #96"
      },
      {
        "page": 1,
        "author": "周八",
        "datetime": "2024-01-15 5:30",
        "replies": 36,
        "views": 5333,
        "id": 95,
        "title": "主题 #95"
      },
      {
        "page": 1,
        "author": "吴九",
        "datetime": "2024-01-15 4:30",
        "replies": 24,
        "views": 4549,
        "id": 94,
        "title": "主题 #94"
      },
      {
        "page": 1,
        "author": "郑十",
        "datetime": "2024-01-15 3:30",
        "replies": 108,
        "views": 4381,
        "id": 93,
        "title": "主题 #93"
      },
      {
        "page": 1,
        "author": "冯十一",
        "datetime": "2024-01-15 2:30",
        "replies": 56,
        "views": 1018,
        "id": 92,
        "title": "主题 #92"
      },
      {
        "page": 1,
        "author": "陈十二",
        "datetime": "2024-01-15 1:30",
        "replies": 101,
        "views": 1742,
        "id": 91,
        "title": "主题 #91"
      },
      {
        "page": 2,
        "author": "张三",
        "datetime": "2024-01-14 10:30",
        "replies": 11,
        "views": 740,
        "id": 90,
        "title": "主题 #90"
      },
      {
        "page": 2,
        "author": "李四",
        "datetime": "2024-01-14 9:30",
        "replies": 33,
        "views": 5296,
        "id": 89,
        "title": "主题 #89"
      },
      {
        "page": 2,
        "author": "王五",
        "datetime": "2024-01-14 8:30",
        "replies": 75,
        "views": 5480,
        "id": 88,
        "title": "主题 #88"
      },
      {
        "page": 2,
        "author": "赵六",
        "datetime": "2024-01-14 7:30",
        "replies": 44,
        "views": 922,
        "id": 87,
        "title": "主题 #87"
      },
      {
        "page": 2,
        "author": "孙七",
        "datetime": "2024-01-14 6:30",
        "replies": 55,
        "views": 1143,
        "id": 86,
        "title": "主题 #86"
      },
      {
        "page": 2,
        "author": "周八",
        "datetime": "2024-01-14 5:30",
        "replies": 83,
        "views": 2225,
        "id": 85,
        "title": "主题 #85"
      },
      {
        "page": 2,
        "author": "吴九",
        "datetime": "2024-01-14 4:30",
        "replies": 70,
        "views": 4894,
        "id": 84,
        "title": "主题 #84"
      },
      {
        "page": 2,
        "author": "郑十",
        "datetime": "2024-01-14 3:30",
        "replies": 84,
        "views": 3591,
        "id": 83,
        "title": "主题 #83"
      },
      {
        "page": 2,
        "author": "冯十一",
        "datetime": "2024-01-14 2:30",
        "replies": 66,
        "views": 4899,
        "id": 82,
        "title": "主题 #82"
      },
      {
        "page": 2,
        "author": "陈十二",
        "datetime": "2024-01-14 1:30",
        "replies": 84,
        "views": 1149,
        "id": 81,
        "title": "主题 #81"
      },
      {
        "page": 3,
        "author": "张三",
        "datetime": "2024-01-13 10:30",
        "replies": 93,
        "views": 779,
        "id": 80,
        "title": "主题 #80"
      },
      {
        "page": 3,
        "author": "李四",
        "datetime": "2024-01-13 9:30",
        "replies": 44,
        "views": 2223,
        "id": 79,
        "title": "主题 #79"
      },
      {
        "page": 3,
        "author": "王五",
        "datetime": "2024-01-13 8:30",
        "replies": 80,
        "views": 1616,
        "id": 78,
        "title": "主题 #78"
      },
      {
        "page": 3,
        "author": "赵六",
        "datetime": "2024-01-13 7:30",
        "replies": 109,
        "views": 4898,
        "id": 77,
        "title": "主题 #77"
      },
      {
        "page": 3,
        "author": "孙七",
        "datetime": "2024-01-13 6:30",
        "replies": 10,
        "views": 3012,
        "id": 76,
        "title": "主题 #76"
      },
      {
        "page": 3,
        "author": "周八",
        "datetime": "2024-01-13 5:30",
        "replies": 40,
        "views": 3082,
        "id": 75,
        "title": "主题 #75"
      },
      {
        "page": 3,
        "author": "吴九",
        "datetime": "2024-01-13 4:30",
        "replies": 92,
        "views": 3404,
        "id": 74,
        "title": "主题 #74"
      },
      {
        "page": 3,
        "author": "郑十",
        "datetime": "2024-01-13 3:30",
        "replies": 100,
        "views": 3859,
        "id": 73,
        "title": "主题 #73"
      },
      {
        "page": 3,
        "author": "冯十一",
        "datetime": "2024-01-13 2:30",
        "replies": 96,
        "views": 4332,
        "id": 72,
        "title": "主题 #72"
      },
      {
        "page": 3,
        "author": "陈十二",
        "datetime": "2024-01-13 1:30",
        "replies": 60,
        "views": 1147,
        "id": 71,
        "title": "主题 #71"
      },
      {
        "page": 4,
        "author": "张三",
        "datetime": "2024-01-12 10:30",
        "replies": 40,
        "views": 2488,
        "id": 70,
        "title": "主题 #70"
      },
      {
        "page": 4,
        "author": "李四",
        "datetime": "2024-01-12 9:30",
        "replies": 87,
        "views": 508,
        "id": 69,
        "title": "主题 #69"
      },
      {
        "page": 4,
        "author": "王五",
        "datetime": "2024-01-12 8:30",
        "replies": 73,
        "views": 5133,
        "id": 68,
        "title": "主题 #68"
      },
      {
        "page": 4,
        "author": "赵六",
        "datetime": "2024-01-12 7:30",
        "replies": 53,
        "views": 3119,
        "id": 67,
        "title": "主题 #67"
      },
      {
        "page": 4,
        "author": "孙七",
        "datetime": "2024-01-12 6:30",
        "replies": 75,
        "views": 3329,
        "id": 66,
        "title": "主题 #66"
      },
      {
        "page": 4,
        "author": "周八",
        "datetime": "2024-01-12 5:30",
        "replies": 56,
        "views": 5253,
        "id": 65,
        "title": "主题 #65"
      },
      {
        "page": 4,
        "author": "吴九",
        "datetime": "2024-01-12 4:30",
        "replies": 36,
        "views": 960,
        "id": 64,
        "title": "主题 #64"
      },
      {
        "page": 4,
        "author": "郑十",
        "datetime": "2024-01-12 3:30",
        "replies": 64,
        "views": 4199,
        "id": 63,
        "title": "主题 #63"
      },
      {
        "page": 4,
        "author": "冯十一",
        "datetime": "2024-01-12 2:30",
        "replies": 83,
        "views": 3168,
        "id": 62,
        "title": "主题 #62"
      },
      {
        "page": 4,
        "author": "陈十二",
        "datetime": "2024-01-12 1:30",
        "replies": 102,
        "views": 1694,
        "id": 61,
        "title": "主题 #61"
      },
      {
        "page": 5,
        "author": "张三",
        "datetime": "2024-01-11 10:30",
        "replies": 30,
        "views": 3796,
        "id": 60,
        "title": "主题 #60"
      },
      {
        "page": 5,
        "author": "李四",
        "datetime": "2024-01-11 9:30",
        "replies": 81,
        "views": 3586,
        "id": 59,
        "title": "主题 #59"
      },
      {
        "page": 5,
        "author": "王五",
        "datetime": "2024-01-11 8:30",
        "replies": 61,
        "views": 2908,
        "id": 58,
        "title": "主题 #58"
      },
      {
        "page": 5,
        "author": "赵六",
        "datetime": "2024-01-11 7:30",
        "replies": 76,
        "views": 1951,
        "id": 57,
        "title": "主题 #57"
      },
      {
        "page": 5,
        "author": "孙七",
        "datetime": "2024-01-11 6:30",
        "replies": 100,
        "views": 3821,
        "id": 56,
        "title": "主题 #56"
      },
      {
        "page": 5,
        "author": "周八",
        "datetime": "2024-01-11 5:30",
        "replies": 15,
        "views": 4115,
        "id": 55,
        "title": "主题 #55"
      },
      {
        "page": 5,
        "author": "吴九",
        "datetime": "2024-01-11 4:30",
        "replies": 82,
        "views": 5094,
        "id": 54,
        "title": "主题 #54"
      },
      {
        "page": 5,
        "author": "郑十",
        "datetime": "2024-01-11 3:30",
        "replies": 42,
        "views": 795,
        "id": 53,
        "title": "主题 #53"
      },
      {
        "page": 5,
        "author": "冯十一",
        "datetime": "2024-01-11 2:30",
        "replies": 81,
        "views": 1681,
        "id": 52,
        "title": "主题 #52"
      },
      {
        "page": 5,
        "author": "陈十二",
        "datetime": "2024-01-11 1:30",
        "replies": 103,
        "views": 2635,
        "id": 51,
        "title": "主题 #51"
      },
      {
        "page": 6,
        "author": "张三",
        "datetime": "2024-01-10 10:30",
        "replies": 51,
        "views": 1870,
        "id": 50,
        "title": "主题 #50"
      },
      {
        "page": 6,
        "author": "李四",
        "datetime": "2024-01-10 9:30",
        "replies": 21,
        "views": 3997,
        "id": 49,
        "title": "主题 #49"
      },
      {
        "page": 6,
        "author": "王五",
        "datetime": "2024-01-10 8:30",
        "replies": 27,
        "views": 869,
        "id": 48,
        "title": "主题 #48"
      },
      {
        "page": 6,
        "author": "赵六",
        "datetime": "2024-01-10 7:30",
        "replies": 48,
        "views": 3670,
        "id": 47,
        "title": "主题 #47"
      },
      {
        "page": 6,
        "author": "孙七",
        "datetime": "2024-01-10 6:30",
        "replies": 44,
        "views": 853,
        "id": 46,
        "title": "主题 #46"
      },
      {
        "page": 6,
        "author": "周八",
        "datetime": "2024-01-10 5:30",
        "replies": 67,
        "views": 969,
        "id": 45,
        "title": "主题 #45"
      },
      {
        "page": 6,
        "author": "吴九",
        "datetime": "2024-01-10 4:30",
        "replies": 85,
        "views": 1494,
        "id": 44,
        "title": "主题 #44"
      },
      {
        "page": 6,
        "author": "郑十",
        "datetime": "2024-01-10 3:30",
        "replies": 59,
        "views": 947,
        "id": 43,
        "title": "主题 #43"
      },
      {
        "page": 6,
        "author": "冯十一",
        "datetime": "2024-01-10 2:30",
        "replies": 93,
        "views": 4259,
        "id": 42,
        "title": "主题 #42"
      },
      {
        "page": 6,
        "author": "陈十二",
        "datetime": "2024-01-10 1:30",
        "replies": 19,
        "views": 3223,
        "id": 41,
        "title": "主题 #41"
      },
      {
        "page": 7,
        "author": "张三",
        "datetime": "2024-01-9 10:30",
        "replies": 87,
        "views": 2737,
        "id": 40,
        "title": "主题 #40"
      },
      {
        "page": 7,
        "author": "李四",
        "datetime": "2024-01-9 9:30",
        "replies": 47,
        "views": 1420,
        "id": 39,
        "title": "主题 #39"
      },
      {
        "page": 7,
        "author": "王五",
        "datetime": "2024-01-9 8:30",
        "replies": 43,
        "views": 1114,
        "id": 38,
        "title": "主题 #38"
      },
      {
        "page": 7,
        "author": "赵六",
        "datetime": "2024-01-9 7:30",
        "replies": 105,
        "views": 4895,
        "id": 37,
        "title": "主题 #37"
      },
      {
        "page": 7,
        "author": "孙七",
        "datetime": "2024-01-9 6:30",
        "replies": 90,
        "views": 4754,
        "id": 36,
        "title": "主题 #36"
      },
      {
        "page": 7,
        "author": "周八",
        "datetime": "2024-01-9 5:30",
        "replies": 75,
        "views": 2913,
        "id": 35,
        "title": "主题 #35"
      },
      {
        "page": 7,
        "author": "吴九",
        "datetime": "2024-01-9 4:30",
        "replies": 85,
        "views": 2693,
        "id": 34,
        "title": "主题 #34"
      },
      {
        "page": 7,
        "author": "郑十",
        "datetime": "2024-01-9 3:30",
        "replies": 62,
        "views": 654,
        "id": 33,
        "title": "主题 #33"
      },
      {
        "page": 7,
        "author": "冯十一",
        "datetime": "2024-01-9 2:30",
        "replies": 90,
        "views": 4779,
        "id": 32,
        "title": "主题 #32"
      },
      {
        "page": 7,
        "author": "陈十二",
        "datetime": "2024-01-9 1:30",
        "replies": 26,
        "views": 1057,
        "id": 31,
        "title": "主题 #31"
      },
      {
        "page": 8,
        "author": "张三",
        "datetime": "2024-01-8 10:30",
        "replies": 36,
        "views": 3577,
        "id": 30,
        "title": "主题 #30"
      },
      {
        "page": 8,
        "author": "李四",
        "datetime": "2024-01-8 9:30",
        "replies": 90,
        "views": 4091,
        "id": 29,
        "title": "主题 #29"
      },
      {
        "page": 8,
        "author": "王五",
        "datetime": "2024-01-8 8:30",
        "replies": 80,
        "views": 3306,
        "id": 28,
        "title": "主题 #28"
      },
      {
        "page": 8,
        "author": "赵六",
        "datetime": "2024-01-8 7:30",
        "replies": 109,
        "views": 3293,
        "id": 27,
        "title": "主题 #27"
      },
      {
        "page": 8,
        "author": "孙七",
        "datetime": "2024-01-8 6:30",
        "replies": 12,
        "views": 4401,
        "id": 26,
        "title": "主题 #26"
      },
      {
        "page": 8,
        "author": "周八",
        "datetime": "2024-01-8 5:30",
        "replies": 48,
        "views": 810,
        "id": 25,
        "title": "主题 #25"
      },
      {
        "page": 8,
        "author": "吴九",
        "datetime": "2024-01-8 4:30",
        "replies": 30,
        "views": 4620,
        "id": 24,
        "title": "主题 #24"
      },
      {
        "page": 8,
        "author": "郑十",
        "datetime": "2024-01-8 3:30",
        "replies": 42,
        "views": 3537,
        "id": 23,
        "title": "主题 #23"
      },
      {
        "page": 8,
        "author": "冯十一",
        "datetime": "2024-01-8 2:30",
        "replies": 45,
        "views": 1021,
        "id": 22,
        "title": "主题 #22"
      },
      {
        "page": 8,
        "author": "陈十二",
        "datetime": "2024-01-8 1:30",
        "replies": 41,
        "views": 4764,
        "id": 21,
        "title": "主题 #21"
      },
      {
        "page": 9,
        "author": "张三",
        "datetime": "2024-01-7 10:30",
        "replies": 57,
        "views": 3984,
        "id": 20,
        "title": "主题 #20"
      },
      {
        "page": 9,
        "author": "李四",
        "datetime": "2024-01-7 9:30",
        "replies": 83,
        "views": 3102,
        "id": 19,
        "title": "主题 #19"
      },
      {
        "page": 9,
        "author": "王五",
        "datetime": "2024-01-7 8:30",
        "replies": 83,
        "views": 2523,
        "id": 18,
        "title": "主题 #18"
      },
      {
        "page": 9,
        "author": "赵六",
        "datetime": "2024-01-7 7:30",
        "replies": 32,
        "views": 1770,
        "id": 17,
        "title": "主题 #17"
      },
      {
        "page": 9,
        "author": "孙七",
        "datetime": "2024-01-7 6:30",
        "replies": 61,
        "views": 2683,
        "id": 16,
        "title": "主题 #16"
      },
      {
        "page": 9,
        "author": "周八",
        "datetime": "2024-01-7 5:30",
        "replies": 18,
        "views": 1225,
        "id": 15,
        "title": "主题 #15"
      },
      {
        "page": 9,
        "author": "吴九",
        "datetime": "2024-01-7 4:30",
        "replies": 71,
        "views": 3512,
        "id": 14,
        "title": "主题 #14"
      },
      {
        "page": 9,
        "author": "郑十",
        "datetime": "2024-01-7 3:30",
        "replies": 10,
        "views": 4055,
        "id": 13,
        "title": "主题 #13"
      },
      {
        "page": 9,
        "author": "冯十一",
        "datetime": "2024-01-7 2:30",
        "replies": 68,
        "views": 5162,
        "id": 12,
        "title": "主题 #12"
      },
      {
        "page": 9,
        "author": "陈十二",
        "datetime": "2024-01-7 1:30",
        "replies": 87,
        "views": 984,
        "id": 11,
        "title": "主题 #11"
      },
      {
        "page": 10,
        "author": "张三",
        "datetime": "2024-01-6 10:30",
        "replies": 61,
        "views": 2329,
        "id": 10,
        "title": "主题 #10"
      },
      {
        "page": 10,
        "author": "李四",
        "datetime": "2024-01-6 9:30",
        "replies": 107,
        "views": 4137,
        "id": 9,
        "title": "主题 #9"
      },
      {
        "page": 10,
        "author": "王五",
        "datetime": "2024-01-6 8:30",
        "replies": 30,
        "views": 4141,
        "id": 8,
        "title": "主题 #8"
      },
      {
        "page": 10,
        "author": "赵六",
        "datetime": "2024-01-6 7:30",
        "replies": 95,
        "views": 5195,
        "id": 7,
        "title": "主题 #7"
      },
      {
        "page": 10,
        "author": "孙七",
        "datetime": "2024-01-6 6:30",
        "replies": 27,
        "views": 5204,
        "id": 6,
        "title": "主题 #6"
      },
      {
        "page": 10,
        "author": "周八",
        "datetime": "2024-01-6 5:30",
        "replies": 99,
        "views": 4115,
        "id": 5,
        "title": "主题 #5"
      },
      {
        "page": 10,
        "author": "吴九",
        "datetime": "2024-01-6 4:30",
        "replies": 37,
        "views": 2907,
        "id": 4,
        "title": "主题 #4"
      },
      {
        "page": 10,
        "author": "郑十",
        "datetime": "2024-01-6 3:30",
        "replies": 82,
        "views": 3877,
        "id": 3,
        "title": "主题 #3"
      },
      {
        "page": 10,
        "author": "冯十一",
        "datetime": "2024-01-6 2:30",
        "replies": 50,
        "views": 846,
        "id": 2,
        "title": "主题 #2"
      },
      {
        "page": 10,
        "author": "陈十二",
        "datetime": "2024-01-6 1:30",
        "replies": 54,
        "views": 2304,
        "id": 1,
        "title": "主题 #1"
      },
      {
        "page": 11,
        "author": "张三",
        "datetime": "2024-01-5 10:30",
        "replies": 46,
        "views": 2374,
        "id": 0,
        "title": "主题 #0"
      },
      {
        "page": 11,
        "author": "李四",
        "datetime": "2024-01-5 9:30",
        "replies": 62,
        "views": 1336,
        "id": -1,
        "title": "主题 #-1"
      },
      {
        "page": 11,
        "author": "王五",
        "datetime": "2024-01-5 8:30",
        "replies": 101,
        "views": 2948,
        "id": -2,
        "title": "主题 #-2"
      },
      {
        "page": 11,
        "author": "赵六",
        "datetime": "2024-01-5 7:30",
        "replies": 59,
        "views": 5364,
        "id": -3,
        "title": "主题 #-3"
      },
      {
        "page": 11,
        "author": "孙七",
        "datetime": "2024-01-5 6:30",
        "replies": 88,
        "views": 1037,
        "id": -4,
        "title": "主题 #-4"
      },
      {
        "page": 11,
        "author": "周八",
        "datetime": "2024-01-5 5:30",
        "replies": 97,
        "views": 2758,
        "id": -5,
        "title": "主题 #-5"
      },
      {
        "page": 11,
        "author": "吴九",
        "datetime": "2024-01-5 4:30",
        "replies": 39,
        "views": 3395,
        "id": -6,
        "title": "主题 #-6"
      },
      {
        "page": 11,
        "author": "郑十",
        "datetime": "2024-01-5 3:30",
        "replies": 94,
        "views": 3084,
        "id": -7,
        "title": "主题 #-7"
      },
      {
        "page": 11,
        "author": "冯十一",
        "datetime": "2024-01-5 2:30",
        "replies": 39,
        "views": 1686,
        "id": -8,
        "title": "主题 #-8"
      },
      {
        "page": 11,
        "author": "陈十二",
        "datetime": "2024-01-5 1:30",
        "replies": 58,
        "views": 3046,
        "id": -9,
        "title": "主题 #-9"
      },
      {
        "page": 12,
        "author": "张三",
        "datetime": "2024-01-4 10:30",
        "replies": 20,
        "views": 1342,
        "id": -10,
        "title": "主题 #-10"
      },
      {
        "page": 12,
        "author": "李四",
        "datetime": "2024-01-4 9:30",
        "replies": 88,
        "views": 4461,
        "id": -11,
        "title": "主题 #-11"
      },
      {
        "page": 12,
        "author": "王五",
        "datetime": "2024-01-4 8:30",
        "replies": 70,
        "views": 1691,
        "id": -12,
        "title": "主题 #-12"
      },
      {
        "page": 12,
        "author": "赵六",
        "datetime": "2024-01-4 7:30",
        "replies": 67,
        "views": 4298,
        "id": -13,
        "title": "主题 #-13"
      },
      {
        "page": 12,
        "author": "孙七",
        "datetime": "2024-01-4 6:30",
        "replies": 51,
        "views": 683,
        "id": -14,
        "title": "主题 #-14"
      },
      {
        "page": 12,
        "author": "周八",
        "datetime": "2024-01-4 5:30",
        "replies": 106,
        "views": 1196,
        "id": -15,
        "title": "主题 #-15"
      },
      {
        "page": 12,
        "author": "吴九",
        "datetime": "2024-01-4 4:30",
        "replies": 67,
        "views": 620,
        "id": -16,
        "title": "主题 #-16"
      },
      {
        "page": 12,
        "author": "郑十",
        "datetime": "2024-01-4 3:30",
        "replies": 67,
        "views": 1155,
        "id": -17,
        "title": "主题 #-17"
      },
      {
        "page": 12,
        "author": "冯十一",
        "datetime": "2024-01-4 2:30",
        "replies": 92,
        "views": 4522,
        "id": -18,
        "title": "主题 #-18"
      },
      {
        "page": 12,
        "author": "陈十二",
        "datetime": "2024-01-4 1:30",
        "replies": 86,
        "views": 3843,
        "id": -19,
        "title": "主题 #-19"
      },
      {
        "page": 13,
        "author": "张三",
        "datetime": "2024-01-3 10:30",
        "replies": 14,
        "views": 4135,
        "id": -20,
        "title": "主题 #-20"
      },
      {
        "page": 13,
        "author": "李四",
        "datetime": "2024-01-3 9:30",
        "replies": 80,
        "views": 631,
        "id": -21,
        "title": "主题 #-21"
      },
      {
        "page": 13,
        "author": "王五",
        "datetime": "2024-01-3 8:30",
        "replies": 71,
        "views": 966,
        "id": -22,
        "title": "主题 #-22"
      },
      {
        "page": 13,
        "author": "赵六",
        "datetime": "2024-01-3 7:30",
        "replies": 55,
        "views": 2948,
        "id": -23,
        "title": "主题 #-23"
      },
      {
        "page": 13,
        "author": "孙七",
        "datetime": "2024-01-3 6:30",
        "replies": 89,
        "views": 4942,
        "id": -24,
        "title": "主题 #-24"
      },
      {
        "page": 13,
        "author": "周八",
        "datetime": "2024-01-3 5:30",
        "replies": 97,
        "views": 1930,
        "id": -25,
        "title": "主题 #-25"
      },
      {
        "page": 13,
        "author": "吴九",
        "datetime": "2024-01-3 4:30",
        "replies": 29,
        "views": 3688,
        "id": -26,
        "title": "主题 #-26"
      },
      {
        "page": 13,
        "author": "郑十",
        "datetime": "2024-01-3 3:30",
        "replies": 21,
        "views": 2783,
        "id": -27,
        "title": "主题 #-27"
      },
      {
        "page": 13,
        "author": "冯十一",
        "datetime": "2024-01-3 2:30",
        "replies": 95,
        "views": 4927,
        "id": -28,
        "title": "主题 #-28"
      },
      {
        "page": 13,
        "author": "陈十二",
        "datetime": "2024-01-3 1:30",
        "replies": 22,
        "views": 4514,
        "id": -29,
        "title": "主题 #-29"
      },
      {
        "page": 14,
        "author": "张三",
        "datetime": "2024-01-2 10:30",
        "replies": 18,
        "views": 4353,
        "id": -30,
        "title": "主题 #-30"
      },
      {
        "page": 14,
        "author": "李四",
        "datetime": "2024-01-2 9:30",
        "replies": 61,
        "views": 612,
        "id": -31,
        "title": "主题 #-31"
      },
      {
        "page": 14,
        "author": "王五",
        "datetime": "2024-01-2 8:30",
        "replies": 11,
        "views": 1997,
        "id": -32,
        "title": "主题 #-32"
      },
      {
        "page": 14,
        "author": "赵六",
        "datetime": "2024-01-2 7:30",
        "replies": 82,
        "views": 1667,
        "id": -33,
        "title": "主题 #-33"
      },
      {
        "page": 14,
        "author": "孙七",
        "datetime": "2024-01-2 6:30",
        "replies": 71,
        "views": 3151,
        "id": -34,
        "title": "主题 #-34"
      },
      {
        "page": 14,
        "author": "周八",
        "datetime": "2024-01-2 5:30",
        "replies": 59,
        "views": 4031,
        "id": -35,
        "title": "主题 #-35"
      },
      {
        "page": 14,
        "author": "吴九",
        "datetime": "2024-01-2 4:30",
        "replies": 18,
        "views": 4127,
        "id": -36,
        "title": "主题 #-36"
      },
      {
        "page": 14,
        "author": "郑十",
        "datetime": "2024-01-2 3:30",
        "replies": 58,
        "views": 2740,
        "id": -37,
        "title": "主题 #-37"
      },
      {
        "page": 14,
        "author": "冯十一",
        "datetime": "2024-01-2 2:30",
        "replies": 15,
        "views": 1518,
        "id": -38,
        "title": "主题 #-38"
      },
      {
        "page": 14,
        "author": "陈十二",
        "datetime": "2024-01-2 1:30",
        "replies": 28,
        "views": 1250,
        "id": -39,
        "title": "主题 #-39"
      },
      {
        "page": 15,
        "author": "张三",
        "datetime": "2024-01-1 10:30",
        "replies": 14,
        "views": 3787,
        "id": -40,
        "title": "主题 #-40"
      },
      {
        "page": 15,
        "author": "李四",
        "datetime": "2024-01-1 9:30",
        "replies": 81,
        "views": 1328,
        "id": -41,
        "title": "主题 #-41"
      },
      {
        "page": 15,
        "author": "王五",
        "datetime": "2024-01-1 8:30",
        "replies": 10,
        "views": 1191,
        "id": -42,
        "title": "主题 #-42"
      },
      {
        "page": 15,
        "author": "赵六",
        "datetime": "2024-01-1 7:30",
        "replies": 36,
        "views": 1059,
        "id": -43,
        "title": "主题 #-43"
      },
      {
        "page": 15,
        "author": "孙七",
        "datetime": "2024-01-1 6:30",
        "replies": 15,
        "views": 5282,
        "id": -44,
        "title": "主题 #-44"
      },
      {
        "page": 15,
        "author": "周八",
        "datetime": "2024-01-1 5:30",
        "replies": 63,
        "views": 4801,
        "id": -45,
        "title": "主题 #-45"
      },
      {
        "page": 15,
        "author": "吴九",
        "datetime": "2024-01-1 4:30",
        "replies": 16,
        "views": 546,
        "id": -46,
        "title": "主题 #-46"
      },
      {
        "page": 15,
        "author": "郑十",
        "datetime": "2024-01-1 3:30",
        "replies": 45,
        "views": 528,
        "id": -47,
        "title": "主题 #-47"
      },
      {
        "page": 15,
        "author": "冯十一",
        "datetime": "2024-01-1 2:30",
        "replies": 35,
        "views": 3697,
        "id": -48,
        "title": "主题 #-48"
      },
      {
        "page": 15,
        "author": "陈十二",
        "datetime": "2024-01-1 1:30",
        "replies": 75,
        "views": 4631,
        "id": -49,
        "title": "主题 #-49"
      },
      {
        "page": 16,
        "author": "张三",
        "datetime": "2024-01-0 10:30",
        "replies": 10,
        "views": 3213,
        "id": -50,
        "title": "主题 #-50"
      },
      {
        "page": 16,
        "author": "李四",
        "datetime": "2024-01-0 9:30",
        "replies": 77,
        "views": 2919,
        "id": -51,
        "title": "主题 #-51"
      },
      {
        "page": 16,
        "author": "王五",
        "datetime": "2024-01-0 8:30",
        "replies": 98,
        "views": 2746,
        "id": -52,
        "title": "主题 #-52"
      },
      {
        "page": 16,
        "author": "赵六",
        "datetime": "2024-01-0 7:30",
        "replies": 78,
        "views": 3436,
        "id": -53,
        "title": "主题 #-53"
      },
      {
        "page": 16,
        "author": "孙七",
        "datetime": "2024-01-0 6:30",
        "replies": 39,
        "views": 3793,
        "id": -54,
        "title": "主题 #-54"
      },
      {
        "page": 16,
        "author": "周八",
        "datetime": "2024-01-0 5:30",
        "replies": 51,
        "views": 1437,
        "id": -55,
        "title": "主题 #-55"
      }
    ]
  },
  "tips": [
    "采集完成，共 16 页 156 条数据"
  ]
}

```

### 1.3 --help 输出

```bash
npx tsx xcli/bin/xcli.ts 04-pagination scrape --help
```

```
📌 scrape - 采集分页数据

采集分页数据

⚙️  Parameters (Zod):
--url [string] (optional)
    目标URL

📤 Result (Zod):
  data: [object] { total_pages, threads }

📝 Examples:
  $ xcli 04-pagination scrape --url "https://..."

    data:
      total_pages: 5
      threads:
        - id: "100"
          title: "Python爬虫入门教程"
          author: 张三
          datetime: 2024-01-15 10:30
          replies: 85
          views: 4056
          page: 1
        - ...
    💡 采集完成，共 5 页 50 条数据

```

---

## 2. verify 命令

### 2.1 默认输出 (YAML)

```bash
npx tsx xcli/bin/xcli.ts 04-pagination verify
```

```yaml
Available: scrape

```

### 2.2 --help 输出

```bash
npx tsx xcli/bin/xcli.ts 04-pagination verify --help
```

```
Available: scrape

```

---

## 3. 结论

**状态**: ✅ 验证完成

---
*此文档由自动化脚本生成*
