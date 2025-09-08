# 仓库速览报告
生成时间: 2025-09-08 19:13:00

## 项目统计
- 总文件数: 10320
- JavaScript/TypeScript文件: 6720
- CSS样式文件: 17
- HTML文件: 79
- AI生成代码块: 9

## 项目依赖信息
- 项目名称: caddy-style-shopping-site
- 版本: 1.0.0
- 描述: Modern e-commerce site with performance optimization and code quality tools
- 主要依赖数量: 0
- 开发依赖数量: 1 1 1 1 1 1 1 1 1

## 项目结构
`
卷 Data 的文件夹 PATH 列表
卷序列号为 D8DC-E56C
D:.
|   .eslintrc.js
|   .gitignore
|   .prettierrc
|   architecture.md
|   babel.config.js
|   debug-uniqueness.js
|   DEPLOYMENT.md
|   index.html
|   LICENSE
|   manifest.json
|   offline.html
|   package-lock.json
|   package.json
|   README.md
|   refactor-feasibility-assessment.md
|   refactor-plan.md
|   refactor-report.md
|   run-tests.cjs
|   sw.js
|   test_package.json
|   tool-compatibility-check.ps1
|   validate-refactor-rules.ps1
|   
+---.refactor
|       ai-blocks.csv
|       ai-blocks.txt
|       ai-hallucination-report.md
|       ai-impact-report.md
|       ai-smell-suggestions.json
|       audit-final-report.md
|       auth-manager-refactor-plan.md
|       auto-critical.csv
|       code-analyzer-refactor-plan.md
|       code-smell-analysis.md
|       commit-hook.ps1
|       critical-issues-report.md
|       css-security-issues.txt
|       dependencies-list.txt
|       dependency-notice.md
|       dependency-vuln.md
|       deployment-security.md
|       dynamic-analysis-report.md
|       env-check.json
|       env-check.log
|       environment-check.md
|       eslint-analysis.json
|       eslint-report.json
|       executive-summary.md
|       gate.md
|       generate-report.ps1
|       health-check.txt
|       homepage-analysis.md
|       html-security-issues.txt
|       js-security-issues.txt
|       license-check.txt
|       memory-leak-scan.txt
|       passport.json
|       performance-test.txt
|       project-files.csv
|       repo-overview.md
|       repo-structure.txt
|       rollback.ps1
|       sbom-report.md
|       security-scan.txt
|       sensitive-data-check.log
|       server-info.json
|       server-pid.txt
|       shopping-cart-proxy-removal-plan.md
|       simple-report.html
|       smell.md
|       solid-dry-analysis.md
|       static-analysis-report.md
|       syntax-validation.log
|       tech-debt-dashboard.md
|       tool-compatibility-check.ps1
|       tool-compatibility.log
|       tool-install.log
|       vulnerability-scan.txt
|       
+---assets
+---components
+---config
+---coverage
|   |   clover.xml
|   |   coverage-final.json
|   |   lcov.info
|   |   
|   \---lcov-report
|       |   base.css
|       |   block-navigation.js
|       |   favicon.png
|       |   index.html
|       |   prettify.css
|       |   prettify.js
|       |   sort-arrow-sprite.png
|       |   sorter.js
|       |   
|       \---js
|           |   animation-utils.js.html
|           |   auth-ui.js.html
|           |   auth.js.html
|           |   cart.js.html
|           |   click-effects.js.html
|           |   code-analyzer.js.html
|           |   CodeAnalyzer.js.html
|           |   config.js.html
|           |   constants.js.html
|           |   dependency-injection.js.html
|           |   di-container.js.html
|           |   error-handler.js.html
|           |   error-utils.js.html
|           |   image-optimization.js.html
|           |   index.html
|           |   input-validator.js.html
|           |   lazy-loader.js.html
|           |   order-ui.js.html
|           |   order.js.html
|           |   password-security.js.html
|           |   payment-ui.js.html
|           |   payment.js.html
|           |   performance-dashboard.js.html
|           |   performance-monitor.js.html
|           |   performance-optimizer.js.html
|           |   product-card.js.html
|           |   selectors-config.js.html
|           |   uniqueness-checker.js.html
|           |   utils.js.html
|           |   
|           +---analyzers
|           |       AnalysisCache.js.html
|           |       ASTAnalyzer.js.html
|           |       BasicAnalyzer.js.html
|           |       ComplexityAnalyzer.js.html
|           |       FileParser.js.html
|           |       index.html
|           |       ProjectAnalyzer.js.html
|           |       QualityAnalyzer.js.html
|           |       ReportGenerator.js.html
|           |       
|           +---auth
|           |   |   api-integration.js.html
|           |   |   auth-manager.js.html
|           |   |   AuthManager.js.html
|           |   |   error-manager.js.html
|           |   |   http-client.js.html
|           |   |   index.html
|           |   |   input-validator.js.html
|           |   |   password-security.js.html
|           |   |   performance-monitor.js.html
|           |   |   registration-event-integration.js.html
|           |   |   registration-manager.js.html
|           |   |   registration-resilience.js.html
|           |   |   security-manager.js.html
|           |   |   session-management.js.html
|           |   |   storage-manager.js.html
|           |   |   ui-interaction.js.html
|           |   |   
|           |   +---api
|           |   |       AuthAPI.js.html
|           |   |       index.html
|           |   |       
|           |   +---core
|           |   |       index.html
|           |   |       SessionManager.js.html
|           |   |       
|           |   +---security
|           |   |       index.html
|           |   |       PasswordSecurity.js.html
|           |   |       
|           |   \---ui
|           |           AuthUI.js.html
|           |           index.html
|           |           
|           \---config
|                   APIConfig.js.html
|                   CodeAnalysisConfig.js.html
|                   DebugConfig.js.html
|                   EventDelegationConfig.js.html
|                   ImageOptimizationConfig.js.html
|                   index.html
|                   LazyLoaderConfig.js.html
|                   NotificationConfig.js.html
|                   PerformanceConfig.js.html
|                   ShoppingCartConfig.js.html
|                   
+---css
|   |   auth.css
|   |   click-effects.css
|   |   error-handler.css
|   |   main.css
|   |   order.css
|   |   payment.css
|   |   style.css
|   |   
|   +---components
|   |       buttons.css
|   |       forms.css
|   |       
|   \---variables
|           colors.css
|           spacing.css
|           typography.css
|           
+---docs
|       deployment.md
|       
+---i18n
+---js
|   |   animation-utils.js
|   |   auth-ui.js
|   |   auth.js
|   |   cart.js
|   |   click-effects.js
|   |   code-analyzer.js
|   |   CodeAnalyzer.js
|   |   config.js
|   |   constants.js
|   |   dependency-injection.js
|   |   di-container.js
|   |   error-handler.js
|   |   error-utils.js
|   |   image-optimization.js
|   |   input-validator.js
|   |   lazy-loader.js
|   |   order-ui.js
|   |   order.js
|   |   password-security.js
|   |   payment-ui.js
|   |   payment.js
|   |   performance-dashboard.js
|   |   performance-monitor.js
|   |   performance-optimizer.js
|   |   product-card.js
|   |   selectors-config.js
|   |   uniqueness-checker.js
|   |   utils.js
|   |   
|   +---analyzers
|   |       AnalysisCache.js
|   |       ASTAnalyzer.js
|   |       BasicAnalyzer.js
|   |       ComplexityAnalyzer.js
|   |       FileParser.js
|   |       ProjectAnalyzer.js
|   |       QualityAnalyzer.js
|   |       ReportGenerator.js
|   |       
|   +---auth
|   |   |   api-integration.js
|   |   |   auth-manager.js
|   |   |   AuthManager.js
|   |   |   error-manager.js
|   |   |   http-client.js
|   |   |   input-validator.js
|   |   |   password-security.js
|   |   |   performance-monitor.js
|   |   |   registration-event-integration.js
|   |   |   registration-manager.js
|   |   |   registration-resilience.js
|   |   |   security-manager.js
|   |   |   session-management.js
|   |   |   storage-manager.js
|   |   |   ui-interaction.js
|   |   |   
|   |   +---api
|   |   |       AuthAPI.js
|   |   |       
|   |   +---core
|   |   |       SessionManager.js
|   |   |       
|   |   +---security
|   |   |       PasswordSecurity.js
|   |   |       
|   |   \---ui
|   |           AuthUI.js
|   |           
|   +---config
|   |       APIConfig.js
|   |       CodeAnalysisConfig.js
|   |       DebugConfig.js
|   |       EventDelegationConfig.js
|   |       ImageOptimizationConfig.js
|   |       LazyLoaderConfig.js
|   |       NotificationConfig.js
|   |       PerformanceConfig.js
|   |       ShoppingCartConfig.js
|   |       
|   +---core
|   \---modules
+---node_modules
|   |   .package-lock.json
|   |   
|   +---.bin
|   |       acorn
|   |       acorn.cmd
|   |       acorn.ps1
|   |       browserslist
|   |       browserslist.cmd
|   |       browserslist.ps1
|   |       create-jest
|   |       create-jest.cmd
|   |       create-jest.ps1
|   |       escodegen
|   |       escodegen.cmd
|   |       escodegen.ps1
|   |       esgenerate
|   |       esgenerate.cmd
|   |       esgenerate.ps1
|   |       eslint
|   |       eslint.cmd
|   |       eslint.ps1
|   |       esparse
|   |       esparse.cmd
|   |       esparse.ps1
|   |       esvalidate
|   |       esvalidate.cmd
|   |       esvalidate.ps1
|   |       import-local-fixture
|   |       import-local-fixture.cmd
|   |       import-local-fixture.ps1
|   |       jest
|   |       jest.cmd
|   |       jest.ps1
|   |       js-yaml
|   |       js-yaml.cmd
|   |       js-yaml.ps1
|   |       jsesc
|   |       jsesc.cmd
|   |       jsesc.ps1
|   |       json5
|   |       json5.cmd
|   |       json5.ps1
|   |       node-gyp-build
|   |       node-gyp-build-optional
|   |       node-gyp-build-optional.cmd
|   |       node-gyp-build-optional.ps1
|   |       node-gyp-build-test
|   |       node-gyp-build-test.cmd
|   |       node-gyp-build-test.ps1
|   |       node-gyp-build.cmd
|   |       node-gyp-build.ps1
|   |       node-which
|   |       node-which.cmd
|   |       node-which.ps1
|   |       parser
|   |       parser.cmd
|   |       parser.ps1
|   |       prettier
|   |       prettier.cmd
|   |       prettier.ps1
|   |       regjsparser
|   |       regjsparser.cmd
|   |       regjsparser.ps1
|   |       resolve
|   |       resolve.cmd
|   |       resolve.ps1
|   |       rimraf
|   |       rimraf.cmd
|   |       rimraf.ps1
|   |       semver
|   |       semver.cmd
|   |       semver.ps1
|   |       tldts
|   |       tldts.cmd
|   |       tldts.ps1
|   |       update-browserslist-db
|   |       update-browserslist-db.cmd
|   |       update-browserslist-db.ps1
|   |       
|   +---@asamuzakjp
|   |   \---css-color
|   |       |   LICENSE
|   |       |   package.json
|   |       |   README.md
|   |       |   
|   |       +---dist
|   |       |   +---browser
|   |       |   |       css-color.min.js
|   |       |   |       css-color.min.js.map
|   |       |   |       
|   |       |   +---cjs
|   |       |   |       index.cjs
|   |       |   |       index.cjs.map
|   |       |   |       index.d.cts
|   |       |   |       
|   |       |   \---esm
|   |       |       |   index.d.ts
|   |       |       |   index.js
|   |       |       |   index.js.map
|   |       |       |   
|   |       |       \---js
|   |       |               cache.d.ts
|   |       |               cache.js
|   |       |               cache.js.map
|   |       |               color.d.ts
|   |       |               color.js
|   |       |               color.js.map
|   |       |               common.d.ts
|   |       |               common.js
|   |       |               common.js.map
|   |       |               constant.d.ts
|   |       |               constant.js
|   |       |               constant.js.map
|   |       |               convert.d.ts
|   |       |               convert.js
|   |       |               convert.js.map
|   |       |               css-calc.d.ts
|   |       |               css-calc.js
|   |       |               css-calc.js.map
|   |       |               css-gradient.d.ts
|   |       |               css-gradient.js
|   |       |               css-gradient.js.map
|   |       |               css-var.d.ts
|   |       |               css-var.js
|   |       |               css-var.js.map
|   |       |               relative-color.d.ts
|   |       |               relative-color.js
|   |       |               relative-color.js.map
|   |       |               resolve.d.ts
|   |       |               resolve.js
|   |       |               resolve.js.map
|   |       |               typedef.d.ts
|   |       |               util.d.ts
|   |       |               util.js
|   |       |               util.js.map
|   |       |               
|   |       +---node_modules
|   |       |   \---lru-cache
|   |       |       |   LICENSE
|   |       |       |   package.json
|   |       |       |   README.md
|   |       |       |   
|   |       |       \---dist
|   |       |           +---commonjs
|   |       |           |       index.d.ts
|   |       |           |       index.d.ts.map
|   |       |           |       index.js
|   |       |           |       index.js.map
|   |       |           |       index.min.js
|   |       |           |       index.min.js.map
|   |       |           |       package.json
|   |       |           |       
|   |       |           \---esm
|   |       |                   index.d.ts
|   |       |                   index.d.ts.map
|   |       |                   index.js
|   |       |                   index.js.map
|   |       |                   index.min.js
|   |       |                   index.min.js.map
|   |       |                   package.json
|   |       |                   
|   |       \---src
|   |           |   index.ts
|   |           |   
|   |           \---js
|   |                   cache.ts
|   |                   color.ts
|   |                   common.ts
|   |                   constant.ts
|   |                   convert.ts
|   |                   css-calc.ts
|   |                   css-gradient.ts
|   |                   css-var.ts
|   |                   relative-color.ts
|   |                   resolve.ts
|   |                   typedef.ts
|   |                   util.ts
|   |                   
|   +---@babel
|   |   +---code-frame
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---compat-data
|   |   |   |   corejs2-built-ins.js
|   |   |   |   corejs3-shipped-proposals.js
|   |   |   |   LICENSE
|   |   |   |   native-modules.js
|   |   |   |   overlapping-plugins.js
|   |   |   |   package.json
|   |   |   |   plugin-bugfixes.js
|   |   |   |   plugins.js
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---data
|   |   |           corejs2-built-ins.json
|   |   |           corejs3-shipped-proposals.json
|   |   |           native-modules.json
|   |   |           overlapping-plugins.json
|   |   |           plugin-bugfixes.json
|   |   |           plugins.json
|   |   |           
|   |   +---core
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   +---lib
|   |   |   |   |   index.js
|   |   |   |   |   index.js.map
|   |   |   |   |   parse.js
|   |   |   |   |   parse.js.map
|   |   |   |   |   transform-ast.js
|   |   |   |   |   transform-ast.js.map
|   |   |   |   |   transform-file-browser.js
|   |   |   |   |   transform-file-browser.js.map
|   |   |   |   |   transform-file.js
|   |   |   |   |   transform-file.js.map
|   |   |   |   |   transform.js
|   |   |   |   |   transform.js.map
|   |   |   |   |   
|   |   |   |   +---config
|   |   |   |   |   |   cache-contexts.js
|   |   |   |   |   |   cache-contexts.js.map
|   |   |   |   |   |   caching.js
|   |   |   |   |   |   caching.js.map
|   |   |   |   |   |   config-chain.js
|   |   |   |   |   |   config-chain.js.map
|   |   |   |   |   |   config-descriptors.js
|   |   |   |   |   |   config-descriptors.js.map
|   |   |   |   |   |   full.js
|   |   |   |   |   |   full.js.map
|   |   |   |   |   |   index.js
|   |   |   |   |   |   index.js.map
|   |   |   |   |   |   item.js
|   |   |   |   |   |   item.js.map
|   |   |   |   |   |   partial.js
|   |   |   |   |   |   partial.js.map
|   |   |   |   |   |   pattern-to-regex.js
|   |   |   |   |   |   pattern-to-regex.js.map
|   |   |   |   |   |   plugin.js
|   |   |   |   |   |   plugin.js.map
|   |   |   |   |   |   printer.js
|   |   |   |   |   |   printer.js.map
|   |   |   |   |   |   resolve-targets-browser.js
|   |   |   |   |   |   resolve-targets-browser.js.map
|   |   |   |   |   |   resolve-targets.js
|   |   |   |   |   |   resolve-targets.js.map
|   |   |   |   |   |   util.js
|   |   |   |   |   |   util.js.map
|   |   |   |   |   |   
|   |   |   |   |   +---files
|   |   |   |   |   |       configuration.js
|   |   |   |   |   |       configuration.js.map
|   |   |   |   |   |       import.cjs
|   |   |   |   |   |       import.cjs.map
|   |   |   |   |   |       index-browser.js
|   |   |   |   |   |       index-browser.js.map
|   |   |   |   |   |       index.js
|   |   |   |   |   |       index.js.map
|   |   |   |   |   |       module-types.js
|   |   |   |   |   |       module-types.js.map
|   |   |   |   |   |       package.js
|   |   |   |   |   |       package.js.map
|   |   |   |   |   |       plugins.js
|   |   |   |   |   |       plugins.js.map
|   |   |   |   |   |       types.js
|   |   |   |   |   |       types.js.map
|   |   |   |   |   |       utils.js
|   |   |   |   |   |       utils.js.map
|   |   |   |   |   |       
|   |   |   |   |   +---helpers
|   |   |   |   |   |       config-api.js
|   |   |   |   |   |       config-api.js.map
|   |   |   |   |   |       deep-array.js
|   |   |   |   |   |       deep-array.js.map
|   |   |   |   |   |       environment.js
|   |   |   |   |   |       environment.js.map
|   |   |   |   |   |       
|   |   |   |   |   \---validation
|   |   |   |   |           option-assertions.js
|   |   |   |   |           option-assertions.js.map
|   |   |   |   |           options.js
|   |   |   |   |           options.js.map
|   |   |   |   |           plugins.js
|   |   |   |   |           plugins.js.map
|   |   |   |   |           removed.js
|   |   |   |   |           removed.js.map
|   |   |   |   |           
|   |   |   |   +---errors
|   |   |   |   |       config-error.js
|   |   |   |   |       config-error.js.map
|   |   |   |   |       rewrite-stack-trace.js
|   |   |   |   |       rewrite-stack-trace.js.map
|   |   |   |   |       
|   |   |   |   +---gensync-utils
|   |   |   |   |       async.js
|   |   |   |   |       async.js.map
|   |   |   |   |       fs.js
|   |   |   |   |       fs.js.map
|   |   |   |   |       functional.js
|   |   |   |   |       functional.js.map
|   |   |   |   |       
|   |   |   |   +---parser
|   |   |   |   |   |   index.js
|   |   |   |   |   |   index.js.map
|   |   |   |   |   |   
|   |   |   |   |   \---util
|   |   |   |   |           missing-plugin-helper.js
|   |   |   |   |           missing-plugin-helper.js.map
|   |   |   |   |           
|   |   |   |   +---tools
|   |   |   |   |       build-external-helpers.js
|   |   |   |   |       build-external-helpers.js.map
|   |   |   |   |       
|   |   |   |   +---transformation
|   |   |   |   |   |   block-hoist-plugin.js
|   |   |   |   |   |   block-hoist-plugin.js.map
|   |   |   |   |   |   index.js
|   |   |   |   |   |   index.js.map
|   |   |   |   |   |   normalize-file.js
|   |   |   |   |   |   normalize-file.js.map
|   |   |   |   |   |   normalize-opts.js
|   |   |   |   |   |   normalize-opts.js.map
|   |   |   |   |   |   plugin-pass.js
|   |   |   |   |   |   plugin-pass.js.map
|   |   |   |   |   |   
|   |   |   |   |   +---file
|   |   |   |   |   |       babel-7-helpers.cjs
|   |   |   |   |   |       babel-7-helpers.cjs.map
|   |   |   |   |   |       file.js
|   |   |   |   |   |       file.js.map
|   |   |   |   |   |       generate.js
|   |   |   |   |   |       generate.js.map
|   |   |   |   |   |       merge-map.js
|   |   |   |   |   |       merge-map.js.map
|   |   |   |   |   |       
|   |   |   |   |   \---util
|   |   |   |   |           clone-deep.js
|   |   |   |   |           clone-deep.js.map
|   |   |   |   |           
|   |   |   |   \---vendor
|   |   |   |           import-meta-resolve.js
|   |   |   |           import-meta-resolve.js.map
|   |   |   |           
|   |   |   \---src
|   |   |       |   transform-file-browser.ts
|   |   |       |   transform-file.ts
|   |   |       |   
|   |   |       \---config
|   |   |           |   resolve-targets-browser.ts
|   |   |           |   resolve-targets.ts
|   |   |           |   
|   |   |           \---files
|   |   |                   index-browser.ts
|   |   |                   index.ts
|   |   |                   
|   |   +---generator
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |       |   buffer.js
|   |   |       |   buffer.js.map
|   |   |       |   index.js
|   |   |       |   index.js.map
|   |   |       |   printer.js
|   |   |       |   printer.js.map
|   |   |       |   source-map.js
|   |   |       |   source-map.js.map
|   |   |       |   token-map.js
|   |   |       |   token-map.js.map
|   |   |       |   
|   |   |       +---generators
|   |   |       |       base.js
|   |   |       |       base.js.map
|   |   |       |       classes.js
|   |   |       |       classes.js.map
|   |   |       |       deprecated.js
|   |   |       |       deprecated.js.map
|   |   |       |       expressions.js
|   |   |       |       expressions.js.map
|   |   |       |       flow.js
|   |   |       |       flow.js.map
|   |   |       |       index.js
|   |   |       |       index.js.map
|   |   |       |       jsx.js
|   |   |       |       jsx.js.map
|   |   |       |       methods.js
|   |   |       |       methods.js.map
|   |   |       |       modules.js
|   |   |       |       modules.js.map
|   |   |       |       statements.js
|   |   |       |       statements.js.map
|   |   |       |       template-literals.js
|   |   |       |       template-literals.js.map
|   |   |       |       types.js
|   |   |       |       types.js.map
|   |   |       |       typescript.js
|   |   |       |       typescript.js.map
|   |   |       |       
|   |   |       \---node
|   |   |               index.js
|   |   |               index.js.map
|   |   |               parentheses.js
|   |   |               parentheses.js.map
|   |   |               whitespace.js
|   |   |               whitespace.js.map
|   |   |               
|   |   +---helper-annotate-as-pure
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---helper-compilation-targets
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           debug.js
|   |   |           debug.js.map
|   |   |           filter-items.js
|   |   |           filter-items.js.map
|   |   |           index.js
|   |   |           index.js.map
|   |   |           options.js
|   |   |           options.js.map
|   |   |           pretty.js
|   |   |           pretty.js.map
|   |   |           targets.js
|   |   |           targets.js.map
|   |   |           utils.js
|   |   |           utils.js.map
|   |   |           
|   |   +---helper-create-class-features-plugin
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           decorators-2018-09.js
|   |   |           decorators-2018-09.js.map
|   |   |           decorators.js
|   |   |           decorators.js.map
|   |   |           features.js
|   |   |           features.js.map
|   |   |           fields.js
|   |   |           fields.js.map
|   |   |           index.js
|   |   |           index.js.map
|   |   |           misc.js
|   |   |           misc.js.map
|   |   |           typescript.js
|   |   |           typescript.js.map
|   |   |           
|   |   +---helper-create-regexp-features-plugin
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           features.js
|   |   |           features.js.map
|   |   |           index.js
|   |   |           index.js.map
|   |   |           util.js
|   |   |           util.js.map
|   |   |           
|   |   +---helper-define-polyfill-provider
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   +---esm
|   |   |   |       index.browser.mjs
|   |   |   |       index.browser.mjs.map
|   |   |   |       index.node.mjs
|   |   |   |       index.node.mjs.map
|   |   |   |       
|   |   |   \---lib
|   |   |       |   debug-utils.js
|   |   |       |   define-provider.js
|   |   |       |   imports-injector.js
|   |   |       |   index.js
|   |   |       |   meta-resolver.js
|   |   |       |   normalize-options.js
|   |   |       |   types.js
|   |   |       |   utils.js
|   |   |       |   
|   |   |       +---browser
|   |   |       |       dependencies.js
|   |   |       |       
|   |   |       +---node
|   |   |       |       dependencies.js
|   |   |       |       
|   |   |       \---visitors
|   |   |               entry.js
|   |   |               index.js
|   |   |               usage.js
|   |   |               
|   |   +---helper-globals
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---data
|   |   |           browser-upper.json
|   |   |           builtin-lower.json
|   |   |           builtin-upper.json
|   |   |           
|   |   +---helper-member-expression-to-functions
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---helper-module-imports
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           import-builder.js
|   |   |           import-builder.js.map
|   |   |           import-injector.js
|   |   |           import-injector.js.map
|   |   |           index.js
|   |   |           index.js.map
|   |   |           is-module.js
|   |   |           is-module.js.map
|   |   |           
|   |   +---helper-module-transforms
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           dynamic-import.js
|   |   |           dynamic-import.js.map
|   |   |           get-module-name.js
|   |   |           get-module-name.js.map
|   |   |           index.js
|   |   |           index.js.map
|   |   |           lazy-modules.js
|   |   |           lazy-modules.js.map
|   |   |           normalize-and-load-metadata.js
|   |   |           normalize-and-load-metadata.js.map
|   |   |           rewrite-live-references.js
|   |   |           rewrite-live-references.js.map
|   |   |           rewrite-this.js
|   |   |           rewrite-this.js.map
|   |   |           
|   |   +---helper-optimise-call-expression
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---helper-plugin-utils
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---helper-remap-async-to-generator
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---helper-replace-supers
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---helper-skip-transparent-expression-wrappers
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---helper-string-parser
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---helper-validator-identifier
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           identifier.js
|   |   |           identifier.js.map
|   |   |           index.js
|   |   |           index.js.map
|   |   |           keyword.js
|   |   |           keyword.js.map
|   |   |           
|   |   +---helper-validator-option
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           find-suggestion.js
|   |   |           find-suggestion.js.map
|   |   |           index.js
|   |   |           index.js.map
|   |   |           validator.js
|   |   |           validator.js.map
|   |   |           
|   |   +---helper-wrap-function
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---helpers
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |       |   helpers-generated.js
|   |   |       |   helpers-generated.js.map
|   |   |       |   index.js
|   |   |       |   index.js.map
|   |   |       |   
|   |   |       \---helpers
|   |   |               applyDecoratedDescriptor.js
|   |   |               applyDecoratedDescriptor.js.map
|   |   |               applyDecs.js
|   |   |               applyDecs.js.map
|   |   |               applyDecs2203.js
|   |   |               applyDecs2203.js.map
|   |   |               applyDecs2203R.js
|   |   |               applyDecs2203R.js.map
|   |   |               applyDecs2301.js
|   |   |               applyDecs2301.js.map
|   |   |               applyDecs2305.js
|   |   |               applyDecs2305.js.map
|   |   |               applyDecs2311.js
|   |   |               applyDecs2311.js.map
|   |   |               arrayLikeToArray.js
|   |   |               arrayLikeToArray.js.map
|   |   |               arrayWithHoles.js
|   |   |               arrayWithHoles.js.map
|   |   |               arrayWithoutHoles.js
|   |   |               arrayWithoutHoles.js.map
|   |   |               assertClassBrand.js
|   |   |               assertClassBrand.js.map
|   |   |               assertThisInitialized.js
|   |   |               assertThisInitialized.js.map
|   |   |               asyncGeneratorDelegate.js
|   |   |               asyncGeneratorDelegate.js.map
|   |   |               asyncIterator.js
|   |   |               asyncIterator.js.map
|   |   |               asyncToGenerator.js
|   |   |               asyncToGenerator.js.map
|   |   |               awaitAsyncGenerator.js
|   |   |               awaitAsyncGenerator.js.map
|   |   |               AwaitValue.js
|   |   |               AwaitValue.js.map
|   |   |               callSuper.js
|   |   |               callSuper.js.map
|   |   |               checkInRHS.js
|   |   |               checkInRHS.js.map
|   |   |               checkPrivateRedeclaration.js
|   |   |               checkPrivateRedeclaration.js.map
|   |   |               classApplyDescriptorDestructureSet.js
|   |   |               classApplyDescriptorDestructureSet.js.map
|   |   |               classApplyDescriptorGet.js
|   |   |               classApplyDescriptorGet.js.map
|   |   |               classApplyDescriptorSet.js
|   |   |               classApplyDescriptorSet.js.map
|   |   |               classCallCheck.js
|   |   |               classCallCheck.js.map
|   |   |               classCheckPrivateStaticAccess.js
|   |   |               classCheckPrivateStaticAccess.js.map
|   |   |               classCheckPrivateStaticFieldDescriptor.js
|   |   |               classCheckPrivateStaticFieldDescriptor.js.map
|   |   |               classExtractFieldDescriptor.js
|   |   |               classExtractFieldDescriptor.js.map
|   |   |               classNameTDZError.js
|   |   |               classNameTDZError.js.map
|   |   |               classPrivateFieldDestructureSet.js
|   |   |               classPrivateFieldDestructureSet.js.map
|   |   |               classPrivateFieldGet.js
|   |   |               classPrivateFieldGet.js.map
|   |   |               classPrivateFieldGet2.js
|   |   |               classPrivateFieldGet2.js.map
|   |   |               classPrivateFieldInitSpec.js
|   |   |               classPrivateFieldInitSpec.js.map
|   |   |               classPrivateFieldLooseBase.js
|   |   |               classPrivateFieldLooseBase.js.map
|   |   |               classPrivateFieldLooseKey.js
|   |   |               classPrivateFieldLooseKey.js.map
|   |   |               classPrivateFieldSet.js
|   |   |               classPrivateFieldSet.js.map
|   |   |               classPrivateFieldSet2.js
|   |   |               classPrivateFieldSet2.js.map
|   |   |               classPrivateGetter.js
|   |   |               classPrivateGetter.js.map
|   |   |               classPrivateMethodGet.js
|   |   |               classPrivateMethodGet.js.map
|   |   |               classPrivateMethodInitSpec.js
|   |   |               classPrivateMethodInitSpec.js.map
|   |   |               classPrivateMethodSet.js
|   |   |               classPrivateMethodSet.js.map
|   |   |               classPrivateSetter.js
|   |   |               classPrivateSetter.js.map
|   |   |               classStaticPrivateFieldDestructureSet.js
|   |   |               classStaticPrivateFieldDestructureSet.js.map
|   |   |               classStaticPrivateFieldSpecGet.js
|   |   |               classStaticPrivateFieldSpecGet.js.map
|   |   |               classStaticPrivateFieldSpecSet.js
|   |   |               classStaticPrivateFieldSpecSet.js.map
|   |   |               classStaticPrivateMethodGet.js
|   |   |               classStaticPrivateMethodGet.js.map
|   |   |               classStaticPrivateMethodSet.js
|   |   |               classStaticPrivateMethodSet.js.map
|   |   |               construct.js
|   |   |               construct.js.map
|   |   |               createClass.js
|   |   |               createClass.js.map
|   |   |               createForOfIteratorHelper.js
|   |   |               createForOfIteratorHelper.js.map
|   |   |               createForOfIteratorHelperLoose.js
|   |   |               createForOfIteratorHelperLoose.js.map
|   |   |               createSuper.js
|   |   |               createSuper.js.map
|   |   |               decorate.js
|   |   |               decorate.js.map
|   |   |               defaults.js
|   |   |               defaults.js.map
|   |   |               defineAccessor.js
|   |   |               defineAccessor.js.map
|   |   |               defineEnumerableProperties.js
|   |   |               defineEnumerableProperties.js.map
|   |   |               defineProperty.js
|   |   |               defineProperty.js.map
|   |   |               dispose.js
|   |   |               dispose.js.map
|   |   |               extends.js
|   |   |               extends.js.map
|   |   |               get.js
|   |   |               get.js.map
|   |   |               getPrototypeOf.js
|   |   |               getPrototypeOf.js.map
|   |   |               identity.js
|   |   |               identity.js.map
|   |   |               importDeferProxy.js
|   |   |               importDeferProxy.js.map
|   |   |               inherits.js
|   |   |               inherits.js.map
|   |   |               inheritsLoose.js
|   |   |               inheritsLoose.js.map
|   |   |               initializerDefineProperty.js
|   |   |               initializerDefineProperty.js.map
|   |   |               initializerWarningHelper.js
|   |   |               initializerWarningHelper.js.map
|   |   |               instanceof.js
|   |   |               instanceof.js.map
|   |   |               interopRequireDefault.js
|   |   |               interopRequireDefault.js.map
|   |   |               interopRequireWildcard.js
|   |   |               interopRequireWildcard.js.map
|   |   |               isNativeFunction.js
|   |   |               isNativeFunction.js.map
|   |   |               isNativeReflectConstruct.js
|   |   |               isNativeReflectConstruct.js.map
|   |   |               iterableToArray.js
|   |   |               iterableToArray.js.map
|   |   |               iterableToArrayLimit.js
|   |   |               iterableToArrayLimit.js.map
|   |   |               jsx.js
|   |   |               jsx.js.map
|   |   |               maybeArrayLike.js
|   |   |               maybeArrayLike.js.map
|   |   |               newArrowCheck.js
|   |   |               newArrowCheck.js.map
|   |   |               nonIterableRest.js
|   |   |               nonIterableRest.js.map
|   |   |               nonIterableSpread.js
|   |   |               nonIterableSpread.js.map
|   |   |               nullishReceiverError.js
|   |   |               nullishReceiverError.js.map
|   |   |               objectDestructuringEmpty.js
|   |   |               objectDestructuringEmpty.js.map
|   |   |               objectSpread.js
|   |   |               objectSpread.js.map
|   |   |               objectSpread2.js
|   |   |               objectSpread2.js.map
|   |   |               objectWithoutProperties.js
|   |   |               objectWithoutProperties.js.map
|   |   |               objectWithoutPropertiesLoose.js
|   |   |               objectWithoutPropertiesLoose.js.map
|   |   |               OverloadYield.js
|   |   |               OverloadYield.js.map
|   |   |               possibleConstructorReturn.js
|   |   |               possibleConstructorReturn.js.map
|   |   |               readOnlyError.js
|   |   |               readOnlyError.js.map
|   |   |               regenerator.js
|   |   |               regenerator.js.map
|   |   |               regeneratorAsync.js
|   |   |               regeneratorAsync.js.map
|   |   |               regeneratorAsyncGen.js
|   |   |               regeneratorAsyncGen.js.map
|   |   |               regeneratorAsyncIterator.js
|   |   |               regeneratorAsyncIterator.js.map
|   |   |               regeneratorDefine.js
|   |   |               regeneratorDefine.js.map
|   |   |               regeneratorKeys.js
|   |   |               regeneratorKeys.js.map
|   |   |               regeneratorRuntime.js
|   |   |               regeneratorRuntime.js.map
|   |   |               regeneratorValues.js
|   |   |               regeneratorValues.js.map
|   |   |               set.js
|   |   |               set.js.map
|   |   |               setFunctionName.js
|   |   |               setFunctionName.js.map
|   |   |               setPrototypeOf.js
|   |   |               setPrototypeOf.js.map
|   |   |               skipFirstGeneratorNext.js
|   |   |               skipFirstGeneratorNext.js.map
|   |   |               slicedToArray.js
|   |   |               slicedToArray.js.map
|   |   |               superPropBase.js
|   |   |               superPropBase.js.map
|   |   |               superPropGet.js
|   |   |               superPropGet.js.map
|   |   |               superPropSet.js
|   |   |               superPropSet.js.map
|   |   |               taggedTemplateLiteral.js
|   |   |               taggedTemplateLiteral.js.map
|   |   |               taggedTemplateLiteralLoose.js
|   |   |               taggedTemplateLiteralLoose.js.map
|   |   |               tdz.js
|   |   |               tdz.js.map
|   |   |               temporalRef.js
|   |   |               temporalRef.js.map
|   |   |               temporalUndefined.js
|   |   |               temporalUndefined.js.map
|   |   |               toArray.js
|   |   |               toArray.js.map
|   |   |               toConsumableArray.js
|   |   |               toConsumableArray.js.map
|   |   |               toPrimitive.js
|   |   |               toPrimitive.js.map
|   |   |               toPropertyKey.js
|   |   |               toPropertyKey.js.map
|   |   |               toSetter.js
|   |   |               toSetter.js.map
|   |   |               tsRewriteRelativeImportExtensions.js
|   |   |               tsRewriteRelativeImportExtensions.js.map
|   |   |               typeof.js
|   |   |               typeof.js.map
|   |   |               unsupportedIterableToArray.js
|   |   |               unsupportedIterableToArray.js.map
|   |   |               using.js
|   |   |               using.js.map
|   |   |               usingCtx.js
|   |   |               usingCtx.js.map
|   |   |               wrapAsyncGenerator.js
|   |   |               wrapAsyncGenerator.js.map
|   |   |               wrapNativeSuper.js
|   |   |               wrapNativeSuper.js.map
|   |   |               wrapRegExp.js
|   |   |               wrapRegExp.js.map
|   |   |               writeOnlyError.js
|   |   |               writeOnlyError.js.map
|   |   |               
|   |   +---parser
|   |   |   |   CHANGELOG.md
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   +---bin
|   |   |   |       babel-parser.js
|   |   |   |       
|   |   |   +---lib
|   |   |   |       index.js
|   |   |   |       index.js.map
|   |   |   |       
|   |   |   \---typings
|   |   |           babel-parser.d.ts
|   |   |           
|   |   +---plugin-bugfix-firefox-class-in-computed-class-key
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-bugfix-safari-class-field-initializer-scope
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-bugfix-safari-id-destructuring-collision-in-function-expression
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-bugfix-v8-spread-parameters-in-optional-chaining
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-bugfix-v8-static-class-fields-redefine-readonly
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-proposal-private-property-in-object
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-syntax-async-generators
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           
|   |   +---plugin-syntax-bigint
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           
|   |   +---plugin-syntax-class-properties
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           
|   |   +---plugin-syntax-class-static-block
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           
|   |   +---plugin-syntax-import-assertions
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-syntax-import-attributes
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-syntax-import-meta
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           
|   |   +---plugin-syntax-json-strings
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           
|   |   +---plugin-syntax-jsx
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-syntax-logical-assignment-operators
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           
|   |   +---plugin-syntax-nullish-coalescing-operator
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           
|   |   +---plugin-syntax-numeric-separator
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           
|   |   +---plugin-syntax-object-rest-spread
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           
|   |   +---plugin-syntax-optional-catch-binding
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           
|   |   +---plugin-syntax-optional-chaining
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           
|   |   +---plugin-syntax-private-property-in-object
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           
|   |   +---plugin-syntax-top-level-await
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           
|   |   +---plugin-syntax-typescript
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-syntax-unicode-sets-regex
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           
|   |   +---plugin-transform-arrow-functions
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-async-generator-functions
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           for-await.js
|   |   |           for-await.js.map
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-async-to-generator
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-block-scoped-functions
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-block-scoping
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           annex-B_3_3.js
|   |   |           annex-B_3_3.js.map
|   |   |           index.js
|   |   |           index.js.map
|   |   |           loop.js
|   |   |           loop.js.map
|   |   |           validation.js
|   |   |           validation.js.map
|   |   |           
|   |   +---plugin-transform-class-properties
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-class-static-block
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-classes
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           inline-callSuper-helpers.js
|   |   |           inline-callSuper-helpers.js.map
|   |   |           transformClass.js
|   |   |           transformClass.js.map
|   |   |           
|   |   +---plugin-transform-computed-properties
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-destructuring
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-dotall-regex
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-duplicate-keys
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-duplicate-named-capturing-groups-regex
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-dynamic-import
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-explicit-resource-management
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-exponentiation-operator
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-export-namespace-from
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-for-of
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           no-helper-implementation.js
|   |   |           no-helper-implementation.js.map
|   |   |           
|   |   +---plugin-transform-function-name
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-json-strings
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-literals
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-logical-assignment-operators
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-member-expression-literals
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-modules-amd
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-modules-commonjs
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           dynamic-import.js
|   |   |           dynamic-import.js.map
|   |   |           hooks.js
|   |   |           hooks.js.map
|   |   |           index.js
|   |   |           index.js.map
|   |   |           lazy.js
|   |   |           lazy.js.map
|   |   |           
|   |   +---plugin-transform-modules-systemjs
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-modules-umd
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-named-capturing-groups-regex
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-new-target
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-nullish-coalescing-operator
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-numeric-separator
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-object-rest-spread
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-object-super
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-optional-catch-binding
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-optional-chaining
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-parameters
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           params.js
|   |   |           params.js.map
|   |   |           rest.js
|   |   |           rest.js.map
|   |   |           shadow-utils.js
|   |   |           shadow-utils.js.map
|   |   |           
|   |   +---plugin-transform-private-methods
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-private-property-in-object
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-property-literals
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-regenerator
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |       |   index.js
|   |   |       |   index.js.map
|   |   |       |   
|   |   |       \---regenerator
|   |   |               emit.js
|   |   |               emit.js.map
|   |   |               hoist.js
|   |   |               hoist.js.map
|   |   |               leap.js
|   |   |               leap.js.map
|   |   |               meta.js
|   |   |               meta.js.map
|   |   |               replaceShorthandObjectMethod.js
|   |   |               replaceShorthandObjectMethod.js.map
|   |   |               util.js
|   |   |               util.js.map
|   |   |               visit.js
|   |   |               visit.js.map
|   |   |               
|   |   +---plugin-transform-regexp-modifiers
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-reserved-words
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-shorthand-properties
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-spread
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-sticky-regex
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-template-literals
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-typeof-symbol
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-unicode-escapes
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-unicode-property-regex
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-unicode-regex
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---plugin-transform-unicode-sets-regex
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           index.js
|   |   |           index.js.map
|   |   |           
|   |   +---preset-env
|   |   |   |   CONTRIBUTING.md
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   +---data
|   |   |   |       built-in-modules.js
|   |   |   |       built-in-modules.json.js
|   |   |   |       built-ins.js
|   |   |   |       built-ins.json.js
|   |   |   |       core-js-compat.js
|   |   |   |       corejs2-built-ins.js
|   |   |   |       corejs2-built-ins.json.js
|   |   |   |       package.json
|   |   |   |       plugins.js
|   |   |   |       plugins.json.js
|   |   |   |       shipped-proposals.js
|   |   |   |       unreleased-labels.js
|   |   |   |       
|   |   |   \---lib
|   |   |       |   available-plugins.js
|   |   |       |   available-plugins.js.map
|   |   |       |   debug.js
|   |   |       |   debug.js.map
|   |   |       |   filter-items.js
|   |   |       |   filter-items.js.map
|   |   |       |   index.js
|   |   |       |   index.js.map
|   |   |       |   module-transformations.js
|   |   |       |   module-transformations.js.map
|   |   |       |   normalize-options.js
|   |   |       |   normalize-options.js.map
|   |   |       |   options.js
|   |   |       |   options.js.map
|   |   |       |   plugins-compat-data.js
|   |   |       |   plugins-compat-data.js.map
|   |   |       |   shipped-proposals.js
|   |   |       |   shipped-proposals.js.map
|   |   |       |   targets-parser.js
|   |   |       |   targets-parser.js.map
|   |   |       |   
|   |   |       \---polyfills
|   |   |               babel-7-plugins.cjs
|   |   |               babel-7-plugins.cjs.map
|   |   |               babel-polyfill.cjs
|   |   |               babel-polyfill.cjs.map
|   |   |               regenerator.cjs
|   |   |               regenerator.cjs.map
|   |   |               utils.cjs
|   |   |               utils.cjs.map
|   |   |               
|   |   +---preset-modules
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   +---lib
|   |   |   |   |   index.js
|   |   |   |   |   
|   |   |   |   \---plugins
|   |   |   |       +---transform-async-arrows-in-class
|   |   |   |       |       index.js
|   |   |   |       |       
|   |   |   |       +---transform-edge-default-parameters
|   |   |   |       |       index.js
|   |   |   |       |       
|   |   |   |       +---transform-edge-function-name
|   |   |   |       |       index.js
|   |   |   |       |       
|   |   |   |       +---transform-jsx-spread
|   |   |   |       |       index.js
|   |   |   |       |       
|   |   |   |       +---transform-safari-block-shadowing
|   |   |   |       |       index.js
|   |   |   |       |       
|   |   |   |       +---transform-safari-for-shadowing
|   |   |   |       |       index.js
|   |   |   |       |       
|   |   |   |       \---transform-tagged-template-caching
|   |   |   |               index.js
|   |   |   |               
|   |   |   \---src
|   |   |       |   index.js
|   |   |       |   
|   |   |       \---plugins
|   |   |           +---transform-async-arrows-in-class
|   |   |           |       index.js
|   |   |           |       
|   |   |           +---transform-edge-default-parameters
|   |   |           |       index.js
|   |   |           |       
|   |   |           +---transform-edge-function-name
|   |   |           |       index.js
|   |   |           |       
|   |   |           +---transform-jsx-spread
|   |   |           |       index.js
|   |   |           |       
|   |   |           +---transform-safari-block-shadowing
|   |   |           |       index.js
|   |   |           |       
|   |   |           +---transform-safari-for-shadowing
|   |   |           |       index.js
|   |   |           |       
|   |   |           \---transform-tagged-template-caching
|   |   |                   index.js
|   |   |                   
|   |   +---template
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |           builder.js
|   |   |           builder.js.map
|   |   |           formatters.js
|   |   |           formatters.js.map
|   |   |           index.js
|   |   |           index.js.map
|   |   |           literal.js
|   |   |           literal.js.map
|   |   |           options.js
|   |   |           options.js.map
|   |   |           parse.js
|   |   |           parse.js.map
|   |   |           populate.js
|   |   |           populate.js.map
|   |   |           string.js
|   |   |           string.js.map
|   |   |           
|   |   +---traverse
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---lib
|   |   |       |   cache.js
|   |   |       |   cache.js.map
|   |   |       |   context.js
|   |   |       |   context.js.map
|   |   |       |   hub.js
|   |   |       |   hub.js.map
|   |   |       |   index.js
|   |   |       |   index.js.map
|   |   |       |   traverse-node.js
|   |   |       |   traverse-node.js.map
|   |   |       |   types.js
|   |   |       |   types.js.map
|   |   |       |   visitors.js
|   |   |       |   visitors.js.map
|   |   |       |   
|   |   |       +---path
|   |   |       |   |   ancestry.js
|   |   |       |   |   ancestry.js.map
|   |   |       |   |   comments.js
|   |   |       |   |   comments.js.map
|   |   |       |   |   context.js
|   |   |       |   |   context.js.map
|   |   |       |   |   conversion.js
|   |   |       |   |   conversion.js.map
|   |   |       |   |   evaluation.js
|   |   |       |   |   evaluation.js.map
|   |   |       |   |   family.js
|   |   |       |   |   family.js.map
|   |   |       |   |   index.js
|   |   |       |   |   index.js.map
|   |   |       |   |   introspection.js
|   |   |       |   |   introspection.js.map
|   |   |       |   |   modification.js
|   |   |       |   |   modification.js.map
|   |   |       |   |   removal.js
|   |   |       |   |   removal.js.map
|   |   |       |   |   replacement.js
|   |   |       |   |   replacement.js.map
|   |   |       |   |   
|   |   |       |   +---inference
|   |   |       |   |       index.js
|   |   |       |   |       index.js.map
|   |   |       |   |       inferer-reference.js
|   |   |       |   |       inferer-reference.js.map
|   |   |       |   |       inferers.js
|   |   |       |   |       inferers.js.map
|   |   |       |   |       util.js
|   |   |       |   |       util.js.map
|   |   |       |   |       
|   |   |       |   \---lib
|   |   |       |           hoister.js
|   |   |       |           hoister.js.map
|   |   |       |           removal-hooks.js
|   |   |       |           removal-hooks.js.map
|   |   |       |           virtual-types-validator.js
|   |   |       |           virtual-types-validator.js.map
|   |   |       |           virtual-types.js
|   |   |       |           virtual-types.js.map
|   |   |       |           
|   |   |       \---scope
|   |   |           |   binding.js
|   |   |           |   binding.js.map
|   |   |           |   index.js
|   |   |           |   index.js.map
|   |   |           |   
|   |   |           \---lib
|   |   |                   renamer.js
|   |   |                   renamer.js.map
|   |   |                   
|   |   \---types
|   |       |   LICENSE
|   |       |   package.json
|   |       |   README.md
|   |       |   
|   |       \---lib
|   |           |   index-legacy.d.ts
|   |           |   index.d.ts
|   |           |   index.js
|   |           |   index.js.flow
|   |           |   index.js.map
|   |           |   
|   |           +---asserts
|   |           |   |   assertNode.js
|   |           |   |   assertNode.js.map
|   |           |   |   
|   |           |   \---generated
|   |           |           index.js
|   |           |           index.js.map
|   |           |           
|   |           +---ast-types
|   |           |   \---generated
|   |           |           index.js
|   |           |           index.js.map
|   |           |           
|   |           +---builders
|   |           |   |   productions.js
|   |           |   |   productions.js.map
|   |           |   |   validateNode.js
|   |           |   |   validateNode.js.map
|   |           |   |   
|   |           |   +---flow
|   |           |   |       createFlowUnionType.js
|   |           |   |       createFlowUnionType.js.map
|   |           |   |       createTypeAnnotationBasedOnTypeof.js
|   |           |   |       createTypeAnnotationBasedOnTypeof.js.map
|   |           |   |       
|   |           |   +---generated
|   |           |   |       index.js
|   |           |   |       index.js.map
|   |           |   |       lowercase.js
|   |           |   |       lowercase.js.map
|   |           |   |       uppercase.js
|   |           |   |       uppercase.js.map
|   |           |   |       
|   |           |   +---react
|   |           |   |       buildChildren.js
|   |           |   |       buildChildren.js.map
|   |           |   |       
|   |           |   \---typescript
|   |           |           createTSUnionType.js
|   |           |           createTSUnionType.js.map
|   |           |           
|   |           +---clone
|   |           |       clone.js
|   |           |       clone.js.map
|   |           |       cloneDeep.js
|   |           |       cloneDeep.js.map
|   |           |       cloneDeepWithoutLoc.js
|   |           |       cloneDeepWithoutLoc.js.map
|   |           |       cloneNode.js
|   |           |       cloneNode.js.map
|   |           |       cloneWithoutLoc.js
|   |           |       cloneWithoutLoc.js.map
|   |           |       
|   |           +---comments
|   |           |       addComment.js
|   |           |       addComment.js.map
|   |           |       addComments.js
|   |           |       addComments.js.map
|   |           |       inheritInnerComments.js
|   |           |       inheritInnerComments.js.map
|   |           |       inheritLeadingComments.js
|   |           |       inheritLeadingComments.js.map
|   |           |       inheritsComments.js
|   |           |       inheritsComments.js.map
|   |           |       inheritTrailingComments.js
|   |           |       inheritTrailingComments.js.map
|   |           |       removeComments.js
|   |           |       removeComments.js.map
|   |           |       
|   |           +---constants
|   |           |   |   index.js
|   |           |   |   index.js.map
|   |           |   |   
|   |           |   \---generated
|   |           |           index.js
|   |           |           index.js.map
|   |           |           
|   |           +---converters
|   |           |       ensureBlock.js
|   |           |       ensureBlock.js.map
|   |           |       gatherSequenceExpressions.js
|   |           |       gatherSequenceExpressions.js.map
|   |           |       toBindingIdentifierName.js
|   |           |       toBindingIdentifierName.js.map
|   |           |       toBlock.js
|   |           |       toBlock.js.map
|   |           |       toComputedKey.js
|   |           |       toComputedKey.js.map
|   |           |       toExpression.js
|   |           |       toExpression.js.map
|   |           |       toIdentifier.js
|   |           |       toIdentifier.js.map
|   |           |       toKeyAlias.js
|   |           |       toKeyAlias.js.map
|   |           |       toSequenceExpression.js
|   |           |       toSequenceExpression.js.map
|   |           |       toStatement.js
|   |           |       toStatement.js.map
|   |           |       valueToNode.js
|   |           |       valueToNode.js.map
|   |           |       
|   |           +---definitions
|   |           |       core.js
|   |           |       core.js.map
|   |           |       deprecated-aliases.js
|   |           |       deprecated-aliases.js.map
|   |           |       experimental.js
|   |           |       experimental.js.map
|   |           |       flow.js
|   |           |       flow.js.map
|   |           |       index.js
|   |           |       index.js.map
|   |           |       jsx.js
|   |           |       jsx.js.map
|   |           |       misc.js
|   |           |       misc.js.map
|   |           |       placeholders.js
|   |           |       placeholders.js.map
|   |           |       typescript.js
|   |           |       typescript.js.map
|   |           |       utils.js
|   |           |       utils.js.map
|   |           |       
|   |           +---modifications
|   |           |   |   appendToMemberExpression.js
|   |           |   |   appendToMemberExpression.js.map
|   |           |   |   inherits.js
|   |           |   |   inherits.js.map
|   |           |   |   prependToMemberExpression.js
|   |           |   |   prependToMemberExpression.js.map
|   |           |   |   removeProperties.js
|   |           |   |   removeProperties.js.map
|   |           |   |   removePropertiesDeep.js
|   |           |   |   removePropertiesDeep.js.map
|   |           |   |   
|   |           |   +---flow
|   |           |   |       removeTypeDuplicates.js
|   |           |   |       removeTypeDuplicates.js.map
|   |           |   |       
|   |           |   \---typescript
|   |           |           removeTypeDuplicates.js
|   |           |           removeTypeDuplicates.js.map
|   |           |           
|   |           +---retrievers
|   |           |       getAssignmentIdentifiers.js
|   |           |       getAssignmentIdentifiers.js.map
|   |           |       getBindingIdentifiers.js
|   |           |       getBindingIdentifiers.js.map
|   |           |       getFunctionName.js
|   |           |       getFunctionName.js.map
|   |           |       getOuterBindingIdentifiers.js
|   |           |       getOuterBindingIdentifiers.js.map
|   |           |       
|   |           +---traverse
|   |           |       traverse.js
|   |           |       traverse.js.map
|   |           |       traverseFast.js
|   |           |       traverseFast.js.map
|   |           |       
|   |           +---utils
|   |           |   |   deprecationWarning.js
|   |           |   |   deprecationWarning.js.map
|   |           |   |   inherit.js
|   |           |   |   inherit.js.map
|   |           |   |   shallowEqual.js
|   |           |   |   shallowEqual.js.map
|   |           |   |   
|   |           |   \---react
|   |           |           cleanJSXElementLiteralChild.js
|   |           |           cleanJSXElementLiteralChild.js.map
|   |           |           
|   |           \---validators
|   |               |   buildMatchMemberExpression.js
|   |               |   buildMatchMemberExpression.js.map
|   |               |   is.js
|   |               |   is.js.map
|   |               |   isBinding.js
|   |               |   isBinding.js.map
|   |               |   isBlockScoped.js
|   |               |   isBlockScoped.js.map
|   |               |   isImmutable.js
|   |               |   isImmutable.js.map
|   |               |   isLet.js
|   |               |   isLet.js.map
|   |               |   isNode.js
|   |               |   isNode.js.map
|   |               |   isNodesEquivalent.js
|   |               |   isNodesEquivalent.js.map
|   |               |   isPlaceholderType.js
|   |               |   isPlaceholderType.js.map
|   |               |   isReferenced.js
|   |               |   isReferenced.js.map
|   |               |   isScope.js
|   |               |   isScope.js.map
|   |               |   isSpecifierDefault.js
|   |               |   isSpecifierDefault.js.map
|   |               |   isType.js
|   |               |   isType.js.map
|   |               |   isValidES3Identifier.js
|   |               |   isValidES3Identifier.js.map
|   |               |   isValidIdentifier.js
|   |               |   isValidIdentifier.js.map
|   |               |   isVar.js
|   |               |   isVar.js.map
|   |               |   matchesPattern.js
|   |               |   matchesPattern.js.map
|   |               |   validate.js
|   |               |   validate.js.map
|   |               |   
|   |               +---generated
|   |               |       index.js
|   |               |       index.js.map
|   |               |       
|   |               \---react
|   |                       isCompatTag.js
|   |                       isCompatTag.js.map
|   |                       isReactComponent.js
|   |                       isReactComponent.js.map
|   |                       
|   +---@bcoe
|   |   \---v8-coverage
|   |       |   .editorconfig
|   |       |   .gitattributes
|   |       |   CHANGELOG.md
|   |       |   gulpfile.ts
|   |       |   LICENSE.md
|   |       |   LICENSE.txt
|   |       |   package.json
|   |       |   README.md
|   |       |   tsconfig.json
|   |       |   
|   |       +---dist
|   |       |   \---lib
|   |       |       |   ascii.d.ts
|   |       |       |   ascii.js
|   |       |       |   ascii.mjs
|   |       |       |   CHANGELOG.md
|   |       |       |   clone.d.ts
|   |       |       |   clone.js
|   |       |       |   clone.mjs
|   |       |       |   compare.d.ts
|   |       |       |   compare.js
|   |       |       |   compare.mjs
|   |       |       |   index.d.ts
|   |       |       |   index.js
|   |       |       |   index.mjs
|   |       |       |   LICENSE.md
|   |       |       |   merge.d.ts
|   |       |       |   merge.js
|   |       |       |   merge.mjs
|   |       |       |   normalize.d.ts
|   |       |       |   normalize.js
|   |       |       |   normalize.mjs
|   |       |       |   package.json
|   |       |       |   range-tree.d.ts
|   |       |       |   range-tree.js
|   |       |       |   range-tree.mjs
|   |       |       |   README.md
|   |       |       |   tsconfig.json
|   |       |       |   types.d.ts
|   |       |       |   types.js
|   |       |       |   types.mjs
|   |       |       |   
|   |       |       \---_src
|   |       |               ascii.ts
|   |       |               clone.ts
|   |       |               compare.ts
|   |       |               index.ts
|   |       |               merge.ts
|   |       |               normalize.ts
|   |       |               range-tree.ts
|   |       |               types.ts
|   |       |               
|   |       \---src
|   |           +---lib
|   |           |       ascii.ts
|   |           |       clone.ts
|   |           |       compare.ts
|   |           |       index.ts
|   |           |       merge.ts
|   |           |       normalize.ts
|   |           |       range-tree.ts
|   |           |       types.ts
|   |           |       
|   |           \---test
|   |                   merge.spec.ts
|   |                   
|   +---@csstools
|   |   +---color-helpers
|   |   |   |   CHANGELOG.md
|   |   |   |   LICENSE.md
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---dist
|   |   |           index.cjs
|   |   |           index.d.ts
|   |   |           index.mjs
|   |   |           
|   |   +---css-calc
|   |   |   |   CHANGELOG.md
|   |   |   |   LICENSE.md
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---dist
|   |   |           index.cjs
|   |   |           index.d.ts
|   |   |           index.mjs
|   |   |           
|   |   +---css-color-parser
|   |   |   |   CHANGELOG.md
|   |   |   |   LICENSE.md
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---dist
|   |   |           index.cjs
|   |   |           index.d.ts
|   |   |           index.mjs
|   |   |           
|   |   +---css-parser-algorithms
|   |   |   |   CHANGELOG.md
|   |   |   |   LICENSE.md
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---dist
|   |   |           index.cjs
|   |   |           index.d.ts
|   |   |           index.mjs
|   |   |           
|   |   \---css-tokenizer
|   |       |   CHANGELOG.md
|   |       |   LICENSE.md
|   |       |   package.json
|   |       |   README.md
|   |       |   
|   |       \---dist
|   |               index.cjs
|   |               index.d.ts
|   |               index.mjs
|   |               
|   +---@eslint
|   |   +---eslintrc
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   universal.js
|   |   |   |   
|   |   |   +---conf
|   |   |   |       config-schema.js
|   |   |   |       environments.js
|   |   |   |       
|   |   |   +---dist
|   |   |   |       eslintrc-universal.cjs
|   |   |   |       eslintrc-universal.cjs.map
|   |   |   |       eslintrc.cjs
|   |   |   |       eslintrc.cjs.map
|   |   |   |       
|   |   |   \---lib
|   |   |       |   cascading-config-array-factory.js
|   |   |       |   config-array-factory.js
|   |   |       |   flat-compat.js
|   |   |       |   index-universal.js
|   |   |       |   index.js
|   |   |       |   
|   |   |       +---config-array
|   |   |       |       config-array.js
|   |   |       |       config-dependency.js
|   |   |       |       extracted-config.js
|   |   |       |       ignore-pattern.js
|   |   |       |       index.js
|   |   |       |       override-tester.js
|   |   |       |       
|   |   |       \---shared
|   |   |               ajv.js
|   |   |               config-ops.js
|   |   |               config-validator.js
|   |   |               deprecation-warnings.js
|   |   |               naming.js
|   |   |               relative-module-resolver.js
|   |   |               types.js
|   |   |               
|   |   \---js
|   |       |   LICENSE
|   |       |   package.json
|   |       |   README.md
|   |       |   
|   |       \---src
|   |           |   index.js
|   |           |   
|   |           \---configs
|   |                   eslint-all.js
|   |                   eslint-recommended.js
|   |                   
|   +---@eslint-community
|   |   +---eslint-utils
|   |   |       index.d.mts
|   |   |       index.d.ts
|   |   |       index.js
|   |   |       index.js.map
|   |   |       index.mjs
|   |   |       index.mjs.map
|   |   |       LICENSE
|   |   |       package.json
|   |   |       README.md
|   |   |       
|   |   \---regexpp
|   |           index.d.ts
|   |           index.js
|   |           index.js.map
|   |           index.mjs
|   |           index.mjs.map
|   |           LICENSE
|   |           package.json
|   |           README.md
|   |           
|   +---@humanwhocodes
|   |   +---config-array
|   |   |       api.js
|   |   |       LICENSE
|   |   |       package.json
|   |   |       README.md
|   |   |       
|   |   +---module-importer
|   |   |   |   CHANGELOG.md
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   +---dist
|   |   |   |       module-importer.cjs
|   |   |   |       module-importer.d.cts
|   |   |   |       module-importer.d.ts
|   |   |   |       module-importer.js
|   |   |   |       
|   |   |   \---src
|   |   |           module-importer.cjs
|   |   |           module-importer.js
|   |   |           
|   |   \---object-schema
|   |       |   CHANGELOG.md
|   |       |   LICENSE
|   |       |   package.json
|   |       |   README.md
|   |       |   
|   |       \---src
|   |               index.js
|   |               merge-strategy.js
|   |               object-schema.js
|   |               validation-strategy.js
|   |               
|   +---@istanbuljs
|   |   +---load-nyc-config
|   |   |   |   CHANGELOG.md
|   |   |   |   index.js
|   |   |   |   LICENSE
|   |   |   |   load-esm.js
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---node_modules
|   |   |       +---.bin
|   |   |       |       js-yaml
|   |   |       |       js-yaml.cmd
|   |   |       |       js-yaml.ps1
|   |   |       |       
|   |   |       +---argparse
|   |   |       |   |   CHANGELOG.md
|   |   |       |   |   index.js
|   |   |       |   |   LICENSE
|   |   |       |   |   package.json
|   |   |       |   |   README.md
|   |   |       |   |   
|   |   |       |   \---lib
|   |   |       |       |   action.js
|   |   |       |       |   action_container.js
|   |   |       |       |   argparse.js
|   |   |       |       |   argument_parser.js
|   |   |       |       |   const.js
|   |   |       |       |   namespace.js
|   |   |       |       |   utils.js
|   |   |       |       |   
|   |   |       |       +---action
|   |   |       |       |   |   append.js
|   |   |       |       |   |   count.js
|   |   |       |       |   |   help.js
|   |   |       |       |   |   store.js
|   |   |       |       |   |   subparsers.js
|   |   |       |       |   |   version.js
|   |   |       |       |   |   
|   |   |       |       |   +---append
|   |   |       |       |   |       constant.js
|   |   |       |       |   |       
|   |   |       |       |   \---store
|   |   |       |       |           constant.js
|   |   |       |       |           false.js
|   |   |       |       |           true.js
|   |   |       |       |           
|   |   |       |       +---argument
|   |   |       |       |       error.js
|   |   |       |       |       exclusive.js
|   |   |       |       |       group.js
|   |   |       |       |       
|   |   |       |       \---help
|   |   |       |               added_formatters.js
|   |   |       |               formatter.js
|   |   |       |               
|   |   |       +---find-up
|   |   |       |       index.d.ts
|   |   |       |       index.js
|   |   |       |       license
|   |   |       |       package.json
|   |   |       |       readme.md
|   |   |       |       
|   |   |       +---js-yaml
|   |   |       |   |   CHANGELOG.md
|   |   |       |   |   index.js
|   |   |       |   |   LICENSE
|   |   |       |   |   package.json
|   |   |       |   |   README.md
|   |   |       |   |   
|   |   |       |   +---bin
|   |   |       |   |       js-yaml.js
|   |   |       |   |       
|   |   |       |   +---dist
|   |   |       |   |       js-yaml.js
|   |   |       |   |       js-yaml.min.js
|   |   |       |   |       
|   |   |       |   \---lib
|   |   |       |       |   js-yaml.js
|   |   |       |       |   
|   |   |       |       \---js-yaml
|   |   |       |           |   common.js
|   |   |       |           |   dumper.js
|   |   |       |           |   exception.js
|   |   |       |           |   loader.js
|   |   |       |           |   mark.js
|   |   |       |           |   schema.js
|   |   |       |           |   type.js
|   |   |       |           |   
|   |   |       |           +---schema
|   |   |       |           |       core.js
|   |   |       |           |       default_full.js
|   |   |       |           |       default_safe.js
|   |   |       |           |       failsafe.js
|   |   |       |           |       json.js
|   |   |       |           |       
|   |   |       |           \---type
|   |   |       |               |   binary.js
|   |   |       |               |   bool.js
|   |   |       |               |   float.js
|   |   |       |               |   int.js
|   |   |       |               |   map.js
|   |   |       |               |   merge.js
|   |   |       |               |   null.js
|   |   |       |               |   omap.js
|   |   |       |               |   pairs.js
|   |   |       |               |   seq.js
|   |   |       |               |   set.js
|   |   |       |               |   str.js
|   |   |       |               |   timestamp.js
|   |   |       |               |   
|   |   |       |               \---js
|   |   |       |                       function.js
|   |   |       |                       regexp.js
|   |   |       |                       undefined.js
|   |   |       |                       
|   |   |       +---locate-path
|   |   |       |       index.d.ts
|   |   |       |       index.js
|   |   |       |       license
|   |   |       |       package.json
|   |   |       |       readme.md
|   |   |       |       
|   |   |       +---p-limit
|   |   |       |       index.d.ts
|   |   |       |       index.js
|   |   |       |       license
|   |   |       |       package.json
|   |   |       |       readme.md
|   |   |       |       
|   |   |       +---p-locate
|   |   |       |       index.d.ts
|   |   |       |       index.js
|   |   |       |       license
|   |   |       |       package.json
|   |   |       |       readme.md
|   |   |       |       
|   |   |       \---resolve-from
|   |   |               index.d.ts
|   |   |               index.js
|   |   |               license
|   |   |               package.json
|   |   |               readme.md
|   |   |               
|   |   \---schema
|   |           CHANGELOG.md
|   |           default-exclude.js
|   |           default-extension.js
|   |           index.js
|   |           LICENSE
|   |           package.json
|   |           README.md
|   |           
|   +---@jest
|   |   +---console
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   
|   |   |   \---build
|   |   |           BufferedConsole.js
|   |   |           CustomConsole.js
|   |   |           getConsoleOutput.js
|   |   |           index.d.ts
|   |   |           index.js
|   |   |           NullConsole.js
|   |   |           types.js
|   |   |           
|   |   +---core
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---build
|   |   |       |   collectHandles.js
|   |   |       |   FailedTestsCache.js
|   |   |       |   FailedTestsInteractiveMode.js
|   |   |       |   getChangedFilesPromise.js
|   |   |       |   getConfigsOfProjectsToRun.js
|   |   |       |   getNoTestFound.js
|   |   |       |   getNoTestFoundFailed.js
|   |   |       |   getNoTestFoundPassWithNoTests.js
|   |   |       |   getNoTestFoundRelatedToChangedFiles.js
|   |   |       |   getNoTestFoundVerbose.js
|   |   |       |   getNoTestsFoundMessage.js
|   |   |       |   getProjectDisplayName.js
|   |   |       |   getProjectNamesMissingWarning.js
|   |   |       |   getSelectProjectsMessage.js
|   |   |       |   index.d.ts
|   |   |       |   index.js
|   |   |       |   ReporterDispatcher.js
|   |   |       |   runGlobalHook.js
|   |   |       |   runJest.js
|   |   |       |   SearchSource.js
|   |   |       |   SnapshotInteractiveMode.js
|   |   |       |   TestNamePatternPrompt.js
|   |   |       |   TestPathPatternPrompt.js
|   |   |       |   TestScheduler.js
|   |   |       |   testSchedulerHelper.js
|   |   |       |   types.js
|   |   |       |   version.js
|   |   |       |   watch.js
|   |   |       |   
|   |   |       +---cli
|   |   |       |       index.js
|   |   |       |       
|   |   |       +---lib
|   |   |       |       activeFiltersMessage.js
|   |   |       |       createContext.js
|   |   |       |       handleDeprecationWarnings.js
|   |   |       |       isValidPath.js
|   |   |       |       logDebugMessages.js
|   |   |       |       updateGlobalConfig.js
|   |   |       |       watchPluginsHelpers.js
|   |   |       |       
|   |   |       \---plugins
|   |   |               FailedTestsInteractive.js
|   |   |               Quit.js
|   |   |               TestNamePattern.js
|   |   |               TestPathPattern.js
|   |   |               UpdateSnapshots.js
|   |   |               UpdateSnapshotsInteractive.js
|   |   |               
|   |   +---environment
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   
|   |   |   \---build
|   |   |           index.d.ts
|   |   |           index.js
|   |   |           
|   |   +---expect
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---build
|   |   |           index.d.ts
|   |   |           index.js
|   |   |           types.js
|   |   |           
|   |   +---expect-utils
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---build
|   |   |           immutableUtils.js
|   |   |           index.d.ts
|   |   |           index.js
|   |   |           jasmineUtils.js
|   |   |           types.js
|   |   |           utils.js
|   |   |           
|   |   +---fake-timers
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   
|   |   |   \---build
|   |   |           index.d.ts
|   |   |           index.js
|   |   |           legacyFakeTimers.js
|   |   |           modernFakeTimers.js
|   |   |           
|   |   +---globals
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   
|   |   |   \---build
|   |   |           index.d.ts
|   |   |           index.js
|   |   |           
|   |   +---pattern
|   |   |   |   api-extractor.json
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   tsconfig.json
|   |   |   |   
|   |   |   +---build
|   |   |   |       index.d.ts
|   |   |   |       index.js
|   |   |   |       index.mjs
|   |   |   |       
|   |   |   +---node_modules
|   |   |   |   \---jest-regex-util
|   |   |   |       |   LICENSE
|   |   |   |       |   package.json
|   |   |   |       |   
|   |   |   |       \---build
|   |   |   |               index.d.ts
|   |   |   |               index.js
|   |   |   |               index.mjs
|   |   |   |               
|   |   |   \---src
|   |   |       |   index.ts
|   |   |       |   TestPathPatterns.ts
|   |   |       |   
|   |   |       \---__tests__
|   |   |           |   TestPathPatterns.test.ts
|   |   |           |   
|   |   |           \---__snapshots__
|   |   |                   TestPathPatterns.test.ts.snap
|   |   |                   
|   |   +---reporters
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   
|   |   |   +---assets
|   |   |   |       jest_logo.png
|   |   |   |       
|   |   |   \---build
|   |   |           BaseReporter.js
|   |   |           CoverageReporter.js
|   |   |           CoverageWorker.js
|   |   |           DefaultReporter.js
|   |   |           formatTestPath.js
|   |   |           generateEmptyCoverage.js
|   |   |           getResultHeader.js
|   |   |           getSnapshotStatus.js
|   |   |           getSnapshotSummary.js
|   |   |           getSummary.js
|   |   |           getWatermarks.js
|   |   |           GitHubActionsReporter.js
|   |   |           index.d.ts
|   |   |           index.js
|   |   |           NotifyReporter.js
|   |   |           printDisplayName.js
|   |   |           relativePath.js
|   |   |           Status.js
|   |   |           SummaryReporter.js
|   |   |           trimAndFormatPath.js
|   |   |           types.js
|   |   |           VerboseReporter.js
|   |   |           wrapAnsiString.js
|   |   |           
|   |   +---schemas
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---build
|   |   |           index.d.ts
|   |   |           index.js
|   |   |           
|   |   +---source-map
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   
|   |   |   \---build
|   |   |           getCallsite.js
|   |   |           index.d.ts
|   |   |           index.js
|   |   |           types.js
|   |   |           
|   |   +---test-result
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   
|   |   |   \---build
|   |   |           formatTestResults.js
|   |   |           helpers.js
|   |   |           index.d.ts
|   |   |           index.js
|   |   |           types.js
|   |   |           
|   |   +---test-sequencer
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   
|   |   |   \---build
|   |   |           index.d.ts
|   |   |           index.js
|   |   |           
|   |   +---transform
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   
|   |   |   \---build
|   |   |           enhanceUnexpectedTokenMessage.js
|   |   |           index.d.ts
|   |   |           index.js
|   |   |           runtimeErrorsAndWarnings.js
|   |   |           ScriptTransformer.js
|   |   |           shouldInstrument.js
|   |   |           types.js
|   |   |           
|   |   \---types
|   |       |   LICENSE
|   |       |   package.json
|   |       |   README.md
|   |       |   
|   |       \---build
|   |               Circus.js
|   |               Config.js
|   |               Global.js
|   |               index.d.ts
|   |               index.js
|   |               TestResult.js
|   |               Transform.js
|   |               
|   +---@jridgewell
|   |   +---gen-mapping
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   +---dist
|   |   |   |   |   gen-mapping.mjs
|   |   |   |   |   gen-mapping.mjs.map
|   |   |   |   |   gen-mapping.umd.js
|   |   |   |   |   gen-mapping.umd.js.map
|   |   |   |   |   
|   |   |   |   \---types
|   |   |   |           gen-mapping.d.ts
|   |   |   |           set-array.d.ts
|   |   |   |           sourcemap-segment.d.ts
|   |   |   |           types.d.ts
|   |   |   |           
|   |   |   +---src
|   |   |   |       gen-mapping.ts
|   |   |   |       set-array.ts
|   |   |   |       sourcemap-segment.ts
|   |   |   |       types.ts
|   |   |   |       
|   |   |   \---types
|   |   |           gen-mapping.d.cts
|   |   |           gen-mapping.d.cts.map
|   |   |           gen-mapping.d.mts
|   |   |           gen-mapping.d.mts.map
|   |   |           set-array.d.cts
|   |   |           set-array.d.cts.map
|   |   |           set-array.d.mts
|   |   |           set-array.d.mts.map
|   |   |           sourcemap-segment.d.cts
|   |   |           sourcemap-segment.d.cts.map
|   |   |           sourcemap-segment.d.mts
|   |   |           sourcemap-segment.d.mts.map
|   |   |           types.d.cts
|   |   |           types.d.cts.map
|   |   |           types.d.mts
|   |   |           types.d.mts.map
|   |   |           
|   |   +---remapping
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   +---dist
|   |   |   |       remapping.mjs
|   |   |   |       remapping.mjs.map
|   |   |   |       remapping.umd.js
|   |   |   |       remapping.umd.js.map
|   |   |   |       
|   |   |   +---src
|   |   |   |       build-source-map-tree.ts
|   |   |   |       remapping.ts
|   |   |   |       source-map-tree.ts
|   |   |   |       source-map.ts
|   |   |   |       types.ts
|   |   |   |       
|   |   |   \---types
|   |   |           build-source-map-tree.d.cts
|   |   |           build-source-map-tree.d.cts.map
|   |   |           build-source-map-tree.d.mts
|   |   |           build-source-map-tree.d.mts.map
|   |   |           remapping.d.cts
|   |   |           remapping.d.cts.map
|   |   |           remapping.d.mts
|   |   |           remapping.d.mts.map
|   |   |           source-map-tree.d.cts
|   |   |           source-map-tree.d.cts.map
|   |   |           source-map-tree.d.mts
|   |   |           source-map-tree.d.mts.map
|   |   |           source-map.d.cts
|   |   |           source-map.d.cts.map
|   |   |           source-map.d.mts
|   |   |           source-map.d.mts.map
|   |   |           types.d.cts
|   |   |           types.d.cts.map
|   |   |           types.d.mts
|   |   |           types.d.mts.map
|   |   |           
|   |   +---resolve-uri
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---dist
|   |   |       |   resolve-uri.mjs
|   |   |       |   resolve-uri.mjs.map
|   |   |       |   resolve-uri.umd.js
|   |   |       |   resolve-uri.umd.js.map
|   |   |       |   
|   |   |       \---types
|   |   |               resolve-uri.d.ts
|   |   |               
|   |   +---sourcemap-codec
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   +---dist
|   |   |   |       sourcemap-codec.mjs
|   |   |   |       sourcemap-codec.mjs.map
|   |   |   |       sourcemap-codec.umd.js
|   |   |   |       sourcemap-codec.umd.js.map
|   |   |   |       
|   |   |   +---src
|   |   |   |       scopes.ts
|   |   |   |       sourcemap-codec.ts
|   |   |   |       strings.ts
|   |   |   |       vlq.ts
|   |   |   |       
|   |   |   \---types
|   |   |           scopes.d.cts
|   |   |           scopes.d.cts.map
|   |   |           scopes.d.mts
|   |   |           scopes.d.mts.map
|   |   |           sourcemap-codec.d.cts
|   |   |           sourcemap-codec.d.cts.map
|   |   |           sourcemap-codec.d.mts
|   |   |           sourcemap-codec.d.mts.map
|   |   |           strings.d.cts
|   |   |           strings.d.cts.map
|   |   |           strings.d.mts
|   |   |           strings.d.mts.map
|   |   |           vlq.d.cts
|   |   |           vlq.d.cts.map
|   |   |           vlq.d.mts
|   |   |           vlq.d.mts.map
|   |   |           
|   |   \---trace-mapping
|   |       |   LICENSE
|   |       |   package.json
|   |       |   README.md
|   |       |   
|   |       +---dist
|   |       |       trace-mapping.mjs
|   |       |       trace-mapping.mjs.map
|   |       |       trace-mapping.umd.js
|   |       |       trace-mapping.umd.js.map
|   |       |       
|   |       +---src
|   |       |       binary-search.ts
|   |       |       by-source.ts
|   |       |       flatten-map.ts
|   |       |       resolve.ts
|   |       |       sort.ts
|   |       |       sourcemap-segment.ts
|   |       |       strip-filename.ts
|   |       |       trace-mapping.ts
|   |       |       types.ts
|   |       |       
|   |       \---types
|   |               binary-search.d.cts
|   |               binary-search.d.cts.map
|   |               binary-search.d.mts
|   |               binary-search.d.mts.map
|   |               by-source.d.cts
|   |               by-source.d.cts.map
|   |               by-source.d.mts
|   |               by-source.d.mts.map
|   |               flatten-map.d.cts
|   |               flatten-map.d.cts.map
|   |               flatten-map.d.mts
|   |               flatten-map.d.mts.map
|   |               resolve.d.cts
|   |               resolve.d.cts.map
|   |               resolve.d.mts
|   |               resolve.d.mts.map
|   |               sort.d.cts
|   |               sort.d.cts.map
|   |               sort.d.mts
|   |               sort.d.mts.map
|   |               sourcemap-segment.d.cts
|   |               sourcemap-segment.d.cts.map
|   |               sourcemap-segment.d.mts
|   |               sourcemap-segment.d.mts.map
|   |               strip-filename.d.cts
|   |               strip-filename.d.cts.map
|   |               strip-filename.d.mts
|   |               strip-filename.d.mts.map
|   |               trace-mapping.d.cts
|   |               trace-mapping.d.cts.map
|   |               trace-mapping.d.mts
|   |               trace-mapping.d.mts.map
|   |               types.d.cts
|   |               types.d.cts.map
|   |               types.d.mts
|   |               types.d.mts.map
|   |               
|   +---@nodelib
|   |   +---fs.scandir
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---out
|   |   |       |   constants.d.ts
|   |   |       |   constants.js
|   |   |       |   index.d.ts
|   |   |       |   index.js
|   |   |       |   settings.d.ts
|   |   |       |   settings.js
|   |   |       |   
|   |   |       +---adapters
|   |   |       |       fs.d.ts
|   |   |       |       fs.js
|   |   |       |       
|   |   |       +---providers
|   |   |       |       async.d.ts
|   |   |       |       async.js
|   |   |       |       common.d.ts
|   |   |       |       common.js
|   |   |       |       sync.d.ts
|   |   |       |       sync.js
|   |   |       |       
|   |   |       +---types
|   |   |       |       index.d.ts
|   |   |       |       index.js
|   |   |       |       
|   |   |       \---utils
|   |   |               fs.d.ts
|   |   |               fs.js
|   |   |               index.d.ts
|   |   |               index.js
|   |   |               
|   |   +---fs.stat
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   \---out
|   |   |       |   index.d.ts
|   |   |       |   index.js
|   |   |       |   settings.d.ts
|   |   |       |   settings.js
|   |   |       |   
|   |   |       +---adapters
|   |   |       |       fs.d.ts
|   |   |       |       fs.js
|   |   |       |       
|   |   |       +---providers
|   |   |       |       async.d.ts
|   |   |       |       async.js
|   |   |       |       sync.d.ts
|   |   |       |       sync.js
|   |   |       |       
|   |   |       \---types
|   |   |               index.d.ts
|   |   |               index.js
|   |   |               
|   |   \---fs.walk
|   |       |   LICENSE
|   |       |   package.json
|   |       |   README.md
|   |       |   
|   |       \---out
|   |           |   index.d.ts
|   |           |   index.js
|   |           |   settings.d.ts
|   |           |   settings.js
|   |           |   
|   |           +---providers
|   |           |       async.d.ts
|   |           |       async.js
|   |           |       index.d.ts
|   |           |       index.js
|   |           |       stream.d.ts
|   |           |       stream.js
|   |           |       sync.d.ts
|   |           |       sync.js
|   |           |       
|   |           +---readers
|   |           |       async.d.ts
|   |           |       async.js
|   |           |       common.d.ts
|   |           |       common.js
|   |           |       reader.d.ts
|   |           |       reader.js
|   |           |       sync.d.ts
|   |           |       sync.js
|   |           |       
|   |           \---types
|   |                   index.d.ts
|   |                   index.js
|   |                   
|   +---@sinclair
|   |   \---typebox
|   |       |   license
|   |       |   package.json
|   |       |   readme.md
|   |       |   typebox.d.ts
|   |       |   typebox.js
|   |       |   
|   |       +---compiler
|   |       |       compiler.d.ts
|   |       |       compiler.js
|   |       |       index.d.ts
|   |       |       index.js
|   |       |       
|   |       +---errors
|   |       |       errors.d.ts
|   |       |       errors.js
|   |       |       index.d.ts
|   |       |       index.js
|   |       |       
|   |       +---system
|   |       |       index.d.ts
|   |       |       index.js
|   |       |       system.d.ts
|   |       |       system.js
|   |       |       
|   |       \---value
|   |               cast.d.ts
|   |               cast.js
|   |               check.d.ts
|   |               check.js
|   |               clone.d.ts
|   |               clone.js
|   |               convert.d.ts
|   |               convert.js
|   |               create.d.ts
|   |               create.js
|   |               delta.d.ts
|   |               delta.js
|   |               equal.d.ts
|   |               equal.js
|   |               hash.d.ts
|   |               hash.js
|   |               index.d.ts
|   |               index.js
|   |               is.d.ts
|   |               is.js
|   |               mutate.d.ts
|   |               mutate.js
|   |               pointer.d.ts
|   |               pointer.js
|   |               value.d.ts
|   |               value.js
|   |               
|   +---@sinonjs
|   |   +---commons
|   |   |   |   LICENSE
|   |   |   |   package.json
|   |   |   |   README.md
|   |   |   |   
|   |   |   +---lib
|   |   |   |   |   called-in-order.js
|   |   |   |   |   called-in-order.test.js
|   |   |   |   |   class-name.js
|   |   |   |   |   class-name.test.js
|   |   |   |   |   deprecated.js
|   |   |   |   |   deprecated.test.js
|   |   |   |   |   every.js
|   |   |   |   |   every.test.js
|   |   |   |   |   function-name.js
|   |   |   |   |   function-name.test.js
|   |   |   |   |   global.js
|   |   |   |   |   global.test.js
|   |   |   |   |   index.js
|   |   |   |   |   index.test.js
|   |   |   |   |   order-by-first-call.js
|   |   |   |   |   order-by-first-call.test.js
|   |   |   |   |   type-of.js
|   |   |   |   |   type-of.test.js
|   |   |   |   |   value-to-string.js
|   |   |   |   |   value-to-string.test.js
|   |   |   |   |   
|   |   |   |   \---prototypes
|   |   |   |           array.js
|   |   |   |           copy-prototype-methods.js
|   |   |   |           copy-prototype-methods.test.js
|   |   |   |           function.js
|   |   |   |           index.js
|   |   |   |           index.test.js
|   |   |   |           map.js
|   |   |   |           object.js
|   |   |   |           README.md
|   |   |   |           set.js
|   |   |   |           string.js
|   |   |   |           throws-on-proto.js
|   |   |   |           
|   |   |   \---types
|   |   |       |   called-in-order.d.ts
|   |   |       |   class-name.d.ts
|   |   |       |   deprecated.d.ts
|   |   |       |   every.d.ts
|   |   |       |   function-name.d.ts
|   |   |       |   global.d.ts
|   |   |       |   index.d.ts
|   |   |       |   order-by-first-call.d.ts
|   |   |       |   type-of.d.ts
|   |   |       |   value-to-string.d.ts
|   |   |       |   
|   |   |       \---prototypes
|   |   |               array.d.ts
|   |   |               copy-prototype-methods.d.ts
|   |   |               function.d.ts
|   |   |               index.d.ts
|   |   |               map.d.ts
|   |   |               object.d.ts
|   |   |               set.d.ts
|   |   |               string.d.ts
|   |   |               throws-on-proto.d.ts
|   |   |               
|   |   \---fake-timers
|   |       |   LICENSE
|   |       |   package.json
|   |       |   README.md
|   |       |   
|   |       \---src
|   |               fake-timers-src.js
|   |               
|   +---@tootallnate
|   |   \---once
|   |       |   LICENSE
|   |       |   package.json
|   |       |   README.md
|   |       |   
|   |       \---dist
|   |               index.d.ts
|   |               index.js
|   |               index.js.map
|   |               overloaded-parameters.d.ts
|   |               overloaded-parameters.js
|   |               overloaded-parameters.js.map
|   |               types.d.ts
|   |               types.js
|   |               types.js.map
|   |               
|   +---@types
|   |   +---babel__core
|   |   |       index.d.ts
|   |   |       LICENSE
|   |   |       package.json
|   |   |       README.md
|   |   |       
|   |   +---babel__generator
|   |   |       index.d.ts
|   |   |       LICENSE
|   |   |       package.json
|   |   |       README.md
|   |   |       
|   |   +---babel__template
|   |   |       index.d.ts
|   |   |       LICENSE
|   |   |       package.json
|   |   |       README.md
|   |   |       
|   |   +---babel__traverse
|   |   |       index.d.ts
|   |   |       LICENSE
|   |   |       package.json
|   |   |       README.md
|   |   |       
|   |   +---graceful-fs
|   |   |       index.d.ts
|   |   |       LICENSE
|   |   |       package.json
|   |   |       README.md
|   |   |       
|   |   +---istanbul-lib-coverage
|   |   |       index.d.ts
|   |   |       LICENSE
|   |   |       package.json
|   |   |       README.md
|   |   |       
|   |   +---istanbul-lib-report
|   |   |       index.d.ts
|   |   |       LICENSE
|   |   |       package.json
|   |   |       README.md
|   |   |       
|   |   +---istanbul-reports
|   |   |       index.d.ts
|   |   |       LICENSE
|   |   |       package.json
|   |   |       README.md
|   |   |       
|   |   +---jsdom
|   |   |       base.d.ts
|   |   |       index.d.ts
|   |   |       LICENSE
|   |   |       package.json
|   |   |       README.md
|   |   |       
|   |   +---node
|   |   |   |   assert.d.ts
|   |   |   |   async_hooks.d.ts
|   |   |   |   buffer.buffer.d.ts
|   |   |   |   buffer.d.ts
|   |   |   |   child_process.d.ts
|   |   |   |   cluster.d.ts
|   |   |   |   console.d.ts
|   |   |   |   constants.d.ts
|   |   |   |   crypto.d.ts
|   |   |   |   dgram.d.ts
|   |   |   |   diagnostics_channel.d.ts
|   |   |   |   dns.d.ts
|   |   |   |   domain.d.ts
|   |   |   |   events.d.ts
|   |   |   |   fs.d.ts
|   |   |   |   globals.d.ts
|   |   |   |   globals.typedarray.d.ts
|   |   |   |   http.d.ts
|   |   |   |   http2.d.ts
|   |   |   |   https.d.ts
|   |   |   |   index.d.ts
|   |   |   |   inspector.d.ts
|   |   |   |   LICENSE
|   |   |   |   module.d.ts
|   |   |   |   net.d.ts
|   |   |   |   os.d.ts
|   |   |   |   package.json
|   |   |   |   path.d.ts
|   |   |   |   perf_hooks.d.ts
|   |   |   |   process.d.ts
|   |   |   |   punycode.d.ts
|   |   |   |   querystring.d.ts
|   |   |   |   readline.d.ts
|   |   |   |   README.md
|   |   |   |   repl.d.ts
|   |   |   |   sea.d.ts
|   |   |   |   sqlite.d.ts
|   |   |   |   stream.d.ts
|   |   |   |   string_decoder.d.ts
|   |   |   |   test.d.ts
|   |   |   |   timers.d.ts
|   |   |   |   tls.d.ts
|   |   |   |   trace_events.d.ts
|   |   |   |   tty.d.ts
|   |   |   |   url.d.ts
|   |   |   |   util.d.ts
|   |   |   |   v8.d.ts
|   |   |   |   vm.d.ts
|   |   |   |   wasi.d.ts
|   |   |   |   worker_threads.d.ts
|   |   |   |   zlib.d.ts
|   |   |   |   
|   |   |   +---assert
|   |   |   |       strict.d.ts
|   |   |   |       
|   |   |   +---compatibility
|   |   |   |       iterators.d.ts
|   |   |   |       
|   |   |   +---dns
|   |   |   |       promises.d.ts
|   |   |   |       
|   |   |   +---fs
|   |   |   |       promises.d.ts
|   |   |   |       
|   |   |   +---readline
|   |   |   |       promises.d.ts
|   |   |   |       
|   |   |   +---stream
|   |   |   |       consumers.d.ts
|   |   |   |       promises.d.ts
|   |   |   |       web.d.ts
|   |   |   |       
|   |   |   +---timers
|   |   |   |       promises.d.ts
|   |   |   |       
|   |   |   +---ts5.6
|   |   |   |   |   buffer.buffer.d.ts
|   |   |   |   |   globals.typedarray.d.ts
|   |   |   |   |   index.d.ts
|   |   |   |   |   
|   |   |   |   \---compatibility
|   |   |   |           float16array.d.ts
|   |   |   |           
|   |   |   +---ts5.7
|   |   |   |   |   index.d.ts
|   |   |   |   |   
|   |   |   |   \---compatibility
|   |   |   |           float16array.d.ts
|   |   |   |           
|   |   |   \---web-globals
|   |   |           abortcontroller.d.ts
|   |   |           domexception.d.ts
|   |   |           events.d.ts
|   |   |           fetch.d.ts
|   |   |           navigator.d.ts
|   |   |           storage.d.ts
|   |   |           
|   |   +---stack-utils
|   |   |       index.d.ts
|   |   |       LICENSE
|   |   |       package.json
|   |   |       README.md
|   |   |       
|   |   +---tough-cookie
|   |   |       index.d.ts
|   |   |       LICENSE
|   |   |       package.json
|   |   |       README.md
|   |   |       
|   |   +---yargs
|   |   |       helpers.d.mts
|   |   |       helpers.d.ts
|   |   |       index.d.mts
|   |   |       index.d.ts
|   |   |       LICENSE
|   |   |       package.json
|   |   |       README.md
|   |   |       yargs.d.ts
|   |   |       
|   |   \---yargs-parser
|   |           index.d.ts
|   |           LICENSE
|   |           package.json
|   |           README.md
|   |           
|   +---@ungap
|   |   \---structured-clone
|   |       |   LICENSE
|   |       |   package.json
|   |       |   README.md
|   |       |   structured-json.js
|   |       |   
|   |       +---.github
|   |       |   \---workflows
|   |       |           node.js.yml
|   |       |           
|   |       +---cjs
|   |       |       deserialize.js
|   |       |       index.js
|   |       |       json.js
|   |       |       package.json
|   |       |       serialize.js
|   |       |       types.js
|   |       |       
|   |       \---esm
|   |               deserialize.js
|   |               index.js
|   |               json.js
|   |               serialize.js
|   |               types.js
|   |               
|   +---abab
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   LICENSE.md
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           atob.js
|   |           btoa.js
|   |           
|   +---acorn
|   |   |   CHANGELOG.md
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---bin
|   |   |       acorn
|   |   |       
|   |   \---dist
|   |           acorn.d.mts
|   |           acorn.d.ts
|   |           acorn.js
|   |           acorn.mjs
|   |           bin.js
|   |           
|   +---acorn-globals
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---acorn-jsx
|   |       index.d.ts
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       xhtml.js
|   |       
|   +---acorn-walk
|   |   |   CHANGELOG.md
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---dist
|   |           walk.d.mts
|   |           walk.d.ts
|   |           walk.js
|   |           walk.mjs
|   |           
|   +---agent-base
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---dist
|   |           helpers.d.ts
|   |           helpers.d.ts.map
|   |           helpers.js
|   |           helpers.js.map
|   |           index.d.ts
|   |           index.d.ts.map
|   |           index.js
|   |           index.js.map
|   |           
|   +---ajv
|   |   |   .tonic_example.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---dist
|   |   |       ajv.bundle.js
|   |   |       ajv.min.js
|   |   |       ajv.min.js.map
|   |   |       
|   |   +---lib
|   |   |   |   ajv.d.ts
|   |   |   |   ajv.js
|   |   |   |   cache.js
|   |   |   |   data.js
|   |   |   |   definition_schema.js
|   |   |   |   keyword.js
|   |   |   |   
|   |   |   +---compile
|   |   |   |       async.js
|   |   |   |       equal.js
|   |   |   |       error_classes.js
|   |   |   |       formats.js
|   |   |   |       index.js
|   |   |   |       resolve.js
|   |   |   |       rules.js
|   |   |   |       schema_obj.js
|   |   |   |       ucs2length.js
|   |   |   |       util.js
|   |   |   |       
|   |   |   +---dot
|   |   |   |       allOf.jst
|   |   |   |       anyOf.jst
|   |   |   |       coerce.def
|   |   |   |       comment.jst
|   |   |   |       const.jst
|   |   |   |       contains.jst
|   |   |   |       custom.jst
|   |   |   |       defaults.def
|   |   |   |       definitions.def
|   |   |   |       dependencies.jst
|   |   |   |       enum.jst
|   |   |   |       errors.def
|   |   |   |       format.jst
|   |   |   |       if.jst
|   |   |   |       items.jst
|   |   |   |       missing.def
|   |   |   |       multipleOf.jst
|   |   |   |       not.jst
|   |   |   |       oneOf.jst
|   |   |   |       pattern.jst
|   |   |   |       properties.jst
|   |   |   |       propertyNames.jst
|   |   |   |       ref.jst
|   |   |   |       required.jst
|   |   |   |       uniqueItems.jst
|   |   |   |       validate.jst
|   |   |   |       _limit.jst
|   |   |   |       _limitItems.jst
|   |   |   |       _limitLength.jst
|   |   |   |       _limitProperties.jst
|   |   |   |       
|   |   |   +---dotjs
|   |   |   |       allOf.js
|   |   |   |       anyOf.js
|   |   |   |       comment.js
|   |   |   |       const.js
|   |   |   |       contains.js
|   |   |   |       custom.js
|   |   |   |       dependencies.js
|   |   |   |       enum.js
|   |   |   |       format.js
|   |   |   |       if.js
|   |   |   |       index.js
|   |   |   |       items.js
|   |   |   |       multipleOf.js
|   |   |   |       not.js
|   |   |   |       oneOf.js
|   |   |   |       pattern.js
|   |   |   |       properties.js
|   |   |   |       propertyNames.js
|   |   |   |       README.md
|   |   |   |       ref.js
|   |   |   |       required.js
|   |   |   |       uniqueItems.js
|   |   |   |       validate.js
|   |   |   |       _limit.js
|   |   |   |       _limitItems.js
|   |   |   |       _limitLength.js
|   |   |   |       _limitProperties.js
|   |   |   |       
|   |   |   \---refs
|   |   |           data.json
|   |   |           json-schema-draft-04.json
|   |   |           json-schema-draft-06.json
|   |   |           json-schema-draft-07.json
|   |   |           json-schema-secure.json
|   |   |           
|   |   \---scripts
|   |           .eslintrc.yml
|   |           bundle.js
|   |           compile-dots.js
|   |           info
|   |           prepare-tests
|   |           publish-built-version
|   |           travis-gh-pages
|   |           
|   +---ansi-escapes
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   license
|   |   |   package.json
|   |   |   readme.md
|   |   |   
|   |   \---node_modules
|   |       \---type-fest
|   |           |   base.d.ts
|   |           |   index.d.ts
|   |           |   license
|   |           |   package.json
|   |           |   readme.md
|   |           |   
|   |           +---source
|   |           |       async-return-type.d.ts
|   |           |       asyncify.d.ts
|   |           |       basic.d.ts
|   |           |       conditional-except.d.ts
|   |           |       conditional-keys.d.ts
|   |           |       conditional-pick.d.ts
|   |           |       entries.d.ts
|   |           |       entry.d.ts
|   |           |       except.d.ts
|   |           |       fixed-length-array.d.ts
|   |           |       iterable-element.d.ts
|   |           |       literal-union.d.ts
|   |           |       merge-exclusive.d.ts
|   |           |       merge.d.ts
|   |           |       mutable.d.ts
|   |           |       opaque.d.ts
|   |           |       package-json.d.ts
|   |           |       partial-deep.d.ts
|   |           |       promisable.d.ts
|   |           |       promise-value.d.ts
|   |           |       readonly-deep.d.ts
|   |           |       require-at-least-one.d.ts
|   |           |       require-exactly-one.d.ts
|   |           |       set-optional.d.ts
|   |           |       set-required.d.ts
|   |           |       set-return-type.d.ts
|   |           |       simplify.d.ts
|   |           |       stringified.d.ts
|   |           |       tsconfig-json.d.ts
|   |           |       typed-array.d.ts
|   |           |       union-to-intersection.d.ts
|   |           |       utilities.d.ts
|   |           |       value-of.d.ts
|   |           |       
|   |           \---ts41
|   |                   camel-case.d.ts
|   |                   delimiter-case.d.ts
|   |                   get.d.ts
|   |                   index.d.ts
|   |                   kebab-case.d.ts
|   |                   pascal-case.d.ts
|   |                   snake-case.d.ts
|   |                   utilities.d.ts
|   |                   
|   +---ansi-regex
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---ansi-styles
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---anymatch
|   |       index.d.ts
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---argparse
|   |   |   argparse.js
|   |   |   CHANGELOG.md
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           sub.js
|   |           textwrap.js
|   |           
|   +---asynckit
|   |   |   bench.js
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   parallel.js
|   |   |   README.md
|   |   |   serial.js
|   |   |   serialOrdered.js
|   |   |   stream.js
|   |   |   
|   |   \---lib
|   |           abort.js
|   |           async.js
|   |           defer.js
|   |           iterate.js
|   |           readable_asynckit.js
|   |           readable_parallel.js
|   |           readable_serial.js
|   |           readable_serial_ordered.js
|   |           state.js
|   |           streamify.js
|   |           terminator.js
|   |           
|   +---babel-jest
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---build
|   |   |       index.d.mts
|   |   |       index.d.ts
|   |   |       index.js
|   |   |       index.mjs
|   |   |       
|   |   \---node_modules
|   |       +---@jest
|   |       |   +---schemas
|   |       |   |   |   LICENSE
|   |       |   |   |   package.json
|   |       |   |   |   README.md
|   |       |   |   |   
|   |       |   |   \---build
|   |       |   |           index.d.mts
|   |       |   |           index.d.ts
|   |       |   |           index.js
|   |       |   |           index.mjs
|   |       |   |           
|   |       |   +---transform
|   |       |   |   |   LICENSE
|   |       |   |   |   package.json
|   |       |   |   |   
|   |       |   |   \---build
|   |       |   |           index.d.mts
|   |       |   |           index.d.ts
|   |       |   |           index.js
|   |       |   |           index.mjs
|   |       |   |           
|   |       |   \---types
|   |       |       |   LICENSE
|   |       |       |   package.json
|   |       |       |   README.md
|   |       |       |   
|   |       |       \---build
|   |       |               index.d.mts
|   |       |               index.d.ts
|   |       |               index.js
|   |       |               index.mjs
|   |       |               
|   |       +---@sinclair
|   |       |   \---typebox
|   |       |       |   license
|   |       |       |   package.json
|   |       |       |   readme.md
|   |       |       |   
|   |       |       +---build
|   |       |       |   +---cjs
|   |       |       |   |   |   index.d.ts
|   |       |       |   |   |   index.js
|   |       |       |   |   |   
|   |       |       |   |   +---compiler
|   |       |       |   |   |       compiler.d.ts
|   |       |       |   |   |       compiler.js
|   |       |       |   |   |       index.d.ts
|   |       |       |   |   |       index.js
|   |       |       |   |   |       
|   |       |       |   |   +---errors
|   |       |       |   |   |       errors.d.ts
|   |       |       |   |   |       errors.js
|   |       |       |   |   |       function.d.ts
|   |       |       |   |   |       function.js
|   |       |       |   |   |       index.d.ts
|   |       |       |   |   |       index.js
|   |       |       |   |   |       
|   |       |       |   |   +---parser
|   |       |       |   |   |   |   index.d.ts
|   |       |       |   |   |   |   index.js
|   |       |       |   |   |   |   
|   |       |       |   |   |   +---runtime
|   |       |       |   |   |   |       guard.d.ts
|   |       |       |   |   |   |       guard.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       module.d.ts
|   |       |       |   |   |   |       module.js
|   |       |       |   |   |   |       parse.d.ts
|   |       |       |   |   |   |       parse.js
|   |       |       |   |   |   |       token.d.ts
|   |       |       |   |   |   |       token.js
|   |       |       |   |   |   |       types.d.ts
|   |       |       |   |   |   |       types.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   \---static
|   |       |       |   |   |           index.d.ts
|   |       |       |   |   |           index.js
|   |       |       |   |   |           parse.d.ts
|   |       |       |   |   |           parse.js
|   |       |       |   |   |           token.d.ts
|   |       |       |   |   |           token.js
|   |       |       |   |   |           types.d.ts
|   |       |       |   |   |           types.js
|   |       |       |   |   |           
|   |       |       |   |   +---syntax
|   |       |       |   |   |       index.d.ts
|   |       |       |   |   |       index.js
|   |       |       |   |   |       mapping.d.ts
|   |       |       |   |   |       mapping.js
|   |       |       |   |   |       parser.d.ts
|   |       |       |   |   |       parser.js
|   |       |       |   |   |       syntax.d.ts
|   |       |       |   |   |       syntax.js
|   |       |       |   |   |       
|   |       |       |   |   +---system
|   |       |       |   |   |       index.d.ts
|   |       |       |   |   |       index.js
|   |       |       |   |   |       policy.d.ts
|   |       |       |   |   |       policy.js
|   |       |       |   |   |       system.d.ts
|   |       |       |   |   |       system.js
|   |       |       |   |   |       
|   |       |       |   |   +---type
|   |       |       |   |   |   |   index.d.ts
|   |       |       |   |   |   |   index.js
|   |       |       |   |   |   |   
|   |       |       |   |   |   +---any
|   |       |       |   |   |   |       any.d.ts
|   |       |       |   |   |   |       any.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---argument
|   |       |       |   |   |   |       argument.d.ts
|   |       |       |   |   |   |       argument.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---array
|   |       |       |   |   |   |       array.d.ts
|   |       |       |   |   |   |       array.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---async-iterator
|   |       |       |   |   |   |       async-iterator.d.ts
|   |       |       |   |   |   |       async-iterator.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---awaited
|   |       |       |   |   |   |       awaited.d.ts
|   |       |       |   |   |   |       awaited.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---bigint
|   |       |       |   |   |   |       bigint.d.ts
|   |       |       |   |   |   |       bigint.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---boolean
|   |       |       |   |   |   |       boolean.d.ts
|   |       |       |   |   |   |       boolean.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---clone
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       type.d.ts
|   |       |       |   |   |   |       type.js
|   |       |       |   |   |   |       value.d.ts
|   |       |       |   |   |   |       value.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---composite
|   |       |       |   |   |   |       composite.d.ts
|   |       |       |   |   |   |       composite.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---computed
|   |       |       |   |   |   |       computed.d.ts
|   |       |       |   |   |   |       computed.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---const
|   |       |       |   |   |   |       const.d.ts
|   |       |       |   |   |   |       const.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---constructor
|   |       |       |   |   |   |       constructor.d.ts
|   |       |       |   |   |   |       constructor.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---constructor-parameters
|   |       |       |   |   |   |       constructor-parameters.d.ts
|   |       |       |   |   |   |       constructor-parameters.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---create
|   |       |       |   |   |   |       immutable.d.ts
|   |       |       |   |   |   |       immutable.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       type.d.ts
|   |       |       |   |   |   |       type.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---date
|   |       |       |   |   |   |       date.d.ts
|   |       |       |   |   |   |       date.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---discard
|   |       |       |   |   |   |       discard.d.ts
|   |       |       |   |   |   |       discard.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---enum
|   |       |       |   |   |   |       enum.d.ts
|   |       |       |   |   |   |       enum.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---error
|   |       |       |   |   |   |       error.d.ts
|   |       |       |   |   |   |       error.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---exclude
|   |       |       |   |   |   |       exclude-from-mapped-result.d.ts
|   |       |       |   |   |   |       exclude-from-mapped-result.js
|   |       |       |   |   |   |       exclude-from-template-literal.d.ts
|   |       |       |   |   |   |       exclude-from-template-literal.js
|   |       |       |   |   |   |       exclude.d.ts
|   |       |       |   |   |   |       exclude.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---extends
|   |       |       |   |   |   |       extends-check.d.ts
|   |       |       |   |   |   |       extends-check.js
|   |       |       |   |   |   |       extends-from-mapped-key.d.ts
|   |       |       |   |   |   |       extends-from-mapped-key.js
|   |       |       |   |   |   |       extends-from-mapped-result.d.ts
|   |       |       |   |   |   |       extends-from-mapped-result.js
|   |       |       |   |   |   |       extends-undefined.d.ts
|   |       |       |   |   |   |       extends-undefined.js
|   |       |       |   |   |   |       extends.d.ts
|   |       |       |   |   |   |       extends.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---extract
|   |       |       |   |   |   |       extract-from-mapped-result.d.ts
|   |       |       |   |   |   |       extract-from-mapped-result.js
|   |       |       |   |   |   |       extract-from-template-literal.d.ts
|   |       |       |   |   |   |       extract-from-template-literal.js
|   |       |       |   |   |   |       extract.d.ts
|   |       |       |   |   |   |       extract.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---function
|   |       |       |   |   |   |       function.d.ts
|   |       |       |   |   |   |       function.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---guard
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       kind.d.ts
|   |       |       |   |   |   |       kind.js
|   |       |       |   |   |   |       type.d.ts
|   |       |       |   |   |   |       type.js
|   |       |       |   |   |   |       value.d.ts
|   |       |       |   |   |   |       value.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---helpers
|   |       |       |   |   |   |       helpers.d.ts
|   |       |       |   |   |   |       helpers.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---indexed
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       indexed-from-mapped-key.d.ts
|   |       |       |   |   |   |       indexed-from-mapped-key.js
|   |       |       |   |   |   |       indexed-from-mapped-result.d.ts
|   |       |       |   |   |   |       indexed-from-mapped-result.js
|   |       |       |   |   |   |       indexed-property-keys.d.ts
|   |       |       |   |   |   |       indexed-property-keys.js
|   |       |       |   |   |   |       indexed.d.ts
|   |       |       |   |   |   |       indexed.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---instance-type
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       instance-type.d.ts
|   |       |       |   |   |   |       instance-type.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---instantiate
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       instantiate.d.ts
|   |       |       |   |   |   |       instantiate.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---integer
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       integer.d.ts
|   |       |       |   |   |   |       integer.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---intersect
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       intersect-create.d.ts
|   |       |       |   |   |   |       intersect-create.js
|   |       |       |   |   |   |       intersect-evaluated.d.ts
|   |       |       |   |   |   |       intersect-evaluated.js
|   |       |       |   |   |   |       intersect-type.d.ts
|   |       |       |   |   |   |       intersect-type.js
|   |       |       |   |   |   |       intersect.d.ts
|   |       |       |   |   |   |       intersect.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---intrinsic
|   |       |       |   |   |   |       capitalize.d.ts
|   |       |       |   |   |   |       capitalize.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       intrinsic-from-mapped-key.d.ts
|   |       |       |   |   |   |       intrinsic-from-mapped-key.js
|   |       |       |   |   |   |       intrinsic.d.ts
|   |       |       |   |   |   |       intrinsic.js
|   |       |       |   |   |   |       lowercase.d.ts
|   |       |       |   |   |   |       lowercase.js
|   |       |       |   |   |   |       uncapitalize.d.ts
|   |       |       |   |   |   |       uncapitalize.js
|   |       |       |   |   |   |       uppercase.d.ts
|   |       |       |   |   |   |       uppercase.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---iterator
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       iterator.d.ts
|   |       |       |   |   |   |       iterator.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---keyof
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       keyof-from-mapped-result.d.ts
|   |       |       |   |   |   |       keyof-from-mapped-result.js
|   |       |       |   |   |   |       keyof-property-entries.d.ts
|   |       |       |   |   |   |       keyof-property-entries.js
|   |       |       |   |   |   |       keyof-property-keys.d.ts
|   |       |       |   |   |   |       keyof-property-keys.js
|   |       |       |   |   |   |       keyof.d.ts
|   |       |       |   |   |   |       keyof.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---literal
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       literal.d.ts
|   |       |       |   |   |   |       literal.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---mapped
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       mapped-key.d.ts
|   |       |       |   |   |   |       mapped-key.js
|   |       |       |   |   |   |       mapped-result.d.ts
|   |       |       |   |   |   |       mapped-result.js
|   |       |       |   |   |   |       mapped.d.ts
|   |       |       |   |   |   |       mapped.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---module
|   |       |       |   |   |   |       compute.d.ts
|   |       |       |   |   |   |       compute.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       infer.d.ts
|   |       |       |   |   |   |       infer.js
|   |       |       |   |   |   |       module.d.ts
|   |       |       |   |   |   |       module.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---never
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       never.d.ts
|   |       |       |   |   |   |       never.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---not
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       not.d.ts
|   |       |       |   |   |   |       not.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---null
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       null.d.ts
|   |       |       |   |   |   |       null.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---number
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       number.d.ts
|   |       |       |   |   |   |       number.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---object
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       object.d.ts
|   |       |       |   |   |   |       object.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---omit
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       omit-from-mapped-key.d.ts
|   |       |       |   |   |   |       omit-from-mapped-key.js
|   |       |       |   |   |   |       omit-from-mapped-result.d.ts
|   |       |       |   |   |   |       omit-from-mapped-result.js
|   |       |       |   |   |   |       omit.d.ts
|   |       |       |   |   |   |       omit.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---optional
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       optional-from-mapped-result.d.ts
|   |       |       |   |   |   |       optional-from-mapped-result.js
|   |       |       |   |   |   |       optional.d.ts
|   |       |       |   |   |   |       optional.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---parameters
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       parameters.d.ts
|   |       |       |   |   |   |       parameters.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---partial
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       partial-from-mapped-result.d.ts
|   |       |       |   |   |   |       partial-from-mapped-result.js
|   |       |       |   |   |   |       partial.d.ts
|   |       |       |   |   |   |       partial.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---patterns
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       patterns.d.ts
|   |       |       |   |   |   |       patterns.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---pick
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       pick-from-mapped-key.d.ts
|   |       |       |   |   |   |       pick-from-mapped-key.js
|   |       |       |   |   |   |       pick-from-mapped-result.d.ts
|   |       |       |   |   |   |       pick-from-mapped-result.js
|   |       |       |   |   |   |       pick.d.ts
|   |       |       |   |   |   |       pick.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---promise
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       promise.d.ts
|   |       |       |   |   |   |       promise.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---readonly
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       readonly-from-mapped-result.d.ts
|   |       |       |   |   |   |       readonly-from-mapped-result.js
|   |       |       |   |   |   |       readonly.d.ts
|   |       |       |   |   |   |       readonly.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---readonly-optional
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       readonly-optional.d.ts
|   |       |       |   |   |   |       readonly-optional.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---record
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       record.d.ts
|   |       |       |   |   |   |       record.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---recursive
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       recursive.d.ts
|   |       |       |   |   |   |       recursive.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---ref
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       ref.d.ts
|   |       |       |   |   |   |       ref.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---regexp
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       regexp.d.ts
|   |       |       |   |   |   |       regexp.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---registry
|   |       |       |   |   |   |       format.d.ts
|   |       |       |   |   |   |       format.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       type.d.ts
|   |       |       |   |   |   |       type.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---required
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       required-from-mapped-result.d.ts
|   |       |       |   |   |   |       required-from-mapped-result.js
|   |       |       |   |   |   |       required.d.ts
|   |       |       |   |   |   |       required.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---rest
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       rest.d.ts
|   |       |       |   |   |   |       rest.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---return-type
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       return-type.d.ts
|   |       |       |   |   |   |       return-type.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---schema
|   |       |       |   |   |   |       anyschema.d.ts
|   |       |       |   |   |   |       anyschema.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       schema.d.ts
|   |       |       |   |   |   |       schema.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---sets
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       set.d.ts
|   |       |       |   |   |   |       set.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---static
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       static.d.ts
|   |       |       |   |   |   |       static.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---string
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       string.d.ts
|   |       |       |   |   |   |       string.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---symbol
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       symbol.d.ts
|   |       |       |   |   |   |       symbol.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---symbols
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       symbols.d.ts
|   |       |       |   |   |   |       symbols.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---template-literal
|   |       |       |   |   |   |       finite.d.ts
|   |       |       |   |   |   |       finite.js
|   |       |       |   |   |   |       generate.d.ts
|   |       |       |   |   |   |       generate.js
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       parse.d.ts
|   |       |       |   |   |   |       parse.js
|   |       |       |   |   |   |       pattern.d.ts
|   |       |       |   |   |   |       pattern.js
|   |       |       |   |   |   |       syntax.d.ts
|   |       |       |   |   |   |       syntax.js
|   |       |       |   |   |   |       template-literal.d.ts
|   |       |       |   |   |   |       template-literal.js
|   |       |       |   |   |   |       union.d.ts
|   |       |       |   |   |   |       union.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---transform
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       transform.d.ts
|   |       |       |   |   |   |       transform.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---tuple
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       tuple.d.ts
|   |       |       |   |   |   |       tuple.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---type
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       javascript.d.ts
|   |       |       |   |   |   |       javascript.js
|   |       |       |   |   |   |       json.d.ts
|   |       |       |   |   |   |       json.js
|   |       |       |   |   |   |       type.d.ts
|   |       |       |   |   |   |       type.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---uint8array
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       uint8array.d.ts
|   |       |       |   |   |   |       uint8array.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---undefined
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       undefined.d.ts
|   |       |       |   |   |   |       undefined.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---union
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       union-create.d.ts
|   |       |       |   |   |   |       union-create.js
|   |       |       |   |   |   |       union-evaluated.d.ts
|   |       |       |   |   |   |       union-evaluated.js
|   |       |       |   |   |   |       union-type.d.ts
|   |       |       |   |   |   |       union-type.js
|   |       |       |   |   |   |       union.d.ts
|   |       |       |   |   |   |       union.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---unknown
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       unknown.d.ts
|   |       |       |   |   |   |       unknown.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   +---unsafe
|   |       |       |   |   |   |       index.d.ts
|   |       |       |   |   |   |       index.js
|   |       |       |   |   |   |       unsafe.d.ts
|   |       |       |   |   |   |       unsafe.js
|   |       |       |   |   |   |       
|   |       |       |   |   |   \---void
|   |       |       |   |   |           index.d.ts
|   |       |       |   |   |           index.js
|   |       |       |   |   |           void.d.ts
|   |       |       |   |   |           void.js
|   |       |       |   |   |           
|   |       |       |   |   \---value
|   |       |       |   |       |   index.d.ts
|   |       |       |   |       |   index.js
|   |       |       |   |       |   
|   |       |       |   |       +---assert
|   |       |       |   |       |       assert.d.ts
|   |       |       |   |       |       assert.js
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       
|   |       |       |   |       +---cast
|   |       |       |   |       |       cast.d.ts
|   |       |       |   |       |       cast.js
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       
|   |       |       |   |       +---check
|   |       |       |   |       |       check.d.ts
|   |       |       |   |       |       check.js
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       
|   |       |       |   |       +---clean
|   |       |       |   |       |       clean.d.ts
|   |       |       |   |       |       clean.js
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       
|   |       |       |   |       +---clone
|   |       |       |   |       |       clone.d.ts
|   |       |       |   |       |       clone.js
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       
|   |       |       |   |       +---convert
|   |       |       |   |       |       convert.d.ts
|   |       |       |   |       |       convert.js
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       
|   |       |       |   |       +---create
|   |       |       |   |       |       create.d.ts
|   |       |       |   |       |       create.js
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       
|   |       |       |   |       +---decode
|   |       |       |   |       |       decode.d.ts
|   |       |       |   |       |       decode.js
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       
|   |       |       |   |       +---default
|   |       |       |   |       |       default.d.ts
|   |       |       |   |       |       default.js
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       
|   |       |       |   |       +---delta
|   |       |       |   |       |       delta.d.ts
|   |       |       |   |       |       delta.js
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       
|   |       |       |   |       +---deref
|   |       |       |   |       |       deref.d.ts
|   |       |       |   |       |       deref.js
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       
|   |       |       |   |       +---encode
|   |       |       |   |       |       encode.d.ts
|   |       |       |   |       |       encode.js
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       
|   |       |       |   |       +---equal
|   |       |       |   |       |       equal.d.ts
|   |       |       |   |       |       equal.js
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       
|   |       |       |   |       +---guard
|   |       |       |   |       |       guard.d.ts
|   |       |       |   |       |       guard.js
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       
|   |       |       |   |       +---hash
|   |       |       |   |       |       hash.d.ts
|   |       |       |   |       |       hash.js
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       
|   |       |       |   |       +---mutate
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       mutate.d.ts
|   |       |       |   |       |       mutate.js
|   |       |       |   |       |       
|   |       |       |   |       +---parse
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       parse.d.ts
|   |       |       |   |       |       parse.js
|   |       |       |   |       |       
|   |       |       |   |       +---pointer
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       pointer.d.ts
|   |       |       |   |       |       pointer.js
|   |       |       |   |       |       
|   |       |       |   |       +---transform
|   |       |       |   |       |       decode.d.ts
|   |       |       |   |       |       decode.js
|   |       |       |   |       |       encode.d.ts
|   |       |       |   |       |       encode.js
|   |       |       |   |       |       has.d.ts
|   |       |       |   |       |       has.js
|   |       |       |   |       |       index.d.ts
|   |       |       |   |       |       index.js
|   |       |       |   |       |       
|   |       |       |   |       \---value
|   |       |       |   |               index.d.ts
|   |       |       |   |               index.js
|   |       |       |   |               value.d.ts
|   |       |       |   |               value.js
|   |       |       |   |               
|   |       |       |   \---esm
|   |       |       |       |   index.d.mts
|   |       |       |       |   index.mjs
|   |       |       |       |   
|   |       |       |       +---compiler
|   |       |       |       |       compiler.d.mts
|   |       |       |       |       compiler.mjs
|   |       |       |       |       index.d.mts
|   |       |       |       |       index.mjs
|   |       |       |       |       
|   |       |       |       +---errors
|   |       |       |       |       errors.d.mts
|   |       |       |       |       errors.mjs
|   |       |       |       |       function.d.mts
|   |       |       |       |       function.mjs
|   |       |       |       |       index.d.mts
|   |       |       |       |       index.mjs
|   |       |       |       |       
|   |       |       |       +---parser
|   |       |       |       |   |   index.d.mts
|   |       |       |       |   |   index.mjs
|   |       |       |       |   |   
|   |       |       |       |   +---runtime
|   |       |       |       |   |       guard.d.mts
|   |       |       |       |   |       guard.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       module.d.mts
|   |       |       |       |   |       module.mjs
|   |       |       |       |   |       parse.d.mts
|   |       |       |       |   |       parse.mjs
|   |       |       |       |   |       token.d.mts
|   |       |       |       |   |       token.mjs
|   |       |       |       |   |       types.d.mts
|   |       |       |       |   |       types.mjs
|   |       |       |       |   |       
|   |       |       |       |   \---static
|   |       |       |       |           index.d.mts
|   |       |       |       |           index.mjs
|   |       |       |       |           parse.d.mts
|   |       |       |       |           parse.mjs
|   |       |       |       |           token.d.mts
|   |       |       |       |           token.mjs
|   |       |       |       |           types.d.mts
|   |       |       |       |           types.mjs
|   |       |       |       |           
|   |       |       |       +---syntax
|   |       |       |       |       index.d.mts
|   |       |       |       |       index.mjs
|   |       |       |       |       mapping.d.mts
|   |       |       |       |       mapping.mjs
|   |       |       |       |       parser.d.mts
|   |       |       |       |       parser.mjs
|   |       |       |       |       syntax.d.mts
|   |       |       |       |       syntax.mjs
|   |       |       |       |       
|   |       |       |       +---system
|   |       |       |       |       index.d.mts
|   |       |       |       |       index.mjs
|   |       |       |       |       policy.d.mts
|   |       |       |       |       policy.mjs
|   |       |       |       |       system.d.mts
|   |       |       |       |       system.mjs
|   |       |       |       |       
|   |       |       |       +---type
|   |       |       |       |   |   index.d.mts
|   |       |       |       |   |   index.mjs
|   |       |       |       |   |   
|   |       |       |       |   +---any
|   |       |       |       |   |       any.d.mts
|   |       |       |       |   |       any.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---argument
|   |       |       |       |   |       argument.d.mts
|   |       |       |       |   |       argument.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---array
|   |       |       |       |   |       array.d.mts
|   |       |       |       |   |       array.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---async-iterator
|   |       |       |       |   |       async-iterator.d.mts
|   |       |       |       |   |       async-iterator.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---awaited
|   |       |       |       |   |       awaited.d.mts
|   |       |       |       |   |       awaited.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---bigint
|   |       |       |       |   |       bigint.d.mts
|   |       |       |       |   |       bigint.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---boolean
|   |       |       |       |   |       boolean.d.mts
|   |       |       |       |   |       boolean.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---clone
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       type.d.mts
|   |       |       |       |   |       type.mjs
|   |       |       |       |   |       value.d.mts
|   |       |       |       |   |       value.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---composite
|   |       |       |       |   |       composite.d.mts
|   |       |       |       |   |       composite.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---computed
|   |       |       |       |   |       computed.d.mts
|   |       |       |       |   |       computed.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---const
|   |       |       |       |   |       const.d.mts
|   |       |       |       |   |       const.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---constructor
|   |       |       |       |   |       constructor.d.mts
|   |       |       |       |   |       constructor.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---constructor-parameters
|   |       |       |       |   |       constructor-parameters.d.mts
|   |       |       |       |   |       constructor-parameters.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---create
|   |       |       |       |   |       immutable.d.mts
|   |       |       |       |   |       immutable.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       type.d.mts
|   |       |       |       |   |       type.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---date
|   |       |       |       |   |       date.d.mts
|   |       |       |       |   |       date.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---discard
|   |       |       |       |   |       discard.d.mts
|   |       |       |       |   |       discard.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---enum
|   |       |       |       |   |       enum.d.mts
|   |       |       |       |   |       enum.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---error
|   |       |       |       |   |       error.d.mts
|   |       |       |       |   |       error.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---exclude
|   |       |       |       |   |       exclude-from-mapped-result.d.mts
|   |       |       |       |   |       exclude-from-mapped-result.mjs
|   |       |       |       |   |       exclude-from-template-literal.d.mts
|   |       |       |       |   |       exclude-from-template-literal.mjs
|   |       |       |       |   |       exclude.d.mts
|   |       |       |       |   |       exclude.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---extends
|   |       |       |       |   |       extends-check.d.mts
|   |       |       |       |   |       extends-check.mjs
|   |       |       |       |   |       extends-from-mapped-key.d.mts
|   |       |       |       |   |       extends-from-mapped-key.mjs
|   |       |       |       |   |       extends-from-mapped-result.d.mts
|   |       |       |       |   |       extends-from-mapped-result.mjs
|   |       |       |       |   |       extends-undefined.d.mts
|   |       |       |       |   |       extends-undefined.mjs
|   |       |       |       |   |       extends.d.mts
|   |       |       |       |   |       extends.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---extract
|   |       |       |       |   |       extract-from-mapped-result.d.mts
|   |       |       |       |   |       extract-from-mapped-result.mjs
|   |       |       |       |   |       extract-from-template-literal.d.mts
|   |       |       |       |   |       extract-from-template-literal.mjs
|   |       |       |       |   |       extract.d.mts
|   |       |       |       |   |       extract.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---function
|   |       |       |       |   |       function.d.mts
|   |       |       |       |   |       function.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---guard
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       kind.d.mts
|   |       |       |       |   |       kind.mjs
|   |       |       |       |   |       type.d.mts
|   |       |       |       |   |       type.mjs
|   |       |       |       |   |       value.d.mts
|   |       |       |       |   |       value.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---helpers
|   |       |       |       |   |       helpers.d.mts
|   |       |       |       |   |       helpers.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---indexed
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       indexed-from-mapped-key.d.mts
|   |       |       |       |   |       indexed-from-mapped-key.mjs
|   |       |       |       |   |       indexed-from-mapped-result.d.mts
|   |       |       |       |   |       indexed-from-mapped-result.mjs
|   |       |       |       |   |       indexed-property-keys.d.mts
|   |       |       |       |   |       indexed-property-keys.mjs
|   |       |       |       |   |       indexed.d.mts
|   |       |       |       |   |       indexed.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---instance-type
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       instance-type.d.mts
|   |       |       |       |   |       instance-type.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---instantiate
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       instantiate.d.mts
|   |       |       |       |   |       instantiate.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---integer
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       integer.d.mts
|   |       |       |       |   |       integer.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---intersect
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       intersect-create.d.mts
|   |       |       |       |   |       intersect-create.mjs
|   |       |       |       |   |       intersect-evaluated.d.mts
|   |       |       |       |   |       intersect-evaluated.mjs
|   |       |       |       |   |       intersect-type.d.mts
|   |       |       |       |   |       intersect-type.mjs
|   |       |       |       |   |       intersect.d.mts
|   |       |       |       |   |       intersect.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---intrinsic
|   |       |       |       |   |       capitalize.d.mts
|   |       |       |       |   |       capitalize.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       intrinsic-from-mapped-key.d.mts
|   |       |       |       |   |       intrinsic-from-mapped-key.mjs
|   |       |       |       |   |       intrinsic.d.mts
|   |       |       |       |   |       intrinsic.mjs
|   |       |       |       |   |       lowercase.d.mts
|   |       |       |       |   |       lowercase.mjs
|   |       |       |       |   |       uncapitalize.d.mts
|   |       |       |       |   |       uncapitalize.mjs
|   |       |       |       |   |       uppercase.d.mts
|   |       |       |       |   |       uppercase.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---iterator
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       iterator.d.mts
|   |       |       |       |   |       iterator.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---keyof
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       keyof-from-mapped-result.d.mts
|   |       |       |       |   |       keyof-from-mapped-result.mjs
|   |       |       |       |   |       keyof-property-entries.d.mts
|   |       |       |       |   |       keyof-property-entries.mjs
|   |       |       |       |   |       keyof-property-keys.d.mts
|   |       |       |       |   |       keyof-property-keys.mjs
|   |       |       |       |   |       keyof.d.mts
|   |       |       |       |   |       keyof.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---literal
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       literal.d.mts
|   |       |       |       |   |       literal.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---mapped
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       mapped-key.d.mts
|   |       |       |       |   |       mapped-key.mjs
|   |       |       |       |   |       mapped-result.d.mts
|   |       |       |       |   |       mapped-result.mjs
|   |       |       |       |   |       mapped.d.mts
|   |       |       |       |   |       mapped.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---module
|   |       |       |       |   |       compute.d.mts
|   |       |       |       |   |       compute.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       infer.d.mts
|   |       |       |       |   |       infer.mjs
|   |       |       |       |   |       module.d.mts
|   |       |       |       |   |       module.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---never
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       never.d.mts
|   |       |       |       |   |       never.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---not
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       not.d.mts
|   |       |       |       |   |       not.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---null
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       null.d.mts
|   |       |       |       |   |       null.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---number
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       number.d.mts
|   |       |       |       |   |       number.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---object
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       object.d.mts
|   |       |       |       |   |       object.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---omit
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       omit-from-mapped-key.d.mts
|   |       |       |       |   |       omit-from-mapped-key.mjs
|   |       |       |       |   |       omit-from-mapped-result.d.mts
|   |       |       |       |   |       omit-from-mapped-result.mjs
|   |       |       |       |   |       omit.d.mts
|   |       |       |       |   |       omit.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---optional
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       optional-from-mapped-result.d.mts
|   |       |       |       |   |       optional-from-mapped-result.mjs
|   |       |       |       |   |       optional.d.mts
|   |       |       |       |   |       optional.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---parameters
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       parameters.d.mts
|   |       |       |       |   |       parameters.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---partial
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       partial-from-mapped-result.d.mts
|   |       |       |       |   |       partial-from-mapped-result.mjs
|   |       |       |       |   |       partial.d.mts
|   |       |       |       |   |       partial.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---patterns
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       patterns.d.mts
|   |       |       |       |   |       patterns.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---pick
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       pick-from-mapped-key.d.mts
|   |       |       |       |   |       pick-from-mapped-key.mjs
|   |       |       |       |   |       pick-from-mapped-result.d.mts
|   |       |       |       |   |       pick-from-mapped-result.mjs
|   |       |       |       |   |       pick.d.mts
|   |       |       |       |   |       pick.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---promise
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       promise.d.mts
|   |       |       |       |   |       promise.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---readonly
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       readonly-from-mapped-result.d.mts
|   |       |       |       |   |       readonly-from-mapped-result.mjs
|   |       |       |       |   |       readonly.d.mts
|   |       |       |       |   |       readonly.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---readonly-optional
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       readonly-optional.d.mts
|   |       |       |       |   |       readonly-optional.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---record
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       record.d.mts
|   |       |       |       |   |       record.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---recursive
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       recursive.d.mts
|   |       |       |       |   |       recursive.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---ref
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       ref.d.mts
|   |       |       |       |   |       ref.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---regexp
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       regexp.d.mts
|   |       |       |       |   |       regexp.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---registry
|   |       |       |       |   |       format.d.mts
|   |       |       |       |   |       format.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       type.d.mts
|   |       |       |       |   |       type.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---required
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       required-from-mapped-result.d.mts
|   |       |       |       |   |       required-from-mapped-result.mjs
|   |       |       |       |   |       required.d.mts
|   |       |       |       |   |       required.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---rest
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       rest.d.mts
|   |       |       |       |   |       rest.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---return-type
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       return-type.d.mts
|   |       |       |       |   |       return-type.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---schema
|   |       |       |       |   |       anyschema.d.mts
|   |       |       |       |   |       anyschema.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       schema.d.mts
|   |       |       |       |   |       schema.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---sets
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       set.d.mts
|   |       |       |       |   |       set.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---static
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       static.d.mts
|   |       |       |       |   |       static.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---string
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       string.d.mts
|   |       |       |       |   |       string.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---symbol
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       symbol.d.mts
|   |       |       |       |   |       symbol.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---symbols
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       symbols.d.mts
|   |       |       |       |   |       symbols.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---template-literal
|   |       |       |       |   |       finite.d.mts
|   |       |       |       |   |       finite.mjs
|   |       |       |       |   |       generate.d.mts
|   |       |       |       |   |       generate.mjs
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       parse.d.mts
|   |       |       |       |   |       parse.mjs
|   |       |       |       |   |       pattern.d.mts
|   |       |       |       |   |       pattern.mjs
|   |       |       |       |   |       syntax.d.mts
|   |       |       |       |   |       syntax.mjs
|   |       |       |       |   |       template-literal.d.mts
|   |       |       |       |   |       template-literal.mjs
|   |       |       |       |   |       union.d.mts
|   |       |       |       |   |       union.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---transform
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       transform.d.mts
|   |       |       |       |   |       transform.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---tuple
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       tuple.d.mts
|   |       |       |       |   |       tuple.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---type
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       javascript.d.mts
|   |       |       |       |   |       javascript.mjs
|   |       |       |       |   |       json.d.mts
|   |       |       |       |   |       json.mjs
|   |       |       |       |   |       type.d.mts
|   |       |       |       |   |       type.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---uint8array
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       uint8array.d.mts
|   |       |       |       |   |       uint8array.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---undefined
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       undefined.d.mts
|   |       |       |       |   |       undefined.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---union
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       union-create.d.mts
|   |       |       |       |   |       union-create.mjs
|   |       |       |       |   |       union-evaluated.d.mts
|   |       |       |       |   |       union-evaluated.mjs
|   |       |       |       |   |       union-type.d.mts
|   |       |       |       |   |       union-type.mjs
|   |       |       |       |   |       union.d.mts
|   |       |       |       |   |       union.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---unknown
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       unknown.d.mts
|   |       |       |       |   |       unknown.mjs
|   |       |       |       |   |       
|   |       |       |       |   +---unsafe
|   |       |       |       |   |       index.d.mts
|   |       |       |       |   |       index.mjs
|   |       |       |       |   |       unsafe.d.mts
|   |       |       |       |   |       unsafe.mjs
|   |       |       |       |   |       
|   |       |       |       |   \---void
|   |       |       |       |           index.d.mts
|   |       |       |       |           index.mjs
|   |       |       |       |           void.d.mts
|   |       |       |       |           void.mjs
|   |       |       |       |           
|   |       |       |       \---value
|   |       |       |           |   index.d.mts
|   |       |       |           |   index.mjs
|   |       |       |           |   
|   |       |       |           +---assert
|   |       |       |           |       assert.d.mts
|   |       |       |           |       assert.mjs
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       
|   |       |       |           +---cast
|   |       |       |           |       cast.d.mts
|   |       |       |           |       cast.mjs
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       
|   |       |       |           +---check
|   |       |       |           |       check.d.mts
|   |       |       |           |       check.mjs
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       
|   |       |       |           +---clean
|   |       |       |           |       clean.d.mts
|   |       |       |           |       clean.mjs
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       
|   |       |       |           +---clone
|   |       |       |           |       clone.d.mts
|   |       |       |           |       clone.mjs
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       
|   |       |       |           +---convert
|   |       |       |           |       convert.d.mts
|   |       |       |           |       convert.mjs
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       
|   |       |       |           +---create
|   |       |       |           |       create.d.mts
|   |       |       |           |       create.mjs
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       
|   |       |       |           +---decode
|   |       |       |           |       decode.d.mts
|   |       |       |           |       decode.mjs
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       
|   |       |       |           +---default
|   |       |       |           |       default.d.mts
|   |       |       |           |       default.mjs
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       
|   |       |       |           +---delta
|   |       |       |           |       delta.d.mts
|   |       |       |           |       delta.mjs
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       
|   |       |       |           +---deref
|   |       |       |           |       deref.d.mts
|   |       |       |           |       deref.mjs
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       
|   |       |       |           +---encode
|   |       |       |           |       encode.d.mts
|   |       |       |           |       encode.mjs
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       
|   |       |       |           +---equal
|   |       |       |           |       equal.d.mts
|   |       |       |           |       equal.mjs
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       
|   |       |       |           +---guard
|   |       |       |           |       guard.d.mts
|   |       |       |           |       guard.mjs
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       
|   |       |       |           +---hash
|   |       |       |           |       hash.d.mts
|   |       |       |           |       hash.mjs
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       
|   |       |       |           +---mutate
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       mutate.d.mts
|   |       |       |           |       mutate.mjs
|   |       |       |           |       
|   |       |       |           +---parse
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       parse.d.mts
|   |       |       |           |       parse.mjs
|   |       |       |           |       
|   |       |       |           +---pointer
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       pointer.d.mts
|   |       |       |           |       pointer.mjs
|   |       |       |           |       
|   |       |       |           +---transform
|   |       |       |           |       decode.d.mts
|   |       |       |           |       decode.mjs
|   |       |       |           |       encode.d.mts
|   |       |       |           |       encode.mjs
|   |       |       |           |       has.d.mts
|   |       |       |           |       has.mjs
|   |       |       |           |       index.d.mts
|   |       |       |           |       index.mjs
|   |       |       |           |       
|   |       |       |           \---value
|   |       |       |                   index.d.mts
|   |       |       |                   index.mjs
|   |       |       |                   value.d.mts
|   |       |       |                   value.mjs
|   |       |       |                   
|   |       |       +---compiler
|   |       |       |       package.json
|   |       |       |       
|   |       |       +---errors
|   |       |       |       package.json
|   |       |       |       
|   |       |       +---parser
|   |       |       |       package.json
|   |       |       |       
|   |       |       +---syntax
|   |       |       |       package.json
|   |       |       |       
|   |       |       +---system
|   |       |       |       package.json
|   |       |       |       
|   |       |       +---type
|   |       |       |       package.json
|   |       |       |       
|   |       |       \---value
|   |       |               package.json
|   |       |               
|   |       +---babel-plugin-istanbul
|   |       |   |   CHANGELOG.md
|   |       |   |   LICENSE
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   
|   |       |   \---lib
|   |       |           index.js
|   |       |           load-nyc-config-sync.js
|   |       |           
|   |       +---ci-info
|   |       |       CHANGELOG.md
|   |       |       index.d.ts
|   |       |       index.js
|   |       |       LICENSE
|   |       |       package.json
|   |       |       README.md
|   |       |       vendors.json
|   |       |       
|   |       +---jest-haste-map
|   |       |   |   LICENSE
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   
|   |       |   \---build
|   |       |           index.d.mts
|   |       |           index.d.ts
|   |       |           index.js
|   |       |           index.mjs
|   |       |           worker.d.mts
|   |       |           worker.js
|   |       |           worker.mjs
|   |       |           
|   |       +---jest-regex-util
|   |       |   |   LICENSE
|   |       |   |   package.json
|   |       |   |   
|   |       |   \---build
|   |       |           index.d.ts
|   |       |           index.js
|   |       |           index.mjs
|   |       |           
|   |       +---jest-util
|   |       |   |   LICENSE
|   |       |   |   package.json
|   |       |   |   Readme.md
|   |       |   |   
|   |       |   \---build
|   |       |           chunk-BQ42LXoh.mjs
|   |       |           index.d.mts
|   |       |           index.d.ts
|   |       |           index.js
|   |       |           index.mjs
|   |       |           
|   |       +---jest-worker
|   |       |   |   LICENSE
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   
|   |       |   \---build
|   |       |           index.d.mts
|   |       |           index.d.ts
|   |       |           index.js
|   |       |           index.mjs
|   |       |           processChild.d.mts
|   |       |           processChild.js
|   |       |           processChild.mjs
|   |       |           threadChild.d.mts
|   |       |           threadChild.js
|   |       |           threadChild.mjs
|   |       |           
|   |       +---picomatch
|   |       |   |   index.js
|   |       |   |   LICENSE
|   |       |   |   package.json
|   |       |   |   posix.js
|   |       |   |   README.md
|   |       |   |   
|   |       |   \---lib
|   |       |           constants.js
|   |       |           parse.js
|   |       |           picomatch.js
|   |       |           scan.js
|   |       |           utils.js
|   |       |           
|   |       +---signal-exit
|   |       |   |   LICENSE.txt
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   
|   |       |   \---dist
|   |       |       +---cjs
|   |       |       |       browser.d.ts
|   |       |       |       browser.d.ts.map
|   |       |       |       browser.js
|   |       |       |       browser.js.map
|   |       |       |       index.d.ts
|   |       |       |       index.d.ts.map
|   |       |       |       index.js
|   |       |       |       index.js.map
|   |       |       |       package.json
|   |       |       |       signals.d.ts
|   |       |       |       signals.d.ts.map
|   |       |       |       signals.js
|   |       |       |       signals.js.map
|   |       |       |       
|   |       |       \---mjs
|   |       |               browser.d.ts
|   |       |               browser.d.ts.map
|   |       |               browser.js
|   |       |               browser.js.map
|   |       |               index.d.ts
|   |       |               index.d.ts.map
|   |       |               index.js
|   |       |               index.js.map
|   |       |               package.json
|   |       |               signals.d.ts
|   |       |               signals.d.ts.map
|   |       |               signals.js
|   |       |               signals.js.map
|   |       |               
|   |       +---supports-color
|   |       |       browser.js
|   |       |       index.js
|   |       |       license
|   |       |       package.json
|   |       |       readme.md
|   |       |       
|   |       \---write-file-atomic
|   |           |   LICENSE.md
|   |           |   package.json
|   |           |   README.md
|   |           |   
|   |           \---lib
|   |                   index.js
|   |                   
|   +---babel-plugin-istanbul
|   |   |   CHANGELOG.md
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---lib
|   |   |       index.js
|   |   |       load-nyc-config-sync.js
|   |   |       
|   |   \---node_modules
|   |       \---istanbul-lib-instrument
|   |           |   CHANGELOG.md
|   |           |   LICENSE
|   |           |   package.json
|   |           |   README.md
|   |           |   
|   |           \---src
|   |                   constants.js
|   |                   index.js
|   |                   instrumenter.js
|   |                   read-coverage.js
|   |                   source-coverage.js
|   |                   visitor.js
|   |                   
|   +---babel-plugin-jest-hoist
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---build
|   |           index.d.ts
|   |           index.js
|   |           index.mjs
|   |           
|   +---babel-plugin-polyfill-corejs2
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---esm
|   |   |       index.mjs
|   |   |       index.mjs.map
|   |   |       
|   |   \---lib
|   |           add-platform-specific-polyfills.js
|   |           built-in-definitions.js
|   |           helpers.js
|   |           index.js
|   |           
|   +---babel-plugin-polyfill-corejs3
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---core-js-compat
|   |   |       data.js
|   |   |       entries.js
|   |   |       get-modules-list-for-target-version.js
|   |   |       README.md
|   |   |       
|   |   +---esm
|   |   |       index.mjs
|   |   |       index.mjs.map
|   |   |       
|   |   \---lib
|   |           babel-runtime-corejs3-paths.js
|   |           built-in-definitions.js
|   |           index.js
|   |           shipped-proposals.js
|   |           usage-filters.js
|   |           utils.js
|   |           
|   +---babel-plugin-polyfill-regenerator
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---esm
|   |   |       index.mjs
|   |   |       index.mjs.map
|   |   |       
|   |   \---lib
|   |           index.js
|   |           
|   +---babel-preset-current-node-syntax
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---.github
|   |   |   |   FUNDING.yml
|   |   |   |   
|   |   |   \---workflows
|   |   |           nodejs.yml
|   |   |           
|   |   \---src
|   |           index.js
|   |           
|   +---babel-preset-jest
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---balanced-match
|   |   |   index.js
|   |   |   LICENSE.md
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---.github
|   |           FUNDING.yml
|   |           
|   +---brace-expansion
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---braces
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           compile.js
|   |           constants.js
|   |           expand.js
|   |           parse.js
|   |           stringify.js
|   |           utils.js
|   |           
|   +---browserslist
|   |       browser.js
|   |       cli.js
|   |       error.d.ts
|   |       error.js
|   |       index.d.ts
|   |       index.js
|   |       LICENSE
|   |       node.js
|   |       package.json
|   |       parse.js
|   |       README.md
|   |       
|   +---bser
|   |       index.js
|   |       package.json
|   |       README.md
|   |       
|   +---buffer-from
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       readme.md
|   |       
|   +---call-bind-apply-helpers
|   |   |   .eslintrc
|   |   |   .nycrc
|   |   |   actualApply.d.ts
|   |   |   actualApply.js
|   |   |   applyBind.d.ts
|   |   |   applyBind.js
|   |   |   CHANGELOG.md
|   |   |   functionApply.d.ts
|   |   |   functionApply.js
|   |   |   functionCall.d.ts
|   |   |   functionCall.js
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   reflectApply.d.ts
|   |   |   reflectApply.js
|   |   |   tsconfig.json
|   |   |   
|   |   +---.github
|   |   |       FUNDING.yml
|   |   |       
|   |   \---test
|   |           index.js
|   |           
|   +---callsites
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---camelcase
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---caniuse-lite
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---data
|   |   |   |   agents.js
|   |   |   |   browsers.js
|   |   |   |   browserVersions.js
|   |   |   |   features.js
|   |   |   |   
|   |   |   +---features
|   |   |   |       aac.js
|   |   |   |       abortcontroller.js
|   |   |   |       ac3-ec3.js
|   |   |   |       accelerometer.js
|   |   |   |       addeventlistener.js
|   |   |   |       alternate-stylesheet.js
|   |   |   |       ambient-light.js
|   |   |   |       apng.js
|   |   |   |       array-find-index.js
|   |   |   |       array-find.js
|   |   |   |       array-flat.js
|   |   |   |       array-includes.js
|   |   |   |       arrow-functions.js
|   |   |   |       asmjs.js
|   |   |   |       async-clipboard.js
|   |   |   |       async-functions.js
|   |   |   |       atob-btoa.js
|   |   |   |       audio-api.js
|   |   |   |       audio.js
|   |   |   |       audiotracks.js
|   |   |   |       autofocus.js
|   |   |   |       auxclick.js
|   |   |   |       av1.js
|   |   |   |       avif.js
|   |   |   |       background-attachment.js
|   |   |   |       background-clip-text.js
|   |   |   |       background-img-opts.js
|   |   |   |       background-position-x-y.js
|   |   |   |       background-repeat-round-space.js
|   |   |   |       background-sync.js
|   |   |   |       battery-status.js
|   |   |   |       beacon.js
|   |   |   |       beforeafterprint.js
|   |   |   |       bigint.js
|   |   |   |       blobbuilder.js
|   |   |   |       bloburls.js
|   |   |   |       border-image.js
|   |   |   |       border-radius.js
|   |   |   |       broadcastchannel.js
|   |   |   |       brotli.js
|   |   |   |       calc.js
|   |   |   |       canvas-blending.js
|   |   |   |       canvas-text.js
|   |   |   |       canvas.js
|   |   |   |       ch-unit.js
|   |   |   |       chacha20-poly1305.js
|   |   |   |       channel-messaging.js
|   |   |   |       childnode-remove.js
|   |   |   |       classlist.js
|   |   |   |       client-hints-dpr-width-viewport.js
|   |   |   |       clipboard.js
|   |   |   |       colr-v1.js
|   |   |   |       colr.js
|   |   |   |       comparedocumentposition.js
|   |   |   |       console-basic.js
|   |   |   |       console-time.js
|   |   |   |       const.js
|   |   |   |       constraint-validation.js
|   |   |   |       contenteditable.js
|   |   |   |       contentsecuritypolicy.js
|   |   |   |       contentsecuritypolicy2.js
|   |   |   |       cookie-store-api.js
|   |   |   |       cors.js
|   |   |   |       createimagebitmap.js
|   |   |   |       credential-management.js
|   |   |   |       cross-document-view-transitions.js
|   |   |   |       cryptography.js
|   |   |   |       css-all.js
|   |   |   |       css-anchor-positioning.js
|   |   |   |       css-animation.js
|   |   |   |       css-any-link.js
|   |   |   |       css-appearance.js
|   |   |   |       css-at-counter-style.js
|   |   |   |       css-autofill.js
|   |   |   |       css-backdrop-filter.js
|   |   |   |       css-background-offsets.js
|   |   |   |       css-backgroundblendmode.js
|   |   |   |       css-boxdecorationbreak.js
|   |   |   |       css-boxshadow.js
|   |   |   |       css-canvas.js
|   |   |   |       css-caret-color.js
|   |   |   |       css-cascade-layers.js
|   |   |   |       css-cascade-scope.js
|   |   |   |       css-case-insensitive.js
|   |   |   |       css-clip-path.js
|   |   |   |       css-color-adjust.js
|   |   |   |       css-color-function.js
|   |   |   |       css-conic-gradients.js
|   |   |   |       css-container-queries-style.js
|   |   |   |       css-container-queries.js
|   |   |   |       css-container-query-units.js
|   |   |   |       css-containment.js
|   |   |   |       css-content-visibility.js
|   |   |   |       css-counters.js
|   |   |   |       css-crisp-edges.js
|   |   |   |       css-cross-fade.js
|   |   |   |       css-default-pseudo.js
|   |   |   |       css-descendant-gtgt.js
|   |   |   |       css-deviceadaptation.js
|   |   |   |       css-dir-pseudo.js
|   |   |   |       css-display-contents.js
|   |   |   |       css-element-function.js
|   |   |   |       css-env-function.js
|   |   |   |       css-exclusions.js
|   |   |   |       css-featurequeries.js
|   |   |   |       css-file-selector-button.js
|   |   |   |       css-filter-function.js
|   |   |   |       css-filters.js
|   |   |   |       css-first-letter.js
|   |   |   |       css-first-line.js
|   |   |   |       css-fixed.js
|   |   |   |       css-focus-visible.js
|   |   |   |       css-focus-within.js
|   |   |   |       css-font-palette.js
|   |   |   |       css-font-rendering-controls.js
|   |   |   |       css-font-stretch.js
|   |   |   |       css-gencontent.js
|   |   |   |       css-gradients.js
|   |   |   |       css-grid-animation.js
|   |   |   |       css-grid.js
|   |   |   |       css-hanging-punctuation.js
|   |   |   |       css-has.js
|   |   |   |       css-hyphens.js
|   |   |   |       css-if.js
|   |   |   |       css-image-orientation.js
|   |   |   |       css-image-set.js
|   |   |   |       css-in-out-of-range.js
|   |   |   |       css-indeterminate-pseudo.js
|   |   |   |       css-initial-letter.js
|   |   |   |       css-initial-value.js
|   |   |   |       css-lch-lab.js
|   |   |   |       css-letter-spacing.js
|   |   |   |       css-line-clamp.js
|   |   |   |       css-logical-props.js
|   |   |   |       css-marker-pseudo.js
|   |   |   |       css-masks.js
|   |   |   |       css-matches-pseudo.js
|   |   |   |       css-math-functions.js
|   |   |   |       css-media-interaction.js
|   |   |   |       css-media-range-syntax.js
|   |   |   |       css-media-resolution.js
|   |   |   |       css-media-scripting.js
|   |   |   |       css-mediaqueries.js
|   |   |   |       css-mixblendmode.js
|   |   |   |       css-module-scripts.js
|   |   |   |       css-motion-paths.js
|   |   |   |       css-namespaces.js
|   |   |   |       css-nesting.js
|   |   |   |       css-not-sel-list.js
|   |   |   |       css-nth-child-of.js
|   |   |   |       css-opacity.js
|   |   |   |       css-optional-pseudo.js
|   |   |   |       css-overflow-anchor.js
|   |   |   |       css-overflow-overlay.js
|   |   |   |       css-overflow.js
|   |   |   |       css-overscroll-behavior.js
|   |   |   |       css-page-break.js
|   |   |   |       css-paged-media.js
|   |   |   |       css-paint-api.js
|   |   |   |       css-placeholder-shown.js
|   |   |   |       css-placeholder.js
|   |   |   |       css-print-color-adjust.js
|   |   |   |       css-read-only-write.js
|   |   |   |       css-rebeccapurple.js
|   |   |   |       css-reflections.js
|   |   |   |       css-regions.js
|   |   |   |       css-relative-colors.js
|   |   |   |       css-repeating-gradients.js
|   |   |   |       css-resize.js
|   |   |   |       css-revert-value.js
|   |   |   |       css-rrggbbaa.js
|   |   |   |       css-scroll-behavior.js
|   |   |   |       css-scrollbar.js
|   |   |   |       css-sel2.js
|   |   |   |       css-sel3.js
|   |   |   |       css-selection.js
|   |   |   |       css-shapes.js
|   |   |   |       css-snappoints.js
|   |   |   |       css-sticky.js
|   |   |   |       css-subgrid.js
|   |   |   |       css-supports-api.js
|   |   |   |       css-table.js
|   |   |   |       css-text-align-last.js
|   |   |   |       css-text-box-trim.js
|   |   |   |       css-text-indent.js
|   |   |   |       css-text-justify.js
|   |   |   |       css-text-orientation.js
|   |   |   |       css-text-spacing.js
|   |   |   |       css-text-wrap-balance.js
|   |   |   |       css-textshadow.js
|   |   |   |       css-touch-action.js
|   |   |   |       css-transitions.js
|   |   |   |       css-unicode-bidi.js
|   |   |   |       css-unset-value.js
|   |   |   |       css-variables.js
|   |   |   |       css-when-else.js
|   |   |   |       css-widows-orphans.js
|   |   |   |       css-width-stretch.js
|   |   |   |       css-writing-mode.js
|   |   |   |       css-zoom.js
|   |   |   |       css3-attr.js
|   |   |   |       css3-boxsizing.js
|   |   |   |       css3-colors.js
|   |   |   |       css3-cursors-grab.js
|   |   |   |       css3-cursors-newer.js
|   |   |   |       css3-cursors.js
|   |   |   |       css3-tabsize.js
|   |   |   |       currentcolor.js
|   |   |   |       custom-elements.js
|   |   |   |       custom-elementsv1.js
|   |   |   |       customevent.js
|   |   |   |       datalist.js
|   |   |   |       dataset.js
|   |   |   |       datauri.js
|   |   |   |       date-tolocaledatestring.js
|   |   |   |       declarative-shadow-dom.js
|   |   |   |       decorators.js
|   |   |   |       details.js
|   |   |   |       deviceorientation.js
|   |   |   |       devicepixelratio.js
|   |   |   |       dialog.js
|   |   |   |       dispatchevent.js
|   |   |   |       dnssec.js
|   |   |   |       do-not-track.js
|   |   |   |       document-currentscript.js
|   |   |   |       document-evaluate-xpath.js
|   |   |   |       document-execcommand.js
|   |   |   |       document-policy.js
|   |   |   |       document-scrollingelement.js
|   |   |   |       documenthead.js
|   |   |   |       dom-manip-convenience.js
|   |   |   |       dom-range.js
|   |   |   |       domcontentloaded.js
|   |   |   |       dommatrix.js
|   |   |   |       download.js
|   |   |   |       dragndrop.js
|   |   |   |       element-closest.js
|   |   |   |       element-from-point.js
|   |   |   |       element-scroll-methods.js
|   |   |   |       eme.js
|   |   |   |       eot.js
|   |   |   |       es5.js
|   |   |   |       es6-class.js
|   |   |   |       es6-generators.js
|   |   |   |       es6-module-dynamic-import.js
|   |   |   |       es6-module.js
|   |   |   |       es6-number.js
|   |   |   |       es6-string-includes.js
|   |   |   |       es6.js
|   |   |   |       eventsource.js
|   |   |   |       extended-system-fonts.js
|   |   |   |       feature-policy.js
|   |   |   |       fetch.js
|   |   |   |       fieldset-disabled.js
|   |   |   |       fileapi.js
|   |   |   |       filereader.js
|   |   |   |       filereadersync.js
|   |   |   |       filesystem.js
|   |   |   |       flac.js
|   |   |   |       flexbox-gap.js
|   |   |   |       flexbox.js
|   |   |   |       flow-root.js
|   |   |   |       focusin-focusout-events.js
|   |   |   |       font-family-system-ui.js
|   |   |   |       font-feature.js
|   |   |   |       font-kerning.js
|   |   |   |       font-loading.js
|   |   |   |       font-size-adjust.js
|   |   |   |       font-smooth.js
|   |   |   |       font-unicode-range.js
|   |   |   |       font-variant-alternates.js
|   |   |   |       font-variant-numeric.js
|   |   |   |       fontface.js
|   |   |   |       form-attribute.js
|   |   |   |       form-submit-attributes.js
|   |   |   |       form-validation.js
|   |   |   |       forms.js
|   |   |   |       fullscreen.js
|   |   |   |       gamepad.js
|   |   |   |       geolocation.js
|   |   |   |       getboundingclientrect.js
|   |   |   |       getcomputedstyle.js
|   |   |   |       getelementsbyclassname.js
|   |   |   |       getrandomvalues.js
|   |   |   |       gyroscope.js
|   |   |   |       hardwareconcurrency.js
|   |   |   |       hashchange.js
|   |   |   |       heif.js
|   |   |   |       hevc.js
|   |   |   |       hidden.js
|   |   |   |       high-resolution-time.js
|   |   |   |       history.js
|   |   |   |       html-media-capture.js
|   |   |   |       html5semantic.js
|   |   |   |       http-live-streaming.js
|   |   |   |       http2.js
|   |   |   |       http3.js
|   |   |   |       iframe-sandbox.js
|   |   |   |       iframe-seamless.js
|   |   |   |       iframe-srcdoc.js
|   |   |   |       imagecapture.js
|   |   |   |       ime.js
|   |   |   |       img-naturalwidth-naturalheight.js
|   |   |   |       import-maps.js
|   |   |   |       imports.js
|   |   |   |       indeterminate-checkbox.js
|   |   |   |       indexeddb.js
|   |   |   |       indexeddb2.js
|   |   |   |       inline-block.js
|   |   |   |       innertext.js
|   |   |   |       input-autocomplete-onoff.js
|   |   |   |       input-color.js
|   |   |   |       input-datetime.js
|   |   |   |       input-email-tel-url.js
|   |   |   |       input-event.js
|   |   |   |       input-file-accept.js
|   |   |   |       input-file-directory.js
|   |   |   |       input-file-multiple.js
|   |   |   |       input-inputmode.js
|   |   |   |       input-minlength.js
|   |   |   |       input-number.js
|   |   |   |       input-pattern.js
|   |   |   |       input-placeholder.js
|   |   |   |       input-range.js
|   |   |   |       input-search.js
|   |   |   |       input-selection.js
|   |   |   |       insert-adjacent.js
|   |   |   |       insertadjacenthtml.js
|   |   |   |       internationalization.js
|   |   |   |       intersectionobserver-v2.js
|   |   |   |       intersectionobserver.js
|   |   |   |       intl-pluralrules.js
|   |   |   |       intrinsic-width.js
|   |   |   |       jpeg2000.js
|   |   |   |       jpegxl.js
|   |   |   |       jpegxr.js
|   |   |   |       js-regexp-lookbehind.js
|   |   |   |       json.js
|   |   |   |       justify-content-space-evenly.js
|   |   |   |       kerning-pairs-ligatures.js
|   |   |   |       keyboardevent-charcode.js
|   |   |   |       keyboardevent-code.js
|   |   |   |       keyboardevent-getmodifierstate.js
|   |   |   |       keyboardevent-key.js
|   |   |   |       keyboardevent-location.js
|   |   |   |       keyboardevent-which.js
|   |   |   |       lazyload.js
|   |   |   |       let.js
|   |   |   |       link-icon-png.js
|   |   |   |       link-icon-svg.js
|   |   |   |       link-rel-dns-prefetch.js
|   |   |   |       link-rel-modulepreload.js
|   |   |   |       link-rel-preconnect.js
|   |   |   |       link-rel-prefetch.js
|   |   |   |       link-rel-preload.js
|   |   |   |       link-rel-prerender.js
|   |   |   |       loading-lazy-attr.js
|   |   |   |       localecompare.js
|   |   |   |       magnetometer.js
|   |   |   |       matchesselector.js
|   |   |   |       matchmedia.js
|   |   |   |       mathml.js
|   |   |   |       maxlength.js
|   |   |   |       mdn-css-backdrop-pseudo-element.js
|   |   |   |       mdn-css-unicode-bidi-isolate-override.js
|   |   |   |       mdn-css-unicode-bidi-isolate.js
|   |   |   |       mdn-css-unicode-bidi-plaintext.js
|   |   |   |       mdn-text-decoration-color.js
|   |   |   |       mdn-text-decoration-line.js
|   |   |   |       mdn-text-decoration-shorthand.js
|   |   |   |       mdn-text-decoration-style.js
|   |   |   |       media-fragments.js
|   |   |   |       mediacapture-fromelement.js
|   |   |   |       mediarecorder.js
|   |   |   |       mediasource.js
|   |   |   |       menu.js
|   |   |   |       meta-theme-color.js
|   |   |   |       meter.js
|   |   |   |       midi.js
|   |   |   |       minmaxwh.js
|   |   |   |       mp3.js
|   |   |   |       mpeg-dash.js
|   |   |   |       mpeg4.js
|   |   |   |       multibackgrounds.js
|   |   |   |       multicolumn.js
|   |   |   |       mutation-events.js
|   |   |   |       mutationobserver.js
|   |   |   |       namevalue-storage.js
|   |   |   |       native-filesystem-api.js
|   |   |   |       nav-timing.js
|   |   |   |       netinfo.js
|   |   |   |       notifications.js
|   |   |   |       object-entries.js
|   |   |   |       object-fit.js
|   |   |   |       object-observe.js
|   |   |   |       object-values.js
|   |   |   |       objectrtc.js
|   |   |   |       offline-apps.js
|   |   |   |       offscreencanvas.js
|   |   |   |       ogg-vorbis.js
|   |   |   |       ogv.js
|   |   |   |       ol-reversed.js
|   |   |   |       once-event-listener.js
|   |   |   |       online-status.js
|   |   |   |       opus.js
|   |   |   |       orientation-sensor.js
|   |   |   |       outline.js
|   |   |   |       pad-start-end.js
|   |   |   |       page-transition-events.js
|   |   |   |       pagevisibility.js
|   |   |   |       passive-event-listener.js
|   |   |   |       passkeys.js
|   |   |   |       passwordrules.js
|   |   |   |       path2d.js
|   |   |   |       payment-request.js
|   |   |   |       pdf-viewer.js
|   |   |   |       permissions-api.js
|   |   |   |       permissions-policy.js
|   |   |   |       picture-in-picture.js
|   |   |   |       picture.js
|   |   |   |       ping.js
|   |   |   |       png-alpha.js
|   |   |   |       pointer-events.js
|   |   |   |       pointer.js
|   |   |   |       pointerlock.js
|   |   |   |       portals.js
|   |   |   |       prefers-color-scheme.js
|   |   |   |       prefers-reduced-motion.js
|   |   |   |       progress.js
|   |   |   |       promise-finally.js
|   |   |   |       promises.js
|   |   |   |       proximity.js
|   |   |   |       proxy.js
|   |   |   |       publickeypinning.js
|   |   |   |       push-api.js
|   |   |   |       queryselector.js
|   |   |   |       readonly-attr.js
|   |   |   |       referrer-policy.js
|   |   |   |       registerprotocolhandler.js
|   |   |   |       rel-noopener.js
|   |   |   |       rel-noreferrer.js
|   |   |   |       rellist.js
|   |   |   |       rem.js
|   |   |   |       requestanimationframe.js
|   |   |   |       requestidlecallback.js
|   |   |   |       resizeobserver.js
|   |   |   |       resource-timing.js
|   |   |   |       rest-parameters.js
|   |   |   |       rtcpeerconnection.js
|   |   |   |       ruby.js
|   |   |   |       run-in.js
|   |   |   |       same-site-cookie-attribute.js
|   |   |   |       screen-orientation.js
|   |   |   |       script-async.js
|   |   |   |       script-defer.js
|   |   |   |       scrollintoview.js
|   |   |   |       scrollintoviewifneeded.js
|   |   |   |       sdch.js
|   |   |   |       selection-api.js
|   |   |   |       selectlist.js
|   |   |   |       server-timing.js
|   |   |   |       serviceworkers.js
|   |   |   |       setimmediate.js
|   |   |   |       shadowdom.js
|   |   |   |       shadowdomv1.js
|   |   |   |       sharedarraybuffer.js
|   |   |   |       sharedworkers.js
|   |   |   |       sni.js
|   |   |   |       spdy.js
|   |   |   |       speech-recognition.js
|   |   |   |       speech-synthesis.js
|   |   |   |       spellcheck-attribute.js
|   |   |   |       sql-storage.js
|   |   |   |       srcset.js
|   |   |   |       stream.js
|   |   |   |       streams.js
|   |   |   |       stricttransportsecurity.js
|   |   |   |       style-scoped.js
|   |   |   |       subresource-bundling.js
|   |   |   |       subresource-integrity.js
|   |   |   |       svg-css.js
|   |   |   |       svg-filters.js
|   |   |   |       svg-fonts.js
|   |   |   |       svg-fragment.js
|   |   |   |       svg-html.js
|   |   |   |       svg-html5.js
|   |   |   |       svg-img.js
|   |   |   |       svg-smil.js
|   |   |   |       svg.js
|   |   |   |       sxg.js
|   |   |   |       tabindex-attr.js
|   |   |   |       template-literals.js
|   |   |   |       template.js
|   |   |   |       temporal.js
|   |   |   |       testfeat.js
|   |   |   |       text-decoration.js
|   |   |   |       text-emphasis.js
|   |   |   |       text-overflow.js
|   |   |   |       text-size-adjust.js
|   |   |   |       text-stroke.js
|   |   |   |       textcontent.js
|   |   |   |       textencoder.js
|   |   |   |       tls1-1.js
|   |   |   |       tls1-2.js
|   |   |   |       tls1-3.js
|   |   |   |       touch.js
|   |   |   |       transforms2d.js
|   |   |   |       transforms3d.js
|   |   |   |       trusted-types.js
|   |   |   |       ttf.js
|   |   |   |       typedarrays.js
|   |   |   |       u2f.js
|   |   |   |       unhandledrejection.js
|   |   |   |       upgradeinsecurerequests.js
|   |   |   |       url-scroll-to-text-fragment.js
|   |   |   |       url.js
|   |   |   |       urlsearchparams.js
|   |   |   |       use-strict.js
|   |   |   |       user-select-none.js
|   |   |   |       user-timing.js
|   |   |   |       variable-fonts.js
|   |   |   |       vector-effect.js
|   |   |   |       vibration.js
|   |   |   |       video.js
|   |   |   |       videotracks.js
|   |   |   |       view-transitions.js
|   |   |   |       viewport-unit-variants.js
|   |   |   |       viewport-units.js
|   |   |   |       wai-aria.js
|   |   |   |       wake-lock.js
|   |   |   |       wasm-bigint.js
|   |   |   |       wasm-bulk-memory.js
|   |   |   |       wasm-extended-const.js
|   |   |   |       wasm-gc.js
|   |   |   |       wasm-multi-memory.js
|   |   |   |       wasm-multi-value.js
|   |   |   |       wasm-mutable-globals.js
|   |   |   |       wasm-nontrapping-fptoint.js
|   |   |   |       wasm-reference-types.js
|   |   |   |       wasm-relaxed-simd.js
|   |   |   |       wasm-signext.js
|   |   |   |       wasm-simd.js
|   |   |   |       wasm-tail-calls.js
|   |   |   |       wasm-threads.js
|   |   |   |       wasm.js
|   |   |   |       wav.js
|   |   |   |       wbr-element.js
|   |   |   |       web-animation.js
|   |   |   |       web-app-manifest.js
|   |   |   |       web-bluetooth.js
|   |   |   |       web-serial.js
|   |   |   |       web-share.js
|   |   |   |       webauthn.js
|   |   |   |       webcodecs.js
|   |   |   |       webgl.js
|   |   |   |       webgl2.js
|   |   |   |       webgpu.js
|   |   |   |       webhid.js
|   |   |   |       webkit-user-drag.js
|   |   |   |       webm.js
|   |   |   |       webnfc.js
|   |   |   |       webp.js
|   |   |   |       websockets.js
|   |   |   |       webtransport.js
|   |   |   |       webusb.js
|   |   |   |       webvr.js
|   |   |   |       webvtt.js
|   |   |   |       webworkers.js
|   |   |   |       webxr.js
|   |   |   |       will-change.js
|   |   |   |       woff.js
|   |   |   |       woff2.js
|   |   |   |       word-break.js
|   |   |   |       wordwrap.js
|   |   |   |       x-doc-messaging.js
|   |   |   |       x-frame-options.js
|   |   |   |       xhr2.js
|   |   |   |       xhtml.js
|   |   |   |       xhtmlsmil.js
|   |   |   |       xml-serializer.js
|   |   |   |       zstd.js
|   |   |   |       
|   |   |   \---regions
|   |   |           AD.js
|   |   |           AE.js
|   |   |           AF.js
|   |   |           AG.js
|   |   |           AI.js
|   |   |           AL.js
|   |   |           alt-af.js
|   |   |           alt-an.js
|   |   |           alt-as.js
|   |   |           alt-eu.js
|   |   |           alt-na.js
|   |   |           alt-oc.js
|   |   |           alt-sa.js
|   |   |           alt-ww.js
|   |   |           AM.js
|   |   |           AO.js
|   |   |           AR.js
|   |   |           AS.js
|   |   |           AT.js
|   |   |           AU.js
|   |   |           AW.js
|   |   |           AX.js
|   |   |           AZ.js
|   |   |           BA.js
|   |   |           BB.js
|   |   |           BD.js
|   |   |           BE.js
|   |   |           BF.js
|   |   |           BG.js
|   |   |           BH.js
|   |   |           BI.js
|   |   |           BJ.js
|   |   |           BM.js
|   |   |           BN.js
|   |   |           BO.js
|   |   |           BR.js
|   |   |           BS.js
|   |   |           BT.js
|   |   |           BW.js
|   |   |           BY.js
|   |   |           BZ.js
|   |   |           CA.js
|   |   |           CD.js
|   |   |           CF.js
|   |   |           CG.js
|   |   |           CH.js
|   |   |           CI.js
|   |   |           CK.js
|   |   |           CL.js
|   |   |           CM.js
|   |   |           CN.js
|   |   |           CO.js
|   |   |           CR.js
|   |   |           CU.js
|   |   |           CV.js
|   |   |           CX.js
|   |   |           CY.js
|   |   |           CZ.js
|   |   |           DE.js
|   |   |           DJ.js
|   |   |           DK.js
|   |   |           DM.js
|   |   |           DO.js
|   |   |           DZ.js
|   |   |           EC.js
|   |   |           EE.js
|   |   |           EG.js
|   |   |           ER.js
|   |   |           ES.js
|   |   |           ET.js
|   |   |           FI.js
|   |   |           FJ.js
|   |   |           FK.js
|   |   |           FM.js
|   |   |           FO.js
|   |   |           FR.js
|   |   |           GA.js
|   |   |           GB.js
|   |   |           GD.js
|   |   |           GE.js
|   |   |           GF.js
|   |   |           GG.js
|   |   |           GH.js
|   |   |           GI.js
|   |   |           GL.js
|   |   |           GM.js
|   |   |           GN.js
|   |   |           GP.js
|   |   |           GQ.js
|   |   |           GR.js
|   |   |           GT.js
|   |   |           GU.js
|   |   |           GW.js
|   |   |           GY.js
|   |   |           HK.js
|   |   |           HN.js
|   |   |           HR.js
|   |   |           HT.js
|   |   |           HU.js
|   |   |           ID.js
|   |   |           IE.js
|   |   |           IL.js
|   |   |           IM.js
|   |   |           IN.js
|   |   |           IQ.js
|   |   |           IR.js
|   |   |           IS.js
|   |   |           IT.js
|   |   |           JE.js
|   |   |           JM.js
|   |   |           JO.js
|   |   |           JP.js
|   |   |           KE.js
|   |   |           KG.js
|   |   |           KH.js
|   |   |           KI.js
|   |   |           KM.js
|   |   |           KN.js
|   |   |           KP.js
|   |   |           KR.js
|   |   |           KW.js
|   |   |           KY.js
|   |   |           KZ.js
|   |   |           LA.js
|   |   |           LB.js
|   |   |           LC.js
|   |   |           LI.js
|   |   |           LK.js
|   |   |           LR.js
|   |   |           LS.js
|   |   |           LT.js
|   |   |           LU.js
|   |   |           LV.js
|   |   |           LY.js
|   |   |           MA.js
|   |   |           MC.js
|   |   |           MD.js
|   |   |           ME.js
|   |   |           MG.js
|   |   |           MH.js
|   |   |           MK.js
|   |   |           ML.js
|   |   |           MM.js
|   |   |           MN.js
|   |   |           MO.js
|   |   |           MP.js
|   |   |           MQ.js
|   |   |           MR.js
|   |   |           MS.js
|   |   |           MT.js
|   |   |           MU.js
|   |   |           MV.js
|   |   |           MW.js
|   |   |           MX.js
|   |   |           MY.js
|   |   |           MZ.js
|   |   |           NA.js
|   |   |           NC.js
|   |   |           NE.js
|   |   |           NF.js
|   |   |           NG.js
|   |   |           NI.js
|   |   |           NL.js
|   |   |           NO.js
|   |   |           NP.js
|   |   |           NR.js
|   |   |           NU.js
|   |   |           NZ.js
|   |   |           OM.js
|   |   |           PA.js
|   |   |           PE.js
|   |   |           PF.js
|   |   |           PG.js
|   |   |           PH.js
|   |   |           PK.js
|   |   |           PL.js
|   |   |           PM.js
|   |   |           PN.js
|   |   |           PR.js
|   |   |           PS.js
|   |   |           PT.js
|   |   |           PW.js
|   |   |           PY.js
|   |   |           QA.js
|   |   |           RE.js
|   |   |           RO.js
|   |   |           RS.js
|   |   |           RU.js
|   |   |           RW.js
|   |   |           SA.js
|   |   |           SB.js
|   |   |           SC.js
|   |   |           SD.js
|   |   |           SE.js
|   |   |           SG.js
|   |   |           SH.js
|   |   |           SI.js
|   |   |           SK.js
|   |   |           SL.js
|   |   |           SM.js
|   |   |           SN.js
|   |   |           SO.js
|   |   |           SR.js
|   |   |           ST.js
|   |   |           SV.js
|   |   |           SY.js
|   |   |           SZ.js
|   |   |           TC.js
|   |   |           TD.js
|   |   |           TG.js
|   |   |           TH.js
|   |   |           TJ.js
|   |   |           TL.js
|   |   |           TM.js
|   |   |           TN.js
|   |   |           TO.js
|   |   |           TR.js
|   |   |           TT.js
|   |   |           TV.js
|   |   |           TW.js
|   |   |           TZ.js
|   |   |           UA.js
|   |   |           UG.js
|   |   |           US.js
|   |   |           UY.js
|   |   |           UZ.js
|   |   |           VA.js
|   |   |           VC.js
|   |   |           VE.js
|   |   |           VG.js
|   |   |           VI.js
|   |   |           VN.js
|   |   |           VU.js
|   |   |           WF.js
|   |   |           WS.js
|   |   |           YE.js
|   |   |           YT.js
|   |   |           ZA.js
|   |   |           ZM.js
|   |   |           ZW.js
|   |   |           
|   |   \---dist
|   |       +---lib
|   |       |       statuses.js
|   |       |       supported.js
|   |       |       
|   |       \---unpacker
|   |               agents.js
|   |               browsers.js
|   |               browserVersions.js
|   |               feature.js
|   |               features.js
|   |               index.js
|   |               region.js
|   |               
|   +---chalk
|   |   |   index.d.ts
|   |   |   license
|   |   |   package.json
|   |   |   readme.md
|   |   |   
|   |   \---source
|   |           index.js
|   |           templates.js
|   |           util.js
|   |           
|   +---char-regex
|   |       index.d.ts
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---ci-info
|   |       CHANGELOG.md
|   |       index.d.ts
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       vendors.json
|   |       
|   +---cjs-module-lexer
|   |   |   lexer.d.ts
|   |   |   lexer.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---dist
|   |           lexer.js
|   |           lexer.mjs
|   |           
|   +---cliui
|   |   |   CHANGELOG.md
|   |   |   index.mjs
|   |   |   LICENSE.txt
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---build
|   |       |   index.cjs
|   |       |   index.d.cts
|   |       |   
|   |       \---lib
|   |               index.js
|   |               string-utils.js
|   |               
|   +---co
|   |       History.md
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       Readme.md
|   |       
|   +---collect-v8-coverage
|   |       CHANGELOG.md
|   |       index.d.ts
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---color-convert
|   |       CHANGELOG.md
|   |       conversions.js
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       route.js
|   |       
|   +---color-name
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---combined-stream
|   |   |   License
|   |   |   package.json
|   |   |   Readme.md
|   |   |   yarn.lock
|   |   |   
|   |   \---lib
|   |           combined_stream.js
|   |           
|   +---concat-map
|   |   |   .travis.yml
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.markdown
|   |   |   
|   |   +---example
|   |   |       map.js
|   |   |       
|   |   \---test
|   |           map.js
|   |           
|   +---convert-source-map
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---core-js-compat
|   |       compat.d.ts
|   |       compat.js
|   |       data.json
|   |       entries.json
|   |       external.json
|   |       get-modules-list-for-target-version.d.ts
|   |       get-modules-list-for-target-version.js
|   |       helpers.js
|   |       index.d.ts
|   |       index.js
|   |       LICENSE
|   |       modules-by-versions.json
|   |       modules.json
|   |       package.json
|   |       README.md
|   |       shared.d.ts
|   |       targets-parser.js
|   |       
|   +---create-jest
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---bin
|   |   |       create-jest.js
|   |   |       
|   |   \---build
|   |           errors.js
|   |           generateConfigFile.js
|   |           index.d.ts
|   |           index.js
|   |           modifyPackageJson.js
|   |           questions.js
|   |           runCreate.js
|   |           types.js
|   |           
|   +---cross-spawn
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |       |   enoent.js
|   |       |   parse.js
|   |       |   
|   |       \---util
|   |               escape.js
|   |               readShebang.js
|   |               resolveCommand.js
|   |               
|   +---cssom
|   |   |   LICENSE.txt
|   |   |   package.json
|   |   |   README.mdown
|   |   |   
|   |   \---lib
|   |           clone.js
|   |           CSSConditionRule.js
|   |           CSSDocumentRule.js
|   |           CSSFontFaceRule.js
|   |           CSSGroupingRule.js
|   |           CSSHostRule.js
|   |           CSSImportRule.js
|   |           CSSKeyframeRule.js
|   |           CSSKeyframesRule.js
|   |           CSSMediaRule.js
|   |           CSSOM.js
|   |           CSSRule.js
|   |           CSSStyleDeclaration.js
|   |           CSSStyleRule.js
|   |           CSSStyleSheet.js
|   |           CSSSupportsRule.js
|   |           CSSValue.js
|   |           CSSValueExpression.js
|   |           index.js
|   |           MatcherList.js
|   |           MediaList.js
|   |           parse.js
|   |           StyleSheet.js
|   |           
|   +---cssstyle
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |       |   allExtraProperties.js
|   |       |   allWebkitProperties.js
|   |       |   CSSStyleDeclaration.js
|   |       |   parsers.js
|   |       |   
|   |       +---generated
|   |       |       allProperties.js
|   |       |       implementedProperties.js
|   |       |       properties.js
|   |       |       
|   |       +---properties
|   |       |       background.js
|   |       |       backgroundAttachment.js
|   |       |       backgroundColor.js
|   |       |       backgroundImage.js
|   |       |       backgroundPosition.js
|   |       |       backgroundRepeat.js
|   |       |       border.js
|   |       |       borderBottom.js
|   |       |       borderBottomColor.js
|   |       |       borderBottomStyle.js
|   |       |       borderBottomWidth.js
|   |       |       borderCollapse.js
|   |       |       borderColor.js
|   |       |       borderLeft.js
|   |       |       borderLeftColor.js
|   |       |       borderLeftStyle.js
|   |       |       borderLeftWidth.js
|   |       |       borderRight.js
|   |       |       borderRightColor.js
|   |       |       borderRightStyle.js
|   |       |       borderRightWidth.js
|   |       |       borderSpacing.js
|   |       |       borderStyle.js
|   |       |       borderTop.js
|   |       |       borderTopColor.js
|   |       |       borderTopStyle.js
|   |       |       borderTopWidth.js
|   |       |       borderWidth.js
|   |       |       bottom.js
|   |       |       clear.js
|   |       |       clip.js
|   |       |       color.js
|   |       |       flex.js
|   |       |       flexBasis.js
|   |       |       flexGrow.js
|   |       |       flexShrink.js
|   |       |       float.js
|   |       |       floodColor.js
|   |       |       font.js
|   |       |       fontFamily.js
|   |       |       fontSize.js
|   |       |       fontStyle.js
|   |       |       fontVariant.js
|   |       |       fontWeight.js
|   |       |       height.js
|   |       |       left.js
|   |       |       lightingColor.js
|   |       |       lineHeight.js
|   |       |       margin.js
|   |       |       marginBottom.js
|   |       |       marginLeft.js
|   |       |       marginRight.js
|   |       |       marginTop.js
|   |       |       opacity.js
|   |       |       outlineColor.js
|   |       |       padding.js
|   |       |       paddingBottom.js
|   |       |       paddingLeft.js
|   |       |       paddingRight.js
|   |       |       paddingTop.js
|   |       |       right.js
|   |       |       stopColor.js
|   |       |       top.js
|   |       |       webkitBorderAfterColor.js
|   |       |       webkitBorderBeforeColor.js
|   |       |       webkitBorderEndColor.js
|   |       |       webkitBorderStartColor.js
|   |       |       webkitColumnRuleColor.js
|   |       |       webkitTapHighlightColor.js
|   |       |       webkitTextEmphasisColor.js
|   |       |       webkitTextFillColor.js
|   |       |       webkitTextStrokeColor.js
|   |       |       width.js
|   |       |       
|   |       \---utils
|   |               camelize.js
|   |               propertyDescriptors.js
|   |               strings.js
|   |               
|   +---data-urls
|   |   |   LICENSE.txt
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           parser.js
|   |           utils.js
|   |           
|   +---debug
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---src
|   |           browser.js
|   |           common.js
|   |           index.js
|   |           node.js
|   |           
|   +---decimal.js
|   |       decimal.d.ts
|   |       decimal.js
|   |       decimal.mjs
|   |       LICENCE.md
|   |       package.json
|   |       README.md
|   |       
|   +---dedent
|   |   |   LICENSE.md
|   |   |   macro.js
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---dist
|   |           dedent.d.mts
|   |           dedent.d.ts
|   |           dedent.js
|   |           dedent.mjs
|   |           
|   +---deep-is
|   |   |   .travis.yml
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.markdown
|   |   |   
|   |   +---example
|   |   |       cmp.js
|   |   |       
|   |   \---test
|   |           cmp.js
|   |           NaN.js
|   |           neg-vs-pos-0.js
|   |           
|   +---deepmerge
|   |   |   .editorconfig
|   |   |   .eslintcache
|   |   |   changelog.md
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   license.txt
|   |   |   package.json
|   |   |   readme.md
|   |   |   rollup.config.js
|   |   |   
|   |   \---dist
|   |           cjs.js
|   |           umd.js
|   |           
|   +---delayed-stream
|   |   |   .npmignore
|   |   |   License
|   |   |   Makefile
|   |   |   package.json
|   |   |   Readme.md
|   |   |   
|   |   \---lib
|   |           delayed_stream.js
|   |           
|   +---detect-newline
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---diff-sequences
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---build
|   |           index.d.ts
|   |           index.js
|   |           
|   +---doctrine
|   |   |   CHANGELOG.md
|   |   |   LICENSE
|   |   |   LICENSE.closure-compiler
|   |   |   LICENSE.esprima
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           doctrine.js
|   |           typed.js
|   |           utility.js
|   |           
|   +---domexception
|   |   |   index.js
|   |   |   LICENSE.txt
|   |   |   package.json
|   |   |   README.md
|   |   |   webidl2js-wrapper.js
|   |   |   
|   |   \---lib
|   |           DOMException-impl.js
|   |           DOMException.js
|   |           Function.js
|   |           legacy-error-codes.json
|   |           utils.js
|   |           VoidFunction.js
|   |           
|   +---dunder-proto
|   |   |   .eslintrc
|   |   |   .nycrc
|   |   |   CHANGELOG.md
|   |   |   get.d.ts
|   |   |   get.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   set.d.ts
|   |   |   set.js
|   |   |   tsconfig.json
|   |   |   
|   |   +---.github
|   |   |       FUNDING.yml
|   |   |       
|   |   \---test
|   |           get.js
|   |           index.js
|   |           set.js
|   |           
|   +---electron-to-chromium
|   |       chromium-versions.js
|   |       chromium-versions.json
|   |       full-chromium-versions.js
|   |       full-chromium-versions.json
|   |       full-versions.js
|   |       full-versions.json
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       versions.js
|   |       versions.json
|   |       
|   +---emittery
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       maps.js
|   |       package.json
|   |       readme.md
|   |       
|   +---emoji-regex
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   LICENSE-MIT.txt
|   |   |   package.json
|   |   |   README.md
|   |   |   text.js
|   |   |   
|   |   \---es2015
|   |           index.js
|   |           text.js
|   |           
|   +---entities
|   |   |   decode.d.ts
|   |   |   decode.js
|   |   |   escape.d.ts
|   |   |   escape.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   readme.md
|   |   |   
|   |   +---dist
|   |   |   +---commonjs
|   |   |   |   |   decode-codepoint.d.ts
|   |   |   |   |   decode-codepoint.d.ts.map
|   |   |   |   |   decode-codepoint.js
|   |   |   |   |   decode-codepoint.js.map
|   |   |   |   |   decode.d.ts
|   |   |   |   |   decode.d.ts.map
|   |   |   |   |   decode.js
|   |   |   |   |   decode.js.map
|   |   |   |   |   encode.d.ts
|   |   |   |   |   encode.d.ts.map
|   |   |   |   |   encode.js
|   |   |   |   |   encode.js.map
|   |   |   |   |   escape.d.ts
|   |   |   |   |   escape.d.ts.map
|   |   |   |   |   escape.js
|   |   |   |   |   escape.js.map
|   |   |   |   |   index.d.ts
|   |   |   |   |   index.d.ts.map
|   |   |   |   |   index.js
|   |   |   |   |   index.js.map
|   |   |   |   |   package.json
|   |   |   |   |   
|   |   |   |   \---generated
|   |   |   |           decode-data-html.d.ts
|   |   |   |           decode-data-html.d.ts.map
|   |   |   |           decode-data-html.js
|   |   |   |           decode-data-html.js.map
|   |   |   |           decode-data-xml.d.ts
|   |   |   |           decode-data-xml.d.ts.map
|   |   |   |           decode-data-xml.js
|   |   |   |           decode-data-xml.js.map
|   |   |   |           encode-html.d.ts
|   |   |   |           encode-html.d.ts.map
|   |   |   |           encode-html.js
|   |   |   |           encode-html.js.map
|   |   |   |           
|   |   |   \---esm
|   |   |       |   decode-codepoint.d.ts
|   |   |       |   decode-codepoint.d.ts.map
|   |   |       |   decode-codepoint.js
|   |   |       |   decode-codepoint.js.map
|   |   |       |   decode.d.ts
|   |   |       |   decode.d.ts.map
|   |   |       |   decode.js
|   |   |       |   decode.js.map
|   |   |       |   encode.d.ts
|   |   |       |   encode.d.ts.map
|   |   |       |   encode.js
|   |   |       |   encode.js.map
|   |   |       |   escape.d.ts
|   |   |       |   escape.d.ts.map
|   |   |       |   escape.js
|   |   |       |   escape.js.map
|   |   |       |   index.d.ts
|   |   |       |   index.d.ts.map
|   |   |       |   index.js
|   |   |       |   index.js.map
|   |   |       |   package.json
|   |   |       |   
|   |   |       \---generated
|   |   |               decode-data-html.d.ts
|   |   |               decode-data-html.d.ts.map
|   |   |               decode-data-html.js
|   |   |               decode-data-html.js.map
|   |   |               decode-data-xml.d.ts
|   |   |               decode-data-xml.d.ts.map
|   |   |               decode-data-xml.js
|   |   |               decode-data-xml.js.map
|   |   |               encode-html.d.ts
|   |   |               encode-html.d.ts.map
|   |   |               encode-html.js
|   |   |               encode-html.js.map
|   |   |               
|   |   \---src
|   |       |   decode-codepoint.ts
|   |       |   decode.spec.ts
|   |       |   decode.ts
|   |       |   encode.spec.ts
|   |       |   encode.ts
|   |       |   escape.spec.ts
|   |       |   escape.ts
|   |       |   index.spec.ts
|   |       |   index.ts
|   |       |   
|   |       \---generated
|   |               .eslintrc.json
|   |               decode-data-html.ts
|   |               decode-data-xml.ts
|   |               encode-html.ts
|   |               
|   +---error-ex
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---es-define-property
|   |   |   .eslintrc
|   |   |   .nycrc
|   |   |   CHANGELOG.md
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   tsconfig.json
|   |   |   
|   |   +---.github
|   |   |       FUNDING.yml
|   |   |       
|   |   \---test
|   |           index.js
|   |           
|   +---es-errors
|   |   |   .eslintrc
|   |   |   CHANGELOG.md
|   |   |   eval.d.ts
|   |   |   eval.js
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   range.d.ts
|   |   |   range.js
|   |   |   README.md
|   |   |   ref.d.ts
|   |   |   ref.js
|   |   |   syntax.d.ts
|   |   |   syntax.js
|   |   |   tsconfig.json
|   |   |   type.d.ts
|   |   |   type.js
|   |   |   uri.d.ts
|   |   |   uri.js
|   |   |   
|   |   +---.github
|   |   |       FUNDING.yml
|   |   |       
|   |   \---test
|   |           index.js
|   |           
|   +---es-object-atoms
|   |   |   .eslintrc
|   |   |   CHANGELOG.md
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   isObject.d.ts
|   |   |   isObject.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   RequireObjectCoercible.d.ts
|   |   |   RequireObjectCoercible.js
|   |   |   ToObject.d.ts
|   |   |   ToObject.js
|   |   |   tsconfig.json
|   |   |   
|   |   +---.github
|   |   |       FUNDING.yml
|   |   |       
|   |   \---test
|   |           index.js
|   |           
|   +---es-set-tostringtag
|   |   |   .eslintrc
|   |   |   .nycrc
|   |   |   CHANGELOG.md
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   tsconfig.json
|   |   |   
|   |   \---test
|   |           index.js
|   |           
|   +---escalade
|   |   |   index.d.mts
|   |   |   index.d.ts
|   |   |   license
|   |   |   package.json
|   |   |   readme.md
|   |   |   
|   |   +---dist
|   |   |       index.js
|   |   |       index.mjs
|   |   |       
|   |   \---sync
|   |           index.d.mts
|   |           index.d.ts
|   |           index.js
|   |           index.mjs
|   |           
|   +---escape-string-regexp
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---escodegen
|   |   |   escodegen.js
|   |   |   LICENSE.BSD
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---bin
|   |           escodegen.js
|   |           esgenerate.js
|   |           
|   +---eslint
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---bin
|   |   |       eslint.js
|   |   |       
|   |   +---conf
|   |   |       config-schema.js
|   |   |       default-cli-options.js
|   |   |       globals.js
|   |   |       replacements.json
|   |   |       rule-type-list.json
|   |   |       
|   |   +---lib
|   |   |   |   api.js
|   |   |   |   cli.js
|   |   |   |   options.js
|   |   |   |   unsupported-api.js
|   |   |   |   
|   |   |   +---cli-engine
|   |   |   |   |   cli-engine.js
|   |   |   |   |   file-enumerator.js
|   |   |   |   |   hash.js
|   |   |   |   |   index.js
|   |   |   |   |   lint-result-cache.js
|   |   |   |   |   load-rules.js
|   |   |   |   |   xml-escape.js
|   |   |   |   |   
|   |   |   |   \---formatters
|   |   |   |           checkstyle.js
|   |   |   |           compact.js
|   |   |   |           formatters-meta.json
|   |   |   |           html.js
|   |   |   |           jslint-xml.js
|   |   |   |           json-with-metadata.js
|   |   |   |           json.js
|   |   |   |           junit.js
|   |   |   |           stylish.js
|   |   |   |           tap.js
|   |   |   |           unix.js
|   |   |   |           visualstudio.js
|   |   |   |           
|   |   |   +---config
|   |   |   |       default-config.js
|   |   |   |       flat-config-array.js
|   |   |   |       flat-config-helpers.js
|   |   |   |       flat-config-schema.js
|   |   |   |       rule-validator.js
|   |   |   |       
|   |   |   +---eslint
|   |   |   |       eslint-helpers.js
|   |   |   |       eslint.js
|   |   |   |       flat-eslint.js
|   |   |   |       index.js
|   |   |   |       
|   |   |   +---linter
|   |   |   |   |   apply-disable-directives.js
|   |   |   |   |   config-comment-parser.js
|   |   |   |   |   index.js
|   |   |   |   |   interpolate.js
|   |   |   |   |   linter.js
|   |   |   |   |   node-event-generator.js
|   |   |   |   |   report-translator.js
|   |   |   |   |   rule-fixer.js
|   |   |   |   |   rules.js
|   |   |   |   |   safe-emitter.js
|   |   |   |   |   source-code-fixer.js
|   |   |   |   |   timing.js
|   |   |   |   |   
|   |   |   |   \---code-path-analysis
|   |   |   |           code-path-analyzer.js
|   |   |   |           code-path-segment.js
|   |   |   |           code-path-state.js
|   |   |   |           code-path.js
|   |   |   |           debug-helpers.js
|   |   |   |           fork-context.js
|   |   |   |           id-generator.js
|   |   |   |           
|   |   |   +---rule-tester
|   |   |   |       flat-rule-tester.js
|   |   |   |       index.js
|   |   |   |       rule-tester.js
|   |   |   |       
|   |   |   +---rules
|   |   |   |   |   accessor-pairs.js
|   |   |   |   |   array-bracket-newline.js
|   |   |   |   |   array-bracket-spacing.js
|   |   |   |   |   array-callback-return.js
|   |   |   |   |   array-element-newline.js
|   |   |   |   |   arrow-body-style.js
|   |   |   |   |   arrow-parens.js
|   |   |   |   |   arrow-spacing.js
|   |   |   |   |   block-scoped-var.js
|   |   |   |   |   block-spacing.js
|   |   |   |   |   brace-style.js
|   |   |   |   |   callback-return.js
|   |   |   |   |   camelcase.js
|   |   |   |   |   capitalized-comments.js
|   |   |   |   |   class-methods-use-this.js
|   |   |   |   |   comma-dangle.js
|   |   |   |   |   comma-spacing.js
|   |   |   |   |   comma-style.js
|   |   |   |   |   complexity.js
|   |   |   |   |   computed-property-spacing.js
|   |   |   |   |   consistent-return.js
|   |   |   |   |   consistent-this.js
|   |   |   |   |   constructor-super.js
|   |   |   |   |   curly.js
|   |   |   |   |   default-case-last.js
|   |   |   |   |   default-case.js
|   |   |   |   |   default-param-last.js
|   |   |   |   |   dot-location.js
|   |   |   |   |   dot-notation.js
|   |   |   |   |   eol-last.js
|   |   |   |   |   eqeqeq.js
|   |   |   |   |   for-direction.js
|   |   |   |   |   func-call-spacing.js
|   |   |   |   |   func-name-matching.js
|   |   |   |   |   func-names.js
|   |   |   |   |   func-style.js
|   |   |   |   |   function-call-argument-newline.js
|   |   |   |   |   function-paren-newline.js
|   |   |   |   |   generator-star-spacing.js
|   |   |   |   |   getter-return.js
|   |   |   |   |   global-require.js
|   |   |   |   |   grouped-accessor-pairs.js
|   |   |   |   |   guard-for-in.js
|   |   |   |   |   handle-callback-err.js
|   |   |   |   |   id-blacklist.js
|   |   |   |   |   id-denylist.js
|   |   |   |   |   id-length.js
|   |   |   |   |   id-match.js
|   |   |   |   |   implicit-arrow-linebreak.js
|   |   |   |   |   indent-legacy.js
|   |   |   |   |   indent.js
|   |   |   |   |   index.js
|   |   |   |   |   init-declarations.js
|   |   |   |   |   jsx-quotes.js
|   |   |   |   |   key-spacing.js
|   |   |   |   |   keyword-spacing.js
|   |   |   |   |   line-comment-position.js
|   |   |   |   |   linebreak-style.js
|   |   |   |   |   lines-around-comment.js
|   |   |   |   |   lines-around-directive.js
|   |   |   |   |   lines-between-class-members.js
|   |   |   |   |   logical-assignment-operators.js
|   |   |   |   |   max-classes-per-file.js
|   |   |   |   |   max-depth.js
|   |   |   |   |   max-len.js
|   |   |   |   |   max-lines-per-function.js
|   |   |   |   |   max-lines.js
|   |   |   |   |   max-nested-callbacks.js
|   |   |   |   |   max-params.js
|   |   |   |   |   max-statements-per-line.js
|   |   |   |   |   max-statements.js
|   |   |   |   |   multiline-comment-style.js
|   |   |   |   |   multiline-ternary.js
|   |   |   |   |   new-cap.js
|   |   |   |   |   new-parens.js
|   |   |   |   |   newline-after-var.js
|   |   |   |   |   newline-before-return.js
|   |   |   |   |   newline-per-chained-call.js
|   |   |   |   |   no-alert.js
|   |   |   |   |   no-array-constructor.js
|   |   |   |   |   no-async-promise-executor.js
|   |   |   |   |   no-await-in-loop.js
|   |   |   |   |   no-bitwise.js
|   |   |   |   |   no-buffer-constructor.js
|   |   |   |   |   no-caller.js
|   |   |   |   |   no-case-declarations.js
|   |   |   |   |   no-catch-shadow.js
|   |   |   |   |   no-class-assign.js
|   |   |   |   |   no-compare-neg-zero.js
|   |   |   |   |   no-cond-assign.js
|   |   |   |   |   no-confusing-arrow.js
|   |   |   |   |   no-console.js
|   |   |   |   |   no-const-assign.js
|   |   |   |   |   no-constant-binary-expression.js
|   |   |   |   |   no-constant-condition.js
|   |   |   |   |   no-constructor-return.js
|   |   |   |   |   no-continue.js
|   |   |   |   |   no-control-regex.js
|   |   |   |   |   no-debugger.js
|   |   |   |   |   no-delete-var.js
|   |   |   |   |   no-div-regex.js
|   |   |   |   |   no-dupe-args.js
|   |   |   |   |   no-dupe-class-members.js
|   |   |   |   |   no-dupe-else-if.js
|   |   |   |   |   no-dupe-keys.js
|   |   |   |   |   no-duplicate-case.js
|   |   |   |   |   no-duplicate-imports.js
|   |   |   |   |   no-else-return.js
|   |   |   |   |   no-empty-character-class.js
|   |   |   |   |   no-empty-function.js
|   |   |   |   |   no-empty-pattern.js
|   |   |   |   |   no-empty-static-block.js
|   |   |   |   |   no-empty.js
|   |   |   |   |   no-eq-null.js
|   |   |   |   |   no-eval.js
|   |   |   |   |   no-ex-assign.js
|   |   |   |   |   no-extend-native.js
|   |   |   |   |   no-extra-bind.js
|   |   |   |   |   no-extra-boolean-cast.js
|   |   |   |   |   no-extra-label.js
|   |   |   |   |   no-extra-parens.js
|   |   |   |   |   no-extra-semi.js
|   |   |   |   |   no-fallthrough.js
|   |   |   |   |   no-floating-decimal.js
|   |   |   |   |   no-func-assign.js
|   |   |   |   |   no-global-assign.js
|   |   |   |   |   no-implicit-coercion.js
|   |   |   |   |   no-implicit-globals.js
|   |   |   |   |   no-implied-eval.js
|   |   |   |   |   no-import-assign.js
|   |   |   |   |   no-inline-comments.js
|   |   |   |   |   no-inner-declarations.js
|   |   |   |   |   no-invalid-regexp.js
|   |   |   |   |   no-invalid-this.js
|   |   |   |   |   no-irregular-whitespace.js
|   |   |   |   |   no-iterator.js
|   |   |   |   |   no-label-var.js
|   |   |   |   |   no-labels.js
|   |   |   |   |   no-lone-blocks.js
|   |   |   |   |   no-lonely-if.js
|   |   |   |   |   no-loop-func.js
|   |   |   |   |   no-loss-of-precision.js
|   |   |   |   |   no-magic-numbers.js
|   |   |   |   |   no-misleading-character-class.js
|   |   |   |   |   no-mixed-operators.js
|   |   |   |   |   no-mixed-requires.js
|   |   |   |   |   no-mixed-spaces-and-tabs.js
|   |   |   |   |   no-multi-assign.js
|   |   |   |   |   no-multi-spaces.js
|   |   |   |   |   no-multi-str.js
|   |   |   |   |   no-multiple-empty-lines.js
|   |   |   |   |   no-native-reassign.js
|   |   |   |   |   no-negated-condition.js
|   |   |   |   |   no-negated-in-lhs.js
|   |   |   |   |   no-nested-ternary.js
|   |   |   |   |   no-new-func.js
|   |   |   |   |   no-new-native-nonconstructor.js
|   |   |   |   |   no-new-object.js
|   |   |   |   |   no-new-require.js
|   |   |   |   |   no-new-symbol.js
|   |   |   |   |   no-new-wrappers.js
|   |   |   |   |   no-new.js
|   |   |   |   |   no-nonoctal-decimal-escape.js
|   |   |   |   |   no-obj-calls.js
|   |   |   |   |   no-object-constructor.js
|   |   |   |   |   no-octal-escape.js
|   |   |   |   |   no-octal.js
|   |   |   |   |   no-param-reassign.js
|   |   |   |   |   no-path-concat.js
|   |   |   |   |   no-plusplus.js
|   |   |   |   |   no-process-env.js
|   |   |   |   |   no-process-exit.js
|   |   |   |   |   no-promise-executor-return.js
|   |   |   |   |   no-proto.js
|   |   |   |   |   no-prototype-builtins.js
|   |   |   |   |   no-redeclare.js
|   |   |   |   |   no-regex-spaces.js
|   |   |   |   |   no-restricted-exports.js
|   |   |   |   |   no-restricted-globals.js
|   |   |   |   |   no-restricted-imports.js
|   |   |   |   |   no-restricted-modules.js
|   |   |   |   |   no-restricted-properties.js
|   |   |   |   |   no-restricted-syntax.js
|   |   |   |   |   no-return-assign.js
|   |   |   |   |   no-return-await.js
|   |   |   |   |   no-script-url.js
|   |   |   |   |   no-self-assign.js
|   |   |   |   |   no-self-compare.js
|   |   |   |   |   no-sequences.js
|   |   |   |   |   no-setter-return.js
|   |   |   |   |   no-shadow-restricted-names.js
|   |   |   |   |   no-shadow.js
|   |   |   |   |   no-spaced-func.js
|   |   |   |   |   no-sparse-arrays.js
|   |   |   |   |   no-sync.js
|   |   |   |   |   no-tabs.js
|   |   |   |   |   no-template-curly-in-string.js
|   |   |   |   |   no-ternary.js
|   |   |   |   |   no-this-before-super.js
|   |   |   |   |   no-throw-literal.js
|   |   |   |   |   no-trailing-spaces.js
|   |   |   |   |   no-undef-init.js
|   |   |   |   |   no-undef.js
|   |   |   |   |   no-undefined.js
|   |   |   |   |   no-underscore-dangle.js
|   |   |   |   |   no-unexpected-multiline.js
|   |   |   |   |   no-unmodified-loop-condition.js
|   |   |   |   |   no-unneeded-ternary.js
|   |   |   |   |   no-unreachable-loop.js
|   |   |   |   |   no-unreachable.js
|   |   |   |   |   no-unsafe-finally.js
|   |   |   |   |   no-unsafe-negation.js
|   |   |   |   |   no-unsafe-optional-chaining.js
|   |   |   |   |   no-unused-expressions.js
|   |   |   |   |   no-unused-labels.js
|   |   |   |   |   no-unused-private-class-members.js
|   |   |   |   |   no-unused-vars.js
|   |   |   |   |   no-use-before-define.js
|   |   |   |   |   no-useless-backreference.js
|   |   |   |   |   no-useless-call.js
|   |   |   |   |   no-useless-catch.js
|   |   |   |   |   no-useless-computed-key.js
|   |   |   |   |   no-useless-concat.js
|   |   |   |   |   no-useless-constructor.js
|   |   |   |   |   no-useless-escape.js
|   |   |   |   |   no-useless-rename.js
|   |   |   |   |   no-useless-return.js
|   |   |   |   |   no-var.js
|   |   |   |   |   no-void.js
|   |   |   |   |   no-warning-comments.js
|   |   |   |   |   no-whitespace-before-property.js
|   |   |   |   |   no-with.js
|   |   |   |   |   nonblock-statement-body-position.js
|   |   |   |   |   object-curly-newline.js
|   |   |   |   |   object-curly-spacing.js
|   |   |   |   |   object-property-newline.js
|   |   |   |   |   object-shorthand.js
|   |   |   |   |   one-var-declaration-per-line.js
|   |   |   |   |   one-var.js
|   |   |   |   |   operator-assignment.js
|   |   |   |   |   operator-linebreak.js
|   |   |   |   |   padded-blocks.js
|   |   |   |   |   padding-line-between-statements.js
|   |   |   |   |   prefer-arrow-callback.js
|   |   |   |   |   prefer-const.js
|   |   |   |   |   prefer-destructuring.js
|   |   |   |   |   prefer-exponentiation-operator.js
|   |   |   |   |   prefer-named-capture-group.js
|   |   |   |   |   prefer-numeric-literals.js
|   |   |   |   |   prefer-object-has-own.js
|   |   |   |   |   prefer-object-spread.js
|   |   |   |   |   prefer-promise-reject-errors.js
|   |   |   |   |   prefer-reflect.js
|   |   |   |   |   prefer-regex-literals.js
|   |   |   |   |   prefer-rest-params.js
|   |   |   |   |   prefer-spread.js
|   |   |   |   |   prefer-template.js
|   |   |   |   |   quote-props.js
|   |   |   |   |   quotes.js
|   |   |   |   |   radix.js
|   |   |   |   |   require-atomic-updates.js
|   |   |   |   |   require-await.js
|   |   |   |   |   require-jsdoc.js
|   |   |   |   |   require-unicode-regexp.js
|   |   |   |   |   require-yield.js
|   |   |   |   |   rest-spread-spacing.js
|   |   |   |   |   semi-spacing.js
|   |   |   |   |   semi-style.js
|   |   |   |   |   semi.js
|   |   |   |   |   sort-imports.js
|   |   |   |   |   sort-keys.js
|   |   |   |   |   sort-vars.js
|   |   |   |   |   space-before-blocks.js
|   |   |   |   |   space-before-function-paren.js
|   |   |   |   |   space-in-parens.js
|   |   |   |   |   space-infix-ops.js
|   |   |   |   |   space-unary-ops.js
|   |   |   |   |   spaced-comment.js
|   |   |   |   |   strict.js
|   |   |   |   |   switch-colon-spacing.js
|   |   |   |   |   symbol-description.js
|   |   |   |   |   template-curly-spacing.js
|   |   |   |   |   template-tag-spacing.js
|   |   |   |   |   unicode-bom.js
|   |   |   |   |   use-isnan.js
|   |   |   |   |   valid-jsdoc.js
|   |   |   |   |   valid-typeof.js
|   |   |   |   |   vars-on-top.js
|   |   |   |   |   wrap-iife.js
|   |   |   |   |   wrap-regex.js
|   |   |   |   |   yield-star-spacing.js
|   |   |   |   |   yoda.js
|   |   |   |   |   
|   |   |   |   \---utils
|   |   |   |       |   ast-utils.js
|   |   |   |       |   fix-tracker.js
|   |   |   |       |   keywords.js
|   |   |   |       |   lazy-loading-rule-map.js
|   |   |   |       |   regular-expressions.js
|   |   |   |       |   
|   |   |   |       +---patterns
|   |   |   |       |       letters.js
|   |   |   |       |       
|   |   |   |       \---unicode
|   |   |   |               index.js
|   |   |   |               is-combining-character.js
|   |   |   |               is-emoji-modifier.js
|   |   |   |               is-regional-indicator-symbol.js
|   |   |   |               is-surrogate-pair.js
|   |   |   |               
|   |   |   +---shared
|   |   |   |       ajv.js
|   |   |   |       ast-utils.js
|   |   |   |       config-validator.js
|   |   |   |       deprecation-warnings.js
|   |   |   |       directives.js
|   |   |   |       logging.js
|   |   |   |       relative-module-resolver.js
|   |   |   |       runtime-info.js
|   |   |   |       severity.js
|   |   |   |       string-utils.js
|   |   |   |       traverser.js
|   |   |   |       types.js
|   |   |   |       
|   |   |   \---source-code
|   |   |       |   index.js
|   |   |       |   source-code.js
|   |   |       |   
|   |   |       \---token-store
|   |   |               backward-token-comment-cursor.js
|   |   |               backward-token-cursor.js
|   |   |               cursor.js
|   |   |               cursors.js
|   |   |               decorative-cursor.js
|   |   |               filter-cursor.js
|   |   |               forward-token-comment-cursor.js
|   |   |               forward-token-cursor.js
|   |   |               index.js
|   |   |               limit-cursor.js
|   |   |               padded-token-cursor.js
|   |   |               skip-cursor.js
|   |   |               utils.js
|   |   |               
|   |   \---messages
|   |           all-files-ignored.js
|   |           eslintrc-incompat.js
|   |           eslintrc-plugins.js
|   |           extend-config-missing.js
|   |           failed-to-read-json.js
|   |           file-not-found.js
|   |           invalid-rule-options.js
|   |           invalid-rule-severity.js
|   |           no-config-found.js
|   |           plugin-conflict.js
|   |           plugin-invalid.js
|   |           plugin-missing.js
|   |           print-config-with-directory-path.js
|   |           shared.js
|   |           whitespace-found.js
|   |           
|   +---eslint-scope
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---dist
|   |   |       eslint-scope.cjs
|   |   |       
|   |   \---lib
|   |           definition.js
|   |           index.js
|   |           pattern-visitor.js
|   |           reference.js
|   |           referencer.js
|   |           scope-manager.js
|   |           scope.js
|   |           variable.js
|   |           version.js
|   |           
|   +---eslint-visitor-keys
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---dist
|   |   |       eslint-visitor-keys.cjs
|   |   |       eslint-visitor-keys.d.cts
|   |   |       index.d.ts
|   |   |       visitor-keys.d.ts
|   |   |       
|   |   \---lib
|   |           index.js
|   |           visitor-keys.js
|   |           
|   +---espree
|   |   |   espree.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---dist
|   |   |       espree.cjs
|   |   |       
|   |   \---lib
|   |           espree.js
|   |           features.js
|   |           options.js
|   |           token-translator.js
|   |           version.js
|   |           
|   +---esprima
|   |   |   ChangeLog
|   |   |   LICENSE.BSD
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---bin
|   |   |       esparse.js
|   |   |       esvalidate.js
|   |   |       
|   |   \---dist
|   |           esprima.js
|   |           
|   +---esquery
|   |   |   license.txt
|   |   |   package.json
|   |   |   parser.js
|   |   |   README.md
|   |   |   
|   |   \---dist
|   |           esquery.esm.js
|   |           esquery.esm.min.js
|   |           esquery.esm.min.js.map
|   |           esquery.js
|   |           esquery.lite.js
|   |           esquery.lite.min.js
|   |           esquery.lite.min.js.map
|   |           esquery.min.js
|   |           esquery.min.js.map
|   |           
|   +---esrecurse
|   |       .babelrc
|   |       esrecurse.js
|   |       gulpfile.babel.js
|   |       package.json
|   |       README.md
|   |       
|   +---estraverse
|   |       .jshintrc
|   |       estraverse.js
|   |       gulpfile.js
|   |       LICENSE.BSD
|   |       package.json
|   |       README.md
|   |       
|   +---esutils
|   |   |   LICENSE.BSD
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           ast.js
|   |           code.js
|   |           keyword.js
|   |           utils.js
|   |           
|   +---execa
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   license
|   |   |   package.json
|   |   |   readme.md
|   |   |   
|   |   \---lib
|   |           command.js
|   |           error.js
|   |           kill.js
|   |           promise.js
|   |           stdio.js
|   |           stream.js
|   |           
|   +---exit
|   |   |   .jshintrc
|   |   |   .npmignore
|   |   |   .travis.yml
|   |   |   Gruntfile.js
|   |   |   LICENSE-MIT
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---lib
|   |   |       exit.js
|   |   |       
|   |   \---test
|   |       |   exit_test.js
|   |       |   
|   |       \---fixtures
|   |               10-stderr.txt
|   |               10-stdout-stderr.txt
|   |               10-stdout.txt
|   |               100-stderr.txt
|   |               100-stdout-stderr.txt
|   |               100-stdout.txt
|   |               1000-stderr.txt
|   |               1000-stdout-stderr.txt
|   |               1000-stdout.txt
|   |               create-files.sh
|   |               log-broken.js
|   |               log.js
|   |               
|   +---expect
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---build
|   |           asymmetricMatchers.js
|   |           extractExpectedAssertionsErrors.js
|   |           index.d.ts
|   |           index.js
|   |           jestMatchersObject.js
|   |           matchers.js
|   |           print.js
|   |           spyMatchers.js
|   |           toThrowMatchers.js
|   |           types.js
|   |           
|   +---fast-deep-equal
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   react.d.ts
|   |   |   react.js
|   |   |   README.md
|   |   |   
|   |   \---es6
|   |           index.d.ts
|   |           index.js
|   |           react.d.ts
|   |           react.js
|   |           
|   +---fast-json-stable-stringify
|   |   |   .eslintrc.yml
|   |   |   .travis.yml
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---.github
|   |   |       FUNDING.yml
|   |   |       
|   |   +---benchmark
|   |   |       index.js
|   |   |       test.json
|   |   |       
|   |   +---example
|   |   |       key_cmp.js
|   |   |       nested.js
|   |   |       str.js
|   |   |       value_cmp.js
|   |   |       
|   |   \---test
|   |           cmp.js
|   |           nested.js
|   |           str.js
|   |           to-json.js
|   |           
|   +---fast-levenshtein
|   |       levenshtein.js
|   |       LICENSE.md
|   |       package.json
|   |       README.md
|   |       
|   +---fastq
|   |   |   bench.js
|   |   |   example.js
|   |   |   example.mjs
|   |   |   index.d.ts
|   |   |   LICENSE
|   |   |   package.json
|   |   |   queue.js
|   |   |   README.md
|   |   |   SECURITY.md
|   |   |   
|   |   +---.github
|   |   |   |   dependabot.yml
|   |   |   |   
|   |   |   \---workflows
|   |   |           ci.yml
|   |   |           
|   |   \---test
|   |           example.ts
|   |           promise.js
|   |           test.js
|   |           tsconfig.json
|   |           
|   +---fb-watchman
|   |       index.js
|   |       package.json
|   |       README.md
|   |       
|   +---file-entry-cache
|   |       cache.js
|   |       changelog.md
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---fill-range
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---find-up
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---flat-cache
|   |   |   changelog.md
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---src
|   |           cache.js
|   |           del.js
|   |           utils.js
|   |           
|   +---flatted
|   |   |   es.js
|   |   |   esm.js
|   |   |   index.js
|   |   |   LICENSE
|   |   |   min.js
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---cjs
|   |   |       index.js
|   |   |       package.json
|   |   |       
|   |   +---esm
|   |   |       index.js
|   |   |       
|   |   +---php
|   |   |       flatted.php
|   |   |       
|   |   +---python
|   |   |       flatted.py
|   |   |       
|   |   \---types
|   |           index.d.ts
|   |           
|   +---form-data
|   |   |   CHANGELOG.md
|   |   |   index.d.ts
|   |   |   License
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           browser.js
|   |           form_data.js
|   |           populate.js
|   |           
|   +---fs.realpath
|   |       index.js
|   |       LICENSE
|   |       old.js
|   |       package.json
|   |       README.md
|   |       
|   +---function-bind
|   |   |   .eslintrc
|   |   |   .nycrc
|   |   |   CHANGELOG.md
|   |   |   implementation.js
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---.github
|   |   |       FUNDING.yml
|   |   |       SECURITY.md
|   |   |       
|   |   \---test
|   |           .eslintrc
|   |           index.js
|   |           
|   +---gensync
|   |   |   index.js
|   |   |   index.js.flow
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---test
|   |           .babelrc
|   |           index.test.js
|   |           
|   +---get-caller-file
|   |       index.d.ts
|   |       index.js
|   |       index.js.map
|   |       LICENSE.md
|   |       package.json
|   |       README.md
|   |       
|   +---get-intrinsic
|   |   |   .eslintrc
|   |   |   .nycrc
|   |   |   CHANGELOG.md
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---.github
|   |   |       FUNDING.yml
|   |   |       
|   |   \---test
|   |           GetIntrinsic.js
|   |           
|   +---get-package-type
|   |       async.cjs
|   |       cache.cjs
|   |       CHANGELOG.md
|   |       index.cjs
|   |       is-node-modules.cjs
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       sync.cjs
|   |       
|   +---get-proto
|   |   |   .eslintrc
|   |   |   .nycrc
|   |   |   CHANGELOG.md
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   LICENSE
|   |   |   Object.getPrototypeOf.d.ts
|   |   |   Object.getPrototypeOf.js
|   |   |   package.json
|   |   |   README.md
|   |   |   Reflect.getPrototypeOf.d.ts
|   |   |   Reflect.getPrototypeOf.js
|   |   |   tsconfig.json
|   |   |   
|   |   +---.github
|   |   |       FUNDING.yml
|   |   |       
|   |   \---test
|   |           index.js
|   |           
|   +---get-stream
|   |       buffer-stream.js
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---glob
|   |       common.js
|   |       glob.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       sync.js
|   |       
|   +---glob-parent
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---globals
|   |       globals.json
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---gopd
|   |   |   .eslintrc
|   |   |   CHANGELOG.md
|   |   |   gOPD.d.ts
|   |   |   gOPD.js
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   tsconfig.json
|   |   |   
|   |   +---.github
|   |   |       FUNDING.yml
|   |   |       
|   |   \---test
|   |           index.js
|   |           
|   +---graceful-fs
|   |       clone.js
|   |       graceful-fs.js
|   |       legacy-streams.js
|   |       LICENSE
|   |       package.json
|   |       polyfills.js
|   |       README.md
|   |       
|   +---graphemer
|   |   |   CHANGELOG.md
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           boundaries.d.ts
|   |           boundaries.d.ts.map
|   |           boundaries.js
|   |           Graphemer.d.ts
|   |           Graphemer.d.ts.map
|   |           Graphemer.js
|   |           GraphemerHelper.d.ts
|   |           GraphemerHelper.d.ts.map
|   |           GraphemerHelper.js
|   |           GraphemerIterator.d.ts
|   |           GraphemerIterator.d.ts.map
|   |           GraphemerIterator.js
|   |           index.d.ts
|   |           index.d.ts.map
|   |           index.js
|   |           
|   +---has-flag
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---has-symbols
|   |   |   .eslintrc
|   |   |   .nycrc
|   |   |   CHANGELOG.md
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   shams.d.ts
|   |   |   shams.js
|   |   |   tsconfig.json
|   |   |   
|   |   +---.github
|   |   |       FUNDING.yml
|   |   |       
|   |   \---test
|   |       |   index.js
|   |       |   tests.js
|   |       |   
|   |       \---shams
|   |               core-js.js
|   |               get-own-property-symbols.js
|   |               
|   +---has-tostringtag
|   |   |   .eslintrc
|   |   |   .nycrc
|   |   |   CHANGELOG.md
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   shams.d.ts
|   |   |   shams.js
|   |   |   tsconfig.json
|   |   |   
|   |   +---.github
|   |   |       FUNDING.yml
|   |   |       
|   |   \---test
|   |       |   index.js
|   |       |   tests.js
|   |       |   
|   |       \---shams
|   |               core-js.js
|   |               get-own-property-symbols.js
|   |               
|   +---hasown
|   |   |   .eslintrc
|   |   |   .nycrc
|   |   |   CHANGELOG.md
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   tsconfig.json
|   |   |   
|   |   \---.github
|   |           FUNDING.yml
|   |           
|   +---html-encoding-sniffer
|   |   |   LICENSE.txt
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           html-encoding-sniffer.js
|   |           
|   +---html-escaper
|   |   |   index.js
|   |   |   LICENSE.txt
|   |   |   min.js
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---cjs
|   |   |       index.js
|   |   |       package.json
|   |   |       
|   |   +---esm
|   |   |       index.js
|   |   |       
|   |   \---test
|   |           index.js
|   |           package.json
|   |           
|   +---http-proxy-agent
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---dist
|   |           index.d.ts
|   |           index.d.ts.map
|   |           index.js
|   |           index.js.map
|   |           
|   +---https-proxy-agent
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---dist
|   |           index.d.ts
|   |           index.d.ts.map
|   |           index.js
|   |           index.js.map
|   |           parse-proxy-response.d.ts
|   |           parse-proxy-response.d.ts.map
|   |           parse-proxy-response.js
|   |           parse-proxy-response.js.map
|   |           
|   +---human-signals
|   |   |   CHANGELOG.md
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---build
|   |       \---src
|   |               core.js
|   |               core.js.map
|   |               main.d.ts
|   |               main.js
|   |               main.js.map
|   |               realtime.js
|   |               realtime.js.map
|   |               signals.js
|   |               signals.js.map
|   |               
|   +---iconv-lite
|   |   |   Changelog.md
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---.github
|   |   |       dependabot.yml
|   |   |       
|   |   +---.idea
|   |   |   |   iconv-lite.iml
|   |   |   |   modules.xml
|   |   |   |   vcs.xml
|   |   |   |   
|   |   |   +---codeStyles
|   |   |   |       codeStyleConfig.xml
|   |   |   |       Project.xml
|   |   |   |       
|   |   |   \---inspectionProfiles
|   |   |           Project_Default.xml
|   |   |           
|   |   +---encodings
|   |   |   |   dbcs-codec.js
|   |   |   |   dbcs-data.js
|   |   |   |   index.js
|   |   |   |   internal.js
|   |   |   |   sbcs-codec.js
|   |   |   |   sbcs-data-generated.js
|   |   |   |   sbcs-data.js
|   |   |   |   utf16.js
|   |   |   |   utf32.js
|   |   |   |   utf7.js
|   |   |   |   
|   |   |   \---tables
|   |   |           big5-added.json
|   |   |           cp936.json
|   |   |           cp949.json
|   |   |           cp950.json
|   |   |           eucjp.json
|   |   |           gb18030-ranges.json
|   |   |           gbk-added.json
|   |   |           shiftjis.json
|   |   |           
|   |   \---lib
|   |           bom-handling.js
|   |           index.d.ts
|   |           index.js
|   |           streams.js
|   |           
|   +---ignore
|   |       index.d.ts
|   |       index.js
|   |       legacy.js
|   |       LICENSE-MIT
|   |       package.json
|   |       README.md
|   |       
|   +---import-fresh
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---import-local
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   license
|   |   |   package.json
|   |   |   readme.md
|   |   |   
|   |   \---fixtures
|   |           cli.js
|   |           
|   +---imurmurhash
|   |       imurmurhash.js
|   |       imurmurhash.min.js
|   |       package.json
|   |       README.md
|   |       
|   +---inflight
|   |       inflight.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---inherits
|   |       inherits.js
|   |       inherits_browser.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---is-arrayish
|   |       .editorconfig
|   |       .istanbul.yml
|   |       .npmignore
|   |       .travis.yml
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---is-core-module
|   |   |   .eslintrc
|   |   |   .nycrc
|   |   |   CHANGELOG.md
|   |   |   core.json
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---test
|   |           index.js
|   |           
|   +---is-extglob
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---is-fullwidth-code-point
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---is-generator-fn
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---is-glob
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---is-number
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---is-path-inside
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---is-potential-custom-element-name
|   |       index.js
|   |       LICENSE-MIT.txt
|   |       package.json
|   |       README.md
|   |       
|   +---is-stream
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---isexe
|   |   |   .npmignore
|   |   |   index.js
|   |   |   LICENSE
|   |   |   mode.js
|   |   |   package.json
|   |   |   README.md
|   |   |   windows.js
|   |   |   
|   |   \---test
|   |           basic.js
|   |           
|   +---istanbul-lib-coverage
|   |   |   CHANGELOG.md
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           coverage-map.js
|   |           coverage-summary.js
|   |           data-properties.js
|   |           file-coverage.js
|   |           percent.js
|   |           
|   +---istanbul-lib-instrument
|   |   |   CHANGELOG.md
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---node_modules
|   |   |   +---.bin
|   |   |   |       semver
|   |   |   |       semver.cmd
|   |   |   |       semver.ps1
|   |   |   |       
|   |   |   \---semver
|   |   |       |   index.js
|   |   |       |   LICENSE
|   |   |       |   package.json
|   |   |       |   preload.js
|   |   |       |   range.bnf
|   |   |       |   README.md
|   |   |       |   
|   |   |       +---bin
|   |   |       |       semver.js
|   |   |       |       
|   |   |       +---classes
|   |   |       |       comparator.js
|   |   |       |       index.js
|   |   |       |       range.js
|   |   |       |       semver.js
|   |   |       |       
|   |   |       +---functions
|   |   |       |       clean.js
|   |   |       |       cmp.js
|   |   |       |       coerce.js
|   |   |       |       compare-build.js
|   |   |       |       compare-loose.js
|   |   |       |       compare.js
|   |   |       |       diff.js
|   |   |       |       eq.js
|   |   |       |       gt.js
|   |   |       |       gte.js
|   |   |       |       inc.js
|   |   |       |       lt.js
|   |   |       |       lte.js
|   |   |       |       major.js
|   |   |       |       minor.js
|   |   |       |       neq.js
|   |   |       |       parse.js
|   |   |       |       patch.js
|   |   |       |       prerelease.js
|   |   |       |       rcompare.js
|   |   |       |       rsort.js
|   |   |       |       satisfies.js
|   |   |       |       sort.js
|   |   |       |       valid.js
|   |   |       |       
|   |   |       +---internal
|   |   |       |       constants.js
|   |   |       |       debug.js
|   |   |       |       identifiers.js
|   |   |       |       lrucache.js
|   |   |       |       parse-options.js
|   |   |       |       re.js
|   |   |       |       
|   |   |       \---ranges
|   |   |               gtr.js
|   |   |               intersects.js
|   |   |               ltr.js
|   |   |               max-satisfying.js
|   |   |               min-satisfying.js
|   |   |               min-version.js
|   |   |               outside.js
|   |   |               simplify.js
|   |   |               subset.js
|   |   |               to-comparators.js
|   |   |               valid.js
|   |   |               
|   |   \---src
|   |           constants.js
|   |           index.js
|   |           instrumenter.js
|   |           read-coverage.js
|   |           source-coverage.js
|   |           visitor.js
|   |           
|   +---istanbul-lib-report
|   |   |   CHANGELOG.md
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           context.js
|   |           file-writer.js
|   |           path.js
|   |           report-base.js
|   |           summarizer-factory.js
|   |           tree.js
|   |           watermarks.js
|   |           xml-writer.js
|   |           
|   +---istanbul-lib-source-maps
|   |   |   CHANGELOG.md
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           get-mapping.js
|   |           map-store.js
|   |           mapped.js
|   |           pathutils.js
|   |           transform-utils.js
|   |           transformer.js
|   |           
|   +---istanbul-reports
|   |   |   CHANGELOG.md
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |       +---clover
|   |       |       index.js
|   |       |       
|   |       +---cobertura
|   |       |       index.js
|   |       |       
|   |       +---html
|   |       |   |   annotator.js
|   |       |   |   index.js
|   |       |   |   insertion-text.js
|   |       |   |   
|   |       |   \---assets
|   |       |       |   base.css
|   |       |       |   block-navigation.js
|   |       |       |   favicon.png
|   |       |       |   sort-arrow-sprite.png
|   |       |       |   sorter.js
|   |       |       |   
|   |       |       \---vendor
|   |       |               prettify.css
|   |       |               prettify.js
|   |       |               
|   |       +---html-spa
|   |       |   |   .babelrc
|   |       |   |   index.js
|   |       |   |   webpack.config.js
|   |       |   |   
|   |       |   +---assets
|   |       |   |       bundle.js
|   |       |   |       sort-arrow-sprite.png
|   |       |   |       spa.css
|   |       |   |       
|   |       |   \---src
|   |       |           fileBreadcrumbs.js
|   |       |           filterToggle.js
|   |       |           flattenToggle.js
|   |       |           getChildData.js
|   |       |           index.js
|   |       |           routing.js
|   |       |           summaryHeader.js
|   |       |           summaryTableHeader.js
|   |       |           summaryTableLine.js
|   |       |           
|   |       +---json
|   |       |       index.js
|   |       |       
|   |       +---json-summary
|   |       |       index.js
|   |       |       
|   |       +---lcov
|   |       |       index.js
|   |       |       
|   |       +---lcovonly
|   |       |       index.js
|   |       |       
|   |       +---none
|   |       |       index.js
|   |       |       
|   |       +---teamcity
|   |       |       index.js
|   |       |       
|   |       +---text
|   |       |       index.js
|   |       |       
|   |       +---text-lcov
|   |       |       index.js
|   |       |       
|   |       \---text-summary
|   |               index.js
|   |               
|   +---jest
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---bin
|   |   |       jest.js
|   |   |       
|   |   \---build
|   |           index.d.ts
|   |           index.js
|   |           
|   +---jest-changed-files
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---build
|   |           git.js
|   |           hg.js
|   |           index.d.ts
|   |           index.js
|   |           sl.js
|   |           types.js
|   |           
|   +---jest-circus
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   runner.js
|   |   |   
|   |   \---build
|   |       |   eventHandler.js
|   |       |   formatNodeAssertErrors.js
|   |       |   globalErrorHandlers.js
|   |       |   index.d.ts
|   |       |   index.js
|   |       |   run.js
|   |       |   shuffleArray.js
|   |       |   state.js
|   |       |   testCaseReportHandler.js
|   |       |   types.js
|   |       |   utils.js
|   |       |   
|   |       \---legacy-code-todo-rewrite
|   |               jestAdapter.js
|   |               jestAdapterInit.js
|   |               
|   +---jest-cli
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---bin
|   |   |       jest.js
|   |   |       
|   |   \---build
|   |           args.js
|   |           index.d.ts
|   |           index.js
|   |           run.js
|   |           
|   +---jest-config
|   |   |   LICENSE
|   |   |   package.json
|   |   |   
|   |   +---build
|   |   |       color.js
|   |   |       constants.js
|   |   |       Defaults.js
|   |   |       Deprecated.js
|   |   |       Descriptions.js
|   |   |       getCacheDirectory.js
|   |   |       getMaxWorkers.js
|   |   |       index.d.ts
|   |   |       index.js
|   |   |       normalize.js
|   |   |       parseShardPair.js
|   |   |       readConfigFileAndSetRootDir.js
|   |   |       ReporterValidationErrors.js
|   |   |       resolveConfigPath.js
|   |   |       setFromArgv.js
|   |   |       stringToBytes.js
|   |   |       utils.js
|   |   |       validatePattern.js
|   |   |       ValidConfig.js
|   |   |       
|   |   \---node_modules
|   |       +---babel-jest
|   |       |   |   LICENSE
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   
|   |       |   \---build
|   |       |           index.d.ts
|   |       |           index.js
|   |       |           loadBabelConfig.js
|   |       |           
|   |       +---babel-plugin-jest-hoist
|   |       |   |   LICENSE
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   
|   |       |   \---build
|   |       |           index.d.ts
|   |       |           index.js
|   |       |           
|   |       \---babel-preset-jest
|   |               index.js
|   |               LICENSE
|   |               package.json
|   |               README.md
|   |               
|   +---jest-diff
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---build
|   |           cleanupSemantic.js
|   |           constants.js
|   |           diffLines.js
|   |           diffStrings.js
|   |           getAlignedDiffs.js
|   |           index.d.ts
|   |           index.js
|   |           joinAlignedDiffs.js
|   |           normalizeDiffOptions.js
|   |           printDiffs.js
|   |           types.js
|   |           
|   +---jest-docblock
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---build
|   |           index.d.ts
|   |           index.js
|   |           
|   +---jest-each
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---build
|   |       |   bind.js
|   |       |   index.d.ts
|   |       |   index.js
|   |       |   validation.js
|   |       |   
|   |       \---table
|   |               array.js
|   |               interpolation.js
|   |               template.js
|   |               
|   +---jest-environment-jsdom
|   |   |   LICENSE
|   |   |   package.json
|   |   |   
|   |   +---build
|   |   |       index.d.ts
|   |   |       index.js
|   |   |       
|   |   \---node_modules
|   |       +---agent-base
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   
|   |       |   +---dist
|   |       |   |   \---src
|   |       |   |           index.d.ts
|   |       |   |           index.js
|   |       |   |           index.js.map
|   |       |   |           promisify.d.ts
|   |       |   |           promisify.js
|   |       |   |           promisify.js.map
|   |       |   |           
|   |       |   \---src
|   |       |           index.ts
|   |       |           promisify.ts
|   |       |           
|   |       +---cssstyle
|   |       |   |   LICENSE
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   
|   |       |   +---lib
|   |       |   |   |   allExtraProperties.js
|   |       |   |   |   allProperties.js
|   |       |   |   |   allWebkitProperties.js
|   |       |   |   |   constants.js
|   |       |   |   |   CSSStyleDeclaration.js
|   |       |   |   |   CSSStyleDeclaration.test.js
|   |       |   |   |   implementedProperties.js
|   |       |   |   |   named_colors.json
|   |       |   |   |   parsers.js
|   |       |   |   |   parsers.test.js
|   |       |   |   |   properties.js
|   |       |   |   |   
|   |       |   |   +---properties
|   |       |   |   |       azimuth.js
|   |       |   |   |       background.js
|   |       |   |   |       backgroundAttachment.js
|   |       |   |   |       backgroundColor.js
|   |       |   |   |       backgroundImage.js
|   |       |   |   |       backgroundPosition.js
|   |       |   |   |       backgroundRepeat.js
|   |       |   |   |       border.js
|   |       |   |   |       borderBottom.js
|   |       |   |   |       borderBottomColor.js
|   |       |   |   |       borderBottomStyle.js
|   |       |   |   |       borderBottomWidth.js
|   |       |   |   |       borderCollapse.js
|   |       |   |   |       borderColor.js
|   |       |   |   |       borderLeft.js
|   |       |   |   |       borderLeftColor.js
|   |       |   |   |       borderLeftStyle.js
|   |       |   |   |       borderLeftWidth.js
|   |       |   |   |       borderRight.js
|   |       |   |   |       borderRightColor.js
|   |       |   |   |       borderRightStyle.js
|   |       |   |   |       borderRightWidth.js
|   |       |   |   |       borderSpacing.js
|   |       |   |   |       borderStyle.js
|   |       |   |   |       borderTop.js
|   |       |   |   |       borderTopColor.js
|   |       |   |   |       borderTopStyle.js
|   |       |   |   |       borderTopWidth.js
|   |       |   |   |       borderWidth.js
|   |       |   |   |       bottom.js
|   |       |   |   |       clear.js
|   |       |   |   |       clip.js
|   |       |   |   |       color.js
|   |       |   |   |       cssFloat.js
|   |       |   |   |       flex.js
|   |       |   |   |       flexBasis.js
|   |       |   |   |       flexGrow.js
|   |       |   |   |       flexShrink.js
|   |       |   |   |       float.js
|   |       |   |   |       floodColor.js
|   |       |   |   |       font.js
|   |       |   |   |       fontFamily.js
|   |       |   |   |       fontSize.js
|   |       |   |   |       fontStyle.js
|   |       |   |   |       fontVariant.js
|   |       |   |   |       fontWeight.js
|   |       |   |   |       height.js
|   |       |   |   |       left.js
|   |       |   |   |       lightingColor.js
|   |       |   |   |       lineHeight.js
|   |       |   |   |       margin.js
|   |       |   |   |       marginBottom.js
|   |       |   |   |       marginLeft.js
|   |       |   |   |       marginRight.js
|   |       |   |   |       marginTop.js
|   |       |   |   |       opacity.js
|   |       |   |   |       outlineColor.js
|   |       |   |   |       padding.js
|   |       |   |   |       paddingBottom.js
|   |       |   |   |       paddingLeft.js
|   |       |   |   |       paddingRight.js
|   |       |   |   |       paddingTop.js
|   |       |   |   |       right.js
|   |       |   |   |       stopColor.js
|   |       |   |   |       textLineThroughColor.js
|   |       |   |   |       textOverlineColor.js
|   |       |   |   |       textUnderlineColor.js
|   |       |   |   |       top.js
|   |       |   |   |       webkitBorderAfterColor.js
|   |       |   |   |       webkitBorderBeforeColor.js
|   |       |   |   |       webkitBorderEndColor.js
|   |       |   |   |       webkitBorderStartColor.js
|   |       |   |   |       webkitColumnRuleColor.js
|   |       |   |   |       webkitMatchNearestMailBlockquoteColor.js
|   |       |   |   |       webkitTapHighlightColor.js
|   |       |   |   |       webkitTextEmphasisColor.js
|   |       |   |   |       webkitTextFillColor.js
|   |       |   |   |       webkitTextStrokeColor.js
|   |       |   |   |       width.js
|   |       |   |   |       
|   |       |   |   \---utils
|   |       |   |           colorSpace.js
|   |       |   |           getBasicPropertyDescriptor.js
|   |       |   |           
|   |       |   \---node_modules
|   |       |       \---cssom
|   |       |           |   LICENSE.txt
|   |       |           |   package.json
|   |       |           |   README.mdown
|   |       |           |   
|   |       |           \---lib
|   |       |                   clone.js
|   |       |                   CSSDocumentRule.js
|   |       |                   CSSFontFaceRule.js
|   |       |                   CSSHostRule.js
|   |       |                   CSSImportRule.js
|   |       |                   CSSKeyframeRule.js
|   |       |                   CSSKeyframesRule.js
|   |       |                   CSSMediaRule.js
|   |       |                   CSSOM.js
|   |       |                   CSSRule.js
|   |       |                   CSSStyleDeclaration.js
|   |       |                   CSSStyleRule.js
|   |       |                   CSSStyleSheet.js
|   |       |                   CSSSupportsRule.js
|   |       |                   CSSValue.js
|   |       |                   CSSValueExpression.js
|   |       |                   index.js
|   |       |                   MatcherList.js
|   |       |                   MediaList.js
|   |       |                   parse.js
|   |       |                   StyleSheet.js
|   |       |                   
|   |       +---data-urls
|   |       |   |   LICENSE.txt
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   
|   |       |   \---lib
|   |       |           parser.js
|   |       |           utils.js
|   |       |           
|   |       +---html-encoding-sniffer
|   |       |   |   LICENSE.txt
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   
|   |       |   \---lib
|   |       |           html-encoding-sniffer.js
|   |       |           
|   |       +---http-proxy-agent
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   
|   |       |   \---dist
|   |       |           agent.d.ts
|   |       |           agent.js
|   |       |           agent.js.map
|   |       |           index.d.ts
|   |       |           index.js
|   |       |           index.js.map
|   |       |           
|   |       +---https-proxy-agent
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   
|   |       |   \---dist
|   |       |           agent.d.ts
|   |       |           agent.js
|   |       |           agent.js.map
|   |       |           index.d.ts
|   |       |           index.js
|   |       |           index.js.map
|   |       |           parse-proxy-response.d.ts
|   |       |           parse-proxy-response.js
|   |       |           parse-proxy-response.js.map
|   |       |           
|   |       +---jsdom
|   |       |   |   LICENSE.txt
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   
|   |       |   \---lib
|   |       |       |   api.js
|   |       |       |   
|   |       |       \---jsdom
|   |       |           |   named-properties-tracker.js
|   |       |           |   utils.js
|   |       |           |   virtual-console.js
|   |       |           |   vm-shim.js
|   |       |           |   
|   |       |           +---browser
|   |       |           |   |   default-stylesheet.js
|   |       |           |   |   js-globals.json
|   |       |           |   |   not-implemented.js
|   |       |           |   |   Window.js
|   |       |           |   |   
|   |       |           |   +---parser
|   |       |           |   |       html.js
|   |       |           |   |       index.js
|   |       |           |   |       xml.js
|   |       |           |   |       
|   |       |           |   \---resources
|   |       |           |           async-resource-queue.js
|   |       |           |           no-op-resource-loader.js
|   |       |           |           per-document-resource-loader.js
|   |       |           |           request-manager.js
|   |       |           |           resource-loader.js
|   |       |           |           resource-queue.js
|   |       |           |           
|   |       |           +---level2
|   |       |           |       style.js
|   |       |           |       
|   |       |           +---level3
|   |       |           |       xpath.js
|   |       |           |       
|   |       |           \---living
|   |       |               |   attributes.js
|   |       |               |   documents.js
|   |       |               |   interfaces.js
|   |       |               |   named-properties-window.js
|   |       |               |   node-document-position.js
|   |       |               |   node-type.js
|   |       |               |   node.js
|   |       |               |   post-message.js
|   |       |               |   
|   |       |               +---aborting
|   |       |               |       AbortController-impl.js
|   |       |               |       AbortSignal-impl.js
|   |       |               |       
|   |       |               +---attributes
|   |       |               |       Attr-impl.js
|   |       |               |       NamedNodeMap-impl.js
|   |       |               |       
|   |       |               +---constraint-validation
|   |       |               |       DefaultConstraintValidation-impl.js
|   |       |               |       ValidityState-impl.js
|   |       |               |       
|   |       |               +---crypto
|   |       |               |       Crypto-impl.js
|   |       |               |       
|   |       |               +---cssom
|   |       |               |       StyleSheetList-impl.js
|   |       |               |       
|   |       |               +---custom-elements
|   |       |               |       CustomElementRegistry-impl.js
|   |       |               |       
|   |       |               +---domparsing
|   |       |               |       DOMParser-impl.js
|   |       |               |       InnerHTML-impl.js
|   |       |               |       parse5-adapter-serialization.js
|   |       |               |       serialization.js
|   |       |               |       XMLSerializer-impl.js
|   |       |               |       
|   |       |               +---events
|   |       |               |       CloseEvent-impl.js
|   |       |               |       CompositionEvent-impl.js
|   |       |               |       CustomEvent-impl.js
|   |       |               |       ErrorEvent-impl.js
|   |       |               |       Event-impl.js
|   |       |               |       EventModifierMixin-impl.js
|   |       |               |       EventTarget-impl.js
|   |       |               |       FocusEvent-impl.js
|   |       |               |       HashChangeEvent-impl.js
|   |       |               |       InputEvent-impl.js
|   |       |               |       KeyboardEvent-impl.js
|   |       |               |       MessageEvent-impl.js
|   |       |               |       MouseEvent-impl.js
|   |       |               |       PageTransitionEvent-impl.js
|   |       |               |       PopStateEvent-impl.js
|   |       |               |       ProgressEvent-impl.js
|   |       |               |       StorageEvent-impl.js
|   |       |               |       TouchEvent-impl.js
|   |       |               |       UIEvent-impl.js
|   |       |               |       WheelEvent-impl.js
|   |       |               |       
|   |       |               +---fetch
|   |       |               |       header-list.js
|   |       |               |       header-types.js
|   |       |               |       Headers-impl.js
|   |       |               |       
|   |       |               +---file-api
|   |       |               |       Blob-impl.js
|   |       |               |       File-impl.js
|   |       |               |       FileList-impl.js
|   |       |               |       FileReader-impl.js
|   |       |               |       
|   |       |               +---generated
|   |       |               |       AbortController.js
|   |       |               |       AbortSignal.js
|   |       |               |       AbstractRange.js
|   |       |               |       AddEventListenerOptions.js
|   |       |               |       AssignedNodesOptions.js
|   |       |               |       Attr.js
|   |       |               |       BarProp.js
|   |       |               |       BinaryType.js
|   |       |               |       Blob.js
|   |       |               |       BlobCallback.js
|   |       |               |       BlobPropertyBag.js
|   |       |               |       CanPlayTypeResult.js
|   |       |               |       CDATASection.js
|   |       |               |       CharacterData.js
|   |       |               |       CloseEvent.js
|   |       |               |       CloseEventInit.js
|   |       |               |       Comment.js
|   |       |               |       CompositionEvent.js
|   |       |               |       CompositionEventInit.js
|   |       |               |       Crypto.js
|   |       |               |       CustomElementConstructor.js
|   |       |               |       CustomElementRegistry.js
|   |       |               |       CustomEvent.js
|   |       |               |       CustomEventInit.js
|   |       |               |       Document.js
|   |       |               |       DocumentFragment.js
|   |       |               |       DocumentReadyState.js
|   |       |               |       DocumentType.js
|   |       |               |       DOMImplementation.js
|   |       |               |       DOMParser.js
|   |       |               |       DOMStringMap.js
|   |       |               |       DOMTokenList.js
|   |       |               |       Element.js
|   |       |               |       ElementCreationOptions.js
|   |       |               |       ElementDefinitionOptions.js
|   |       |               |       EndingType.js
|   |       |               |       ErrorEvent.js
|   |       |               |       ErrorEventInit.js
|   |       |               |       Event.js
|   |       |               |       EventHandlerNonNull.js
|   |       |               |       EventInit.js
|   |       |               |       EventListener.js
|   |       |               |       EventListenerOptions.js
|   |       |               |       EventModifierInit.js
|   |       |               |       EventTarget.js
|   |       |               |       External.js
|   |       |               |       File.js
|   |       |               |       FileList.js
|   |       |               |       FilePropertyBag.js
|   |       |               |       FileReader.js
|   |       |               |       FocusEvent.js
|   |       |               |       FocusEventInit.js
|   |       |               |       FormData.js
|   |       |               |       Function.js
|   |       |               |       GetRootNodeOptions.js
|   |       |               |       HashChangeEvent.js
|   |       |               |       HashChangeEventInit.js
|   |       |               |       Headers.js
|   |       |               |       History.js
|   |       |               |       HTMLAnchorElement.js
|   |       |               |       HTMLAreaElement.js
|   |       |               |       HTMLAudioElement.js
|   |       |               |       HTMLBaseElement.js
|   |       |               |       HTMLBodyElement.js
|   |       |               |       HTMLBRElement.js
|   |       |               |       HTMLButtonElement.js
|   |       |               |       HTMLCanvasElement.js
|   |       |               |       HTMLCollection.js
|   |       |               |       HTMLDataElement.js
|   |       |               |       HTMLDataListElement.js
|   |       |               |       HTMLDetailsElement.js
|   |       |               |       HTMLDialogElement.js
|   |       |               |       HTMLDirectoryElement.js
|   |       |               |       HTMLDivElement.js
|   |       |               |       HTMLDListElement.js
|   |       |               |       HTMLElement.js
|   |       |               |       HTMLEmbedElement.js
|   |       |               |       HTMLFieldSetElement.js
|   |       |               |       HTMLFontElement.js
|   |       |               |       HTMLFormControlsCollection.js
|   |       |               |       HTMLFormElement.js
|   |       |               |       HTMLFrameElement.js
|   |       |               |       HTMLFrameSetElement.js
|   |       |               |       HTMLHeadElement.js
|   |       |               |       HTMLHeadingElement.js
|   |       |               |       HTMLHRElement.js
|   |       |               |       HTMLHtmlElement.js
|   |       |               |       HTMLIFrameElement.js
|   |       |               |       HTMLImageElement.js
|   |       |               |       HTMLInputElement.js
|   |       |               |       HTMLLabelElement.js
|   |       |               |       HTMLLegendElement.js
|   |       |               |       HTMLLIElement.js
|   |       |               |       HTMLLinkElement.js
|   |       |               |       HTMLMapElement.js
|   |       |               |       HTMLMarqueeElement.js
|   |       |               |       HTMLMediaElement.js
|   |       |               |       HTMLMenuElement.js
|   |       |               |       HTMLMetaElement.js
|   |       |               |       HTMLMeterElement.js
|   |       |               |       HTMLModElement.js
|   |       |               |       HTMLObjectElement.js
|   |       |               |       HTMLOListElement.js
|   |       |               |       HTMLOptGroupElement.js
|   |       |               |       HTMLOptionElement.js
|   |       |               |       HTMLOptionsCollection.js
|   |       |               |       HTMLOutputElement.js
|   |       |               |       HTMLParagraphElement.js
|   |       |               |       HTMLParamElement.js
|   |       |               |       HTMLPictureElement.js
|   |       |               |       HTMLPreElement.js
|   |       |               |       HTMLProgressElement.js
|   |       |               |       HTMLQuoteElement.js
|   |       |               |       HTMLScriptElement.js
|   |       |               |       HTMLSelectElement.js
|   |       |               |       HTMLSlotElement.js
|   |       |               |       HTMLSourceElement.js
|   |       |               |       HTMLSpanElement.js
|   |       |               |       HTMLStyleElement.js
|   |       |               |       HTMLTableCaptionElement.js
|   |       |               |       HTMLTableCellElement.js
|   |       |               |       HTMLTableColElement.js
|   |       |               |       HTMLTableElement.js
|   |       |               |       HTMLTableRowElement.js
|   |       |               |       HTMLTableSectionElement.js
|   |       |               |       HTMLTemplateElement.js
|   |       |               |       HTMLTextAreaElement.js
|   |       |               |       HTMLTimeElement.js
|   |       |               |       HTMLTitleElement.js
|   |       |               |       HTMLTrackElement.js
|   |       |               |       HTMLUListElement.js
|   |       |               |       HTMLUnknownElement.js
|   |       |               |       HTMLVideoElement.js
|   |       |               |       InputEvent.js
|   |       |               |       InputEventInit.js
|   |       |               |       KeyboardEvent.js
|   |       |               |       KeyboardEventInit.js
|   |       |               |       Location.js
|   |       |               |       MessageEvent.js
|   |       |               |       MessageEventInit.js
|   |       |               |       MimeType.js
|   |       |               |       MimeTypeArray.js
|   |       |               |       MouseEvent.js
|   |       |               |       MouseEventInit.js
|   |       |               |       MutationCallback.js
|   |       |               |       MutationObserver.js
|   |       |               |       MutationObserverInit.js
|   |       |               |       MutationRecord.js
|   |       |               |       NamedNodeMap.js
|   |       |               |       Navigator.js
|   |       |               |       Node.js
|   |       |               |       NodeFilter.js
|   |       |               |       NodeIterator.js
|   |       |               |       NodeList.js
|   |       |               |       OnBeforeUnloadEventHandlerNonNull.js
|   |       |               |       OnErrorEventHandlerNonNull.js
|   |       |               |       PageTransitionEvent.js
|   |       |               |       PageTransitionEventInit.js
|   |       |               |       Performance.js
|   |       |               |       Plugin.js
|   |       |               |       PluginArray.js
|   |       |               |       PopStateEvent.js
|   |       |               |       PopStateEventInit.js
|   |       |               |       ProcessingInstruction.js
|   |       |               |       ProgressEvent.js
|   |       |               |       ProgressEventInit.js
|   |       |               |       RadioNodeList.js
|   |       |               |       Range.js
|   |       |               |       Screen.js
|   |       |               |       ScrollBehavior.js
|   |       |               |       ScrollIntoViewOptions.js
|   |       |               |       ScrollLogicalPosition.js
|   |       |               |       ScrollOptions.js
|   |       |               |       ScrollRestoration.js
|   |       |               |       Selection.js
|   |       |               |       SelectionMode.js
|   |       |               |       ShadowRoot.js
|   |       |               |       ShadowRootInit.js
|   |       |               |       ShadowRootMode.js
|   |       |               |       StaticRange.js
|   |       |               |       StaticRangeInit.js
|   |       |               |       Storage.js
|   |       |               |       StorageEvent.js
|   |       |               |       StorageEventInit.js
|   |       |               |       StyleSheetList.js
|   |       |               |       SupportedType.js
|   |       |               |       SVGAnimatedString.js
|   |       |               |       SVGBoundingBoxOptions.js
|   |       |               |       SVGElement.js
|   |       |               |       SVGGraphicsElement.js
|   |       |               |       SVGNumber.js
|   |       |               |       SVGStringList.js
|   |       |               |       SVGSVGElement.js
|   |       |               |       SVGTitleElement.js
|   |       |               |       Text.js
|   |       |               |       TextTrackKind.js
|   |       |               |       TouchEvent.js
|   |       |               |       TouchEventInit.js
|   |       |               |       TreeWalker.js
|   |       |               |       UIEvent.js
|   |       |               |       UIEventInit.js
|   |       |               |       utils.js
|   |       |               |       ValidityState.js
|   |       |               |       VisibilityState.js
|   |       |               |       VoidFunction.js
|   |       |               |       WebSocket.js
|   |       |               |       WheelEvent.js
|   |       |               |       WheelEventInit.js
|   |       |               |       XMLDocument.js
|   |       |               |       XMLHttpRequest.js
|   |       |               |       XMLHttpRequestEventTarget.js
|   |       |               |       XMLHttpRequestResponseType.js
|   |       |               |       XMLHttpRequestUpload.js
|   |       |               |       XMLSerializer.js
|   |       |               |       
|   |       |               +---helpers
|   |       |               |   |   agent-factory.js
|   |       |               |   |   binary-data.js
|   |       |               |   |   create-element.js
|   |       |               |   |   create-event-accessor.js
|   |       |               |   |   custom-elements.js
|   |       |               |   |   dates-and-times.js
|   |       |               |   |   details.js
|   |       |               |   |   document-base-url.js
|   |       |               |   |   events.js
|   |       |               |   |   focusing.js
|   |       |               |   |   form-controls.js
|   |       |               |   |   html-constructor.js
|   |       |               |   |   http-request.js
|   |       |               |   |   internal-constants.js
|   |       |               |   |   iterable-weak-set.js
|   |       |               |   |   json.js
|   |       |               |   |   mutation-observers.js
|   |       |               |   |   namespaces.js
|   |       |               |   |   node.js
|   |       |               |   |   number-and-date-inputs.js
|   |       |               |   |   ordered-set.js
|   |       |               |   |   page-transition-event.js
|   |       |               |   |   runtime-script-errors.js
|   |       |               |   |   selectors.js
|   |       |               |   |   shadow-dom.js
|   |       |               |   |   strings.js
|   |       |               |   |   style-rules.js
|   |       |               |   |   stylesheets.js
|   |       |               |   |   text.js
|   |       |               |   |   traversal.js
|   |       |               |   |   validate-names.js
|   |       |               |   |   
|   |       |               |   \---svg
|   |       |               |           basic-types.js
|   |       |               |           render.js
|   |       |               |           
|   |       |               +---hr-time
|   |       |               |       Performance-impl.js
|   |       |               |       
|   |       |               +---mutation-observer
|   |       |               |       MutationObserver-impl.js
|   |       |               |       MutationRecord-impl.js
|   |       |               |       
|   |       |               +---navigator
|   |       |               |       MimeType-impl.js
|   |       |               |       MimeTypeArray-impl.js
|   |       |               |       Navigator-impl.js
|   |       |               |       NavigatorConcurrentHardware-impl.js
|   |       |               |       NavigatorCookies-impl.js
|   |       |               |       NavigatorID-impl.js
|   |       |               |       NavigatorLanguage-impl.js
|   |       |               |       NavigatorOnLine-impl.js
|   |       |               |       NavigatorPlugins-impl.js
|   |       |               |       Plugin-impl.js
|   |       |               |       PluginArray-impl.js
|   |       |               |       
|   |       |               +---nodes
|   |       |               |       CDATASection-impl.js
|   |       |               |       CharacterData-impl.js
|   |       |               |       ChildNode-impl.js
|   |       |               |       Comment-impl.js
|   |       |               |       Document-impl.js
|   |       |               |       DocumentFragment-impl.js
|   |       |               |       DocumentOrShadowRoot-impl.js
|   |       |               |       DocumentType-impl.js
|   |       |               |       DOMImplementation-impl.js
|   |       |               |       DOMStringMap-impl.js
|   |       |               |       DOMTokenList-impl.js
|   |       |               |       Element-impl.js
|   |       |               |       ElementContentEditable-impl.js
|   |       |               |       ElementCSSInlineStyle-impl.js
|   |       |               |       GlobalEventHandlers-impl.js
|   |       |               |       HTMLAnchorElement-impl.js
|   |       |               |       HTMLAreaElement-impl.js
|   |       |               |       HTMLAudioElement-impl.js
|   |       |               |       HTMLBaseElement-impl.js
|   |       |               |       HTMLBodyElement-impl.js
|   |       |               |       HTMLBRElement-impl.js
|   |       |               |       HTMLButtonElement-impl.js
|   |       |               |       HTMLCanvasElement-impl.js
|   |       |               |       HTMLCollection-impl.js
|   |       |               |       HTMLDataElement-impl.js
|   |       |               |       HTMLDataListElement-impl.js
|   |       |               |       HTMLDetailsElement-impl.js
|   |       |               |       HTMLDialogElement-impl.js
|   |       |               |       HTMLDirectoryElement-impl.js
|   |       |               |       HTMLDivElement-impl.js
|   |       |               |       HTMLDListElement-impl.js
|   |       |               |       HTMLElement-impl.js
|   |       |               |       HTMLEmbedElement-impl.js
|   |       |               |       HTMLFieldSetElement-impl.js
|   |       |               |       HTMLFontElement-impl.js
|   |       |               |       HTMLFormControlsCollection-impl.js
|   |       |               |       HTMLFormElement-impl.js
|   |       |               |       HTMLFrameElement-impl.js
|   |       |               |       HTMLFrameSetElement-impl.js
|   |       |               |       HTMLHeadElement-impl.js
|   |       |               |       HTMLHeadingElement-impl.js
|   |       |               |       HTMLHRElement-impl.js
|   |       |               |       HTMLHtmlElement-impl.js
|   |       |               |       HTMLHyperlinkElementUtils-impl.js
|   |       |               |       HTMLIFrameElement-impl.js
|   |       |               |       HTMLImageElement-impl.js
|   |       |               |       HTMLInputElement-impl.js
|   |       |               |       HTMLLabelElement-impl.js
|   |       |               |       HTMLLegendElement-impl.js
|   |       |               |       HTMLLIElement-impl.js
|   |       |               |       HTMLLinkElement-impl.js
|   |       |               |       HTMLMapElement-impl.js
|   |       |               |       HTMLMarqueeElement-impl.js
|   |       |               |       HTMLMediaElement-impl.js
|   |       |               |       HTMLMenuElement-impl.js
|   |       |               |       HTMLMetaElement-impl.js
|   |       |               |       HTMLMeterElement-impl.js
|   |       |               |       HTMLModElement-impl.js
|   |       |               |       HTMLObjectElement-impl.js
|   |       |               |       HTMLOListElement-impl.js
|   |       |               |       HTMLOptGroupElement-impl.js
|   |       |               |       HTMLOptionElement-impl.js
|   |       |               |       HTMLOptionsCollection-impl.js
|   |       |               |       HTMLOrSVGElement-impl.js
|   |       |               |       HTMLOutputElement-impl.js
|   |       |               |       HTMLParagraphElement-impl.js
|   |       |               |       HTMLParamElement-impl.js
|   |       |               |       HTMLPictureElement-impl.js
|   |       |               |       HTMLPreElement-impl.js
|   |       |               |       HTMLProgressElement-impl.js
|   |       |               |       HTMLQuoteElement-impl.js
|   |       |               |       HTMLScriptElement-impl.js
|   |       |               |       HTMLSelectElement-impl.js
|   |       |               |       HTMLSlotElement-impl.js
|   |       |               |       HTMLSourceElement-impl.js
|   |       |               |       HTMLSpanElement-impl.js
|   |       |               |       HTMLStyleElement-impl.js
|   |       |               |       HTMLTableCaptionElement-impl.js
|   |       |               |       HTMLTableCellElement-impl.js
|   |       |               |       HTMLTableColElement-impl.js
|   |       |               |       HTMLTableElement-impl.js
|   |       |               |       HTMLTableRowElement-impl.js
|   |       |               |       HTMLTableSectionElement-impl.js
|   |       |               |       HTMLTemplateElement-impl.js
|   |       |               |       HTMLTextAreaElement-impl.js
|   |       |               |       HTMLTimeElement-impl.js
|   |       |               |       HTMLTitleElement-impl.js
|   |       |               |       HTMLTrackElement-impl.js
|   |       |               |       HTMLUListElement-impl.js
|   |       |               |       HTMLUnknownElement-impl.js
|   |       |               |       HTMLVideoElement-impl.js
|   |       |               |       LinkStyle-impl.js
|   |       |               |       Node-impl.js
|   |       |               |       NodeList-impl.js
|   |       |               |       NonDocumentTypeChildNode-impl.js
|   |       |               |       NonElementParentNode-impl.js
|   |       |               |       ParentNode-impl.js
|   |       |               |       ProcessingInstruction-impl.js
|   |       |               |       RadioNodeList-impl.js
|   |       |               |       ShadowRoot-impl.js
|   |       |               |       Slotable-impl.js
|   |       |               |       SVGElement-impl.js
|   |       |               |       SVGGraphicsElement-impl.js
|   |       |               |       SVGSVGElement-impl.js
|   |       |               |       SVGTests-impl.js
|   |       |               |       SVGTitleElement-impl.js
|   |       |               |       Text-impl.js
|   |       |               |       WindowEventHandlers-impl.js
|   |       |               |       XMLDocument-impl.js
|   |       |               |       
|   |       |               +---range
|   |       |               |       AbstractRange-impl.js
|   |       |               |       boundary-point.js
|   |       |               |       Range-impl.js
|   |       |               |       StaticRange-impl.js
|   |       |               |       
|   |       |               +---selection
|   |       |               |       Selection-impl.js
|   |       |               |       
|   |       |               +---svg
|   |       |               |       SVGAnimatedString-impl.js
|   |       |               |       SVGListBase.js
|   |       |               |       SVGNumber-impl.js
|   |       |               |       SVGStringList-impl.js
|   |       |               |       
|   |       |               +---traversal
|   |       |               |       helpers.js
|   |       |               |       NodeIterator-impl.js
|   |       |               |       TreeWalker-impl.js
|   |       |               |       
|   |       |               +---websockets
|   |       |               |       WebSocket-impl-browser.js
|   |       |               |       WebSocket-impl.js
|   |       |               |       
|   |       |               +---webstorage
|   |       |               |       Storage-impl.js
|   |       |               |       
|   |       |               +---window
|   |       |               |       BarProp-impl.js
|   |       |               |       External-impl.js
|   |       |               |       History-impl.js
|   |       |               |       Location-impl.js
|   |       |               |       navigation.js
|   |       |               |       Screen-impl.js
|   |       |               |       SessionHistory.js
|   |       |               |       
|   |       |               \---xhr
|   |       |                       FormData-impl.js
|   |       |                       xhr-sync-worker.js
|   |       |                       xhr-utils.js
|   |       |                       XMLHttpRequest-impl.js
|   |       |                       XMLHttpRequestEventTarget-impl.js
|   |       |                       XMLHttpRequestUpload-impl.js
|   |       |                       
|   |       +---tough-cookie
|   |       |   |   LICENSE
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   
|   |       |   \---lib
|   |       |           cookie.js
|   |       |           memstore.js
|   |       |           pathMatch.js
|   |       |           permuteDomain.js
|   |       |           pubsuffix-psl.js
|   |       |           store.js
|   |       |           utilHelper.js
|   |       |           validators.js
|   |       |           version.js
|   |       |           
|   |       +---tr46
|   |       |   |   index.js
|   |       |   |   LICENSE.md
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   
|   |       |   \---lib
|   |       |           mappingTable.json
|   |       |           regexes.js
|   |       |           statusMapping.js
|   |       |           
|   |       +---w3c-xmlserializer
|   |       |   |   LICENSE.md
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   
|   |       |   \---lib
|   |       |           attributes.js
|   |       |           constants.js
|   |       |           serialize.js
|   |       |           
|   |       +---whatwg-encoding
|   |       |   |   LICENSE.txt
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   
|   |       |   \---lib
|   |       |           labels-to-names.json
|   |       |           supported-names.json
|   |       |           whatwg-encoding.js
|   |       |           
|   |       +---whatwg-mimetype
|   |       |   |   LICENSE.txt
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   
|   |       |   \---lib
|   |       |           mime-type-parameters.js
|   |       |           mime-type.js
|   |       |           parser.js
|   |       |           serializer.js
|   |       |           utils.js
|   |       |           
|   |       +---whatwg-url
|   |       |   |   index.js
|   |       |   |   LICENSE.txt
|   |       |   |   package.json
|   |       |   |   README.md
|   |       |   |   webidl2js-wrapper.js
|   |       |   |   
|   |       |   \---lib
|   |       |           encoding.js
|   |       |           Function.js
|   |       |           infra.js
|   |       |           percent-encoding.js
|   |       |           URL-impl.js
|   |       |           url-state-machine.js
|   |       |           URL.js
|   |       |           urlencoded.js
|   |       |           URLSearchParams-impl.js
|   |       |           URLSearchParams.js
|   |       |           utils.js
|   |       |           VoidFunction.js
|   |       |           
|   |       \---xml-name-validator
|   |           |   LICENSE.txt
|   |           |   package.json
|   |           |   README.md
|   |           |   
|   |           \---lib
|   |                   xml-name-validator.js
|   |                   
|   +---jest-environment-node
|   |   |   LICENSE
|   |   |   package.json
|   |   |   
|   |   \---build
|   |           index.d.ts
|   |           index.js
|   |           
|   +---jest-get-type
|   |   |   LICENSE
|   |   |   package.json
|   |   |   
|   |   \---build
|   |           index.d.ts
|   |           index.js
|   |           
|   +---jest-haste-map
|   |   |   LICENSE
|   |   |   package.json
|   |   |   
|   |   \---build
|   |       |   blacklist.js
|   |       |   constants.js
|   |       |   getMockName.js
|   |       |   HasteFS.js
|   |       |   index.d.ts
|   |       |   index.js
|   |       |   ModuleMap.js
|   |       |   types.js
|   |       |   worker.js
|   |       |   
|   |       +---crawlers
|   |       |       node.js
|   |       |       watchman.js
|   |       |       
|   |       +---lib
|   |       |       dependencyExtractor.js
|   |       |       fast_path.js
|   |       |       getPlatformExtension.js
|   |       |       isWatchmanInstalled.js
|   |       |       normalizePathSep.js
|   |       |       
|   |       \---watchers
|   |               common.js
|   |               FSEventsWatcher.js
|   |               NodeWatcher.js
|   |               RecrawlWarning.js
|   |               WatchmanWatcher.js
|   |               
|   +---jest-leak-detector
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---build
|   |           index.d.ts
|   |           index.js
|   |           
|   +---jest-matcher-utils
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---build
|   |           deepCyclicCopyReplaceable.js
|   |           index.d.ts
|   |           index.js
|   |           Replaceable.js
|   |           
|   +---jest-message-util
|   |   |   LICENSE
|   |   |   package.json
|   |   |   
|   |   \---build
|   |           index.d.ts
|   |           index.js
|   |           types.js
|   |           
|   +---jest-mock
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---build
|   |           index.d.ts
|   |           index.js
|   |           
|   +---jest-pnp-resolver
|   |       createRequire.js
|   |       getDefaultResolver.js
|   |       index.d.ts
|   |       index.js
|   |       package.json
|   |       README.md
|   |       
|   +---jest-regex-util
|   |   |   LICENSE
|   |   |   package.json
|   |   |   
|   |   \---build
|   |           index.d.ts
|   |           index.js
|   |           
|   +---jest-resolve
|   |   |   LICENSE
|   |   |   package.json
|   |   |   
|   |   \---build
|   |           defaultResolver.js
|   |           fileWalkers.js
|   |           index.d.ts
|   |           index.js
|   |           isBuiltinModule.js
|   |           ModuleNotFoundError.js
|   |           nodeModulesPaths.js
|   |           resolver.js
|   |           shouldLoadAsEsm.js
|   |           types.js
|   |           utils.js
|   |           
|   +---jest-resolve-dependencies
|   |   |   LICENSE
|   |   |   package.json
|   |   |   
|   |   \---build
|   |           index.d.ts
|   |           index.js
|   |           
|   +---jest-runner
|   |   |   LICENSE
|   |   |   package.json
|   |   |   
|   |   \---build
|   |           index.d.ts
|   |           index.js
|   |           runTest.js
|   |           testWorker.js
|   |           types.js
|   |           
|   +---jest-runtime
|   |   |   LICENSE
|   |   |   package.json
|   |   |   
|   |   \---build
|   |           helpers.js
|   |           index.d.ts
|   |           index.js
|   |           
|   +---jest-snapshot
|   |   |   LICENSE
|   |   |   package.json
|   |   |   
|   |   +---build
|   |   |       colors.js
|   |   |       dedentLines.js
|   |   |       index.d.ts
|   |   |       index.js
|   |   |       InlineSnapshots.js
|   |   |       mockSerializer.js
|   |   |       plugins.js
|   |   |       printSnapshot.js
|   |   |       SnapshotResolver.js
|   |   |       State.js
|   |   |       types.js
|   |   |       utils.js
|   |   |       
|   |   \---node_modules
|   |       +---.bin
|   |       |       semver
|   |       |       semver.cmd
|   |       |       semver.ps1
|   |       |       
|   |       \---semver
|   |           |   index.js
|   |           |   LICENSE
|   |           |   package.json
|   |           |   preload.js
|   |           |   range.bnf
|   |           |   README.md
|   |           |   
|   |           +---bin
|   |           |       semver.js
|   |           |       
|   |           +---classes
|   |           |       comparator.js
|   |           |       index.js
|   |           |       range.js
|   |           |       semver.js
|   |           |       
|   |           +---functions
|   |           |       clean.js
|   |           |       cmp.js
|   |           |       coerce.js
|   |           |       compare-build.js
|   |           |       compare-loose.js
|   |           |       compare.js
|   |           |       diff.js
|   |           |       eq.js
|   |           |       gt.js
|   |           |       gte.js
|   |           |       inc.js
|   |           |       lt.js
|   |           |       lte.js
|   |           |       major.js
|   |           |       minor.js
|   |           |       neq.js
|   |           |       parse.js
|   |           |       patch.js
|   |           |       prerelease.js
|   |           |       rcompare.js
|   |           |       rsort.js
|   |           |       satisfies.js
|   |           |       sort.js
|   |           |       valid.js
|   |           |       
|   |           +---internal
|   |           |       constants.js
|   |           |       debug.js
|   |           |       identifiers.js
|   |           |       lrucache.js
|   |           |       parse-options.js
|   |           |       re.js
|   |           |       
|   |           \---ranges
|   |                   gtr.js
|   |                   intersects.js
|   |                   ltr.js
|   |                   max-satisfying.js
|   |                   min-satisfying.js
|   |                   min-version.js
|   |                   outside.js
|   |                   simplify.js
|   |                   subset.js
|   |                   to-comparators.js
|   |                   valid.js
|   |                   
|   +---jest-util
|   |   |   LICENSE
|   |   |   package.json
|   |   |   Readme.md
|   |   |   
|   |   \---build
|   |           clearLine.js
|   |           convertDescriptorToString.js
|   |           createDirectory.js
|   |           createProcessObject.js
|   |           deepCyclicCopy.js
|   |           ErrorWithStack.js
|   |           formatTime.js
|   |           globsToMatcher.js
|   |           index.d.ts
|   |           index.js
|   |           installCommonGlobals.js
|   |           interopRequireDefault.js
|   |           invariant.js
|   |           isInteractive.js
|   |           isNonNullable.js
|   |           isPromise.js
|   |           pluralize.js
|   |           preRunMessage.js
|   |           replacePathSepForGlob.js
|   |           requireOrImportModule.js
|   |           setGlobal.js
|   |           specialChars.js
|   |           testPathPatternToRegExp.js
|   |           tryRealpath.js
|   |           
|   +---jest-validate
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---build
|   |   |       condition.js
|   |   |       defaultConfig.js
|   |   |       deprecated.js
|   |   |       errors.js
|   |   |       exampleConfig.js
|   |   |       index.d.ts
|   |   |       index.js
|   |   |       types.js
|   |   |       utils.js
|   |   |       validate.js
|   |   |       validateCLIOptions.js
|   |   |       warnings.js
|   |   |       
|   |   \---node_modules
|   |       \---camelcase
|   |               index.d.ts
|   |               index.js
|   |               license
|   |               package.json
|   |               readme.md
|   |               
|   +---jest-watcher
|   |   |   LICENSE
|   |   |   package.json
|   |   |   
|   |   \---build
|   |       |   BaseWatchPlugin.js
|   |       |   constants.js
|   |       |   index.d.ts
|   |       |   index.js
|   |       |   JestHooks.js
|   |       |   PatternPrompt.js
|   |       |   TestWatcher.js
|   |       |   types.js
|   |       |   
|   |       \---lib
|   |               colorize.js
|   |               formatTestNameByPattern.js
|   |               patternModeHelpers.js
|   |               Prompt.js
|   |               scroll.js
|   |               
|   +---jest-worker
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---build
|   |   |   |   Farm.js
|   |   |   |   FifoQueue.js
|   |   |   |   index.d.ts
|   |   |   |   index.js
|   |   |   |   PriorityQueue.js
|   |   |   |   types.js
|   |   |   |   WorkerPool.js
|   |   |   |   
|   |   |   +---base
|   |   |   |       BaseWorkerPool.js
|   |   |   |       
|   |   |   \---workers
|   |   |           ChildProcessWorker.js
|   |   |           messageParent.js
|   |   |           NodeThreadsWorker.js
|   |   |           processChild.js
|   |   |           threadChild.js
|   |   |           WorkerAbstract.js
|   |   |           
|   |   \---node_modules
|   |       \---supports-color
|   |               browser.js
|   |               index.js
|   |               license
|   |               package.json
|   |               readme.md
|   |               
|   +---js-tokens
|   |       CHANGELOG.md
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---js-yaml
|   |   |   CHANGELOG.md
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---bin
|   |   |       js-yaml.js
|   |   |       
|   |   +---dist
|   |   |       js-yaml.js
|   |   |       js-yaml.min.js
|   |   |       js-yaml.mjs
|   |   |       
|   |   \---lib
|   |       |   common.js
|   |       |   dumper.js
|   |       |   exception.js
|   |       |   loader.js
|   |       |   schema.js
|   |       |   snippet.js
|   |       |   type.js
|   |       |   
|   |       +---schema
|   |       |       core.js
|   |       |       default.js
|   |       |       failsafe.js
|   |       |       json.js
|   |       |       
|   |       \---type
|   |               binary.js
|   |               bool.js
|   |               float.js
|   |               int.js
|   |               map.js
|   |               merge.js
|   |               null.js
|   |               omap.js
|   |               pairs.js
|   |               seq.js
|   |               set.js
|   |               str.js
|   |               timestamp.js
|   |               
|   +---jsdom
|   |   |   LICENSE.txt
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |       |   api.js
|   |       |   
|   |       \---jsdom
|   |           |   named-properties-tracker.js
|   |           |   utils.js
|   |           |   virtual-console.js
|   |           |   
|   |           +---browser
|   |           |   |   default-stylesheet.js
|   |           |   |   js-globals.json
|   |           |   |   not-implemented.js
|   |           |   |   Window.js
|   |           |   |   
|   |           |   +---parser
|   |           |   |       html.js
|   |           |   |       index.js
|   |           |   |       xml.js
|   |           |   |       
|   |           |   \---resources
|   |           |           async-resource-queue.js
|   |           |           no-op-resource-loader.js
|   |           |           per-document-resource-loader.js
|   |           |           request-manager.js
|   |           |           resource-loader.js
|   |           |           resource-queue.js
|   |           |           
|   |           +---level2
|   |           |       style.js
|   |           |       
|   |           +---level3
|   |           |       xpath.js
|   |           |       
|   |           \---living
|   |               |   attributes.js
|   |               |   documents.js
|   |               |   interfaces.js
|   |               |   named-properties-window.js
|   |               |   node-document-position.js
|   |               |   node-type.js
|   |               |   node.js
|   |               |   
|   |               +---aborting
|   |               |       AbortController-impl.js
|   |               |       AbortSignal-impl.js
|   |               |       
|   |               +---attributes
|   |               |       Attr-impl.js
|   |               |       NamedNodeMap-impl.js
|   |               |       
|   |               +---constraint-validation
|   |               |       DefaultConstraintValidation-impl.js
|   |               |       ValidityState-impl.js
|   |               |       
|   |               +---crypto
|   |               |       Crypto-impl.js
|   |               |       
|   |               +---cssom
|   |               |       StyleSheetList-impl.js
|   |               |       
|   |               +---custom-elements
|   |               |       CustomElementRegistry-impl.js
|   |               |       ElementInternals-impl.js
|   |               |       
|   |               +---domparsing
|   |               |       DOMParser-impl.js
|   |               |       InnerHTML-impl.js
|   |               |       parse5-adapter-serialization.js
|   |               |       serialization.js
|   |               |       XMLSerializer-impl.js
|   |               |       
|   |               +---events
|   |               |       CloseEvent-impl.js
|   |               |       CompositionEvent-impl.js
|   |               |       CustomEvent-impl.js
|   |               |       ErrorEvent-impl.js
|   |               |       Event-impl.js
|   |               |       EventModifierMixin-impl.js
|   |               |       EventTarget-impl.js
|   |               |       FocusEvent-impl.js
|   |               |       HashChangeEvent-impl.js
|   |               |       InputEvent-impl.js
|   |               |       KeyboardEvent-impl.js
|   |               |       MessageEvent-impl.js
|   |               |       MouseEvent-impl.js
|   |               |       PageTransitionEvent-impl.js
|   |               |       PopStateEvent-impl.js
|   |               |       ProgressEvent-impl.js
|   |               |       StorageEvent-impl.js
|   |               |       SubmitEvent-impl.js
|   |               |       TouchEvent-impl.js
|   |               |       UIEvent-impl.js
|   |               |       WheelEvent-impl.js
|   |               |       
|   |               +---fetch
|   |               |       header-list.js
|   |               |       header-types.js
|   |               |       Headers-impl.js
|   |               |       
|   |               +---file-api
|   |               |       Blob-impl.js
|   |               |       File-impl.js
|   |               |       FileList-impl.js
|   |               |       FileReader-impl.js
|   |               |       
|   |               +---generated
|   |               |       AbortController.js
|   |               |       AbortSignal.js
|   |               |       AbstractRange.js
|   |               |       AddEventListenerOptions.js
|   |               |       AssignedNodesOptions.js
|   |               |       Attr.js
|   |               |       BarProp.js
|   |               |       BinaryType.js
|   |               |       Blob.js
|   |               |       BlobCallback.js
|   |               |       BlobPropertyBag.js
|   |               |       CanPlayTypeResult.js
|   |               |       CDATASection.js
|   |               |       CharacterData.js
|   |               |       CloseEvent.js
|   |               |       CloseEventInit.js
|   |               |       Comment.js
|   |               |       CompositionEvent.js
|   |               |       CompositionEventInit.js
|   |               |       Crypto.js
|   |               |       CustomElementConstructor.js
|   |               |       CustomElementRegistry.js
|   |               |       CustomEvent.js
|   |               |       CustomEventInit.js
|   |               |       Document.js
|   |               |       DocumentFragment.js
|   |               |       DocumentReadyState.js
|   |               |       DocumentType.js
|   |               |       DOMException.js
|   |               |       DOMImplementation.js
|   |               |       DOMParser.js
|   |               |       DOMRect.js
|   |               |       DOMRectInit.js
|   |               |       DOMRectReadOnly.js
|   |               |       DOMStringMap.js
|   |               |       DOMTokenList.js
|   |               |       Element.js
|   |               |       ElementCreationOptions.js
|   |               |       ElementDefinitionOptions.js
|   |               |       ElementInternals.js
|   |               |       EndingType.js
|   |               |       ErrorEvent.js
|   |               |       ErrorEventInit.js
|   |               |       Event.js
|   |               |       EventHandlerNonNull.js
|   |               |       EventInit.js
|   |               |       EventListener.js
|   |               |       EventListenerOptions.js
|   |               |       EventModifierInit.js
|   |               |       EventTarget.js
|   |               |       External.js
|   |               |       File.js
|   |               |       FileList.js
|   |               |       FilePropertyBag.js
|   |               |       FileReader.js
|   |               |       FocusEvent.js
|   |               |       FocusEventInit.js
|   |               |       FormData.js
|   |               |       Function.js
|   |               |       GetRootNodeOptions.js
|   |               |       HashChangeEvent.js
|   |               |       HashChangeEventInit.js
|   |               |       Headers.js
|   |               |       History.js
|   |               |       HTMLAnchorElement.js
|   |               |       HTMLAreaElement.js
|   |               |       HTMLAudioElement.js
|   |               |       HTMLBaseElement.js
|   |               |       HTMLBodyElement.js
|   |               |       HTMLBRElement.js
|   |               |       HTMLButtonElement.js
|   |               |       HTMLCanvasElement.js
|   |               |       HTMLCollection.js
|   |               |       HTMLDataElement.js
|   |               |       HTMLDataListElement.js
|   |               |       HTMLDetailsElement.js
|   |               |       HTMLDialogElement.js
|   |               |       HTMLDirectoryElement.js
|   |               |       HTMLDivElement.js
|   |               |       HTMLDListElement.js
|   |               |       HTMLElement.js
|   |               |       HTMLEmbedElement.js
|   |               |       HTMLFieldSetElement.js
|   |               |       HTMLFontElement.js
|   |               |       HTMLFormControlsCollection.js
|   |               |       HTMLFormElement.js
|   |               |       HTMLFrameElement.js
|   |               |       HTMLFrameSetElement.js
|   |               |       HTMLHeadElement.js
|   |               |       HTMLHeadingElement.js
|   |               |       HTMLHRElement.js
|   |               |       HTMLHtmlElement.js
|   |               |       HTMLIFrameElement.js
|   |               |       HTMLImageElement.js
|   |               |       HTMLInputElement.js
|   |               |       HTMLLabelElement.js
|   |               |       HTMLLegendElement.js
|   |               |       HTMLLIElement.js
|   |               |       HTMLLinkElement.js
|   |               |       HTMLMapElement.js
|   |               |       HTMLMarqueeElement.js
|   |               |       HTMLMediaElement.js
|   |               |       HTMLMenuElement.js
|   |               |       HTMLMetaElement.js
|   |               |       HTMLMeterElement.js
|   |               |       HTMLModElement.js
|   |               |       HTMLObjectElement.js
|   |               |       HTMLOListElement.js
|   |               |       HTMLOptGroupElement.js
|   |               |       HTMLOptionElement.js
|   |               |       HTMLOptionsCollection.js
|   |               |       HTMLOutputElement.js
|   |               |       HTMLParagraphElement.js
|   |               |       HTMLParamElement.js
|   |               |       HTMLPictureElement.js
|   |               |       HTMLPreElement.js
|   |               |       HTMLProgressElement.js
|   |               |       HTMLQuoteElement.js
|   |               |       HTMLScriptElement.js
|   |               |       HTMLSelectElement.js
|   |               |       HTMLSlotElement.js
|   |               |       HTMLSourceElement.js
|   |               |       HTMLSpanElement.js
|   |               |       HTMLStyleElement.js
|   |               |       HTMLTableCaptionElement.js
|   |               |       HTMLTableCellElement.js
|   |               |       HTMLTableColElement.js
|   |               |       HTMLTableElement.js
|   |               |       HTMLTableRowElement.js
|   |               |       HTMLTableSectionElement.js
|   |               |       HTMLTemplateElement.js
|   |               |       HTMLTextAreaElement.js
|   |               |       HTMLTimeElement.js
|   |               |       HTMLTitleElement.js
|   |               |       HTMLTrackElement.js
|   |               |       HTMLUListElement.js
|   |               |       HTMLUnknownElement.js
|   |               |       HTMLVideoElement.js
|   |               |       InputEvent.js
|   |               |       InputEventInit.js
|   |               |       KeyboardEvent.js
|   |               |       KeyboardEventInit.js
|   |               |       Location.js
|   |               |       MessageEvent.js
|   |               |       MessageEventInit.js
|   |               |       MimeType.js
|   |               |       MimeTypeArray.js
|   |               |       MouseEvent.js
|   |               |       MouseEventInit.js
|   |               |       MutationCallback.js
|   |               |       MutationObserver.js
|   |               |       MutationObserverInit.js
|   |               |       MutationRecord.js
|   |               |       NamedNodeMap.js
|   |               |       Navigator.js
|   |               |       Node.js
|   |               |       NodeFilter.js
|   |               |       NodeIterator.js
|   |               |       NodeList.js
|   |               |       OnBeforeUnloadEventHandlerNonNull.js
|   |               |       OnErrorEventHandlerNonNull.js
|   |               |       PageTransitionEvent.js
|   |               |       PageTransitionEventInit.js
|   |               |       Performance.js
|   |               |       Plugin.js
|   |               |       PluginArray.js
|   |               |       PopStateEvent.js
|   |               |       PopStateEventInit.js
|   |               |       ProcessingInstruction.js
|   |               |       ProgressEvent.js
|   |               |       ProgressEventInit.js
|   |               |       RadioNodeList.js
|   |               |       Range.js
|   |               |       Screen.js
|   |               |       ScrollBehavior.js
|   |               |       ScrollIntoViewOptions.js
|   |               |       ScrollLogicalPosition.js
|   |               |       ScrollOptions.js
|   |               |       ScrollRestoration.js
|   |               |       Selection.js
|   |               |       SelectionMode.js
|   |               |       ShadowRoot.js
|   |               |       ShadowRootInit.js
|   |               |       ShadowRootMode.js
|   |               |       StaticRange.js
|   |               |       StaticRangeInit.js
|   |               |       Storage.js
|   |               |       StorageEvent.js
|   |               |       StorageEventInit.js
|   |               |       StyleSheetList.js
|   |               |       SubmitEvent.js
|   |               |       SubmitEventInit.js
|   |               |       SupportedType.js
|   |               |       SVGAnimatedPreserveAspectRatio.js
|   |               |       SVGAnimatedRect.js
|   |               |       SVGAnimatedString.js
|   |               |       SVGBoundingBoxOptions.js
|   |               |       SVGDefsElement.js
|   |               |       SVGDescElement.js
|   |               |       SVGElement.js
|   |               |       SVGGElement.js
|   |               |       SVGGraphicsElement.js
|   |               |       SVGMetadataElement.js
|   |               |       SVGNumber.js
|   |               |       SVGPreserveAspectRatio.js
|   |               |       SVGRect.js
|   |               |       SVGStringList.js
|   |               |       SVGSVGElement.js
|   |               |       SVGSwitchElement.js
|   |               |       SVGSymbolElement.js
|   |               |       SVGTitleElement.js
|   |               |       Text.js
|   |               |       TextTrackKind.js
|   |               |       TouchEvent.js
|   |               |       TouchEventInit.js
|   |               |       TreeWalker.js
|   |               |       UIEvent.js
|   |               |       UIEventInit.js
|   |               |       utils.js
|   |               |       ValidityState.js
|   |               |       VisibilityState.js
|   |               |       VoidFunction.js
|   |               |       WebSocket.js
|   |               |       WheelEvent.js
|   |               |       WheelEventInit.js
|   |               |       XMLDocument.js
|   |               |       XMLHttpRequest.js
|   |               |       XMLHttpRequestEventTarget.js
|   |               |       XMLHttpRequestResponseType.js
|   |               |       XMLHttpRequestUpload.js
|   |               |       XMLSerializer.js
|   |               |       
|   |               +---geometry
|   |               |       DOMRect-impl.js
|   |               |       DOMRectReadOnly-impl.js
|   |               |       
|   |               +---helpers
|   |               |   |   agent-factory.js
|   |               |   |   binary-data.js
|   |               |   |   colors.js
|   |               |   |   create-element.js
|   |               |   |   create-event-accessor.js
|   |               |   |   custom-elements.js
|   |               |   |   dates-and-times.js
|   |               |   |   details.js
|   |               |   |   events.js
|   |               |   |   focusing.js
|   |               |   |   form-controls.js
|   |               |   |   html-constructor.js
|   |               |   |   http-request.js
|   |               |   |   internal-constants.js
|   |               |   |   iterable-weak-set.js
|   |               |   |   json.js
|   |               |   |   mutation-observers.js
|   |               |   |   namespaces.js
|   |               |   |   node.js
|   |               |   |   number-and-date-inputs.js
|   |               |   |   ordered-set.js
|   |               |   |   page-transition-event.js
|   |               |   |   runtime-script-errors.js
|   |               |   |   selectors.js
|   |               |   |   shadow-dom.js
|   |               |   |   strings.js
|   |               |   |   style-rules.js
|   |               |   |   stylesheets.js
|   |               |   |   text.js
|   |               |   |   traversal.js
|   |               |   |   validate-names.js
|   |               |   |   
|   |               |   \---svg
|   |               |           basic-types.js
|   |               |           render.js
|   |               |           
|   |               +---hr-time
|   |               |       Performance-impl.js
|   |               |       
|   |               +---mutation-observer
|   |               |       MutationObserver-impl.js
|   |               |       MutationRecord-impl.js
|   |               |       
|   |               +---navigator
|   |               |       MimeType-impl.js
|   |               |       MimeTypeArray-impl.js
|   |               |       Navigator-impl.js
|   |               |       NavigatorConcurrentHardware-impl.js
|   |               |       NavigatorCookies-impl.js
|   |               |       NavigatorID-impl.js
|   |               |       NavigatorLanguage-impl.js
|   |               |       NavigatorOnLine-impl.js
|   |               |       NavigatorPlugins-impl.js
|   |               |       Plugin-impl.js
|   |               |       PluginArray-impl.js
|   |               |       
|   |               +---nodes
|   |               |       CDATASection-impl.js
|   |               |       CharacterData-impl.js
|   |               |       ChildNode-impl.js
|   |               |       Comment-impl.js
|   |               |       Document-impl.js
|   |               |       DocumentFragment-impl.js
|   |               |       DocumentOrShadowRoot-impl.js
|   |               |       DocumentType-impl.js
|   |               |       DOMImplementation-impl.js
|   |               |       DOMStringMap-impl.js
|   |               |       DOMTokenList-impl.js
|   |               |       Element-impl.js
|   |               |       ElementContentEditable-impl.js
|   |               |       ElementCSSInlineStyle-impl.js
|   |               |       GlobalEventHandlers-impl.js
|   |               |       HTMLAnchorElement-impl.js
|   |               |       HTMLAreaElement-impl.js
|   |               |       HTMLAudioElement-impl.js
|   |               |       HTMLBaseElement-impl.js
|   |               |       HTMLBodyElement-impl.js
|   |               |       HTMLBRElement-impl.js
|   |               |       HTMLButtonElement-impl.js
|   |               |       HTMLCanvasElement-impl.js
|   |               |       HTMLCollection-impl.js
|   |               |       HTMLDataElement-impl.js
|   |               |       HTMLDataListElement-impl.js
|   |               |       HTMLDetailsElement-impl.js
|   |               |       HTMLDialogElement-impl.js
|   |               |       HTMLDirectoryElement-impl.js
|   |               |       HTMLDivElement-impl.js
|   |               |       HTMLDListElement-impl.js
|   |               |       HTMLElement-impl.js
|   |               |       HTMLEmbedElement-impl.js
|   |               |       HTMLFieldSetElement-impl.js
|   |               |       HTMLFontElement-impl.js
|   |               |       HTMLFormControlsCollection-impl.js
|   |               |       HTMLFormElement-impl.js
|   |               |       HTMLFrameElement-impl.js
|   |               |       HTMLFrameSetElement-impl.js
|   |               |       HTMLHeadElement-impl.js
|   |               |       HTMLHeadingElement-impl.js
|   |               |       HTMLHRElement-impl.js
|   |               |       HTMLHtmlElement-impl.js
|   |               |       HTMLHyperlinkElementUtils-impl.js
|   |               |       HTMLIFrameElement-impl.js
|   |               |       HTMLImageElement-impl.js
|   |               |       HTMLInputElement-impl.js
|   |               |       HTMLLabelElement-impl.js
|   |               |       HTMLLegendElement-impl.js
|   |               |       HTMLLIElement-impl.js
|   |               |       HTMLLinkElement-impl.js
|   |               |       HTMLMapElement-impl.js
|   |               |       HTMLMarqueeElement-impl.js
|   |               |       HTMLMediaElement-impl.js
|   |               |       HTMLMenuElement-impl.js
|   |               |       HTMLMetaElement-impl.js
|   |               |       HTMLMeterElement-impl.js
|   |               |       HTMLModElement-impl.js
|   |               |       HTMLObjectElement-impl.js
|   |               |       HTMLOListElement-impl.js
|   |               |       HTMLOptGroupElement-impl.js
|   |               |       HTMLOptionElement-impl.js
|   |               |       HTMLOptionsCollection-impl.js
|   |               |       HTMLOrSVGElement-impl.js
|   |               |       HTMLOutputElement-impl.js
|   |               |       HTMLParagraphElement-impl.js
|   |               |       HTMLParamElement-impl.js
|   |               |       HTMLPictureElement-impl.js
|   |               |       HTMLPreElement-impl.js
|   |               |       HTMLProgressElement-impl.js
|   |               |       HTMLQuoteElement-impl.js
|   |               |       HTMLScriptElement-impl.js
|   |               |       HTMLSelectElement-impl.js
|   |               |       HTMLSlotElement-impl.js
|   |               |       HTMLSourceElement-impl.js
|   |               |       HTMLSpanElement-impl.js
|   |               |       HTMLStyleElement-impl.js
|   |               |       HTMLTableCaptionElement-impl.js
|   |               |       HTMLTableCellElement-impl.js
|   |               |       HTMLTableColElement-impl.js
|   |               |       HTMLTableElement-impl.js
|   |               |       HTMLTableRowElement-impl.js
|   |               |       HTMLTableSectionElement-impl.js
|   |               |       HTMLTemplateElement-impl.js
|   |               |       HTMLTextAreaElement-impl.js
|   |               |       HTMLTimeElement-impl.js
|   |               |       HTMLTitleElement-impl.js
|   |               |       HTMLTrackElement-impl.js
|   |               |       HTMLUListElement-impl.js
|   |               |       HTMLUnknownElement-impl.js
|   |               |       HTMLVideoElement-impl.js
|   |               |       LinkStyle-impl.js
|   |               |       Node-impl.js
|   |               |       NodeList-impl.js
|   |               |       NonDocumentTypeChildNode-impl.js
|   |               |       NonElementParentNode-impl.js
|   |               |       ParentNode-impl.js
|   |               |       ProcessingInstruction-impl.js
|   |               |       RadioNodeList-impl.js
|   |               |       ShadowRoot-impl.js
|   |               |       Slotable-impl.js
|   |               |       SVGDefsElement-impl.js
|   |               |       SVGDescElement-impl.js
|   |               |       SVGElement-impl.js
|   |               |       SVGGElement-impl.js
|   |               |       SVGGraphicsElement-impl.js
|   |               |       SVGMetadataElement-impl.js
|   |               |       SVGSVGElement-impl.js
|   |               |       SVGSwitchElement-impl.js
|   |               |       SVGSymbolElement-impl.js
|   |               |       SVGTests-impl.js
|   |               |       SVGTitleElement-impl.js
|   |               |       Text-impl.js
|   |               |       WindowEventHandlers-impl.js
|   |               |       XMLDocument-impl.js
|   |               |       
|   |               +---range
|   |               |       AbstractRange-impl.js
|   |               |       boundary-point.js
|   |               |       Range-impl.js
|   |               |       StaticRange-impl.js
|   |               |       
|   |               +---selection
|   |               |       Selection-impl.js
|   |               |       
|   |               +---svg
|   |               |       SVGAnimatedPreserveAspectRatio-impl.js
|   |               |       SVGAnimatedRect-impl.js
|   |               |       SVGAnimatedString-impl.js
|   |               |       SVGListBase.js
|   |               |       SVGNumber-impl.js
|   |               |       SVGPreserveAspectRatio-impl.js
|   |               |       SVGRect-impl.js
|   |               |       SVGStringList-impl.js
|   |               |       
|   |               +---traversal
|   |               |       helpers.js
|   |               |       NodeIterator-impl.js
|   |               |       TreeWalker-impl.js
|   |               |       
|   |               +---webidl
|   |               |       DOMException-impl.js
|   |               |       
|   |               +---websockets
|   |               |       WebSocket-impl.js
|   |               |       
|   |               +---webstorage
|   |               |       Storage-impl.js
|   |               |       
|   |               +---window
|   |               |       BarProp-impl.js
|   |               |       External-impl.js
|   |               |       History-impl.js
|   |               |       Location-impl.js
|   |               |       navigation.js
|   |               |       Screen-impl.js
|   |               |       SessionHistory.js
|   |               |       
|   |               \---xhr
|   |                       FormData-impl.js
|   |                       multipart-form-data.js
|   |                       xhr-sync-worker.js
|   |                       xhr-utils.js
|   |                       XMLHttpRequest-impl.js
|   |                       XMLHttpRequestEventTarget-impl.js
|   |                       XMLHttpRequestUpload-impl.js
|   |                       
|   +---jsesc
|   |   |   jsesc.js
|   |   |   LICENSE-MIT.txt
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---bin
|   |   |       jsesc
|   |   |       
|   |   \---man
|   |           jsesc.1
|   |           
|   +---json-buffer
|   |   |   .travis.yml
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---test
|   |           index.js
|   |           
|   +---json-parse-even-better-errors
|   |       CHANGELOG.md
|   |       index.js
|   |       LICENSE.md
|   |       package.json
|   |       README.md
|   |       
|   +---json-schema-traverse
|   |   |   .eslintrc.yml
|   |   |   .travis.yml
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---spec
|   |       |   .eslintrc.yml
|   |       |   index.spec.js
|   |       |   
|   |       \---fixtures
|   |               schema.js
|   |               
|   +---json-stable-stringify-without-jsonify
|   |   |   .npmignore
|   |   |   .travis.yml
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   readme.markdown
|   |   |   
|   |   +---example
|   |   |       key_cmp.js
|   |   |       nested.js
|   |   |       str.js
|   |   |       value_cmp.js
|   |   |       
|   |   \---test
|   |           cmp.js
|   |           nested.js
|   |           replacer.js
|   |           space.js
|   |           str.js
|   |           to-json.js
|   |           
|   +---json5
|   |   |   LICENSE.md
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---dist
|   |   |       index.js
|   |   |       index.min.js
|   |   |       index.min.mjs
|   |   |       index.mjs
|   |   |       
|   |   \---lib
|   |           cli.js
|   |           index.d.ts
|   |           index.js
|   |           parse.d.ts
|   |           parse.js
|   |           register.js
|   |           require.js
|   |           stringify.d.ts
|   |           stringify.js
|   |           unicode.d.ts
|   |           unicode.js
|   |           util.d.ts
|   |           util.js
|   |           
|   +---keyv
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---src
|   |           index.d.ts
|   |           index.js
|   |           
|   +---kleur
|   |       index.js
|   |       kleur.d.ts
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---leven
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---levn
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           cast.js
|   |           index.js
|   |           parse-string.js
|   |           
|   +---lines-and-columns
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---build
|   |           index.d.ts
|   |           index.js
|   |           
|   +---locate-path
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---lodash.debounce
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---lodash.merge
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---lru-cache
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---make-dir
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   license
|   |   |   package.json
|   |   |   readme.md
|   |   |   
|   |   \---node_modules
|   |       +---.bin
|   |       |       semver
|   |       |       semver.cmd
|   |       |       semver.ps1
|   |       |       
|   |       \---semver
|   |           |   index.js
|   |           |   LICENSE
|   |           |   package.json
|   |           |   preload.js
|   |           |   range.bnf
|   |           |   README.md
|   |           |   
|   |           +---bin
|   |           |       semver.js
|   |           |       
|   |           +---classes
|   |           |       comparator.js
|   |           |       index.js
|   |           |       range.js
|   |           |       semver.js
|   |           |       
|   |           +---functions
|   |           |       clean.js
|   |           |       cmp.js
|   |           |       coerce.js
|   |           |       compare-build.js
|   |           |       compare-loose.js
|   |           |       compare.js
|   |           |       diff.js
|   |           |       eq.js
|   |           |       gt.js
|   |           |       gte.js
|   |           |       inc.js
|   |           |       lt.js
|   |           |       lte.js
|   |           |       major.js
|   |           |       minor.js
|   |           |       neq.js
|   |           |       parse.js
|   |           |       patch.js
|   |           |       prerelease.js
|   |           |       rcompare.js
|   |           |       rsort.js
|   |           |       satisfies.js
|   |           |       sort.js
|   |           |       valid.js
|   |           |       
|   |           +---internal
|   |           |       constants.js
|   |           |       debug.js
|   |           |       identifiers.js
|   |           |       lrucache.js
|   |           |       parse-options.js
|   |           |       re.js
|   |           |       
|   |           \---ranges
|   |                   gtr.js
|   |                   intersects.js
|   |                   ltr.js
|   |                   max-satisfying.js
|   |                   min-satisfying.js
|   |                   min-version.js
|   |                   outside.js
|   |                   simplify.js
|   |                   subset.js
|   |                   to-comparators.js
|   |                   valid.js
|   |                   
|   +---makeerror
|   |   |   .travis.yml
|   |   |   license
|   |   |   package.json
|   |   |   readme.md
|   |   |   
|   |   \---lib
|   |           makeerror.js
|   |           
|   +---math-intrinsics
|   |   |   .eslintrc
|   |   |   abs.d.ts
|   |   |   abs.js
|   |   |   CHANGELOG.md
|   |   |   floor.d.ts
|   |   |   floor.js
|   |   |   isFinite.d.ts
|   |   |   isFinite.js
|   |   |   isInteger.d.ts
|   |   |   isInteger.js
|   |   |   isNaN.d.ts
|   |   |   isNaN.js
|   |   |   isNegativeZero.d.ts
|   |   |   isNegativeZero.js
|   |   |   LICENSE
|   |   |   max.d.ts
|   |   |   max.js
|   |   |   min.d.ts
|   |   |   min.js
|   |   |   mod.d.ts
|   |   |   mod.js
|   |   |   package.json
|   |   |   pow.d.ts
|   |   |   pow.js
|   |   |   README.md
|   |   |   round.d.ts
|   |   |   round.js
|   |   |   sign.d.ts
|   |   |   sign.js
|   |   |   tsconfig.json
|   |   |   
|   |   +---.github
|   |   |       FUNDING.yml
|   |   |       
|   |   +---constants
|   |   |       maxArrayLength.d.ts
|   |   |       maxArrayLength.js
|   |   |       maxSafeInteger.d.ts
|   |   |       maxSafeInteger.js
|   |   |       maxValue.d.ts
|   |   |       maxValue.js
|   |   |       
|   |   \---test
|   |           index.js
|   |           
|   +---merge-stream
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---micromatch
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---mime-db
|   |       db.json
|   |       HISTORY.md
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---mime-types
|   |       HISTORY.md
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---mimic-fn
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---minimatch
|   |       LICENSE
|   |       minimatch.js
|   |       package.json
|   |       README.md
|   |       
|   +---ms
|   |       index.js
|   |       license.md
|   |       package.json
|   |       readme.md
|   |       
|   +---natural-compare
|   |       index.js
|   |       package.json
|   |       README.md
|   |       
|   +---node-int64
|   |       .npmignore
|   |       Int64.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       test.js
|   |       
|   +---node-releases
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---data
|   |       +---processed
|   |       |       envs.json
|   |       |       
|   |       \---release-schedule
|   |               release-schedule.json
|   |               
|   +---normalize-path
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---npm-run-path
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---nwsapi
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---dist
|   |   |       lint.log
|   |   |       
|   |   \---src
|   |       |   nwsapi.js
|   |       |   
|   |       \---modules
|   |               nwsapi-jquery.js
|   |               nwsapi-traversal.js
|   |               
|   +---once
|   |       LICENSE
|   |       once.js
|   |       package.json
|   |       README.md
|   |       
|   +---onetime
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---optionator
|   |   |   CHANGELOG.md
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           help.js
|   |           index.js
|   |           util.js
|   |           
|   +---p-limit
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---p-locate
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---p-try
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---parent-module
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---parse-json
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---parse5
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---dist
|   |       |   index.d.ts
|   |       |   index.js
|   |       |   
|   |       +---cjs
|   |       |   |   index.d.ts
|   |       |   |   index.js
|   |       |   |   package.json
|   |       |   |   
|   |       |   +---common
|   |       |   |       doctype.d.ts
|   |       |   |       doctype.js
|   |       |   |       error-codes.d.ts
|   |       |   |       error-codes.js
|   |       |   |       foreign-content.d.ts
|   |       |   |       foreign-content.js
|   |       |   |       html.d.ts
|   |       |   |       html.js
|   |       |   |       token.d.ts
|   |       |   |       token.js
|   |       |   |       unicode.d.ts
|   |       |   |       unicode.js
|   |       |   |       
|   |       |   +---parser
|   |       |   |       formatting-element-list.d.ts
|   |       |   |       formatting-element-list.js
|   |       |   |       index.d.ts
|   |       |   |       index.js
|   |       |   |       open-element-stack.d.ts
|   |       |   |       open-element-stack.js
|   |       |   |       
|   |       |   +---serializer
|   |       |   |       index.d.ts
|   |       |   |       index.js
|   |       |   |       
|   |       |   +---tokenizer
|   |       |   |       index.d.ts
|   |       |   |       index.js
|   |       |   |       preprocessor.d.ts
|   |       |   |       preprocessor.js
|   |       |   |       
|   |       |   \---tree-adapters
|   |       |           default.d.ts
|   |       |           default.js
|   |       |           interface.d.ts
|   |       |           interface.js
|   |       |           
|   |       +---common
|   |       |       doctype.d.ts
|   |       |       doctype.js
|   |       |       error-codes.d.ts
|   |       |       error-codes.js
|   |       |       foreign-content.d.ts
|   |       |       foreign-content.js
|   |       |       html.d.ts
|   |       |       html.js
|   |       |       token.d.ts
|   |       |       token.js
|   |       |       unicode.d.ts
|   |       |       unicode.js
|   |       |       
|   |       +---parser
|   |       |       formatting-element-list.d.ts
|   |       |       formatting-element-list.js
|   |       |       index.d.ts
|   |       |       index.js
|   |       |       open-element-stack.d.ts
|   |       |       open-element-stack.js
|   |       |       
|   |       +---serializer
|   |       |       index.d.ts
|   |       |       index.js
|   |       |       
|   |       +---tokenizer
|   |       |       index.d.ts
|   |       |       index.js
|   |       |       preprocessor.d.ts
|   |       |       preprocessor.js
|   |       |       
|   |       \---tree-adapters
|   |               default.d.ts
|   |               default.js
|   |               interface.d.ts
|   |               interface.js
|   |               
|   +---path-exists
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---path-is-absolute
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---path-key
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---path-parse
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---picocolors
|   |       LICENSE
|   |       package.json
|   |       picocolors.browser.js
|   |       picocolors.d.ts
|   |       picocolors.js
|   |       README.md
|   |       types.d.ts
|   |       
|   +---picomatch
|   |   |   CHANGELOG.md
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           constants.js
|   |           parse.js
|   |           picomatch.js
|   |           scan.js
|   |           utils.js
|   |           
|   +---pirates
|   |   |   index.d.ts
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           index.js
|   |           
|   +---pkg-dir
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   license
|   |   |   package.json
|   |   |   readme.md
|   |   |   
|   |   \---node_modules
|   |       +---find-up
|   |       |       index.d.ts
|   |       |       index.js
|   |       |       license
|   |       |       package.json
|   |       |       readme.md
|   |       |       
|   |       +---locate-path
|   |       |       index.d.ts
|   |       |       index.js
|   |       |       license
|   |       |       package.json
|   |       |       readme.md
|   |       |       
|   |       +---p-limit
|   |       |       index.d.ts
|   |       |       index.js
|   |       |       license
|   |       |       package.json
|   |       |       readme.md
|   |       |       
|   |       \---p-locate
|   |               index.d.ts
|   |               index.js
|   |               license
|   |               package.json
|   |               readme.md
|   |               
|   +---prelude-ls
|   |   |   CHANGELOG.md
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           Func.js
|   |           index.js
|   |           List.js
|   |           Num.js
|   |           Obj.js
|   |           Str.js
|   |           
|   +---prettier
|   |   |   doc.d.ts
|   |   |   doc.js
|   |   |   doc.mjs
|   |   |   index.cjs
|   |   |   index.d.ts
|   |   |   index.mjs
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   standalone.d.ts
|   |   |   standalone.js
|   |   |   standalone.mjs
|   |   |   THIRD-PARTY-NOTICES.md
|   |   |   
|   |   +---bin
|   |   |       prettier.cjs
|   |   |       
|   |   +---internal
|   |   |       experimental-cli-worker.mjs
|   |   |       experimental-cli.mjs
|   |   |       legacy-cli.mjs
|   |   |       
|   |   \---plugins
|   |           acorn.d.ts
|   |           acorn.js
|   |           acorn.mjs
|   |           angular.d.ts
|   |           angular.js
|   |           angular.mjs
|   |           babel.d.ts
|   |           babel.js
|   |           babel.mjs
|   |           estree.d.ts
|   |           estree.js
|   |           estree.mjs
|   |           flow.d.ts
|   |           flow.js
|   |           flow.mjs
|   |           glimmer.d.ts
|   |           glimmer.js
|   |           glimmer.mjs
|   |           graphql.d.ts
|   |           graphql.js
|   |           graphql.mjs
|   |           html.d.ts
|   |           html.js
|   |           html.mjs
|   |           markdown.d.ts
|   |           markdown.js
|   |           markdown.mjs
|   |           meriyah.d.ts
|   |           meriyah.js
|   |           meriyah.mjs
|   |           postcss.d.ts
|   |           postcss.js
|   |           postcss.mjs
|   |           typescript.d.ts
|   |           typescript.js
|   |           typescript.mjs
|   |           yaml.d.ts
|   |           yaml.js
|   |           yaml.mjs
|   |           
|   +---pretty-format
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---build
|   |   |   |   collections.js
|   |   |   |   index.d.ts
|   |   |   |   index.js
|   |   |   |   types.js
|   |   |   |   
|   |   |   \---plugins
|   |   |       |   AsymmetricMatcher.js
|   |   |       |   DOMCollection.js
|   |   |       |   DOMElement.js
|   |   |       |   Immutable.js
|   |   |       |   ReactElement.js
|   |   |       |   ReactTestComponent.js
|   |   |       |   
|   |   |       \---lib
|   |   |               escapeHTML.js
|   |   |               markup.js
|   |   |               
|   |   \---node_modules
|   |       \---ansi-styles
|   |               index.d.ts
|   |               index.js
|   |               license
|   |               package.json
|   |               readme.md
|   |               
|   +---prompts
|   |   |   index.js
|   |   |   license
|   |   |   package.json
|   |   |   readme.md
|   |   |   
|   |   +---dist
|   |   |   |   index.js
|   |   |   |   prompts.js
|   |   |   |   
|   |   |   +---dateparts
|   |   |   |       datepart.js
|   |   |   |       day.js
|   |   |   |       hours.js
|   |   |   |       index.js
|   |   |   |       meridiem.js
|   |   |   |       milliseconds.js
|   |   |   |       minutes.js
|   |   |   |       month.js
|   |   |   |       seconds.js
|   |   |   |       year.js
|   |   |   |       
|   |   |   +---elements
|   |   |   |       autocomplete.js
|   |   |   |       autocompleteMultiselect.js
|   |   |   |       confirm.js
|   |   |   |       date.js
|   |   |   |       index.js
|   |   |   |       multiselect.js
|   |   |   |       number.js
|   |   |   |       prompt.js
|   |   |   |       select.js
|   |   |   |       text.js
|   |   |   |       toggle.js
|   |   |   |       
|   |   |   \---util
|   |   |           action.js
|   |   |           clear.js
|   |   |           entriesToDisplay.js
|   |   |           figures.js
|   |   |           index.js
|   |   |           lines.js
|   |   |           strip.js
|   |   |           style.js
|   |   |           wrap.js
|   |   |           
|   |   \---lib
|   |       |   index.js
|   |       |   prompts.js
|   |       |   
|   |       +---dateparts
|   |       |       datepart.js
|   |       |       day.js
|   |       |       hours.js
|   |       |       index.js
|   |       |       meridiem.js
|   |       |       milliseconds.js
|   |       |       minutes.js
|   |       |       month.js
|   |       |       seconds.js
|   |       |       year.js
|   |       |       
|   |       +---elements
|   |       |       autocomplete.js
|   |       |       autocompleteMultiselect.js
|   |       |       confirm.js
|   |       |       date.js
|   |       |       index.js
|   |       |       multiselect.js
|   |       |       number.js
|   |       |       prompt.js
|   |       |       select.js
|   |       |       text.js
|   |       |       toggle.js
|   |       |       
|   |       \---util
|   |               action.js
|   |               clear.js
|   |               entriesToDisplay.js
|   |               figures.js
|   |               index.js
|   |               lines.js
|   |               strip.js
|   |               style.js
|   |               wrap.js
|   |               
|   +---psl
|   |   |   browserstack-logo.svg
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   SECURITY.md
|   |   |   vite.config.js
|   |   |   
|   |   +---data
|   |   |       rules.js
|   |   |       
|   |   +---dist
|   |   |       psl.cjs
|   |   |       psl.mjs
|   |   |       psl.umd.cjs
|   |   |       
|   |   \---types
|   |           index.d.ts
|   |           test.ts
|   |           tsconfig.json
|   |           
|   +---punycode
|   |       LICENSE-MIT.txt
|   |       package.json
|   |       punycode.es6.js
|   |       punycode.js
|   |       README.md
|   |       
|   +---pure-rand
|   |   |   CHANGELOG.md
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |       |   pure-rand-default.js
|   |       |   pure-rand.js
|   |       |   
|   |       +---distribution
|   |       |   |   Distribution.js
|   |       |   |   UniformArrayIntDistribution.js
|   |       |   |   UniformBigIntDistribution.js
|   |       |   |   UniformIntDistribution.js
|   |       |   |   UnsafeUniformArrayIntDistribution.js
|   |       |   |   UnsafeUniformBigIntDistribution.js
|   |       |   |   UnsafeUniformIntDistribution.js
|   |       |   |   
|   |       |   \---internals
|   |       |           ArrayInt.js
|   |       |           UnsafeUniformArrayIntDistributionInternal.js
|   |       |           UnsafeUniformIntDistributionInternal.js
|   |       |           
|   |       +---esm
|   |       |   |   package.json
|   |       |   |   pure-rand-default.js
|   |       |   |   pure-rand.js
|   |       |   |   
|   |       |   +---distribution
|   |       |   |   |   Distribution.js
|   |       |   |   |   UniformArrayIntDistribution.js
|   |       |   |   |   UniformBigIntDistribution.js
|   |       |   |   |   UniformIntDistribution.js
|   |       |   |   |   UnsafeUniformArrayIntDistribution.js
|   |       |   |   |   UnsafeUniformBigIntDistribution.js
|   |       |   |   |   UnsafeUniformIntDistribution.js
|   |       |   |   |   
|   |       |   |   \---internals
|   |       |   |           ArrayInt.js
|   |       |   |           UnsafeUniformArrayIntDistributionInternal.js
|   |       |   |           UnsafeUniformIntDistributionInternal.js
|   |       |   |           
|   |       |   +---generator
|   |       |   |       LinearCongruential.js
|   |       |   |       MersenneTwister.js
|   |       |   |       RandomGenerator.js
|   |       |   |       XoroShiro.js
|   |       |   |       XorShift.js
|   |       |   |       
|   |       |   \---types
|   |       |       |   pure-rand-default.d.ts
|   |       |       |   pure-rand.d.ts
|   |       |       |   
|   |       |       +---distribution
|   |       |       |   |   Distribution.d.ts
|   |       |       |   |   UniformArrayIntDistribution.d.ts
|   |       |       |   |   UniformBigIntDistribution.d.ts
|   |       |       |   |   UniformIntDistribution.d.ts
|   |       |       |   |   UnsafeUniformArrayIntDistribution.d.ts
|   |       |       |   |   UnsafeUniformBigIntDistribution.d.ts
|   |       |       |   |   UnsafeUniformIntDistribution.d.ts
|   |       |       |   |   
|   |       |       |   \---internals
|   |       |       |           ArrayInt.d.ts
|   |       |       |           UnsafeUniformArrayIntDistributionInternal.d.ts
|   |       |       |           UnsafeUniformIntDistributionInternal.d.ts
|   |       |       |           
|   |       |       \---generator
|   |       |               LinearCongruential.d.ts
|   |       |               MersenneTwister.d.ts
|   |       |               RandomGenerator.d.ts
|   |       |               XoroShiro.d.ts
|   |       |               XorShift.d.ts
|   |       |               
|   |       +---generator
|   |       |       LinearCongruential.js
|   |       |       MersenneTwister.js
|   |       |       RandomGenerator.js
|   |       |       XoroShiro.js
|   |       |       XorShift.js
|   |       |       
|   |       \---types
|   |           |   pure-rand-default.d.ts
|   |           |   pure-rand.d.ts
|   |           |   
|   |           +---distribution
|   |           |   |   Distribution.d.ts
|   |           |   |   UniformArrayIntDistribution.d.ts
|   |           |   |   UniformBigIntDistribution.d.ts
|   |           |   |   UniformIntDistribution.d.ts
|   |           |   |   UnsafeUniformArrayIntDistribution.d.ts
|   |           |   |   UnsafeUniformBigIntDistribution.d.ts
|   |           |   |   UnsafeUniformIntDistribution.d.ts
|   |           |   |   
|   |           |   \---internals
|   |           |           ArrayInt.d.ts
|   |           |           UnsafeUniformArrayIntDistributionInternal.d.ts
|   |           |           UnsafeUniformIntDistributionInternal.d.ts
|   |           |           
|   |           \---generator
|   |                   LinearCongruential.d.ts
|   |                   MersenneTwister.d.ts
|   |                   RandomGenerator.d.ts
|   |                   XoroShiro.d.ts
|   |                   XorShift.d.ts
|   |                   
|   +---querystringify
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---queue-microtask
|   |       index.d.ts
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---react-is
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---cjs
|   |   |       react-is.development.js
|   |   |       react-is.production.min.js
|   |   |       
|   |   \---umd
|   |           react-is.development.js
|   |           react-is.production.min.js
|   |           
|   +---regenerate
|   |       LICENSE-MIT.txt
|   |       package.json
|   |       README.md
|   |       regenerate.js
|   |       
|   +---regenerate-unicode-properties
|   |   |   index.js
|   |   |   LICENSE-MIT.txt
|   |   |   package.json
|   |   |   README.md
|   |   |   unicode-version.js
|   |   |   
|   |   +---Binary_Property
|   |   |       Alphabetic.js
|   |   |       Any.js
|   |   |       ASCII.js
|   |   |       ASCII_Hex_Digit.js
|   |   |       Assigned.js
|   |   |       Bidi_Control.js
|   |   |       Bidi_Mirrored.js
|   |   |       Cased.js
|   |   |       Case_Ignorable.js
|   |   |       Changes_When_Casefolded.js
|   |   |       Changes_When_Casemapped.js
|   |   |       Changes_When_Lowercased.js
|   |   |       Changes_When_NFKC_Casefolded.js
|   |   |       Changes_When_Titlecased.js
|   |   |       Changes_When_Uppercased.js
|   |   |       Dash.js
|   |   |       Default_Ignorable_Code_Point.js
|   |   |       Deprecated.js
|   |   |       Diacritic.js
|   |   |       Emoji.js
|   |   |       Emoji_Component.js
|   |   |       Emoji_Modifier.js
|   |   |       Emoji_Modifier_Base.js
|   |   |       Emoji_Presentation.js
|   |   |       Extended_Pictographic.js
|   |   |       Extender.js
|   |   |       Grapheme_Base.js
|   |   |       Grapheme_Extend.js
|   |   |       Hex_Digit.js
|   |   |       Ideographic.js
|   |   |       IDS_Binary_Operator.js
|   |   |       IDS_Trinary_Operator.js
|   |   |       ID_Continue.js
|   |   |       ID_Start.js
|   |   |       Join_Control.js
|   |   |       Logical_Order_Exception.js
|   |   |       Lowercase.js
|   |   |       Math.js
|   |   |       Noncharacter_Code_Point.js
|   |   |       Pattern_Syntax.js
|   |   |       Pattern_White_Space.js
|   |   |       Quotation_Mark.js
|   |   |       Radical.js
|   |   |       Regional_Indicator.js
|   |   |       Sentence_Terminal.js
|   |   |       Soft_Dotted.js
|   |   |       Terminal_Punctuation.js
|   |   |       Unified_Ideograph.js
|   |   |       Uppercase.js
|   |   |       Variation_Selector.js
|   |   |       White_Space.js
|   |   |       XID_Continue.js
|   |   |       XID_Start.js
|   |   |       
|   |   +---General_Category
|   |   |       Cased_Letter.js
|   |   |       Close_Punctuation.js
|   |   |       Connector_Punctuation.js
|   |   |       Control.js
|   |   |       Currency_Symbol.js
|   |   |       Dash_Punctuation.js
|   |   |       Decimal_Number.js
|   |   |       Enclosing_Mark.js
|   |   |       Final_Punctuation.js
|   |   |       Format.js
|   |   |       Initial_Punctuation.js
|   |   |       Letter.js
|   |   |       Letter_Number.js
|   |   |       Line_Separator.js
|   |   |       Lowercase_Letter.js
|   |   |       Mark.js
|   |   |       Math_Symbol.js
|   |   |       Modifier_Letter.js
|   |   |       Modifier_Symbol.js
|   |   |       Nonspacing_Mark.js
|   |   |       Number.js
|   |   |       Open_Punctuation.js
|   |   |       Other.js
|   |   |       Other_Letter.js
|   |   |       Other_Number.js
|   |   |       Other_Punctuation.js
|   |   |       Other_Symbol.js
|   |   |       Paragraph_Separator.js
|   |   |       Private_Use.js
|   |   |       Punctuation.js
|   |   |       Separator.js
|   |   |       Space_Separator.js
|   |   |       Spacing_Mark.js
|   |   |       Surrogate.js
|   |   |       Symbol.js
|   |   |       Titlecase_Letter.js
|   |   |       Unassigned.js
|   |   |       Uppercase_Letter.js
|   |   |       
|   |   +---Property_of_Strings
|   |   |       Basic_Emoji.js
|   |   |       Emoji_Keycap_Sequence.js
|   |   |       RGI_Emoji.js
|   |   |       RGI_Emoji_Flag_Sequence.js
|   |   |       RGI_Emoji_Modifier_Sequence.js
|   |   |       RGI_Emoji_Tag_Sequence.js
|   |   |       RGI_Emoji_ZWJ_Sequence.js
|   |   |       
|   |   +---Script
|   |   |       Adlam.js
|   |   |       Ahom.js
|   |   |       Anatolian_Hieroglyphs.js
|   |   |       Arabic.js
|   |   |       Armenian.js
|   |   |       Avestan.js
|   |   |       Balinese.js
|   |   |       Bamum.js
|   |   |       Bassa_Vah.js
|   |   |       Batak.js
|   |   |       Bengali.js
|   |   |       Bhaiksuki.js
|   |   |       Bopomofo.js
|   |   |       Brahmi.js
|   |   |       Braille.js
|   |   |       Buginese.js
|   |   |       Buhid.js
|   |   |       Canadian_Aboriginal.js
|   |   |       Carian.js
|   |   |       Caucasian_Albanian.js
|   |   |       Chakma.js
|   |   |       Cham.js
|   |   |       Cherokee.js
|   |   |       Chorasmian.js
|   |   |       Common.js
|   |   |       Coptic.js
|   |   |       Cuneiform.js
|   |   |       Cypriot.js
|   |   |       Cypro_Minoan.js
|   |   |       Cyrillic.js
|   |   |       Deseret.js
|   |   |       Devanagari.js
|   |   |       Dives_Akuru.js
|   |   |       Dogra.js
|   |   |       Duployan.js
|   |   |       Egyptian_Hieroglyphs.js
|   |   |       Elbasan.js
|   |   |       Elymaic.js
|   |   |       Ethiopic.js
|   |   |       Garay.js
|   |   |       Georgian.js
|   |   |       Glagolitic.js
|   |   |       Gothic.js
|   |   |       Grantha.js
|   |   |       Greek.js
|   |   |       Gujarati.js
|   |   |       Gunjala_Gondi.js
|   |   |       Gurmukhi.js
|   |   |       Gurung_Khema.js
|   |   |       Han.js
|   |   |       Hangul.js
|   |   |       Hanifi_Rohingya.js
|   |   |       Hanunoo.js
|   |   |       Hatran.js
|   |   |       Hebrew.js
|   |   |       Hiragana.js
|   |   |       Imperial_Aramaic.js
|   |   |       Inherited.js
|   |   |       Inscriptional_Pahlavi.js
|   |   |       Inscriptional_Parthian.js
|   |   |       Javanese.js
|   |   |       Kaithi.js
|   |   |       Kannada.js
|   |   |       Katakana.js
|   |   |       Kawi.js
|   |   |       Kayah_Li.js
|   |   |       Kharoshthi.js
|   |   |       Khitan_Small_Script.js
|   |   |       Khmer.js
|   |   |       Khojki.js
|   |   |       Khudawadi.js
|   |   |       Kirat_Rai.js
|   |   |       Lao.js
|   |   |       Latin.js
|   |   |       Lepcha.js
|   |   |       Limbu.js
|   |   |       Linear_A.js
|   |   |       Linear_B.js
|   |   |       Lisu.js
|   |   |       Lycian.js
|   |   |       Lydian.js
|   |   |       Mahajani.js
|   |   |       Makasar.js
|   |   |       Malayalam.js
|   |   |       Mandaic.js
|   |   |       Manichaean.js
|   |   |       Marchen.js
|   |   |       Masaram_Gondi.js
|   |   |       Medefaidrin.js
|   |   |       Meetei_Mayek.js
|   |   |       Mende_Kikakui.js
|   |   |       Meroitic_Cursive.js
|   |   |       Meroitic_Hieroglyphs.js
|   |   |       Miao.js
|   |   |       Modi.js
|   |   |       Mongolian.js
|   |   |       Mro.js
|   |   |       Multani.js
|   |   |       Myanmar.js
|   |   |       Nabataean.js
|   |   |       Nag_Mundari.js
|   |   |       Nandinagari.js
|   |   |       Newa.js
|   |   |       New_Tai_Lue.js
|   |   |       Nko.js
|   |   |       Nushu.js
|   |   |       Nyiakeng_Puachue_Hmong.js
|   |   |       Ogham.js
|   |   |       Old_Hungarian.js
|   |   |       Old_Italic.js
|   |   |       Old_North_Arabian.js
|   |   |       Old_Permic.js
|   |   |       Old_Persian.js
|   |   |       Old_Sogdian.js
|   |   |       Old_South_Arabian.js
|   |   |       Old_Turkic.js
|   |   |       Old_Uyghur.js
|   |   |       Ol_Chiki.js
|   |   |       Ol_Onal.js
|   |   |       Oriya.js
|   |   |       Osage.js
|   |   |       Osmanya.js
|   |   |       Pahawh_Hmong.js
|   |   |       Palmyrene.js
|   |   |       Pau_Cin_Hau.js
|   |   |       Phags_Pa.js
|   |   |       Phoenician.js
|   |   |       Psalter_Pahlavi.js
|   |   |       Rejang.js
|   |   |       Runic.js
|   |   |       Samaritan.js
|   |   |       Saurashtra.js
|   |   |       Sharada.js
|   |   |       Shavian.js
|   |   |       Siddham.js
|   |   |       SignWriting.js
|   |   |       Sinhala.js
|   |   |       Sogdian.js
|   |   |       Sora_Sompeng.js
|   |   |       Soyombo.js
|   |   |       Sundanese.js
|   |   |       Sunuwar.js
|   |   |       Syloti_Nagri.js
|   |   |       Syriac.js
|   |   |       Tagalog.js
|   |   |       Tagbanwa.js
|   |   |       Tai_Le.js
|   |   |       Tai_Tham.js
|   |   |       Tai_Viet.js
|   |   |       Takri.js
|   |   |       Tamil.js
|   |   |       Tangsa.js
|   |   |       Tangut.js
|   |   |       Telugu.js
|   |   |       Thaana.js
|   |   |       Thai.js
|   |   |       Tibetan.js
|   |   |       Tifinagh.js
|   |   |       Tirhuta.js
|   |   |       Todhri.js
|   |   |       Toto.js
|   |   |       Tulu_Tigalari.js
|   |   |       Ugaritic.js
|   |   |       Vai.js
|   |   |       Vithkuqi.js
|   |   |       Wancho.js
|   |   |       Warang_Citi.js
|   |   |       Yezidi.js
|   |   |       Yi.js
|   |   |       Zanabazar_Square.js
|   |   |       
|   |   \---Script_Extensions
|   |           Adlam.js
|   |           Ahom.js
|   |           Anatolian_Hieroglyphs.js
|   |           Arabic.js
|   |           Armenian.js
|   |           Avestan.js
|   |           Balinese.js
|   |           Bamum.js
|   |           Bassa_Vah.js
|   |           Batak.js
|   |           Bengali.js
|   |           Bhaiksuki.js
|   |           Bopomofo.js
|   |           Brahmi.js
|   |           Braille.js
|   |           Buginese.js
|   |           Buhid.js
|   |           Canadian_Aboriginal.js
|   |           Carian.js
|   |           Caucasian_Albanian.js
|   |           Chakma.js
|   |           Cham.js
|   |           Cherokee.js
|   |           Chorasmian.js
|   |           Common.js
|   |           Coptic.js
|   |           Cuneiform.js
|   |           Cypriot.js
|   |           Cypro_Minoan.js
|   |           Cyrillic.js
|   |           Deseret.js
|   |           Devanagari.js
|   |           Dives_Akuru.js
|   |           Dogra.js
|   |           Duployan.js
|   |           Egyptian_Hieroglyphs.js
|   |           Elbasan.js
|   |           Elymaic.js
|   |           Ethiopic.js
|   |           Garay.js
|   |           Georgian.js
|   |           Glagolitic.js
|   |           Gothic.js
|   |           Grantha.js
|   |           Greek.js
|   |           Gujarati.js
|   |           Gunjala_Gondi.js
|   |           Gurmukhi.js
|   |           Gurung_Khema.js
|   |           Han.js
|   |           Hangul.js
|   |           Hanifi_Rohingya.js
|   |           Hanunoo.js
|   |           Hatran.js
|   |           Hebrew.js
|   |           Hiragana.js
|   |           Imperial_Aramaic.js
|   |           Inherited.js
|   |           Inscriptional_Pahlavi.js
|   |           Inscriptional_Parthian.js
|   |           Javanese.js
|   |           Kaithi.js
|   |           Kannada.js
|   |           Katakana.js
|   |           Kawi.js
|   |           Kayah_Li.js
|   |           Kharoshthi.js
|   |           Khitan_Small_Script.js
|   |           Khmer.js
|   |           Khojki.js
|   |           Khudawadi.js
|   |           Kirat_Rai.js
|   |           Lao.js
|   |           Latin.js
|   |           Lepcha.js
|   |           Limbu.js
|   |           Linear_A.js
|   |           Linear_B.js
|   |           Lisu.js
|   |           Lycian.js
|   |           Lydian.js
|   |           Mahajani.js
|   |           Makasar.js
|   |           Malayalam.js
|   |           Mandaic.js
|   |           Manichaean.js
|   |           Marchen.js
|   |           Masaram_Gondi.js
|   |           Medefaidrin.js
|   |           Meetei_Mayek.js
|   |           Mende_Kikakui.js
|   |           Meroitic_Cursive.js
|   |           Meroitic_Hieroglyphs.js
|   |           Miao.js
|   |           Modi.js
|   |           Mongolian.js
|   |           Mro.js
|   |           Multani.js
|   |           Myanmar.js
|   |           Nabataean.js
|   |           Nag_Mundari.js
|   |           Nandinagari.js
|   |           Newa.js
|   |           New_Tai_Lue.js
|   |           Nko.js
|   |           Nushu.js
|   |           Nyiakeng_Puachue_Hmong.js
|   |           Ogham.js
|   |           Old_Hungarian.js
|   |           Old_Italic.js
|   |           Old_North_Arabian.js
|   |           Old_Permic.js
|   |           Old_Persian.js
|   |           Old_Sogdian.js
|   |           Old_South_Arabian.js
|   |           Old_Turkic.js
|   |           Old_Uyghur.js
|   |           Ol_Chiki.js
|   |           Ol_Onal.js
|   |           Oriya.js
|   |           Osage.js
|   |           Osmanya.js
|   |           Pahawh_Hmong.js
|   |           Palmyrene.js
|   |           Pau_Cin_Hau.js
|   |           Phags_Pa.js
|   |           Phoenician.js
|   |           Psalter_Pahlavi.js
|   |           Rejang.js
|   |           Runic.js
|   |           Samaritan.js
|   |           Saurashtra.js
|   |           Sharada.js
|   |           Shavian.js
|   |           Siddham.js
|   |           SignWriting.js
|   |           Sinhala.js
|   |           Sogdian.js
|   |           Sora_Sompeng.js
|   |           Soyombo.js
|   |           Sundanese.js
|   |           Sunuwar.js
|   |           Syloti_Nagri.js
|   |           Syriac.js
|   |           Tagalog.js
|   |           Tagbanwa.js
|   |           Tai_Le.js
|   |           Tai_Tham.js
|   |           Tai_Viet.js
|   |           Takri.js
|   |           Tamil.js
|   |           Tangsa.js
|   |           Tangut.js
|   |           Telugu.js
|   |           Thaana.js
|   |           Thai.js
|   |           Tibetan.js
|   |           Tifinagh.js
|   |           Tirhuta.js
|   |           Todhri.js
|   |           Toto.js
|   |           Tulu_Tigalari.js
|   |           Ugaritic.js
|   |           Vai.js
|   |           Vithkuqi.js
|   |           Wancho.js
|   |           Warang_Citi.js
|   |           Yezidi.js
|   |           Yi.js
|   |           Zanabazar_Square.js
|   |           
|   +---regexpu-core
|   |   |   LICENSE-MIT.txt
|   |   |   package.json
|   |   |   README.md
|   |   |   rewrite-pattern.js
|   |   |   
|   |   \---data
|   |           all-characters.js
|   |           character-class-escape-sets.js
|   |           i-bmp-mappings.js
|   |           iu-foldings.js
|   |           iu-mappings.js
|   |           
|   +---regjsgen
|   |       LICENSE-MIT.txt
|   |       package.json
|   |       README.md
|   |       regjsgen.js
|   |       
|   +---regjsparser
|   |   |   LICENSE.BSD
|   |   |   package.json
|   |   |   parser.d.ts
|   |   |   parser.js
|   |   |   README.md
|   |   |   
|   |   +---bin
|   |   |       parser
|   |   |       
|   |   \---node_modules
|   |       +---.bin
|   |       |       jsesc
|   |       |       jsesc.cmd
|   |       |       jsesc.ps1
|   |       |       
|   |       \---jsesc
|   |           |   jsesc.js
|   |           |   LICENSE-MIT.txt
|   |           |   package.json
|   |           |   README.md
|   |           |   
|   |           +---bin
|   |           |       jsesc
|   |           |       
|   |           \---man
|   |                   jsesc.1
|   |                   
|   +---require-directory
|   |       .jshintrc
|   |       .npmignore
|   |       .travis.yml
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.markdown
|   |       
|   +---requires-port
|   |       .npmignore
|   |       .travis.yml
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       test.js
|   |       
|   +---resolve
|   |   |   .editorconfig
|   |   |   .eslintrc
|   |   |   async.js
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   readme.markdown
|   |   |   SECURITY.md
|   |   |   sync.js
|   |   |   
|   |   +---.github
|   |   |       FUNDING.yml
|   |   |       
|   |   +---bin
|   |   |       resolve
|   |   |       
|   |   +---example
|   |   |       async.js
|   |   |       sync.js
|   |   |       
|   |   +---lib
|   |   |       async.js
|   |   |       caller.js
|   |   |       core.js
|   |   |       core.json
|   |   |       homedir.js
|   |   |       is-core.js
|   |   |       node-modules-paths.js
|   |   |       normalize-options.js
|   |   |       sync.js
|   |   |       
|   |   \---test
|   |       |   core.js
|   |       |   dotdot.js
|   |       |   faulty_basedir.js
|   |       |   filter.js
|   |       |   filter_sync.js
|   |       |   home_paths.js
|   |       |   home_paths_sync.js
|   |       |   mock.js
|   |       |   mock_sync.js
|   |       |   module_dir.js
|   |       |   node-modules-paths.js
|   |       |   node_path.js
|   |       |   nonstring.js
|   |       |   pathfilter.js
|   |       |   precedence.js
|   |       |   resolver.js
|   |       |   resolver_sync.js
|   |       |   shadowed_core.js
|   |       |   subdirs.js
|   |       |   symlinks.js
|   |       |   
|   |       +---dotdot
|   |       |   |   index.js
|   |       |   |   
|   |       |   \---abc
|   |       |           index.js
|   |       |           
|   |       +---module_dir
|   |       |   +---xmodules
|   |       |   |   \---aaa
|   |       |   |           index.js
|   |       |   |           
|   |       |   +---ymodules
|   |       |   |   \---aaa
|   |       |   |           index.js
|   |       |   |           
|   |       |   \---zmodules
|   |       |       \---bbb
|   |       |               main.js
|   |       |               package.json
|   |       |               
|   |       +---node_path
|   |       |   +---x
|   |       |   |   +---aaa
|   |       |   |   |       index.js
|   |       |   |   |       
|   |       |   |   \---ccc
|   |       |   |           index.js
|   |       |   |           
|   |       |   \---y
|   |       |       +---bbb
|   |       |       |       index.js
|   |       |       |       
|   |       |       \---ccc
|   |       |               index.js
|   |       |               
|   |       +---pathfilter
|   |       |   \---deep_ref
|   |       |           main.js
|   |       |           
|   |       +---precedence
|   |       |   |   aaa.js
|   |       |   |   bbb.js
|   |       |   |   
|   |       |   +---aaa
|   |       |   |       index.js
|   |       |   |       main.js
|   |       |   |       
|   |       |   \---bbb
|   |       |           main.js
|   |       |           
|   |       +---resolver
|   |       |   |   cup.coffee
|   |       |   |   foo.js
|   |       |   |   mug.coffee
|   |       |   |   mug.js
|   |       |   |   
|   |       |   +---baz
|   |       |   |       doom.js
|   |       |   |       package.json
|   |       |   |       quux.js
|   |       |   |       
|   |       |   +---browser_field
|   |       |   |       a.js
|   |       |   |       b.js
|   |       |   |       package.json
|   |       |   |       
|   |       |   +---dot_main
|   |       |   |       index.js
|   |       |   |       package.json
|   |       |   |       
|   |       |   +---dot_slash_main
|   |       |   |       index.js
|   |       |   |       package.json
|   |       |   |       
|   |       |   +---false_main
|   |       |   |       index.js
|   |       |   |       package.json
|   |       |   |       
|   |       |   +---incorrect_main
|   |       |   |       index.js
|   |       |   |       package.json
|   |       |   |       
|   |       |   +---invalid_main
|   |       |   |       package.json
|   |       |   |       
|   |       |   +---multirepo
|   |       |   |   |   lerna.json
|   |       |   |   |   package.json
|   |       |   |   |   
|   |       |   |   \---packages
|   |       |   |       +---package-a
|   |       |   |       |       index.js
|   |       |   |       |       package.json
|   |       |   |       |       
|   |       |   |       \---package-b
|   |       |   |               index.js
|   |       |   |               package.json
|   |       |   |               
|   |       |   +---nested_symlinks
|   |       |   |   \---mylib
|   |       |   |           async.js
|   |       |   |           package.json
|   |       |   |           sync.js
|   |       |   |           
|   |       |   +---other_path
|   |       |   |   |   root.js
|   |       |   |   |   
|   |       |   |   \---lib
|   |       |   |           other-lib.js
|   |       |   |           
|   |       |   +---quux
|   |       |   |   \---foo
|   |       |   |           index.js
|   |       |   |           
|   |       |   +---same_names
|   |       |   |   |   foo.js
|   |       |   |   |   
|   |       |   |   \---foo
|   |       |   |           index.js
|   |       |   |           
|   |       |   +---symlinked
|   |       |   |   +---package
|   |       |   |   |       bar.js
|   |       |   |   |       package.json
|   |       |   |   |       
|   |       |   |   \---_
|   |       |   |       +---node_modules
|   |       |   |       |       foo.js
|   |       |   |       |       
|   |       |   |       \---symlink_target
|   |       |   |               .gitkeep
|   |       |   |               
|   |       |   \---without_basedir
|   |       |           main.js
|   |       |           
|   |       \---shadowed_core
|   |           \---node_modules
|   |               \---util
|   |                       index.js
|   |                       
|   +---resolve-cwd
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   license
|   |   |   package.json
|   |   |   readme.md
|   |   |   
|   |   \---node_modules
|   |       \---resolve-from
|   |               index.d.ts
|   |               index.js
|   |               license
|   |               package.json
|   |               readme.md
|   |               
|   +---resolve-from
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---resolve.exports
|   |   |   index.d.ts
|   |   |   license
|   |   |   package.json
|   |   |   readme.md
|   |   |   
|   |   \---dist
|   |           index.js
|   |           index.mjs
|   |           
|   +---reusify
|   |   |   eslint.config.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   reusify.d.ts
|   |   |   reusify.js
|   |   |   SECURITY.md
|   |   |   test.js
|   |   |   tsconfig.json
|   |   |   
|   |   +---.github
|   |   |   |   dependabot.yml
|   |   |   |   
|   |   |   \---workflows
|   |   |           ci.yml
|   |   |           
|   |   \---benchmarks
|   |           createNoCodeFunction.js
|   |           fib.js
|   |           reuseNoCodeFunction.js
|   |           
|   +---rimraf
|   |       bin.js
|   |       CHANGELOG.md
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       rimraf.js
|   |       
|   +---rrweb-cssom
|   |   |   LICENSE.txt
|   |   |   package.json
|   |   |   README.mdown
|   |   |   
|   |   +---build
|   |   |       CSSOM.js
|   |   |       
|   |   \---lib
|   |           clone.js
|   |           CSSConditionRule.js
|   |           CSSContainerRule.js
|   |           CSSDocumentRule.js
|   |           CSSFontFaceRule.js
|   |           CSSGroupingRule.js
|   |           CSSHostRule.js
|   |           CSSImportRule.js
|   |           CSSKeyframeRule.js
|   |           CSSKeyframesRule.js
|   |           CSSLayerBlockRule.js
|   |           CSSMediaRule.js
|   |           CSSOM.js
|   |           CSSRule.js
|   |           CSSStartingStyleRule.js
|   |           CSSStyleDeclaration.js
|   |           CSSStyleRule.js
|   |           CSSStyleSheet.js
|   |           CSSSupportsRule.js
|   |           CSSValue.js
|   |           CSSValueExpression.js
|   |           index.js
|   |           MatcherList.js
|   |           MediaList.js
|   |           parse.js
|   |           StyleSheet.js
|   |           
|   +---run-parallel
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---safer-buffer
|   |       dangerous.js
|   |       LICENSE
|   |       package.json
|   |       Porting-Buffer.md
|   |       Readme.md
|   |       safer.js
|   |       tests.js
|   |       
|   +---saxes
|   |       package.json
|   |       README.md
|   |       saxes.d.ts
|   |       saxes.js
|   |       saxes.js.map
|   |       
|   +---semver
|   |   |   LICENSE
|   |   |   package.json
|   |   |   range.bnf
|   |   |   README.md
|   |   |   semver.js
|   |   |   
|   |   \---bin
|   |           semver.js
|   |           
|   +---shebang-command
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---shebang-regex
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---signal-exit
|   |       index.js
|   |       LICENSE.txt
|   |       package.json
|   |       README.md
|   |       signals.js
|   |       
|   +---sisteransi
|   |   |   license
|   |   |   package.json
|   |   |   readme.md
|   |   |   
|   |   \---src
|   |           index.js
|   |           sisteransi.d.ts
|   |           
|   +---slash
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---source-map
|   |   |   CHANGELOG.md
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   source-map.d.ts
|   |   |   source-map.js
|   |   |   
|   |   +---dist
|   |   |       source-map.debug.js
|   |   |       source-map.js
|   |   |       source-map.min.js
|   |   |       source-map.min.js.map
|   |   |       
|   |   \---lib
|   |           array-set.js
|   |           base64-vlq.js
|   |           base64.js
|   |           binary-search.js
|   |           mapping-list.js
|   |           quick-sort.js
|   |           source-map-consumer.js
|   |           source-map-generator.js
|   |           source-node.js
|   |           util.js
|   |           
|   +---source-map-support
|   |       browser-source-map-support.js
|   |       LICENSE.md
|   |       package.json
|   |       README.md
|   |       register.js
|   |       source-map-support.js
|   |       
|   +---sprintf-js
|   |   |   .npmignore
|   |   |   bower.json
|   |   |   gruntfile.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---demo
|   |   |       angular.html
|   |   |       
|   |   +---dist
|   |   |       angular-sprintf.min.js
|   |   |       angular-sprintf.min.js.map
|   |   |       angular-sprintf.min.map
|   |   |       sprintf.min.js
|   |   |       sprintf.min.js.map
|   |   |       sprintf.min.map
|   |   |       
|   |   +---src
|   |   |       angular-sprintf.js
|   |   |       sprintf.js
|   |   |       
|   |   \---test
|   |           test.js
|   |           
|   +---stack-utils
|   |   |   index.js
|   |   |   LICENSE.md
|   |   |   package.json
|   |   |   readme.md
|   |   |   
|   |   \---node_modules
|   |       \---escape-string-regexp
|   |               index.d.ts
|   |               index.js
|   |               license
|   |               package.json
|   |               readme.md
|   |               
|   +---string-length
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---string-width
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---strip-ansi
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---strip-bom
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---strip-final-newline
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---strip-json-comments
|   |       index.d.ts
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---supports-color
|   |       browser.js
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---supports-preserve-symlinks-flag
|   |   |   .eslintrc
|   |   |   .nycrc
|   |   |   browser.js
|   |   |   CHANGELOG.md
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---.github
|   |   |       FUNDING.yml
|   |   |       
|   |   \---test
|   |           index.js
|   |           
|   +---symbol-tree
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           SymbolTree.js
|   |           SymbolTreeNode.js
|   |           TreeIterator.js
|   |           TreePosition.js
|   |           
|   +---test-exclude
|   |       CHANGELOG.md
|   |       index.js
|   |       is-outside-dir-posix.js
|   |       is-outside-dir-win32.js
|   |       is-outside-dir.js
|   |       LICENSE.txt
|   |       package.json
|   |       README.md
|   |       
|   +---text-table
|   |   |   .travis.yml
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   readme.markdown
|   |   |   
|   |   +---example
|   |   |       align.js
|   |   |       center.js
|   |   |       dotalign.js
|   |   |       doubledot.js
|   |   |       table.js
|   |   |       
|   |   \---test
|   |           align.js
|   |           ansi-colors.js
|   |           center.js
|   |           dotalign.js
|   |           doubledot.js
|   |           table.js
|   |           
|   +---tldts
|   |   |   index.ts
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---bin
|   |   |       cli.js
|   |   |       
|   |   +---dist
|   |   |   |   index.cjs.min.js
|   |   |   |   index.cjs.min.js.map
|   |   |   |   index.esm.min.js
|   |   |   |   index.esm.min.js.map
|   |   |   |   index.umd.min.js
|   |   |   |   index.umd.min.js.map
|   |   |   |   
|   |   |   +---cjs
|   |   |   |   |   index.js
|   |   |   |   |   index.js.map
|   |   |   |   |   tsconfig.tsbuildinfo
|   |   |   |   |   
|   |   |   |   \---src
|   |   |   |       |   suffix-trie.js
|   |   |   |       |   suffix-trie.js.map
|   |   |   |       |   
|   |   |   |       \---data
|   |   |   |               trie.js
|   |   |   |               trie.js.map
|   |   |   |               
|   |   |   +---es6
|   |   |   |   |   index.js
|   |   |   |   |   index.js.map
|   |   |   |   |   tsconfig.bundle.tsbuildinfo
|   |   |   |   |   
|   |   |   |   \---src
|   |   |   |       |   suffix-trie.js
|   |   |   |       |   suffix-trie.js.map
|   |   |   |       |   
|   |   |   |       \---data
|   |   |   |               trie.js
|   |   |   |               trie.js.map
|   |   |   |               
|   |   |   \---types
|   |   |       |   index.d.ts
|   |   |       |   
|   |   |       \---src
|   |   |           |   suffix-trie.d.ts
|   |   |           |   
|   |   |           \---data
|   |   |                   trie.d.ts
|   |   |                   
|   |   \---src
|   |       |   suffix-trie.ts
|   |       |   
|   |       \---data
|   |               trie.ts
|   |               
|   +---tldts-core
|   |   |   index.ts
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   +---dist
|   |   |   +---cjs
|   |   |   |   |   index.js
|   |   |   |   |   index.js.map
|   |   |   |   |   tsconfig.tsbuildinfo
|   |   |   |   |   
|   |   |   |   \---src
|   |   |   |       |   domain-without-suffix.js
|   |   |   |       |   domain-without-suffix.js.map
|   |   |   |       |   domain.js
|   |   |   |       |   domain.js.map
|   |   |   |       |   extract-hostname.js
|   |   |   |       |   extract-hostname.js.map
|   |   |   |       |   factory.js
|   |   |   |       |   factory.js.map
|   |   |   |       |   is-ip.js
|   |   |   |       |   is-ip.js.map
|   |   |   |       |   is-valid.js
|   |   |   |       |   is-valid.js.map
|   |   |   |       |   options.js
|   |   |   |       |   options.js.map
|   |   |   |       |   subdomain.js
|   |   |   |       |   subdomain.js.map
|   |   |   |       |   
|   |   |   |       \---lookup
|   |   |   |               fast-path.js
|   |   |   |               fast-path.js.map
|   |   |   |               interface.js
|   |   |   |               interface.js.map
|   |   |   |               
|   |   |   +---es6
|   |   |   |   |   index.js
|   |   |   |   |   index.js.map
|   |   |   |   |   tsconfig.bundle.tsbuildinfo
|   |   |   |   |   
|   |   |   |   \---src
|   |   |   |       |   domain-without-suffix.js
|   |   |   |       |   domain-without-suffix.js.map
|   |   |   |       |   domain.js
|   |   |   |       |   domain.js.map
|   |   |   |       |   extract-hostname.js
|   |   |   |       |   extract-hostname.js.map
|   |   |   |       |   factory.js
|   |   |   |       |   factory.js.map
|   |   |   |       |   is-ip.js
|   |   |   |       |   is-ip.js.map
|   |   |   |       |   is-valid.js
|   |   |   |       |   is-valid.js.map
|   |   |   |       |   options.js
|   |   |   |       |   options.js.map
|   |   |   |       |   subdomain.js
|   |   |   |       |   subdomain.js.map
|   |   |   |       |   
|   |   |   |       \---lookup
|   |   |   |               fast-path.js
|   |   |   |               fast-path.js.map
|   |   |   |               interface.js
|   |   |   |               interface.js.map
|   |   |   |               
|   |   |   \---types
|   |   |       |   index.d.ts
|   |   |       |   
|   |   |       \---src
|   |   |           |   domain-without-suffix.d.ts
|   |   |           |   domain.d.ts
|   |   |           |   extract-hostname.d.ts
|   |   |           |   factory.d.ts
|   |   |           |   is-ip.d.ts
|   |   |           |   is-valid.d.ts
|   |   |           |   options.d.ts
|   |   |           |   subdomain.d.ts
|   |   |           |   
|   |   |           \---lookup
|   |   |                   fast-path.d.ts
|   |   |                   interface.d.ts
|   |   |                   
|   |   \---src
|   |       |   domain-without-suffix.ts
|   |       |   domain.ts
|   |       |   extract-hostname.ts
|   |       |   factory.ts
|   |       |   is-ip.ts
|   |       |   is-valid.ts
|   |       |   options.ts
|   |       |   subdomain.ts
|   |       |   
|   |       \---lookup
|   |               fast-path.ts
|   |               interface.ts
|   |               
|   +---tmpl
|   |   |   license
|   |   |   package.json
|   |   |   readme.md
|   |   |   
|   |   \---lib
|   |           tmpl.js
|   |           
|   +---to-regex-range
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---tough-cookie
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---dist
|   |       |   getPublicSuffix.d.ts
|   |       |   getPublicSuffix.js
|   |       |   memstore.d.ts
|   |       |   memstore.js
|   |       |   pathMatch.d.ts
|   |       |   pathMatch.js
|   |       |   permuteDomain.d.ts
|   |       |   permuteDomain.js
|   |       |   store.d.ts
|   |       |   store.js
|   |       |   utils.d.ts
|   |       |   utils.js
|   |       |   validators.d.ts
|   |       |   validators.js
|   |       |   version.d.ts
|   |       |   version.js
|   |       |   
|   |       \---cookie
|   |               canonicalDomain.d.ts
|   |               canonicalDomain.js
|   |               constants.d.ts
|   |               constants.js
|   |               cookie.d.ts
|   |               cookie.js
|   |               cookieCompare.d.ts
|   |               cookieCompare.js
|   |               cookieJar.d.ts
|   |               cookieJar.js
|   |               defaultPath.d.ts
|   |               defaultPath.js
|   |               domainMatch.d.ts
|   |               domainMatch.js
|   |               formatDate.d.ts
|   |               formatDate.js
|   |               index.d.ts
|   |               index.js
|   |               parseDate.d.ts
|   |               parseDate.js
|   |               permutePath.d.ts
|   |               permutePath.js
|   |               
|   +---tr46
|   |   |   index.js
|   |   |   LICENSE.md
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           mappingTable.json
|   |           regexes.js
|   |           statusMapping.js
|   |           
|   +---type-check
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           check.js
|   |           index.js
|   |           parse-type.js
|   |           
|   +---type-detect
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       type-detect.js
|   |       
|   +---type-fest
|   |   |   base.d.ts
|   |   |   index.d.ts
|   |   |   license
|   |   |   package.json
|   |   |   readme.md
|   |   |   
|   |   +---source
|   |   |       async-return-type.d.ts
|   |   |       asyncify.d.ts
|   |   |       basic.d.ts
|   |   |       conditional-except.d.ts
|   |   |       conditional-keys.d.ts
|   |   |       conditional-pick.d.ts
|   |   |       entries.d.ts
|   |   |       entry.d.ts
|   |   |       except.d.ts
|   |   |       fixed-length-array.d.ts
|   |   |       iterable-element.d.ts
|   |   |       literal-union.d.ts
|   |   |       merge-exclusive.d.ts
|   |   |       merge.d.ts
|   |   |       mutable.d.ts
|   |   |       opaque.d.ts
|   |   |       package-json.d.ts
|   |   |       partial-deep.d.ts
|   |   |       promisable.d.ts
|   |   |       promise-value.d.ts
|   |   |       readonly-deep.d.ts
|   |   |       require-at-least-one.d.ts
|   |   |       require-exactly-one.d.ts
|   |   |       set-optional.d.ts
|   |   |       set-required.d.ts
|   |   |       set-return-type.d.ts
|   |   |       stringified.d.ts
|   |   |       tsconfig-json.d.ts
|   |   |       union-to-intersection.d.ts
|   |   |       utilities.d.ts
|   |   |       value-of.d.ts
|   |   |       
|   |   \---ts41
|   |           camel-case.d.ts
|   |           delimiter-case.d.ts
|   |           index.d.ts
|   |           kebab-case.d.ts
|   |           pascal-case.d.ts
|   |           snake-case.d.ts
|   |           
|   +---undici-types
|   |       agent.d.ts
|   |       api.d.ts
|   |       balanced-pool.d.ts
|   |       cache-interceptor.d.ts
|   |       cache.d.ts
|   |       client-stats.d.ts
|   |       client.d.ts
|   |       connector.d.ts
|   |       content-type.d.ts
|   |       cookies.d.ts
|   |       diagnostics-channel.d.ts
|   |       dispatcher.d.ts
|   |       env-http-proxy-agent.d.ts
|   |       errors.d.ts
|   |       eventsource.d.ts
|   |       fetch.d.ts
|   |       formdata.d.ts
|   |       global-dispatcher.d.ts
|   |       global-origin.d.ts
|   |       h2c-client.d.ts
|   |       handlers.d.ts
|   |       header.d.ts
|   |       index.d.ts
|   |       interceptors.d.ts
|   |       LICENSE
|   |       mock-agent.d.ts
|   |       mock-call-history.d.ts
|   |       mock-client.d.ts
|   |       mock-errors.d.ts
|   |       mock-interceptor.d.ts
|   |       mock-pool.d.ts
|   |       package.json
|   |       patch.d.ts
|   |       pool-stats.d.ts
|   |       pool.d.ts
|   |       proxy-agent.d.ts
|   |       readable.d.ts
|   |       README.md
|   |       retry-agent.d.ts
|   |       retry-handler.d.ts
|   |       util.d.ts
|   |       utility.d.ts
|   |       webidl.d.ts
|   |       websocket.d.ts
|   |       
|   +---unicode-canonical-property-names-ecmascript
|   |       index.js
|   |       LICENSE-MIT.txt
|   |       package.json
|   |       README.md
|   |       
|   +---unicode-match-property-ecmascript
|   |       index.js
|   |       LICENSE-MIT.txt
|   |       package.json
|   |       README.md
|   |       
|   +---unicode-match-property-value-ecmascript
|   |   |   index.js
|   |   |   LICENSE-MIT.txt
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---data
|   |           mappings.js
|   |           
|   +---unicode-property-aliases-ecmascript
|   |       index.js
|   |       LICENSE-MIT.txt
|   |       package.json
|   |       README.md
|   |       
|   +---universalify
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---update-browserslist-db
|   |       check-npm-version.js
|   |       cli.js
|   |       index.d.ts
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       utils.js
|   |       
|   +---uri-js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   yarn.lock
|   |   |   
|   |   \---dist
|   |       +---es5
|   |       |       uri.all.d.ts
|   |       |       uri.all.js
|   |       |       uri.all.js.map
|   |       |       uri.all.min.d.ts
|   |       |       uri.all.min.js
|   |       |       uri.all.min.js.map
|   |       |       
|   |       \---esnext
|   |           |   index.d.ts
|   |           |   index.js
|   |           |   index.js.map
|   |           |   regexps-iri.d.ts
|   |           |   regexps-iri.js
|   |           |   regexps-iri.js.map
|   |           |   regexps-uri.d.ts
|   |           |   regexps-uri.js
|   |           |   regexps-uri.js.map
|   |           |   uri.d.ts
|   |           |   uri.js
|   |           |   uri.js.map
|   |           |   util.d.ts
|   |           |   util.js
|   |           |   util.js.map
|   |           |   
|   |           \---schemes
|   |                   http.d.ts
|   |                   http.js
|   |                   http.js.map
|   |                   https.d.ts
|   |                   https.js
|   |                   https.js.map
|   |                   mailto.d.ts
|   |                   mailto.js
|   |                   mailto.js.map
|   |                   urn-uuid.d.ts
|   |                   urn-uuid.js
|   |                   urn-uuid.js.map
|   |                   urn.d.ts
|   |                   urn.js
|   |                   urn.js.map
|   |                   ws.d.ts
|   |                   ws.js
|   |                   ws.js.map
|   |                   wss.d.ts
|   |                   wss.js
|   |                   wss.js.map
|   |                   
|   +---url-parse
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---dist
|   |           url-parse.js
|   |           url-parse.min.js
|   |           url-parse.min.js.map
|   |           
|   +---v8-to-istanbul
|   |   |   CHANGELOG.md
|   |   |   index.d.ts
|   |   |   index.js
|   |   |   LICENSE.txt
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           branch.js
|   |           function.js
|   |           line.js
|   |           range.js
|   |           source.js
|   |           v8-to-istanbul.js
|   |           
|   +---w3c-xmlserializer
|   |   |   LICENSE.md
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           attributes.js
|   |           constants.js
|   |           serialize.js
|   |           
|   +---walker
|   |   |   .travis.yml
|   |   |   LICENSE
|   |   |   package.json
|   |   |   readme.md
|   |   |   
|   |   \---lib
|   |           walker.js
|   |           
|   +---webidl-conversions
|   |   |   LICENSE.md
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           index.js
|   |           
|   +---whatwg-encoding
|   |   |   LICENSE.txt
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           labels-to-names.json
|   |           supported-names.json
|   |           whatwg-encoding.js
|   |           
|   +---whatwg-mimetype
|   |   |   LICENSE.txt
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           mime-type-parameters.js
|   |           mime-type.js
|   |           parser.js
|   |           serializer.js
|   |           utils.js
|   |           
|   +---whatwg-url
|   |   |   index.js
|   |   |   LICENSE.txt
|   |   |   package.json
|   |   |   README.md
|   |   |   webidl2js-wrapper.js
|   |   |   
|   |   \---lib
|   |           encoding.js
|   |           Function.js
|   |           infra.js
|   |           percent-encoding.js
|   |           URL-impl.js
|   |           url-state-machine.js
|   |           URL.js
|   |           urlencoded.js
|   |           URLSearchParams-impl.js
|   |           URLSearchParams.js
|   |           utils.js
|   |           VoidFunction.js
|   |           
|   +---which
|   |   |   CHANGELOG.md
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   which.js
|   |   |   
|   |   \---bin
|   |           node-which
|   |           
|   +---word-wrap
|   |       index.d.ts
|   |       index.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       
|   +---wrap-ansi
|   |       index.js
|   |       license
|   |       package.json
|   |       readme.md
|   |       
|   +---wrappy
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       wrappy.js
|   |       
|   +---write-file-atomic
|   |   |   LICENSE.md
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           index.js
|   |           
|   +---ws
|   |   |   browser.js
|   |   |   index.js
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   wrapper.mjs
|   |   |   
|   |   \---lib
|   |           buffer-util.js
|   |           constants.js
|   |           event-target.js
|   |           extension.js
|   |           limiter.js
|   |           permessage-deflate.js
|   |           receiver.js
|   |           sender.js
|   |           stream.js
|   |           subprotocol.js
|   |           validation.js
|   |           websocket-server.js
|   |           websocket.js
|   |           
|   +---xml-name-validator
|   |   |   LICENSE.txt
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---lib
|   |           xml-name-validator.js
|   |           
|   +---xmlchars
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   xmlchars.d.ts
|   |   |   xmlchars.js
|   |   |   xmlchars.js.map
|   |   |   
|   |   +---xml
|   |   |   +---1.0
|   |   |   |       ed4.d.ts
|   |   |   |       ed4.js
|   |   |   |       ed4.js.map
|   |   |   |       ed5.d.ts
|   |   |   |       ed5.js
|   |   |   |       ed5.js.map
|   |   |   |       
|   |   |   \---1.1
|   |   |           ed2.d.ts
|   |   |           ed2.js
|   |   |           ed2.js.map
|   |   |           
|   |   \---xmlns
|   |       \---1.0
|   |               ed3.d.ts
|   |               ed3.js
|   |               ed3.js.map
|   |               
|   +---y18n
|   |   |   CHANGELOG.md
|   |   |   index.mjs
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---build
|   |       |   index.cjs
|   |       |   
|   |       \---lib
|   |           |   cjs.js
|   |           |   index.js
|   |           |   
|   |           \---platform-shims
|   |                   node.js
|   |                   
|   +---yallist
|   |       iterator.js
|   |       LICENSE
|   |       package.json
|   |       README.md
|   |       yallist.js
|   |       
|   +---yargs
|   |   |   browser.d.ts
|   |   |   browser.mjs
|   |   |   index.cjs
|   |   |   index.mjs
|   |   |   LICENSE
|   |   |   package.json
|   |   |   README.md
|   |   |   yargs
|   |   |   yargs.mjs
|   |   |   
|   |   +---build
|   |   |   |   index.cjs
|   |   |   |   
|   |   |   \---lib
|   |   |       |   argsert.js
|   |   |       |   command.js
|   |   |       |   completion-templates.js
|   |   |       |   completion.js
|   |   |       |   middleware.js
|   |   |       |   parse-command.js
|   |   |       |   usage.js
|   |   |       |   validation.js
|   |   |       |   yargs-factory.js
|   |   |       |   yerror.js
|   |   |       |   
|   |   |       +---typings
|   |   |       |       common-types.js
|   |   |       |       yargs-parser-types.js
|   |   |       |       
|   |   |       \---utils
|   |   |               apply-extends.js
|   |   |               is-promise.js
|   |   |               levenshtein.js
|   |   |               maybe-async-result.js
|   |   |               obj-filter.js
|   |   |               process-argv.js
|   |   |               set-blocking.js
|   |   |               which-module.js
|   |   |               
|   |   +---helpers
|   |   |       helpers.mjs
|   |   |       index.js
|   |   |       package.json
|   |   |       
|   |   +---lib
|   |   |   \---platform-shims
|   |   |           browser.mjs
|   |   |           esm.mjs
|   |   |           
|   |   \---locales
|   |           be.json
|   |           cs.json
|   |           de.json
|   |           en.json
|   |           es.json
|   |           fi.json
|   |           fr.json
|   |           hi.json
|   |           hu.json
|   |           id.json
|   |           it.json
|   |           ja.json
|   |           ko.json
|   |           nb.json
|   |           nl.json
|   |           nn.json
|   |           pirate.json
|   |           pl.json
|   |           pt.json
|   |           pt_BR.json
|   |           ru.json
|   |           th.json
|   |           tr.json
|   |           uk_UA.json
|   |           uz.json
|   |           zh_CN.json
|   |           zh_TW.json
|   |           
|   +---yargs-parser
|   |   |   browser.js
|   |   |   CHANGELOG.md
|   |   |   LICENSE.txt
|   |   |   package.json
|   |   |   README.md
|   |   |   
|   |   \---build
|   |       |   index.cjs
|   |       |   
|   |       \---lib
|   |               index.js
|   |               string-utils.js
|   |               tokenize-arg-string.js
|   |               yargs-parser-types.js
|   |               yargs-parser.js
|   |               
|   \---yocto-queue
|           index.d.ts
|           index.js
|           license
|           package.json
|           readme.md
|           
+---tasks
|       checklist.md
|       
\---tests
    |   auth-manager.test.js
    |   auth-test.html
    |   auth.test.js
    |   cart.test.js
    |   error-manager.test.js
    |   eventDelegator.test.js
    |   input-validator.test.js
    |   integration.test.js
    |   password-security.test.js
    |   performance-benchmark-report.md
    |   performance-benchmark-results.json
    |   performance-benchmark.js
    |   performance-monitor.test.js
    |   performance.test.js
    |   registration-event-integration.test.js
    |   registration-integration.test.js
    |   registration-resilience.test.js
    |   security-manager.test.js
    |   setup.js
    |   storage-manager.test.js
    |   test-report.md
    |   test-results.json
    |   test-runner.html
    |   test-summary.md
    |   uniqueness-checker.test.js
    |   unit-tests.js
    |   utils.test.js
    |   
    \---config
            APIConfig.test.js
            CodeAnalysisConfig.test.js
            DebugConfig.test.js
            EventDelegationConfig.test.js
            ImageOptimizationConfig.test.js
            LazyLoaderConfig.test.js
            NotificationConfig.test.js
            PerformanceConfig.test.js
            ShoppingCartConfig.test.js
            

`

## AI生成代码识别结果
- D:\codes\onlinestore\caddy-style-shopping-site\.refactor\ai-hallucination-report.md: 包含 'AI生成'
- D:\codes\onlinestore\caddy-style-shopping-site\.refactor\audit-final-report.md: 包含 'AI生成'
- D:\codes\onlinestore\caddy-style-shopping-site\.refactor\executive-summary.md: 包含 'AI生成'
- D:\codes\onlinestore\caddy-style-shopping-site\.refactor\repo-overview.md: 包含 'AI生成'
- D:\codes\onlinestore\caddy-style-shopping-site\.refactor\static-analysis-report.md: 包含 'AI生成'
- D:\codes\onlinestore\caddy-style-shopping-site\node_modules\@babel\parser\typings\babel-parser.d.ts: 包含 'Auto-generated'
- D:\codes\onlinestore\caddy-style-shopping-site\node_modules\@istanbuljs\load-nyc-config\node_modules\argparse\lib\argument_parser.js: 包含 'Auto-generated'
- D:\codes\onlinestore\caddy-style-shopping-site\node_modules\@types\node\assert.d.ts: 包含 'Auto-generated'
- D:\codes\onlinestore\caddy-style-shopping-site\node_modules\argparse\argparse.js: 包含 'Auto-generated'



## 审计重点目录
- /js/ : JavaScript核心逻辑
- /css/ : 样式文件
- /tests/ : 测试文件
- /auth/ : 认证相关代码
- /utils/ : 工具函数
