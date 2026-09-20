# 私有照片服务端登记修复

真机asset_registry来自客户端assets写入被私有数据库规则阻止。修复不放宽规则：上传票据、文件上传之后调用recognizeObservation/register_asset，云函数从getWXContext().OPENID获取所有者，校验observationId格式、cloudPath完全一致、photoFileId归属路径、purpose=recognition；拒绝客户端owner/_openid字段。下载核验文件存在和4MB限额后写assets。

登记document ID为OPENID与fileID的SHA256，因此重试不制造重复归属记录；内容中的_openid只由服务端赋值。客户端不再database().collection('assets').add。assets可保持禁止客户端写，仍须在控制台预先创建集合；函数管理员权限负责登记。

自动测试覆盖成功、重试幂等、伪造owner、跨身份文件、错用途/路径、服务端数据库异常，以及前端完全不调用客户端数据库。没有读取凭据。

2026-09-17 16:14:20 CST尝试部署recognizeObservation到现有环境cloudbase-d1gsupcxmde24eb11失败：success:false，getCloudAPISignedHeader ret41002 system error；请求ID 66605091-1789632860。不能声称云端已更新。需重新登录开发者工具后上传并部署（云端安装依赖），并刷新前端预览，才能使用register_asset。不要通过开放数据库写入替代此修复。
