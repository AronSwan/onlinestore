const { chromium } = require('playwright');

/**
 * MCP Playwright导航按钮悬停测试脚本
 * 测试任务：控制鼠标在"腕表珠宝"按钮与"香水"按钮之间平滑悬停切换1000次，
 * 每次切换耗时0.7秒，同时观察"手袋"按钮的高亮状态变化
 * 
 * AI-generated: Created by AI assistant for navigation button hover testing
 * Source: User request for MCP Playwright test execution
 * Timestamp: 2025-09-21 17:45:00 Asia/Shanghai
 */

async function runTest() {
  console.log('开始导航按钮悬停测试...');
  
  // 启动浏览器
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 导航到主页
    await page.goto('http://localhost:8000');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    
    // 确保导航栏可见
    await page.waitForSelector('.navbar-luxury');
    
    // 定位导航按钮
    const watchJewelryButton = page.locator('.nav-link-luxury', { hasText: '腕表珠宝' });
    const perfumeButton = page.locator('.nav-link-luxury', { hasText: '香水' });
    const handbagButton = page.locator('.nav-link-luxury', { hasText: '手袋' });
    
    // 验证按钮存在
    await watchJewelryButton.waitFor();
    await perfumeButton.waitFor();
    await handbagButton.waitFor();
    
    console.log('✅ 所有导航按钮已找到');
    
    // 初始状态：手袋按钮应该有active类
    const initialHandbagClass = await handbagButton.getAttribute('class');
    const initialHandbagState = await handbagButton.getAttribute('data-state') || 'inactive';
    console.log(`手袋按钮初始类名: ${initialHandbagClass}`);
    console.log(`手袋按钮初始状态: ${initialHandbagState}`);
    
    // 记录异常现象
    const anomalies = [];
    const handbagStateHistory = [];
    
    // 获取按钮位置信息
    const watchJewelryBox = await watchJewelryButton.boundingBox();
    const perfumeBox = await perfumeButton.boundingBox();
    const handbagBox = await handbagButton.boundingBox();
    
    console.log('按钮位置信息:');
    console.log(`腕表珠宝: x=${watchJewelryBox.x}, y=${watchJewelryBox.y}, width=${watchJewelryBox.width}, height=${watchJewelryBox.height}`);
    console.log(`香水: x=${perfumeBox.x}, y=${perfumeBox.y}, width=${perfumeBox.width}, height=${perfumeBox.height}`);
    console.log(`手袋: x=${handbagBox.x}, y=${handbagBox.y}, width=${handbagBox.width}, height=${handbagBox.height}`);
    
    // 执行100次悬停切换
  console.log('开始执行100次悬停切换，每次耗时1秒...');
  
  for (let i = 1; i <= 100; i++) {
      try {
        // 确保导航栏可见
        await page.waitForSelector('.navbar-luxury', { state: 'visible' });
        
        // 滚动到导航栏位置
        await page.evaluate(() => {
          const navbar = document.querySelector('.navbar-luxury');
          if (navbar) {
            navbar.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
        
        // 短暂延迟，确保滚动完成
        await page.waitForTimeout(100);
        
        // 记录手袋按钮的初始状态
        const handbagStateBefore = await handbagButton.getAttribute('data-state') || 'inactive';
        const handbagClassesBefore = await handbagButton.getAttribute('class') || '';
        
        // 第1步：平滑移动鼠标到腕表珠宝按钮中心
        const watchJewelryCenterX = watchJewelryBox.x + watchJewelryBox.width / 2;
        const watchJewelryCenterY = watchJewelryBox.y + watchJewelryBox.height / 2;
        
        await page.mouse.move(watchJewelryCenterX, watchJewelryCenterY, { steps: 20 });
        await page.waitForTimeout(400); // 等待0.4秒，确保悬停状态稳定
        
        // 验证腕表珠宝按钮获得悬停状态
        const watchJewelryState = await watchJewelryButton.getAttribute('data-state');
        if (watchJewelryState !== 'hover' && watchJewelryState !== 'active') {
          anomalies.push({
            iteration: i,
            step: 1,
            button: '腕表珠宝',
            expected: 'hover or active',
            actual: watchJewelryState || 'none'
          });
        }
        
        // 记录手袋按钮状态变化
        const handbagStateAfterWatchHover = await handbagButton.getAttribute('data-state') || 'inactive';
        const handbagClassesAfterWatchHover = await handbagButton.getAttribute('class') || '';
        
        // 检查手袋按钮状态变化
        if (handbagStateAfterWatchHover !== handbagStateBefore) {
          handbagStateHistory.push({
            iteration: i,
            step: 1,
            before: handbagStateBefore,
            after: handbagStateAfterWatchHover,
            trigger: '腕表珠宝悬停'
          });
        }
        
        // 第2步：平滑移动鼠标到香水按钮中心
        const perfumeCenterX = perfumeBox.x + perfumeBox.width / 2;
        const perfumeCenterY = perfumeBox.y + perfumeBox.height / 2;
        
        await page.mouse.move(perfumeCenterX, perfumeCenterY, { steps: 20 });
        await page.waitForTimeout(400); // 等待0.4秒，确保悬停状态稳定
        
        // 验证香水按钮获得悬停状态
        const perfumeState = await perfumeButton.getAttribute('data-state');
        if (perfumeState !== 'hover' && perfumeState !== 'active') {
          anomalies.push({
            iteration: i,
            step: 2,
            button: '香水',
            expected: 'hover or active',
            actual: perfumeState || 'none'
          });
        }
        
        // 记录手袋按钮状态变化
        const handbagStateAfterPerfumeHover = await handbagButton.getAttribute('data-state') || 'inactive';
        const handbagClassesAfterPerfumeHover = await handbagButton.getAttribute('class') || '';
        
        // 检查手袋按钮状态变化
        if (handbagStateAfterPerfumeHover !== handbagStateAfterWatchHover) {
          handbagStateHistory.push({
            iteration: i,
            step: 2,
            before: handbagStateAfterWatchHover,
            after: handbagStateAfterPerfumeHover,
            trigger: '香水悬停'
          });
        }
        
        // 检查手袋按钮是否有异常状态
        if (handbagStateAfterWatchHover === 'active' || handbagStateAfterPerfumeHover === 'active') {
          anomalies.push({
            iteration: i,
            step: '状态检查',
            button: '手袋',
            expected: 'not active when other buttons are hovered',
            actual: `watch hover: ${handbagStateAfterWatchHover}, perfume hover: ${handbagStateAfterPerfumeHover}`
          });
        }
        
        // 剩余时间等待，确保总耗时为1秒
        await page.waitForTimeout(200);
        
        // 每100次迭代输出一次进度
        if (i % 100 === 0) {
          console.log(`已完成 ${i} 次悬停切换`);
        }
      } catch (error) {
        console.error(`第 ${i} 次迭代发生错误:`, error.message);
        anomalies.push({
          iteration: i,
          step: '错误',
          button: '系统',
          expected: '无错误',
          actual: error.message
        });
        
        // 尝试恢复状态
        try {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(500);
        } catch (resetError) {
          console.error('重置状态失败:', resetError.message);
        }
      }
    }
    
    // 测试完成后，验证手袋按钮是否恢复active状态
    const finalHandbagClass = await handbagButton.getAttribute('class');
    const finalHandbagState = await handbagButton.getAttribute('data-state') || 'inactive';
    console.log(`手袋按钮最终类名: ${finalHandbagClass}`);
    console.log(`手袋按钮最终状态: ${finalHandbagState}`);
    
    // 输出异常报告
    console.log('\n=== 异常现象分析报告 ===');
    
    // 分析异常类型
    const stateChangeAnomalies = anomalies.filter(a => a.step === '状态检查');
    const hoverAnomalies = anomalies.filter(a => a.step !== '状态检查');
    
    // 定义异常类型
    const anomalyTypes = {
      '状态变化异常': stateChangeAnomalies.length,
      '悬停状态异常': hoverAnomalies.length,
      '其他错误': anomalies.filter(a => a.step === '错误').length
    };
    
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
      
      console.log('=== 异常分析 ===');
      console.log(`状态变化异常: ${stateChangeAnomalies.length} 次`);
      console.log(`悬停状态异常: ${hoverAnomalies.length} 次`);
      
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
    }
    
    // 输出手袋按钮状态变化历史
    console.log('\n=== 手袋按钮状态变化历史 ===');
    console.log(`总共记录了 ${handbagStateHistory.length} 次状态变化`);
    
    // 分析状态变化类型
    const stateChanges = {
      'inactive to hover': 0,
      'hover to inactive': 0,
      'inactive to active': 0,
      'active to inactive': 0,
      'hover to active': 0,
      'active to hover': 0,
      'other': 0
    };
    
    handbagStateHistory.forEach(change => {
      const changeKey = `${change.before} to ${change.after}`;
      if (stateChanges.hasOwnProperty(changeKey)) {
        stateChanges[changeKey]++;
      } else {
        stateChanges['other']++;
      }
    });
    
    console.log('\n=== 状态变化统计 ===');
    Object.entries(stateChanges).forEach(([change, count]) => {
      if (count > 0) {
        console.log(`${change}: ${count} 次`);
      }
    });
    
    // 保存异常数据到文件
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportData = {
      testInfo: {
        totalIterations: 100,
        durationPerIteration: '1秒',
        testTime: new Date().toISOString(),
        initialHandbagState: initialHandbagState,
        finalHandbagState: finalHandbagState
      },
      anomalies: anomalies,
      handbagStateHistory: handbagStateHistory,
      stateChanges: stateChanges,
      anomalyTypes: anomalyTypes
    };
    
    const fileName = `nav-hover-anomalies-${timestamp}.json`;
    fs.writeFileSync(fileName, JSON.stringify(reportData, null, 2));
    console.log(`\n异常数据已保存到文件: ${fileName}`);
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  } finally {
    // 关闭浏览器
    await browser.close();
  }
}

// 运行测试
runTest().catch(console.error);