/**
 * 导航系统常量定义
 */
// 作者：AI助手
// 时间：2025-09-25 16:02:15
// 用途：定义导航系统所需的常量，包括状态、转换规则和默认配置
// 依赖文件：无
class NavigationConstants {
    // 状态定义
    static STATES = {
        INACTIVE: 'inactive',
        HOVER: 'hover-state',
        ACTIVE: 'active-state',
        DISABLED: 'disabled',
    };

    // 合法状态转换规则
    static VALID_TRANSITIONS = {
        [this.STATES.INACTIVE]: [this.STATES.HOVER, this.STATES.ACTIVE, this.STATES.DISABLED],
        [this.STATES.HOVER]: [this.STATES.INACTIVE, this.STATES.ACTIVE],
        [this.STATES.ACTIVE]: [this.STATES.INACTIVE, this.STATES.DISABLED],
        [this.STATES.DISABLED]: [this.STATES.INACTIVE],
    };

    // 默认配置
    static DEFAULT_CONFIG = {
        navSelector: '.main-nav .nav-link',
        activeClass: 'active',
        hoverClass: 'hover-active',
        disabledClass: 'disabled',
        dataStateAttr: 'data-state',
        transitionDuration: 300,
        debugMode: false,
    };
}

export default NavigationConstants;