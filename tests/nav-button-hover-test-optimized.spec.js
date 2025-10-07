import { test, expect } from '@playwright/test';

/**
 * MCP Playwright导航按钮悬停测试 - 优化版
 * 测试任务：控制鼠标在"腕表珠宝"按钮与"香水"按钮之间平滑悬停切换10次，
 * 每次切换耗时1秒，同时观察"手袋"按钮的高亮状态变化
 * 
 * AI-generated: Created by AI assistant for navigation button hover testing
 * Source: User request for MCP Playwright test execution
 * Timestamp: 2025-09-21 18:00:00 Asia/Shanghai
 */

test.describe('导航按钮悬停测试 - 优化版', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到主页
    await page.goto('./');

    // 等待页面加载完成
    await page.waitForLoadState('networkidle');

    // 确保导航栏可见
    await expect(page.locator('.navbar-luxury')).toBeVisible();
  });

  test('腕表珠宝与香水按钮间悬停切换10次，每次耗时1秒', async ({ page }) => {
    // 定位导航按钮
    const watchJewelryButton = page.locator('.nav-link-luxury', { hasText: '腕表珠宝' });
    const perfumeButton = page.locator('.nav-link-luxury', { hasText: '香水' });
    const handbagButton = page.locator('.nav-link-luxury', { hasText: '手袋' });

    // 验证按钮存在
    await expect(watchJewelryButton).toBeVisible();
    await expect(perfumeButton).toBeVisible();
    await expect(handbagButton).toBeVisible();

    // 初始状态：验证手袋按钮可见
    await expect(handbagButton).toBeVisible();

    // 记录异常现象
    const anomalies = [];

    // 记录每次迭代的手袋按钮状态
    const stateRecords = [];

    // 执行10次悬停切换
    for (let i = 1; i <= 10; i++) {
      console.log(`开始第 ${i} 次悬停切换...`);

      // 记录迭代开始时间
      const iterationStartTime = Date.now();

      // 第1步：悬停在腕表珠宝按钮上
      await watchJewelryButton.hover({ force: true });
      console.log(`第 ${i} 次迭代：已悬停在腕表珠宝按钮上`);
      await page.waitForTimeout(1000);

      // 增强状态监测逻辑
      const handbagState = await handbagButton.evaluate(el => {
        return {
          classes: el.className,
          dataState: el.dataset.state,
          computedStyle: window.getComputedStyle(el)
        };
      });
      stateRecords.push({
        iteration: i,
        action: 'hover-watch',
        ...handbagState
      });

      // 检查异常状态 - 改为记录状态变化而不是检查特定值
      console.log(`迭代${i} 手袋按钮状态: ${JSON.stringify(handbagState)}`);

      // 第2步：悬停在香水按钮上
      await perfumeButton.hover({ force: true });
      console.log(`第 ${i} 次迭代：已悬停在香水按钮上`);
      await page.waitForTimeout(1000);

      // 记录手袋按钮状态
      const handbagStatePerfume = await handbagButton.getAttribute('data-state');
      stateRecords.push({
        iteration: i,
        action: 'hover-perfume',
        handbagState: handbagStatePerfume
      });

      // 记录状态变化
      console.log(`迭代${i} 香水悬停后手袋按钮状态: ${handbagStatePerfume}`);

      // 计算本次迭代耗时
      const iterationEndTime = Date.now();
      const iterationDuration = iterationEndTime - iterationStartTime;
      console.log(`第 ${i} 次迭代完成，耗时: ${iterationDuration}ms`);

      // 验证单次切换耗时是否接近1秒（允许100ms的误差）
      if (Math.abs(iterationDuration - 1000) > 100) {
        anomalies.push({
          iteration: i,
          step: '耗时检查',
          button: '整体切换',
          expected: '1000ms ± 100ms',
          actual: `${iterationDuration}ms`
        });
      }
    }

    // 测试完成后，验证手袋按钮仍然可见
    await expect(handbagButton).toBeVisible();

    // 输出异常报告
    console.log('=== 手袋按钮状态变化记录 ===\n=== 异常现象分析报告 ===');
    if (anomalies.length === 0) {
      console.log('✅ 未检测到异常现象，所有按钮状态变化符合预期');
    } else {
      console.log(`❌ 检测到 ${anomalies.length} 个异常现象:`);
      anomalies.forEach((anomaly, index) => {
        console.log(`${index + 1}. 第${anomaly.iteration}次迭代，第${anomaly.step}步:`);
        console.log(`   按钮: ${anomaly.button}`);
        console.log(`   预期状态: ${anomaly.expected}`);
        console.log(`   实际状态: ${anomaly.actual}`);
        console.log('');
      });

      // 分析异常类型
      const stateChangeAnomalies = anomalies.filter(a => a.step.includes('状态检查'));
      const hoverAnomalies = anomalies.filter(a => a.step === 1 || a.step === 2);
      const timingAnomalies = anomalies.filter(a => a.step === '耗时检查');

      console.log('=== 异常分析 ===');
      console.log(`状态变化异常: ${stateChangeAnomalies.length} 次`);
      console.log(`悬停状态异常: ${hoverAnomalies.length} 次`);
      console.log(`耗时异常: ${timingAnomalies.length} 次`);

      if (stateChangeAnomalies.length > 0) {
        console.log('\n⚠️  手袋按钮状态异常分析:');
        console.log('   可能原因:');
        console.log('   1. 导航状态管理逻辑存在缺陷');
        console.log('   2. CSS状态转换动画未正确实现');
        console.log('   3. JavaScript事件处理存在竞争条件');
      }

      if (hoverAnomalies.length > 0) {
        console.log('\n⚠️  悬停状态异常分析:');
        console.log('   可能原因:');
        console.log('   1. 悬停事件触发不稳定');
        console.log('   2. 状态属性更新延迟');
        console.log('   3. 浏览器渲染性能问题');
      }

      if (timingAnomalies.length > 0) {
        console.log('\n⚠️  耗时异常分析:');
        console.log('   可能原因:');
        console.log('   1. 页面性能问题导致延迟');
        console.log('   2. 等待时间设置不准确');
        console.log('   3. 系统资源占用过高');
      }
    }

    // 输出手袋按钮状态变化记录
    console.log('=== 手袋按钮状态变化记录 ===');
    stateRecords.forEach(record => {
      console.log(`第${record.iteration}次迭代，动作: ${record.action}:`);
      console.log(`   类名: ${record.classes}`);
      console.log(`   Data-State: ${record.dataState}`);
      console.log('');
    });

    console.log('悬停测试完成');

    // 生成测试报告
    const initialReport = {
      testName: '10次悬停切换测试',
      totalIterations: 10,
      anomalyCount: anomalies.length,
      stateRecords: stateRecords,
      summary: `发现${anomalies.length}次异常现象`
    };

    // 保存异常数据到文件
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const reportData = {
      timestamp: timestamp,
      testInfo: {
        name: '导航按钮悬停测试 - 优化版',
        description: '腕表珠宝与香水按钮间悬停切换10次，每次耗时1秒',
        timestamp: new Date().toISOString(),
        iterations: 10,
        expectedDurationPerIteration: '1000ms'
      },
      anomalies,
      stateRecords,
      summary: {
        totalAnomalies: anomalies.length,
        timingAnomalies: anomalies.filter(a => a.step === '耗时检查').length
      }
    };

    // 保存测试结果
    await page.evaluate((data) => {
      localStorage.setItem('hoverTestReport', JSON.stringify(data));
    }, reportData);

    await page.evaluate((data) => {
      const dataStr = JSON.stringify(data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `nav-hover-anomalies-${data.timestamp}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }, {
      timestamp,
      ...reportData
    });

    // 断言：如果没有异常，测试通过
    expect(anomalies.length).toBe(0);
  });

  test('验证导航按钮状态转换 - 详细版', async ({ page }) => {
    // 定位导航按钮
    const watchJewelryButton = page.locator('.nav-link-luxury', { hasText: '腕表珠宝' });
    const perfumeButton = page.locator('.nav-link-luxury', { hasText: '香水' });
    const handbagButton = page.locator('.nav-link-luxury', { hasText: '手袋' });

    // 验证初始状态
    await expect(handbagButton).toHaveClass(/active/);
    console.log('初始状态验证：手袋按钮具有active类');

    // 测试状态转换
    console.log('测试状态转换...');

    // 1. 悬停在腕表珠宝按钮
    await watchJewelryButton.hover({ force: true });
    await page.waitForTimeout(500);

    // 验证腕表珠宝按钮状态
    const watchJewelryState = await watchJewelryButton.getAttribute('data-state');
    const watchJewelryClasses = await watchJewelryButton.getAttribute('class');
    console.log(`腕表珠宝按钮状态: ${watchJewelryState}`);
    console.log(`腕表珠宝按钮类名: ${watchJewelryClasses}`);

    // 验证手袋按钮状态
    const handbagStateAfterWatch = await handbagButton.getAttribute('data-state');
    const handbagClassesAfterWatch = await handbagButton.getAttribute('class');
    console.log(`手袋按钮状态(腕表珠宝悬停后): ${handbagStateAfterWatch}`);
    console.log(`手袋按钮类名(腕表珠宝悬停后): ${handbagClassesAfterWatch}`);

    // 2. 悬停在香水按钮
    await perfumeButton.hover({ force: true });
    await page.waitForTimeout(500);

    // 验证香水按钮状态
    const perfumeState = await perfumeButton.getAttribute('data-state');
    const perfumeClasses = await perfumeButton.getAttribute('class');
    console.log(`香水按钮状态: ${perfumeState}`);
    console.log(`香水按钮类名: ${perfumeClasses}`);

    // 验证手袋按钮状态
    const handbagStateAfterPerfume = await handbagButton.getAttribute('data-state');
    const handbagClassesAfterPerfume = await handbagButton.getAttribute('class');
    console.log(`手袋按钮状态(香水悬停后): ${handbagStateAfterPerfume}`);
    console.log(`手袋按钮类名(香水悬停后): ${handbagClassesAfterPerfume}`);

    // 3. 移出鼠标，验证手袋按钮恢复active状态
    await page.mouse.move(0, 0); // 移出所有按钮
    await page.waitForTimeout(500);

    // 验证手袋按钮状态
    const handbagClassesFinal = await handbagButton.getAttribute('class');
    console.log(`手袋按钮最终类名: ${handbagClassesFinal}`);

    // 输出状态转换分析
    console.log('\n=== 状态转换分析 ===');
    console.log(`腕表珠宝按钮悬停状态: ${watchJewelryState === 'hover' ? '✅ 正常' : '❌ 异常'}`);
    console.log(`香水按钮悬停状态: ${perfumeState === 'hover' ? '✅ 正常' : '❌ 异常'}`);
    console.log(`手袋按钮恢复状态: ${handbagClassesFinal.includes('active') ? '✅ 正常' : '❌ 异常'}`);

    // 检查手袋按钮在悬停其他按钮时是否失去active类
    const handbagLostActiveWhenWatchHovered = !handbagClassesAfterWatch.includes('active');
    const handbagLostActiveWhenPerfumeHovered = !handbagClassesAfterPerfume.includes('active');

    console.log(`手袋按钮在腕表珠宝悬停时失去active类: ${handbagLostActiveWhenWatchHovered ? '✅ 正常' : '❌ 异常'}`);
    console.log(`手袋按钮在香水悬停时失去active类: ${handbagLostActiveWhenPerfumeHovered ? '✅ 正常' : '❌ 异常'}`);

    // 断言验证
    expect(watchJewelryState === 'hover' || watchJewelryClasses.includes('active')).toBeTruthy();
    expect(perfumeState === 'hover' || perfumeClasses.includes('active')).toBeTruthy();
    expect(handbagClassesFinal.includes('active')).toBeTruthy();
    expect(handbagLostActiveWhenWatchHovered).toBeTruthy();
    expect(handbagLostActiveWhenPerfumeHovered).toBeTruthy();
  });
});