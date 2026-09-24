# 纯C实施验证记录

## Task1–2，2026-09-20

范围止于共享视觉基础、中央拍摄导航。Task3及后续未开始，无云资源操作、部署或预览上传。

修改：app.wxss；native/lib/tab-model.js；native/components/navigation/index.js/index.wxml/index.wxss；tests/native-tabs.cjs。
新增测试：tests/native-c-theme.cjs、tests/native-c-navigation.cjs。

实现：纸张/自然色token、系统字和44/34/28/24字号、88rpx按钮、低动效兜底；保持三个持久tab，新增独立capture行动并navigateTo拍摄，图鉴tab仍reLaunch，当前项不重复导航。拍摄/揭晓内隐藏dock，四等宽区域、本地CSS图标、112rpx抬升拍摄入口与安全区。

对比度纠正：原设计#C45431配#FFF8E8未通过4.5:1测试；操作橙改为#B8492A，相关测试已达到4.5:1。没有修改收藏卡组件或原星级数据。

TDD：两个新增测试初跑均失败（缺少token、navigationItems）；实现后通过。

验证：
- node --test tests/*.cjs：39/39 pass，0 fail。
- npm run build:weapp：PASS，原生发布源/语法验证，无上传产物。
- 全部native JS语法与JSON解析通过。
- 官方wcc/wcsc单文件编译24个native模板/样式，加app.wxss，全部通过。
- /tmp/nature-c-baseline.json记录10文件SHA-256：7张assets/images图片、native/lib/example-cards.js、app.js、src/data/species.ts全部一致。

未验收：375/390/430px真实截图和真机点击/大字体。为遵守本轮无云操作边界，未启动会执行app云同步的模拟器。此处不宣称像素/真机验收通过，需主控视觉复核后再启动Task3。

## Task3–4，2026-09-20

主控批准继续Task3–4。新增exploration-model纯函数与native-c-exploration/native-c-chapter测试；修改home与library的JS/WXML/WXSS、chapter-model。相关回归中的旧“春日推荐/九格/水墨首页”断言更新到已批准的新口径，未删除案例身份或严格失败保存断言。

数据口径：
- 首页只读取app.getCards的真实非sample/example已收藏数据，不读会话失败草稿。
- 章节固定七个原有目标speciesId，按物种去重；重复观察增加记录数，不增加种数。
- 今日收集按设备本地日历日期createdAt筛选，无日期/非法日期不假冒今日，时间倒序，同时间按记录后序。
- 无收藏任务为首次收录；已有收藏但章节未完成为发现新物种；7/7为完成状态。
- 图鉴进度不随筛选改变；组合无结果可重置；七张案例独立且仍不计收藏。
- 章节里程碑3/6/7只是章节反馈，未改变app.getBadges的类别成就阈值。

TDD新增两测试初跑失败（缺模型、原9格），实现后通过。补充home VM的示例-only/重复/入口路由及library VM的bird+holo、plant+standard、无结果、重置测试。

验证：node --test tests/*.cjs为41/41通过；npm run build:weapp通过；native JS/JSON、24个官方模板/样式加app.wxss通过；10文件SHA-256基线全部不变。无云资源操作、部署或预览上传。

阶段边界：
- 首页“从相册选择”已路由source=album；observe自动消费参数属于计划Task6，本轮不跨范围修改，因此现阶段该入口只到拍摄页，不宣称一键选图已完成。
- 手绘主题目前是设计允许的本地CSS叶/花形状，不宣称已生成完整gouache插画。
- 我的页经验口径同步属于Task5，尚未实施；小屏/真机截图仍留Task7。Task5及之后等待主控批准。

## Task5–6，2026-09-20

主控批准后完成本地范围，止于Task6。修改profile-model、profile/observe的JS/WXML/WXSS，reveal/card/nearby/settings/note的WXML/WXSS；新增native-c-profile和native-c-flow-visual测试。

数据口径：我的探索经验只计七个章节目标中真实已收藏的不同物种，重复、示例及章节外物种不增加章节经验；章节外真实物种仍计全局种数。徽章数量只计app.getBadges返回的earned项，笔记无示例填充；非法日期不计观察天数。未改变原始成就阈值或卡片星级。

相册入口：onLoad接收source=album，onReady仅消费一次；页面提前隐藏取消自动打开；卸载后到达的相册结果不再保存。选图前不上传、不写观察；沿用既有相册及识别授权路径。拍摄页不再显示持久导航栏。

视觉：我的经验/徽章、拍摄、封卡揭晓、详情外壳、静态生境、设置和笔记对齐纸张/苔藓/陶土橙；装饰图标使用本地CSS。保留collectible母版、详情翻面/拖动逻辑、识别错误文本及严格失败不保存/不自动原图降级流程。附近明确静态资料，不再将固定月份描述为当前提醒。

TDD：新增测试初跑因缺少相册接收器、章节外物种错误增加经验而失败；实现后通过。覆盖真实经验与徽章、无示例笔记、单次相册入口、卸载后迟到结果、隐藏前取消入口，以及原绑定保留。

最终复跑证据：
- node --test tests/*.cjs：44 tests，44 pass，0 fail。
- npm run build:weapp：PASS native release source and syntax；不产生上传产物。
- 全部native JS语法、JSON解析通过。
- 官方wcc/wcsc逐文件编译24个native模板/样式及app.wxss，共25项通过。复跑时一次工具路径拼写导致ENOENT，纠正为wcc-exec/wcsc后全部通过，并非模板错误。
- 七张assets/images、example-cards.js、app.js、src/data/species.ts共10项SHA-256与Task1前基线一致。

尚待Task7：小屏、字体放大、真机实际布局和动画手感，尤其封卡和设置长文；本轮不宣称视觉验收通过。未操作云资源、未部署、未preview/upload。暂停等待主控审阅。

## Task7 静态与隔离验证，2026-09-20

按主控授权仅执行不会触发云端同步的检查。新增tests/native-c-accessibility.cjs：六个有交互动效页面的reduce-motion入口、九页面无无限动画/背景模糊、导航可读标签、关闭按钮可读标签与最小88rpx目标；隔离VM验证低动效揭晓无震动且直接settled，详情拖动无倾斜、翻面无旋转动画。初跑因关闭图标无aria-label失败，随后给card/index.wxml增加“关闭卡片查看”标签，card/index.wxss增加88rpx最小宽高，测试通过。未改变业务或手势逻辑。

最终验证：
- node --test tests/*.cjs：45 tests，45 pass，0 fail（完整输出/tmp/nature-c-task7-tests.log）。
- npm run build:weapp：PASS native release source and syntax，无上传。
- native全部JS/JSON及根app.js/app.json/project.config.json检查通过。
- 官方wcc/wcsc单文件编译24个native模板/样式与app.wxss，共25项通过。
- 10项保护案例/图片/源数据SHA-256与原基线全部一致。

未验证且不得视为通过：375/390/430px屏宽截图、系统字体放大、真机布局/触控目标物理尺寸、读屏实际表现、动画手感及拍摄全链路。主控本地预览连接超时；本轮未启动会同步云端的预览，也未操作云资源或部署。静态断言不等价于设备可访问性验收。

历史外部阻塞：此前水彩模型探测得到HTTP429，具体额度/节流原因仍需平台核查；本轮没有再次调用，也不依据UI检查声称AI服务可用。Task7设备和视觉验收门仍未关闭。

## 第二轮 C 结构与插画落地，2026-09-20

依据用户真实画面反馈及主控批准，补足上一轮只有色彩与CSS花叶的视觉差距：
- 首页移除CSS小花DOM，使用独立assets/theme/exploration-hero.jpg大幅水粉溪流/花鸟场景，任务纸签略叠场景边缘，保留原拍摄/相册动作和真实任务口径。
- 图鉴七格增加物种名称、已遇见/等待相遇状态和独立图片区；照片仅来自本人已收藏记录，未收录格不挪用案例假装解锁。收藏卡母版未改，案例仍独立。
- 我的增加圆形本地观察者CSS头像、章节经验阶段称号、六格统计（物种/记录/观察天数/已得徽章/重逢/笔记）、勋章陈列。重逢=真实记录数减真实不同物种数；笔记=真实记录中非空白笔记数；阶段称号按既有章节经验0/3/6/7分段，仅展示，不新增积分奖励或持久状态。

资源：主控交付exec-2c61d96f-b9f6-48ab-a829-83295b44f5c8.png已检查无文字/私图。生成源2.8MB仍保留在原目录，项目展示副本等比1200px、JPEG82约395KB；删除的仅是刚复制进项目的中间PNG，不影响用户源图。插画仅为装饰，不作物种识别或科学示例。

变更：home WXML/WXSS；library JS/WXML/WXSS；profile JS/WXML/WXSS；profile-model；新增theme JPEG、native-c-second-pass测试和第二轮计划；更新native-profile-page-runtime的六格零值断言。

测试先行：新增测试初跑因缺失repeat字段失败，实现后通过；旧四字段精确断言更新为六字段并保持零值/非示例检查。最终46/46 tests通过，build:weapp通过，native JS/JSON与25项官方wcc/wcsc通过，10项保护资产/源数据SHA-256全部一致。未改collectible正面、手势、失败保存逻辑、云函数或云资源。

待验收：本轮代码/资产证据已齐，实际设备截图及主控与C方向稿视觉对比尚未核验，不宣称像素或真机体验完全一致。
