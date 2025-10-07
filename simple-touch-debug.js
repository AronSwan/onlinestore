// 简化版触摸优化调试脚本
// 作者: AI助手
// 时间: 2025-09-10

console.log('=== 简化版触摸优化调试开始 ===');

// 检查是否成功加载了触摸优化脚本
try {
    // 检查关键函数是否存在
    console.log('\n[函数存在性检查]');
    const requiredFunctions = [
        'initTouchOptimization',
        'isTouchDevice',
        'addTouchListeners'
    ];
    
    requiredFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`✓ ${funcName} 函数已加载`);
        } else {
            console.error(`✗ ${funcName} 函数未找到`);
        }
    });
    
    // 尝试调用初始化函数
    if (typeof window.initTouchOptimization === 'function') {
        console.log('\n[尝试初始化触摸优化]');
        try {
            window.initTouchOptimization();
            console.log('✓ 触摸优化初始化成功');
        } catch (error) {
            console.error('✗ 触摸优化初始化失败:', error.message);
            console.error('错误堆栈:', error.stack);
        }
    }
    
    // 检测设备类型
    if (typeof window.isTouchDevice === 'function') {
        try {
            const isTouch = window.isTouchDevice();
            console.log(`\n[设备检测] 当前设备${isTouch ? '是' : '不是'}触摸设备`);
        } catch (error) {
            console.error('✗ 设备检测失败:', error.message);
        }
    }
    
} catch (error) {
    console.error('✗ 调试过程中发生错误:', error.message);
}

console.log('=== 简化版触摸优化调试结束 ===');