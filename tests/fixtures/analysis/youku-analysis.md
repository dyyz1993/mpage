# youku.yaml

## 原始结构

```
#app: [i:1 t:118 372KB→9KB]
  .channel_container: [i:1 t:224 372KB→9KB]
    .channel_container_modulelist: [i:1 t:118 371.9KB→9KB]
      #channel_module_container: [i:1 t:224 371.9KB→9KB]
        .src_ykheader_box: [i:1 t:4 ×3 23.4KB→773B]
          .topheader_left_box: [div]
          .search_search_box: [i:1]
            #search_box: [i:1]
              .search_search_input_box: [i:1]
                .search_search_input_content: [i:1]
                  .search_search_input: [input]
            .search_search_other: [div]
          .crmvip_vip_wrap: [l:1 3.8KB→27B]
          .filter_filter_box: [l:1]
            .filter_text: [t:1]
          .historyrecord_record_box: [l:1]
            .historyrecord_text: [t:1]
          .useiku_iku_box: [l:1]
            .useiku_text: [t:1]
          .crmusercenter_user_center_box: [t:1]
            .crmusercenter_avatar: [div]
        #maintitle_48260: [t:70 126.5KB→2.8KB]
          .module_content: [t:22 126.4KB→2.8KB]
            .swiper_wrap_873Zu: [t:70 126.3KB→2.8KB]
              .swiper-wrapper: [×12 40.7KB→370B]
                .swiper_show_img_35RxB: [l:1 3.6KB→33B]
                  .img_top_shadow_2Php6: [div]
                  .img_left_shadow_2fEQ_: [div]
                  .img_bottom_shadow_FR1ZY: [div]
              .pagination_info_wrap_dIfrg: [t:22 84.9KB→2.5KB]
                .swiper_item_info_wrap_VUf6i: [l:9 t:46 ×12 41.6KB→1.7KB]
                  .swiper_item_info_2EwYx: [l:1 t:2 4.4KB→170B]
                    .item_wrap_1-jfk: [l:1 t:4 4.1KB→164B]
                      #info_item_0: [t:1]
                        .swiper_item_tags_1jVsc: [t:3]
                          .tag_32dfQ tag12_3X0t4: [div]
                          .tag_32dfQ tag1_1kFNi: [×2]
                        .swiper_item_desc_gV7hg: [t:1]
                      .swiper_item_control_3B6vG: [l:1 t:1 3.5KB→39B]
                        .control_btn_wrap_K7AJG: [l:1 3.4KB→39B]
                .custom_pagination_wrap_34fns: [t:24 43.3KB→770B]
                  .hscroll_wrapper_3CJzY: [t:2 43.3KB→770B]
                    .hscroll_content_fdYOj: [t:2 ×2 43.2KB→770B]
                      #swiperMode0: [l:1 4.1KB→81B]
                        .yk_card_368vl: [l:1 t:3 4KB→81B]
                        .bullet_active_2sIh6: [active]
              .video_preview_wrap_2otC8: [h]
                #swiper_video_preview_wrap: [h]
                .img_top_shadow_2Php6: [h]
                .img_left_shadow_2fEQ_: [h]
                .img_bottom_shadow_FR1ZY: [h]
              .swiper_right_shadow_-YKcS: [div]
        #maintitle_13901: [t:27 221.3KB→5.4KB]
          .module_content: [t:198 221.2KB→5.4KB]
            .feed_container_2OIca: [t:27 ×6 221.2KB→5.4KB]
              #feed_content_0: [t:68 54.1KB→1.6KB]
                .hscroll_wrapper_3CJzY: [t:5 54KB→1.6KB]
                  .hscroll_content_fdYOj: [t:4 ×2 52.8KB→1.6KB]
                    .g-col: [l:1 3.8KB→126B]
                      .yk_card_368vl: [l:1 t:5 3.8KB→126B]
        .loading_component_box_YVgAF: [h]
        #preview: [div]
          .preview_content_wrap_3bSOx: [div]
            #drawer_video_preview_wrap_v2: [h]
          .toast_wrapper_2Xq-X: [h]
        .src_youku_fixed_bar: [div]
#YK-login-container: [div]
  .loginnew_yk_login_wrap: [div]
    .loginnew_close: [div]
    .loginnew_login_loading: [div]
#YK-login-mask: [div]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构
- `#search_box` - 搜索功能入口
- `.src_ykheader_box` - 头部导航容器
- `.crmusercenter_user_center_box` - 用户中心入口
- `.swiper_wrap_873Zu` - 轮播内容（视频展示）
- `.feed_container_2OIca` - 信息流内容区
- `.src_youku_fixed_bar` - 底部固定栏

### 建议删除的内容
| 选择器 | 删除原因 |
|--------|----------|
| `.loading_component_box_YVgAF` | 骨架屏/加载占位（hidden状态） |
| `.video_preview_wrap_2otC8` | 视频预览临时交互（hidden状态） |
| `#swiper_video_preview_wrap` | 预览浮层（hidden状态） |
| `.toast_wrapper_2Xq-X` | 临时提示消息（hidden状态） |
| `#YK-login-container` | 登录弹窗（用户已登录时应隐藏） |
| `#YK-login-mask` | 登录遮罩层 |

### 不稳定的模式
| 模式 | 原因 |
|------|------|
| `#maintitle_*` | 动态ID哈希（版本更新会变化） |
| `#feed_content_*` | 动态生成的内容区ID |
| `#swiperMode*` | 轮播模式标识符 |
| `.swiper_wrap_*` | CSS Module哈希类名 |
| `.yk_card_*` | CSS Module哈希类名 |
| `.hscroll_wrapper_*` | CSS Module哈希类名 |

### 过滤后的结构树
```
#app
└── .channel_container
    └── .channel_container_modulelist
        └── #channel_module_container
            ├── .src_ykheader_box
            │   ├── .topheader_left_box
            │   ├── #search_box [★关键]
            │   ├── .crmvip_vip_wrap
            │   ├── .filter_filter_box
            │   ├── .historyrecord_record_box
            │   └── .crmusercenter_user_center_box [★关键]
            ├── #maintitle_48260
            │   └── .swiper_wrap_873Zu [★关键]
            └── #maintitle_13901
                └── .feed_container_2OIca [★关键]
```

**总结**：该页面为优酷频道主页，核心功能为视频内容展示（轮播+信息流）。用户如果想操作，主要关注搜索框、轮播区域、信息流和用户入口即可。
