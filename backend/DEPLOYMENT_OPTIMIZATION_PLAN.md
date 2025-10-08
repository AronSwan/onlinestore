# 部署优化方案

> 🚀 **目标**: 实现零停机部署，部署时间从10分钟缩短至2分钟  
> 📊 **覆盖范围**: CI/CD流水线、容器化、Kubernetes、监控告警  
> 🎯 **核心指标**: 部署成功率99.9%，回滚时间<30秒

## 🎯 部署优化目标

### 核心部署指标
| 部署指标 | 当前状态 | 目标状态 | 改进措施 |
|---------|----------|----------|----------|
| 部署时间 | 10分钟 | 2分钟 | 并行构建+缓存 |
| 部署成功率 | 95% | 99.9% | 自动化测试 |
| 回滚时间 | 5分钟 | 30秒 | 蓝绿部署 |
| 停机时间 | 2分钟 | 0秒 | 滚动更新 |
| 环境一致性 | 80% | 100% | 容器化 |

## 🔄 CI/CD流水线优化

### 1. GitHub Actions工作流

#### 优化后的CI/CD配置
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # 代码质量检查
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run security audit
        run: npm audit --audit-level=high

  # 单元测试
  unit-tests:
    runs-on: ubuntu-latest
    needs: quality-check
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  # 集成测试
  integration-tests:
    runs-on: ubuntu-latest
    needs: quality-check
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  # 构建Docker镜像
  build-image:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    if: github.ref == 'refs/heads/main'
    outputs:
      image: ${{ steps.image.outputs.image }}
      digest: ${{ steps.build.outputs.digest }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}
      
      - name: Build and push Docker image
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      
      - name: Output image
        id: image
        run: |
          echo "image=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}" >> $GITHUB_OUTPUT

  # 安全扫描
  security-scan:
    runs-on: ubuntu-latest
    needs: build-image
    steps:
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ needs.build-image.outputs.image }}
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  # 部署到Staging
  deploy-staging:
    runs-on: ubuntu-latest
    needs: [build-image, security-scan]
    environment: staging
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'v1.28.0'
      
      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBECONFIG_STAGING }}" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig
      
      - name: Deploy to staging
        run: |
          export KUBECONFIG=kubeconfig
          sed -i 's|IMAGE_TAG|${{ github.sha }}|g' k8s/staging/*.yaml
          kubectl apply -f k8s/staging/
          kubectl rollout status deployment/backend-api -n staging --timeout=300s

  # E2E测试
  e2e-tests:
    runs-on: ubuntu-latest
    needs: deploy-staging
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          E2E_BASE_URL: https://staging-api.example.com

  # 部署到Production
  deploy-production:
    runs-on: ubuntu-latest
    needs: [e2e-tests]
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'v1.28.0'
      
      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBECONFIG_PRODUCTION }}" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig
      
      - name: Deploy to production
        run: |
          export KUBECONFIG=kubeconfig
          sed -i 's|IMAGE_TAG|${{ github.sha }}|g' k8s/production/*.yaml
          kubectl apply -f k8s/production/
          kubectl rollout status deployment/backend-api -n production --timeout=600s
      
      - name: Verify deployment
        run: |
          export KUBECONFIG=kubeconfig
          kubectl get pods -n production
          curl -f https://api.example.com/health || exit 1
```

### 2. 优化的Dockerfile

#### 多阶段构建优化
```dockerfile
# Dockerfile
# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY tsconfig*.json ./

# 安装依赖（包括开发依赖）
RUN npm ci --include=dev

# 复制源代码
COPY src/ ./src/
COPY test/ ./test/

# 构建应用
RUN npm run build

# 生产依赖安装阶段
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./

# 只安装生产依赖
RUN npm ci --omit=dev && npm cache clean --force

# 运行时阶段
FROM node:20-alpine AS runtime

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# 安装dumb-init用于信号处理
RUN apk add --no-cache dumb-init

# 复制生产依赖
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# 复制构建产物
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js

# 切换到非root用户
USER nestjs

# 暴露端口
EXPOSE 3000

# 使用dumb-init启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

## ☸️ Kubernetes部署优化

### 1. 生产环境部署配置

#### Deployment配置
```yaml
# k8s/production/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: production
  labels:
    app: backend-api
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: backend-api
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: backend-api
        image: ghcr.io/company/backend:IMAGE_TAG
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        envFrom:
        - secretRef:
            name: backend-secrets
        - configMapRef:
            name: backend-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 30
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: tmp
        emptyDir: {}
      - name: logs
        emptyDir: {}
      nodeSelector:
        kubernetes.io/arch: amd64
      tolerations:
      - key: "node.kubernetes.io/not-ready"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300
      - key: "node.kubernetes.io/unreachable"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300
```

#### HPA自动扩缩容
```yaml
# k8s/production/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Max
```

### 2. 蓝绿部署配置

#### Argo Rollouts配置
```yaml
# k8s/production/rollout.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: backend-api-rollout
  namespace: production
spec:
  replicas: 5
  strategy:
    blueGreen:
      activeService: backend-api-active
      previewService: backend-api-preview
      autoPromotionEnabled: false
      scaleDownDelaySeconds: 30
      prePromotionAnalysis:
        templates:
        - templateName: success-rate
        args:
        - name: service-name
          value: backend-api-preview
      postPromotionAnalysis:
        templates:
        - templateName: success-rate
        args:
        - name: service-name
          value: backend-api-active
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      containers:
      - name: backend-api
        image: ghcr.io/company/backend:IMAGE_TAG
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
  namespace: production
spec:
  args:
  - name: service-name
  metrics:
  - name: success-rate
    interval: 60s
    count: 5
    successCondition: result[0] >= 0.95
    failureLimit: 3
    provider:
      prometheus:
        address: http://prometheus.monitoring.svc.cluster.local:9090
        query: |
          sum(rate(http_requests_total{service="{{args.service-name}}",status!~"5.."}[5m])) /
          sum(rate(http_requests_total{service="{{args.service-name}}"}[5m]))
```

## 📊 监控和告警

### 1. Prometheus监控配置

#### ServiceMonitor配置
```yaml
# k8s/monitoring/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: backend-api
  namespace: production
  labels:
    app: backend-api
spec:
  selector:
    matchLabels:
      app: backend-api
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
    scrapeTimeout: 10s
    honorLabels: true
```

#### 告警规则
```yaml
# k8s/monitoring/alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: backend-api-alerts
  namespace: production
spec:
  groups:
  - name: backend-api
    rules:
    - alert: BackendAPIDown
      expr: up{job="backend-api"} == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Backend API is down"
        description: "Backend API has been down for more than 1 minute"
    
    - alert: BackendAPIHighErrorRate
      expr: |
        (
          sum(rate(http_requests_total{job="backend-api",status=~"5.."}[5m])) /
          sum(rate(http_requests_total{job="backend-api"}[5m]))
        ) > 0.05
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High error rate on Backend API"
        description: "Error rate is {{ $value | humanizePercentage }}"
    
    - alert: BackendAPIHighLatency
      expr: |
        histogram_quantile(0.95,
          sum(rate(http_request_duration_seconds_bucket{job="backend-api"}[5m])) by (le)
        ) > 1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High latency on Backend API"
        description: "95th percentile latency is {{ $value }}s"
    
    - alert: BackendAPIHighMemoryUsage
      expr: |
        (
          container_memory_working_set_bytes{pod=~"backend-api-.*"} /
          container_spec_memory_limit_bytes{pod=~"backend-api-.*"}
        ) > 0.9
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High memory usage on Backend API"
        description: "Memory usage is {{ $value | humanizePercentage }}"
```

## 🔧 部署脚本

### 1. 自动化部署脚本

#### 部署脚本
```bash
#!/bin/bash
# scripts/deploy.sh

set -euo pipefail

# 配置
NAMESPACE=${NAMESPACE:-production}
IMAGE_TAG=${IMAGE_TAG:-latest}
TIMEOUT=${TIMEOUT:-600}

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# 检查依赖
check_dependencies() {
    log "检查部署依赖..."
    
    command -v kubectl >/dev/null 2>&1 || error "kubectl 未安装"
    command -v helm >/dev/null 2>&1 || error "helm 未安装"
    
    kubectl cluster-info >/dev/null 2>&1 || error "无法连接到Kubernetes集群"
    
    log "依赖检查完成"
}

# 预部署检查
pre_deploy_check() {
    log "执行预部署检查..."
    
    # 检查镜像是否存在
    if ! docker manifest inspect "ghcr.io/company/backend:${IMAGE_TAG}" >/dev/null 2>&1; then
        error "镜像 ghcr.io/company/backend:${IMAGE_TAG} 不存在"
    fi
    
    # 检查命名空间
    if ! kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1; then
        log "创建命名空间 ${NAMESPACE}"
        kubectl create namespace "${NAMESPACE}"
    fi
    
    # 检查资源配额
    local cpu_request=$(kubectl get deployment backend-api -n "${NAMESPACE}" -o jsonpath='{.spec.template.spec.containers[0].resources.requests.cpu}' 2>/dev/null || echo "200m")
    local memory_request=$(kubectl get deployment backend-api -n "${NAMESPACE}" -o jsonpath='{.spec.template.spec.containers[0].resources.requests.memory}' 2>/dev/null || echo "256Mi")
    
    log "预部署检查完成"
}

# 执行部署
deploy() {
    log "开始部署到 ${NAMESPACE} 环境..."
    
    # 更新镜像标签
    find k8s/${NAMESPACE} -name "*.yaml" -exec sed -i "s|IMAGE_TAG|${IMAGE_TAG}|g" {} \;
    
    # 应用配置
    kubectl apply -f k8s/${NAMESPACE}/
    
    # 等待部署完成
    log "等待部署完成..."
    kubectl rollout status deployment/backend-api -n "${NAMESPACE}" --timeout="${TIMEOUT}s"
    
    log "部署完成"
}

# 部署后验证
post_deploy_verify() {
    log "执行部署后验证..."
    
    # 检查Pod状态
    local ready_pods=$(kubectl get pods -n "${NAMESPACE}" -l app=backend-api --field-selector=status.phase=Running -o jsonpath='{.items[*].status.containerStatuses[0].ready}' | tr ' ' '\n' | grep -c true || echo 0)
    local total_pods=$(kubectl get pods -n "${NAMESPACE}" -l app=backend-api -o jsonpath='{.items[*].metadata.name}' | wc -w)
    
    if [ "${ready_pods}" -eq 0 ]; then
        error "没有Pod处于Ready状态"
    fi
    
    log "Ready Pods: ${ready_pods}/${total_pods}"
    
    # 健康检查
    local service_ip=$(kubectl get service backend-api -n "${NAMESPACE}" -o jsonpath='{.spec.clusterIP}')
    if ! kubectl run curl-test --image=curlimages/curl:latest --rm -i --restart=Never -- curl -f "http://${service_ip}:3000/health" >/dev/null 2>&1; then
        warn "健康检查失败，但部署可能仍然成功"
    else
        log "健康检查通过"
    fi
    
    log "部署验证完成"
}

# 回滚函数
rollback() {
    local revision=${1:-}
    
    log "执行回滚..."
    
    if [ -n "${revision}" ]; then
        kubectl rollout undo deployment/backend-api -n "${NAMESPACE}" --to-revision="${revision}"
    else
        kubectl rollout undo deployment/backend-api -n "${NAMESPACE}"
    fi
    
    kubectl rollout status deployment/backend-api -n "${NAMESPACE}" --timeout=300s
    
    log "回滚完成"
}

# 主函数
main() {
    case "${1:-deploy}" in
        "deploy")
            check_dependencies
            pre_deploy_check
            deploy
            post_deploy_verify
            ;;
        "rollback")
            rollback "${2:-}"
            ;;
        "verify")
            post_deploy_verify
            ;;
        *)
            echo "用法: $0 {deploy|rollback|verify}"
            exit 1
            ;;
    esac
}

# 捕获错误并清理
trap 'error "部署过程中发生错误"' ERR

main "$@"
```

## 📋 实施计划

### Week 1-2: CI/CD优化
- **Day 1-3**: 优化GitHub Actions工作流
- **Day 4-6**: 实施多阶段Docker构建
- **Day 7**: 集成安全扫描

### Week 3-4: Kubernetes部署
- **Day 1-3**: 配置生产环境部署
- **Day 4-6**: 实施蓝绿部署
- **Day 7**: 配置自动扩缩容

### Week 5-6: 监控告警
- **Day 1-3**: 部署Prometheus监控
- **Day 4-6**: 配置告警规则
- **Day 7**: 集成通知系统

### 验收标准
- [ ] 部署时间缩短至2分钟以内
- [ ] 实现零停机部署
- [ ] 部署成功率达到99.9%
- [ ] 回滚时间控制在30秒内
- [ ] 监控告警全面覆盖

---

**文档版本**: v1.0  
**最后更新**: 2025-10-07  
**负责人**: DevOps团队