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
