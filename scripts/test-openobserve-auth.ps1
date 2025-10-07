# 测试OpenObserve认证的PowerShell脚本

Write-Host "🔍 开始测试OpenObserve认证..."

# 定义要测试的凭据组合
$credentialsList = @(
    @{ username = "admin"; password = "admin" },
    @{ username = "admin"; password = "admin123" },
    @{ username = "admin@example.com"; password = "admin123" },
    @{ username = "admin@example.com"; password = "ComplexPass#123" },
    @{ username = "admin@example.com"; password = "Complexpass#123" }
)

# 定义要测试的端点
$endpoints = @(
    "/",
    "/api/default/_health",
    "/api/default/streams"
)

# 测试每个凭据组合
foreach ($credentials in $credentialsList) {
    $username = $credentials.username
    $password = $credentials.password
    Write-Host "\n🔑 测试凭据: $username / $password"
    
    # 生成基本认证头
    $base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$username`:$password"))
    $headers = @{ "Authorization" = "Basic $base64Auth" }
    
    # 测试每个端点
    foreach ($endpoint in $endpoints) {
        $url = "http://localhost:5080$endpoint"
        Write-Host "\n🌐 测试端点: $url"
        
        try {
            $response = Invoke-WebRequest -Uri $url -Headers $headers -Method Get -ErrorAction Stop
            Write-Host "✅ 成功: 状态码 $($response.StatusCode)"
            if ($response.StatusCode -eq 200 -and $endpoint -eq "/api/default/streams") {
                Write-Host "📋 流列表响应内容 (前100字符):"
                Write-Host $($response.Content.Substring(0, [Math]::Min(100, $response.Content.Length)))
            }
        } catch {
            Write-Host "❌ 失败: $($_.Exception.Message)"
            if ($_.Exception.Response) {
                Write-Host "   状态码: $($_.Exception.Response.StatusCode.Value__)"
            }
        }
    }
}

Write-Host "\n📋 测试完成!"