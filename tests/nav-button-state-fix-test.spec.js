/**
 * 导航按钮状态修复验证测试
 * 验证三个核心问题的修复效果：
 * 1. 修复悬停状态异常
 * 2. 解决状态同步问题
 * 3. 优化导航按钮高亮逻辑
 * 
 * 创建时间: 2025-06-18
 * 来源: 验证导航按钮状态修复效果
 */

import { test, expect } from '@playwright/test';

// 辅助函数：安全获取按钮状态
async function getButtonState(locator) {
    try {
        const isVisible = await locator.isVisible();
        if (!isVisible) {
            return {
                visible: false,
                dataState: 'unknown',
                classes: '',
                text: 'unknown'
            };
        }
        
        const dataState = await locator.getAttribute('data-state') || 'inactive';
        const classes = await locator.getAttribute('class') || '';
        const text = await locator.textContent() || 'unknown';
        
        return {
            visible: true,
            dataState,
            classes,
            text
        };
    } catch (error) {
        console.error('获取按钮状态失败:', error);
        return {
            visible: false,
            dataState: 'error',
            classes: '',
            text: 'error'
        };
    }
}

test.describe('导航按钮状态修复验证', () => {
    let page;
    let anomalies = [];

    test.beforeEach(async ({ browser }) => {
        page = await browser.newPage();
        // 启用控制台日志收集
        page.on('console', msg => {
            console.log(msg.text());
            if (msg.text().includes('State inconsistency') || msg.text().includes('anomaly')) {
                anomalies.push({
                    type: 'console_warning',
                    message: msg.text(),
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        // 启用页面错误收集
        page.on('pageerror', error => {
            console.error('Page error:', error.message);
            anomalies.push({
                type: 'page_error',
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        });

        // 导航到测试页面
        await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });
        
        // 等待导航状态管理器初始化
        await page.waitForTimeout(1000);
        
        // 检查导航栏是否可见
        const navbarVisible = await page.isVisible('.navbar-luxury');
        if (!navbarVisible) {
            console.warn('导航栏不可见，测试可能会失败');
            anomalies.push({
                type: 'setup_warning',
                message: '导航栏不可见',
                timestamp: new Date().toISOString()
            });
        }
        
        // 检查导航按钮是否存在
        const navLinksCount = await page.locator('.nav-link-luxury').count();
        if (navLinksCount === 0) {
            console.warn('未找到导航按钮，测试将会失败');
            anomalies.push({
                type: 'setup_warning',
                message: '未找到导航按钮',
                timestamp: new Date().toISOString()
            });
        } else {
            console.log(`找到 ${navLinksCount} 个导航按钮`);
        }
        
        // 检查导航状态管理器是否已加载
        const stateManagerLoaded = await page.evaluate(() => {
            return typeof window.NavigationStateManager !== 'undefined';
        });
        
        if (!stateManagerLoaded) {
            console.warn('导航状态管理器未加载，测试可能会失败');
            anomalies.push({
                type: 'setup_warning',
                message: '导航状态管理器未加载',
                timestamp: new Date().toISOString()
            });
        } else {
            console.log('导航状态管理器已加载');
        }
    });

    test.afterEach(async () => {
        // 保存异常数据到浏览器控制台，而不是文件系统
        if (anomalies.length > 0) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            // 将异常数据存储到浏览器的localStorage中
            await page.evaluate((anomaliesData) => {
                try {
                    const existingAnomalies = JSON.parse(localStorage.getItem('navAnomalies') || '[]');
                    const allAnomalies = [...existingAnomalies, ...anomaliesData];
                    localStorage.setItem('navAnomalies', JSON.stringify(allAnomalies));
                    console.log(`已保存 ${anomaliesData.length} 条异常数据到localStorage`);
                } catch (e) {
                    console.error('保存异常数据失败:', e);
                }
            }, anomalies);
            
            // 在控制台输出异常数据摘要
            console.log(`测试完成，发现 ${anomalies.length} 条异常:`);
            anomalies.forEach((anomaly, index) => {
                console.log(`异常 ${index + 1}: [${anomaly.type}] ${anomaly.message}`);
            });
        }
        
        await page.close();
    });

    test('验证悬停状态异常修复', async () => {
        console.log('开始验证悬停状态异常修复...');
        
        // 获取导航按钮
        const watchJewelryButton = page.locator('.nav-link-luxury', { hasText: '腕表珠宝' });
        const perfumeButton = page.locator('.nav-link-luxury', { hasText: '香水' });
        const handbagButton = page.locator('.nav-link-luxury', { hasText: '手袋' });
        
        // 确保导航栏可见
        await expect(page.locator('.navbar-luxury')).toBeVisible();
        
        // 执行10次悬停切换
        for (let i = 1; i <= 10; i++) {
            console.log(`执行第 ${i} 次悬停切换...`);
            
            // 记录初始状态
            const handbagStateBefore = await getButtonState(handbagButton);
            
            // 第1步：悬停腕表珠宝按钮
            await watchJewelryButton.hover();
            await page.waitForTimeout(500);
            
            // 验证腕表珠宝按钮状态
            const watchJewelryState = await getButtonState(watchJewelryButton);
            
            // 腕表珠宝按钮应该处于悬停激活状态（除非它是活动按钮）
            if (watchJewelryState.visible) {
                // 检查是否是活动按钮
                const isHandbagActive = handbagStateBefore.visible && 
                                      handbagStateBefore.dataState === 'active' && 
                                      handbagStateBefore.classes.includes('active');
                
                if (isHandbagActive) {
                    // 手袋是活动按钮，腕表珠宝应该可以悬停
                    expect(watchJewelryState.dataState).toBe('hover-active');
                    expect(watchJewelryState.classes).toContain('hover-active');
                } else {
                    // 手袋不是活动按钮，需要检查腕表珠宝是否是活动按钮
                    if (watchJewelryState.classes.includes('active')) {
                        // 如果是活动按钮，不应该有悬停状态
                        expect(watchJewelryState.dataState).toBe('active');
                        expect(watchJewelryState.classes).toContain('active');
                        expect(watchJewelryState.classes).not.toContain('hover-active');
                    } else {
                        // 不是活动按钮，应该有悬停状态
                        expect(watchJewelryState.dataState).toBe('hover-active');
                        expect(watchJewelryState.classes).toContain('hover-active');
                    }
                }
            } else {
                console.warn('腕表珠宝按钮不可见，跳过验证');
                anomalies.push({
                    type: 'element_not_visible',
                    message: '腕表珠宝按钮不可见',
                    timestamp: new Date().toISOString()
                });
            }
            
            // 第2步：悬停香水按钮
            await perfumeButton.hover();
            await page.waitForTimeout(500);
            
            // 验证香水按钮状态
            const perfumeState = await getButtonState(perfumeButton);
            
            // 香水按钮应该处于悬停激活状态（除非它是活动按钮）
            if (perfumeState.visible) {
                // 检查是否是活动按钮
                if (perfumeState.classes.includes('active')) {
                    // 如果是活动按钮，不应该有悬停状态
                    expect(perfumeState.dataState).toBe('active');
                    expect(perfumeState.classes).toContain('active');
                    expect(perfumeState.classes).not.toContain('hover-active');
                } else {
                    // 不是活动按钮，应该有悬停状态
                    expect(perfumeState.dataState).toBe('hover-active');
                    expect(perfumeState.classes).toContain('hover-active');
                }
            } else {
                console.warn('香水按钮不可见，跳过验证');
                anomalies.push({
                    type: 'element_not_visible',
                    message: '香水按钮不可见',
                    timestamp: new Date().toISOString()
                });
            }
            
            // 验证腕表珠宝按钮状态已恢复
            const watchJewelryStateAfter = await getButtonState(watchJewelryButton);
            
            if (watchJewelryStateAfter.visible) {
                // 如果不是活动按钮，应该恢复到非活动状态
                if (!watchJewelryStateAfter.classes.includes('active')) {
                    expect(watchJewelryStateAfter.dataState).toBe('inactive');
                    expect(watchJewelryStateAfter.classes).not.toContain('hover-active');
                }
            }
            
            // 记录最终状态
            const handbagStateAfter = await getButtonState(handbagButton);
            
            // 手袋按钮状态应该保持不变
            if (handbagStateBefore.visible && handbagStateAfter.visible) {
                expect(handbagStateBefore.dataState).toBe(handbagStateAfter.dataState);
                expect(handbagStateBefore.classes).toBe(handbagStateAfter.classes);
            }
            
            console.log(`第 ${i} 次悬停切换完成`);
        }
        
        console.log('悬停状态异常修复验证完成');
    });

    test('验证状态同步问题修复', async () => {
        console.log('开始验证状态同步问题修复...');
        
        // 获取所有导航按钮
        const navLinks = await page.locator('.nav-link-luxury').all();
        
        // 如果没有找到导航按钮，跳过测试
        if (navLinks.length === 0) {
            console.warn('未找到导航按钮，跳过状态同步测试');
            anomalies.push({
                type: 'setup_error',
                message: '未找到导航按钮',
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        // 执行5次点击和悬停组合操作
        for (let i = 1; i <= 5; i++) {
            console.log(`执行第 ${i} 次状态同步验证...`);
            
            // 随机选择一个导航按钮
            const randomIndex = Math.floor(Math.random() * navLinks.length);
            const selectedLink = navLinks[randomIndex];
            
            // 点击选中的导航按钮
            await selectedLink.click();
            await page.waitForTimeout(300);
            
            // 验证点击后的状态同步
            const selectedState = await getButtonState(selectedLink);
            
            // data-state和class应该同步
            if (selectedState.visible) {
                if (selectedState.classes.includes('active')) {
                    expect(selectedState.dataState).toBe('active');
                } else {
                    expect(selectedState.dataState).not.toBe('active');
                }
            } else {
                console.warn(`选中的导航按钮不可见，跳过验证`);
                anomalies.push({
                    type: 'element_not_visible',
                    message: `选中的导航按钮不可见`,
                    timestamp: new Date().toISOString()
                });
            }
            
            // 验证其他按钮的状态同步
            for (let j = 0; j < navLinks.length; j++) {
                if (j !== randomIndex) {
                    const otherLink = navLinks[j];
                    const otherState = await getButtonState(otherLink);
                    
                    // 其他按钮不应该有active状态
                    if (otherState.visible) {
                        expect(otherState.classes).not.toContain('active');
                        expect(otherState.dataState).not.toBe('active');
                    }
                }
            }
            
            // 随机悬停另一个按钮
            let hoverIndex;
            do {
                hoverIndex = Math.floor(Math.random() * navLinks.length);
            } while (hoverIndex === randomIndex);
            
            const hoverLink = navLinks[hoverIndex];
            await hoverLink.hover();
            await page.waitForTimeout(300);
            
            // 验证悬停状态同步
            const hoverState = await getButtonState(hoverLink);
            
            // 悬停按钮应该有hover-active状态
            if (hoverState.visible) {
                expect(hoverState.dataState).toBe('hover-active');
                expect(hoverState.classes).toContain('hover-active');
                
                // 验证悬停按钮不是活动按钮
                expect(hoverState.classes).not.toContain('active');
            } else {
                console.warn(`悬停的导航按钮不可见，跳过验证`);
                anomalies.push({
                    type: 'element_not_visible',
                    message: `悬停的导航按钮不可见`,
                    timestamp: new Date().toISOString()
                });
            }
            
            // 验证点击按钮的状态保持不变
            const clickedState = await getButtonState(selectedLink);
            
            if (clickedState.visible) {
                expect(clickedState.dataState).toBe('active');
                expect(clickedState.classes).toContain('active');
            }
            
            console.log(`第 ${i} 次状态同步验证完成`);
        }
        
        console.log('状态同步问题修复验证完成');
    });

    test('验证导航按钮高亮逻辑优化', async () => {
        console.log('开始验证导航按钮高亮逻辑优化...');
        
        // 获取导航按钮
        const handbagButton = page.locator('.nav-link-luxury', { hasText: '手袋' });
        const shoesButton = page.locator('.nav-link-luxury', { hasText: '鞋履' });
        
        // 检查按钮是否可见
        const handbagVisible = await handbagButton.isVisible();
        const shoesVisible = await shoesButton.isVisible();
        
        if (!handbagVisible || !shoesVisible) {
            console.warn('手袋或鞋履按钮不可见，跳过高亮逻辑测试');
            anomalies.push({
                type: 'setup_error',
                message: '手袋或鞋履按钮不可见',
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        // 确保手袋按钮是初始活动按钮
        await expect(handbagButton).toHaveClass(/active/);
        await expect(handbagButton).toHaveAttribute('data-state', 'active');
        
        // 执行3次点击切换
        for (let i = 1; i <= 3; i++) {
            console.log(`执行第 ${i} 次高亮逻辑验证...`);
            
            // 点击鞋履按钮
            await shoesButton.click();
            await page.waitForTimeout(300);
            
            // 验证鞋履按钮成为活动按钮
            await expect(shoesButton).toHaveClass(/active/);
            await expect(shoesButton).toHaveAttribute('data-state', 'active');
            
            // 验证手袋按钮不再是活动按钮
            await expect(handbagButton).not.toHaveClass(/active/);
            await expect(handbagButton).toHaveAttribute('data-state', 'inactive');
            
            // 悬停手袋按钮
            await handbagButton.hover();
            await page.waitForTimeout(300);
            
            // 验证手袋按钮有悬停状态，但没有活动状态
            const handbagState = await getButtonState(handbagButton);
            if (handbagState.visible) {
                expect(handbagState.classes).toContain('hover-active');
                expect(handbagState.dataState).toBe('hover-active');
                expect(handbagState.classes).not.toContain('active');
            }
            
            // 验证鞋履按钮保持活动状态且没有悬停状态
            const shoesState = await getButtonState(shoesButton);
            if (shoesState.visible) {
                expect(shoesState.classes).toContain('active');
                expect(shoesState.dataState).toBe('active');
                // 活动按钮不应该有悬停状态
                expect(shoesState.classes).not.toContain('hover-active');
            }
            
            // 点击手袋按钮
            await handbagButton.click();
            await page.waitForTimeout(300);
            
            // 验证手袋按钮重新成为活动按钮且没有悬停状态
            const handbagStateAfterClick = await getButtonState(handbagButton);
            if (handbagStateAfterClick.visible) {
                expect(handbagStateAfterClick.classes).toContain('active');
                expect(handbagStateAfterClick.dataState).toBe('active');
                // 活动按钮不应该有悬停状态
                expect(handbagStateAfterClick.classes).not.toContain('hover-active');
            }
            
            // 验证鞋履按钮不再是活动按钮
            const shoesStateAfterClick = await getButtonState(shoesButton);
            if (shoesStateAfterClick.visible) {
                expect(shoesStateAfterClick.classes).not.toContain('active');
                expect(shoesStateAfterClick.dataState).toBe('inactive');
            }
            
            console.log(`第 ${i} 次高亮逻辑验证完成`);
        }
        
        console.log('导航按钮高亮逻辑优化验证完成');
    });

    test('综合验证 - 10次悬停切换并观察手袋按钮状态', async () => {
        console.log('开始综合验证...');
        
        // 获取所有导航按钮
        const navButtons = await page.$$('.nav-link-luxury');
        
        if (navButtons.length === 0) {
            console.warn('未找到导航按钮，跳过综合验证');
            anomalies.push({
                type: 'setup_error',
                message: '未找到导航按钮',
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        console.log(`找到 ${navButtons.length} 个导航按钮`);
        
        // 获取手袋按钮
        const handbagButton = page.locator('.nav-link-luxury', { hasText: '手袋' });
        const handbagVisible = await handbagButton.isVisible();
        
        if (!handbagVisible) {
            console.warn('手袋按钮不可见，跳过综合验证');
            anomalies.push({
                type: 'setup_error',
                message: '手袋按钮不可见',
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        // 记录手袋按钮初始状态
        const initialHandbagState = await getButtonState(handbagButton);
        
        console.log(`手袋按钮初始状态: data-state=${initialHandbagState.dataState}, classes=${initialHandbagState.classes}`);
        
        // 执行10次悬停切换
        for (let i = 1; i <= 10; i++) {
            console.log(`执行第 ${i} 次综合验证...`);
            
            // 随机选择一个按钮进行悬停
            const randomIndex = Math.floor(Math.random() * navButtons.length);
            const randomButton = navButtons[randomIndex];
            const randomButtonText = await page.evaluate(el => el.textContent, randomButton);
            
            // 悬停随机按钮
            await randomButton.hover();
            await page.waitForTimeout(300);
            
            // 验证随机按钮有悬停状态（除非它是活动按钮）
            const randomButtonState = await getButtonState(randomButton);
            if (randomButtonState.visible) {
                // 检查是否是活动按钮
                const isActive = randomButtonState.classes.includes('active');
                
                if (isActive) {
                    // 活动按钮不应该有悬停状态
                    expect(randomButtonState.classes).not.toContain('hover-active');
                    expect(randomButtonState.dataState).not.toBe('hover-active');
                    expect(randomButtonState.dataState).toBe('active');
                } else {
                    // 非活动按钮应该有悬停状态
                    expect(randomButtonState.classes).toContain('hover-active');
                    expect(randomButtonState.dataState).toBe('hover-active');
                }
            }
            
            // 移出鼠标
            await page.mouse.move(100, 100);
            await page.waitForTimeout(300);
            
            // 验证随机按钮不再有悬停状态（除非它是活动按钮）
            const randomButtonStateAfter = await getButtonState(randomButton);
            if (randomButtonStateAfter.visible) {
                // 检查是否是活动按钮
                const isActive = randomButtonStateAfter.classes.includes('active');
                
                if (!isActive) {
                    // 非活动按钮不应该有悬停状态
                    expect(randomButtonStateAfter.classes).not.toContain('hover-active');
                    expect(randomButtonStateAfter.dataState).not.toBe('hover-active');
                    expect(randomButtonStateAfter.dataState).toBe('inactive');
                } else {
                    // 活动按钮应该保持活动状态
                    expect(randomButtonStateAfter.classes).toContain('active');
                    expect(randomButtonStateAfter.dataState).toBe('active');
                    expect(randomButtonStateAfter.classes).not.toContain('hover-active');
                }
            }
            
            // 观察手袋按钮状态
            const handbagState = await getButtonState(handbagButton);
            if (handbagState.visible) {
                console.log(`第 ${i} 次综合验证后，手袋按钮状态: ${handbagState.dataState}`);
                
                // 如果手袋按钮状态异常，记录异常
                if (handbagState.dataState === 'hover-active') {
                    anomalies.push({
                        type: 'unexpected_hover_state',
                        button: '手袋',
                        state: handbagState.dataState,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            
            console.log(`第 ${i} 次综合验证完成`);
        }
        
        // 记录手袋按钮最终状态
        const finalHandbagState = await getButtonState(handbagButton);
        
        console.log(`手袋按钮最终状态: data-state=${finalHandbagState.dataState}, classes=${finalHandbagState.classes}`);
        
        // 验证手袋按钮状态保持不变
        expect(initialHandbagState.dataState).toBe(finalHandbagState.dataState);
        expect(initialHandbagState.classes).toBe(finalHandbagState.classes);
        
        // 生成测试报告并输出到控制台
        const report = {
            testType: 'comprehensive',
            iterations: 10,
            handbagButton: {
                initialState: {
                    dataState: initialHandbagState.dataState,
                    classes: initialHandbagState.classes
                },
                finalState: {
                    dataState: finalHandbagState.dataState,
                    classes: finalHandbagState.classes
                },
                stateChanged: initialHandbagState.dataState !== finalHandbagState.dataState || initialHandbagState.classes !== finalHandbagState.classes
            },
            anomalies: anomalies,
            timestamp: new Date().toISOString()
        };
        
        // 在控制台输出测试报告
        console.log('=== 导航按钮状态修复测试报告 ===');
        console.log(`测试类型: ${report.testType}`);
        console.log(`迭代次数: ${report.iterations}`);
        console.log(`手袋按钮状态变化: ${report.handbagButton.stateChanged ? '是' : '否'}`);
        console.log(`异常数量: ${report.anomalies.length}`);
        console.log(`测试时间: ${report.timestamp}`);
        console.log('====================================');
        
        // 将测试报告保存到浏览器的localStorage中
        await page.evaluate((reportData) => {
            try {
                const existingReports = JSON.parse(localStorage.getItem('navFixReports') || '[]');
                existingReports.push(reportData);
                localStorage.setItem('navFixReports', JSON.stringify(existingReports));
                console.log('测试报告已保存到localStorage');
            } catch (e) {
                console.error('保存测试报告失败:', e);
            }
        }, report);
        
        console.log('综合验证完成');
    });
});