#!/bin/bash
# Docker验证工具函数库

# 检测并使用可用的Docker Compose命令
get_docker_compose_cmd() {
    if command -v docker &> /dev/null; then
        # 检查是否支持docker compose (v2)
        if docker compose version &> /dev/null; then
            echo "docker compose"
            return 0
        fi
    fi
    
    # 回退到docker-compose (v1)
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
        return 0
    fi
    
    # 都不可用
    echo "ERROR: Neither 'docker compose' nor 'docker-compose' is available" >&2
    return 1
}

# 创建临时目录
create_temp_dir() {
    if command -v mktemp &> /dev/null; then
        mktemp -d
    else
        # 回退方案
        echo "/tmp/docker-validation-$$"
        mkdir -p "/tmp/docker-validation-$$"
    fi
}

# 自动发现Docker Compose文件（基础、环境、override 层叠）
discover_compose_files() {
    local search_dir="${1:-.}"
    
    # 如果当前目录是 docker-validation-scripts，则向上搜索到项目根目录
    if [ "$(basename "$search_dir")" = "docker-validation-scripts" ]; then
        search_dir="$(dirname "$search_dir")"
    fi
    
    # 递归搜索项目中的所有Docker Compose文件
    local list=()
    
    # 跨平台的文件搜索方法
    if command -v find &> /dev/null && find --version 2>/dev/null | grep -q GNU; then
        # Linux环境使用find命令
        while IFS= read -r -d '' file; do
            list+=("$file")
        done < <(find "$search_dir" -name "docker-compose*.yml" -type f -print0 2>/dev/null)
    else
        # Windows环境或其他系统，使用PowerShell或直接指定文件
        # 直接指定项目根目录中的主要Docker Compose文件
        if [ -f "$search_dir/docker-compose.yml" ]; then
            list+=("$search_dir/docker-compose.yml")
        fi
        
        if [ -f "$search_dir/docker-compose.dev.yml" ]; then
            list+=("$search_dir/docker-compose.dev.yml")
        fi
        
        if [ -f "$search_dir/docker-compose.openobserve.yml" ]; then
            list+=("$search_dir/docker-compose.openobserve.yml")
        fi
        
        # 检查backend目录中的文件
        if [ -f "$search_dir/backend/docker-compose.yml" ]; then
            list+=("$search_dir/backend/docker-compose.yml")
        fi
        
        if [ -f "$search_dir/backend/docker-compose.tracing.yml" ]; then
            list+=("$search_dir/backend/docker-compose.tracing.yml")
        fi
    fi
    
    printf '%s\n' "${list[@]}"
}

# 根据发现的文件构造 -f 链（基础+环境+override）
build_compose_f_chain() {
    local files=("$@"); local args=""
    for f in "${files[@]}"; do args+=" -f \"$f\""; done
    echo "$args"
}

# 验证Docker Compose文件语法
validate_compose_syntax() {
    local file="$1"
    local docker_cmd
    docker_cmd=$(get_docker_compose_cmd) || return 1
    
    if [ ! -f "$file" ]; then
        echo "ERROR: File not found: $file" >&2
        return 1
    fi
    
    if $docker_cmd -f "$file" config > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 获取Docker Compose配置的JSON输出
get_compose_config() {
    local file="$1"
    local docker_cmd
    docker_cmd=$(get_docker_compose_cmd) || return 1
    
    if [ ! -f "$file" ]; then
        echo "ERROR: File not found: $file" >&2
        return 1
    fi
    
    # 支持 override 合并与 yq 回退
local dir="$(dirname "$file")"
local override="${dir}/docker-compose.override.yml"
local cmd="$docker_cmd"
if [ -f "$override" ]; then
    cmd="$docker_cmd -f \"$file\" -f \"$override\""
else
    cmd="$docker_cmd -f \"$file\""
fi
# v2: --format json；v1不支持时使用 yq 将 YAML 转 JSON
if $docker_cmd version &>/dev/null && $docker_cmd config --help 2>&1 | grep -q "--format"; then
    eval "$cmd config --format json" 2>/dev/null
else
    # 回退：获取 YAML 并用 yq 转 JSON
    if command -v yq &>/dev/null; then
        # 兼容旧版本 yq，使用 -j 或 -o json 替代 -o=json
        if yq --help 2>&1 | grep -q "-o json"; then
            eval "$cmd config" 2>/dev/null | yq -o json '.'
        elif yq --help 2>&1 | grep -q "-j"; then
            eval "$cmd config" 2>/dev/null | yq -j '.'
        else
            # 最后回退为原始文本（精度降低）
            eval "$cmd config" 2>/dev/null
        fi
    else
        # 最后回退为原始文本（精度降低）
        eval "$cmd config" 2>/dev/null
    fi
fi
}

# 加载 env_file 内容为映射
load_env_map_for_service() {
    local config="$1"; local service_name="$2"; declare -A envmap
    if command -v jq &> /dev/null; then
        # env_file 引用
        while read -r envf; do
            [ -f "$envf" ] || continue
            while IFS='=' read -r k v; do
                [ -z "$k" ] && continue
                v="${v%\r}"; v="${v%\n}"; v="${v%\"}"; v="${v#\"}"
                envmap["$k"]="$v"
            done < <(grep -E '^[A-Z_][A-Z0-9_]*=' "$envf")
        done < <(echo "$config" | jq -r ".services[\"$service_name\"].env_file[]? // empty")
        # environment 映射（字典）覆盖
        while IFS='|' read -r k v; do
            [ -z "$k" ] && continue
            envmap["$k"]="$v"
        done < <(echo "$config" | jq -r ".services[\"$service_name\"].environment | to_entries[]? | \"\(.key)|\(.value)\"")
    fi
    # 输出为 k=v
    for k in "${!envmap[@]}"; do
        echo "$k=${envmap[$k]}"
    done
}

# 展开 ${VAR:-default} / ${VAR} 引用（纯 Bash 版本）
expand_var_refs() {
    local val="$1"; shift
    declare -A envmap
    while IFS='=' read -r k v; do
        [ -z "$k" ] && continue
        envmap["$k"]="$v"
    done < <(printf '%s\n' "$@")
    
    local out="$val"; local prev=""
    for _ in 1 2 3; do
        prev="$out"
        # 查找匹配并替换一个模式，循环多次以处理嵌套
        if [[ "$out" =~ \$\{([A-Z_][A-Z0-9_]*)[:-]?([^}]*)\} ]]; then
            local name="${BASH_REMATCH[1]}"
            local def="${BASH_REMATCH[2]}"
            local repl=""
            if [[ -n "${envmap[$name]}" ]]; then
                repl="${envmap[$name]}"
            elif [[ -n "${!name}" ]]; then
                repl="${!name}"
            else
                repl="$def"
            fi
            # 执行一次替换
            out="${out/\">${BASH_REMATCH[0]}/$repl}"
        fi
        [[ "$out" == "$prev" ]] && break
    done
    echo "$out"
}

# 解析端口映射（支持主机IP、IPv6、范围、长格式对象）
parse_port_mappings() {
    local config="$1"; local service_name="$2"
    mapfile -t envpairs < <(load_env_map_for_service "$config" "$service_name")
    if command -v jq &> /dev/null; then
        # 先尝试长格式对象
        echo "$config" | jq -r ".services[\"$service_name\"].ports[]? | if type==\"object\" then \"\(.published)//\(.target)//\(.protocol)//\(.host_ip)//\(.mode)\" else . end" 2>/dev/null |
        while read -r entry; do
            if [[ "$entry" =~ ^([0-9]+)//([0-9]+)// ]]; then
                echo "${BASH_REMATCH[1]}:${BASH_REMATCH[2]}"
            else
                # 字符串形式，包含IP/IPv6/范围
                entry=$(expand_var_refs "$entry" "${envpairs[@]}")
                # 支持 127.0.0.1:8080:80 / [::1]:8080:80 / 8080-8082:80
                if [[ "$entry" =~ ^([^:]+):([0-9]+):([0-9]+)$ ]]; then
                    echo "${BASH_REMATCH[2]}:${BASH_REMATCH[3]}"
                elif [[ "$entry" =~ ^([0-9]+)-([0-9]+):([0-9]+)$ ]]; then
                    # 展开范围（主机端口范围）
                    for hp in $(seq ${BASH_REMATCH[1]} ${BASH_REMATCH[2]}); do echo "$hp:${BASHREMATCH[3]}"; done
                elif [[ "$entry" =~ ^([0-9]+):([0-9]+)(/.*)?$ ]]; then
                    echo "${BASH_REMATCH[1]}:${BASH_REMATCH[2]}"
                fi
            fi
        done
    else
        # 回退字符串解析
        echo "$config" | grep -o "\"ports\":[[:space:]]*\[[^]]*\]" | sed 's/"ports":\[//g' | sed 's/\]$//g' | tr ',' '\n' | while read -r entry; do
            entry=$(expand_var_refs "$entry" "${envpairs[@]}")
            entry=$(echo "$entry" | sed 's/^[[:space:]]*"*//g' | sed 's/"*[[:space:]]*$//g')
            if [[ "$entry" =~ ^([^:]+):([0-9]+):([0-9]+)$ ]]; then
                echo "${BASH_REMATCH[2]}:${BASH_REMATCH[3]}"
            elif [[ "$entry" =~ ^([0-9]+)-([0-9]+):([0-9]+)$ ]]; then
                for hp in $(seq ${BASH_REMATCH[1]} ${BASH_REMATCH[2]}); do echo "$hp:${BASHREMATCH[3]}"; done
            elif [[ "$entry" =~ ^([0-9]+):([0-9]+)(/.*)?$ ]]; then
                echo "${BASH_REMATCH[1]}:${BASH_REMATCH[2]}"
            fi
        done
    fi
}

# 获取服务列表
get_service_names() {
    local config="$1"
    
    if command -v jq &> /dev/null; then
        echo "$config" | jq -r '.services | keys[]' 2>/dev/null
    else
        # 回退到grep/awk解析
        echo "$config" | grep -o '"services":[[:space:]]*{' -A 1000 | grep -o '"[^"]*":[[:space:]]*{' | grep -v '^[[:space:]]*"' | sed 's/^[[:space:]]*"\([^"]*\)".*/\1/' | head -n -1
    fi
}

# 解析环境变量（支持数组和字典格式，并进行变量展开与 env 合并）
parse_environment_variables() {
    local config="$1"; local service_name="$2"; local temp_env_file
    temp_env_file=$(create_temp_dir)/env_vars.txt
    
    # 构建 envmap
    mapfile -t envpairs < <(load_env_map_for_service "$config" "$service_name")
    
    if command -v jq &> /dev/null; then
        # 数组格式
        echo "$config" | jq -r ".services[\"$service_name\"].environment[]? // empty" 2>/dev/null | while read -r env_var; do
            if [[ "$env_var" =~ ^([^=]+)=(.*)$ ]]; then
                key="${BASH_REMATCH[1]}"; val="${BASH_REMATCH[2]}"
                val=$(expand_var_refs "$val" "${envpairs[@]}")
                echo "$key|$val"
            fi
        done > "$temp_env_file"
        
        # 字典格式
        echo "$config" | jq -r ".services[\"$service_name\"].environment | to_entries[]? | \"\(.key)|\(.value)\"" 2>/dev/null | while read -r env_var; do
            if [[ "$env_var" =~ ^([^|]+)\|(.*)$ ]]; then
                key="${BASH_REMATCH[1]}"; val="${BASH_REMATCH[2]}"
                val=$(expand_var_refs "$val" "${envpairs[@]}")
                echo "$key|$val"
            fi
        done >> "$temp_env_file"
        
        # env_file 引用（已在 envmap 中），不重复输出
    else
        echo "WARNING: jq not available, environment variable parsing may be incomplete" >&2
        echo "$config" | grep -o "\"environment\":[[:space:]]*\[[^]]*\]" | sed 's/"environment":\[//g' | sed 's/\]$//g' | tr ',' '\n' | while read -r env_var; do
            env_var=$(echo "$env_var" | sed 's/^[[:space:]]*"*//g' | sed 's/"*[[:space:]]*$//g')
            if [[ "$env_var" =~ ^([^=]+)=(.*)$ ]]; then
                key="${BASH_REMATCH[1]}"; val="${BASH_REMATCH[2]}"
                val=$(expand_var_refs "$val" "${envpairs[@]}")
                echo "$key|$val"
            fi
        done > "$temp_env_file"
    fi
    
    cat "$temp_env_file"
    rm -f "$temp_env_file"
}

# 解析网络配置
parse_networks() {
    local config="$1"
    
    if command -v jq &> /dev/null; then
        echo "$config" | jq -r '.networks | keys[]' 2>/dev/null
    else
        # 回退到grep/awk解析
        echo "$config" | grep -o '"networks":[[:space:]]*{' -A 1000 | grep -o '"[^"]*":' | grep -v '^[[:space:]]*"' | sed 's/^[[:space:]]*"\([^"]*\)".*/\1/'
    fi
}

# 解析卷配置
parse_volumes() {
    local config="$1"
    local service_name="$2"
    
    if command -v jq &> /dev/null; then
        echo "$config" | jq -r ".services[\"$service_name\"].volumes[]? // empty" 2>/dev/null | while read -r volume; do
            # 提取主机路径部分（如果有）
            if [[ "$volume" =~ ^([^:]+): ]]; then
                echo "${BASH_REMATCH[1]}"
            fi
        done
    else
        # 回退到grep/awk解析
        echo "$config" | grep -o "\"volumes\":[[:space:]]*\[[^]]*\]" | sed 's/"volumes":\[//g' | sed 's/\]$//g' | tr ',' '\n' | while read -r volume; do
            volume=$(echo "$volume" | sed 's/^[[:space:]]*"*//g' | sed 's/"*[[:space:]]*$//g')
            if [[ "$volume" =~ ^([^:]+): ]]; then
                echo "${BASH_REMATCH[1]}"
            fi
        done
    fi
}

# 解析健康检查配置
parse_healthcheck() {
    local config="$1"
    local service_name="$2"
    
    if command -v jq &> /dev/null; then
        echo "$config" | jq -r ".services[\"$service_name\"].healthcheck // empty" 2>/dev/null
    else
        # 回退到grep/awk解析
        echo "$config" | grep -o "\"healthcheck\":[[:space:]]*{[^}]*}" | sed 's/"healthcheck":{//g' | sed 's/}$//g'
    fi
}

# 解析资源限制配置
parse_resource_limits() {
    local config="$1"
    local service_name="$2"
    
    if command -v jq &> /dev/null; then
        echo "$config" | jq -r ".services[\"$service_name\"].deploy.resources // empty" 2>/dev/null
    else
        # 回退到grep/awk解析
        echo "$config" | grep -o "\"deploy\":[[:space:]]*{[^}]*\"resources\":[^}]*}" | sed 's/.*"resources":{//g' | sed 's/}$//g'
    fi
}

# 检查命令是否存在
command_exists() {
    command -v "$1" &> /dev/null
}

# 输出带颜色的消息
print_message() {
    local level="$1"
    local message="$2"
    
    case "$level" in
        "error")
            echo -e "\033[31m❌ $message\033[0m" >&2
            ;;
        "warning")
            echo -e "\033[33m⚠️  $message\033[0m"
            ;;
        "success")
            echo -e "\033[32m✅ $message\033[0m"
            ;;
        "info")
            echo -e "\033[36mℹ️  $message\033[0m"
            ;;
        *)
            echo "$message"
            ;;
    esac
}

# 获取环境变量优先级策略（根 .env 与服务级 env_file、environment 的覆盖规则）
get_env_precedence() {
    local service_name="$1"
    local config="$2"
    
    # 默认优先级：environment > env_file > .env 文件
    local precedence_order=("environment" "env_file" "dotenv")
    
    # 首先检查环境变量
    if [ -n "$VALIDATION_ENV_PRECEDENCE" ]; then
        IFS=',' read -r -a precedence_order <<< "$VALIDATION_ENV_PRECEDENCE"
    else
        # 检查是否有自定义配置
        local config_file="validation.config"
        if [ -f "$config_file" ]; then
            local custom_order=$(grep -E '^ENV_PRECEDENCE=' "$config_file" | cut -d'=' -f2 | tr -d '\r')
            if [ -n "$custom_order" ]; then
                IFS=',' read -r -a precedence_order <<< "$custom_order"
            fi
        fi
    fi
    
    # 返回优先级顺序
    printf '%s\n' "${precedence_order[@]}"
}

# 获取环境变量值（根据优先级策略）
get_env_value_by_precedence() {
    local service_name="$1"
    local env_var_name="$2"
    local config="$3"
    
    # 获取优先级顺序
    mapfile -t precedence < <(get_env_precedence "$service_name" "$config")
    
    # 按优先级查找变量值
    for source in "${precedence[@]}"; do
        case "$source" in
            "environment")
                # 从 environment 字段获取
                if command -v jq &> /dev/null; then
                    local value=$(echo "$config" | jq -r ".services[\"$service_name\"].environment.\"$env_var_name\"? // empty" 2>/dev/null)
                    if [ -n "$value" ]; then
                        echo "$value"
                        return 0
                    fi
                fi
                ;;
            "env_file")
                # 从 env_file 文件获取
                if command -v jq &> /dev/null; then
                    local env_files=$(echo "$config" | jq -r ".services[\"$service_name\"].env_file[]? // empty" 2>/dev/null)
                    for env_file in $env_files; do
                        if [ -f "$env_file" ]; then
                            local value=$(grep -E "^$env_var_name=" "$env_file" | cut -d'=' -f2-)
                            if [ -n "$value" ]; then
                                echo "$value"
                                return 0
                            fi
                        fi
                    done
                fi
                ;;
            "dotenv")
                # 从根目录 .env 文件获取
                if [ -f ".env" ]; then
                    local value=$(grep -E "^$env_var_name=" ".env" | cut -d'=' -f2-)
                    if [ -n "$value" ]; then
                        echo "$value"
                        return 0
                    fi
                fi
                ;;
        esac
    done
    
    # 如果所有来源都没有找到，返回空
    echo ""
    return 1
}