#!/bin/bash
# γ-bifrost 步骤 4：盲审席批后兜底 manual runner
# 当 CI 不可用时（未推 origin / 推 master 0 史）手动跑批后盲审
# 债-10 v6 立项批（γ-bifrost 5 步之 4）2026-10-15 装
#
# 用法：
#   bash backend/scripts/post-commit-blind-review.sh                    # 最近 1 commit
#   bash backend/scripts/post-commit-blind-review.sh HEAD~3..HEAD~1     # 3 commit 范围
#
# 输出：盲审报告写到 docs/debt-10-archive/audit-outputs/blind-review-YYYYMMDD-HHMMSS.md
# 也可在 commit 后用 git hook `post-commit` 自动跑：
#   ln -sf "$REPO/backend/scripts/post-commit-blind-review.sh" "$GIT_DIR/hooks/post-commit"

set -e
REPO_ROOT="$(git rev-parse --show-toplevel)"
RANGE="${1:-HEAD~1..HEAD}"
TS=$(date -u +%Y%m%d-%H%M%S)
OUT="$REPO_ROOT/docs/debt-10-archive/audit-outputs/blind-review-$TS.md"

CHANGED=$(git diff --name-only "$RANGE" 2>/dev/null | grep -E '\.(md|py|ts|mjs|json|txt|sql)$' || true)

cat > "$OUT" << HEADER
# γ-bifrost 盲审席批后审查报告

**Commit Range**: \`$RANGE\`
**Run Time**: $TS (UTC)
**Files Reviewed**: ${CHANGED:-0}

## 4 席闸 跑测

| 闸 | Pass / Fail | Notes |
|----|--------------|-------|
| G1 caliber_guard | ? | 词义/聚合/数字锚 |
| G2 pre_emit_check | ? | 数字锚严格比对 |
| G3 finding_lifecycle | ? | 三件齐 + 占位 + 长度 + 优先级 |
| G4 数字证据 | ? | 数字 2+ 位有显锚 |
HEADER

if [ -z "$CHANGED" ]; then
  echo "**No relevant files changed in range.**" >> "$OUT"
else
  echo "" >> "$OUT"
  echo "## 逐件结果" >> "$OUT"
  echo "" >> "$OUT"
  echo "| 文件 | G1 | G2 | G3 | G4 | 判定 |" >> "$OUT"
  echo "|------|----|----|----|----|------|" >> "$OUT"

  OVERALL_PASS=1
  for f in $CHANGED; do
    [ -f "$REPO_ROOT/$f" ] || continue

    # G1 caliber_guard
    R1=$(python "$REPO_ROOT/backend/scripts/caliber_guard.py" "$REPO_ROOT/$f" 2>&1 | tail -1)
    C1=$(echo "$R1" | grep -oE "[0-9]+ findings" | grep -oE "[0-9]+"); C1=${C1:-0}

    # G2 pre_emit_check
    R2=$(python "$REPO_ROOT/backend/scripts/pre_emit_check.py" "$REPO_ROOT/$f" 2>&1 | grep "出口断言" | head -1)
    C2=$(echo "$R2" | grep -oE "[0-9]+ 违例" | grep -oE "[0-9]+"); C2=${C2:-0}

    # G3 finding_lifecycle（适用 finding 类文件）
    C3="-"
    if [[ "$f" == *finding* ]] || [[ "$f" == *Finding* ]]; then
      R3=$(python "$REPO_ROOT/backend/scripts/finding_lifecycle.py" "$REPO_ROOT/$f" 2>&1)
      if echo "$R3" | grep -q "OK 规则 8 三件齐"; then
        C3="✅"
      else
        C3="❌"
        OVERALL_PASS=0
      fi
    fi

    # G4 数字证据（caliber_guard 内含）
    C4=$C1  # 数字锚 = caliber_guard DIGIT 项

    TOTAL=$((C1 + C2))
    if [ $TOTAL -gt 0 ]; then
      VERDICT="❌"
      OVERALL_PASS=0
    else
      VERDICT="✅"
    fi
    echo "| $f | $C1 | $C2 | $C3 | $C4 | $VERDICT |" >> "$OUT"
  done

  echo "" >> "$OUT"
  if [ $OVERALL_PASS -eq 1 ]; then
    echo "**Overall: ✅ PASS**" >> "$OUT"
  else
    echo "**Overall: ❌ FAIL**" >> "$OUT"
  fi
fi

cat "$OUT"
echo ""
echo "盲审报告已写：$OUT"
