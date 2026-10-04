// 用途：M4(2026-10-04) 第二闸服务端侧一致性 spec——锁死"后端动态 import 的就是
// 前端同源规则引擎"这一事实：
//   1. loadIntegrityRules() 能加载仓库根 js/shared/integrity-rules.js（src/dist 双布局路径均可达）；
//   2. checkNameImage 对三个标准用例（上午三事故回归）行为正确；
//   3. 复检闸本体（P1-2 双盲审修复后契约）：禁用词对所有 create/update 无条件
//      生效（不依赖 factCard）/ 词表冲突按"合并视图有 factCard 即生效" /
//      factCard 形状校验（数组 400）/ 旧拼法 mainColor 识别 / 合规放行。
// 若有人移动 js/shared、破坏 ESM 导出或改坏词表，本 spec 直接红灯（fail-fast 防漂移）。

import * as fs from 'fs';
import { BadRequestException } from '@nestjs/common';
import {
  loadIntegrityRules,
  resolveIntegrityRulesPath,
  enforceProductIntegrityGate,
  hasFactCard,
} from './product-integrity.gate';

describe('M4 第二闸服务端侧：integrity 同源复检', () => {
  describe('同源加载（src/dist 双布局路径解析）', () => {
    it('resolveIntegrityRulesPath 指向仓库根 js/shared/integrity-rules.js 且文件存在', () => {
      const p = resolveIntegrityRulesPath();
      expect(p.replace(/\\/g, '/')).toMatch(/onlinestore_remediation\/js\/shared\/integrity-rules\.js$/);
      expect(fs.existsSync(p)).toBe(true);
    });

    it('loadIntegrityRules 能加载并暴露 lintCopy/checkNameImage/sanityCheck', async () => {
      const rules = await loadIntegrityRules();
      expect(typeof rules.lintCopy).toBe('function');
      expect(typeof rules.checkNameImage).toBe('function');
    });
  });

  describe('checkNameImage 三标准用例（上午三事故回归，与 js/shared 测试同判）', () => {
    it('事故 1：黑包名「柠檬黄小圆筒」→ 黄警 COLOR_MISMATCH（黄系），零红拦', async () => {
      const rules = await loadIntegrityRules();
      const r = rules.checkNameImage({
        name: '柠檬黄小圆筒',
        description: '明亮的柠檬黄背景前，黑色小圆筒包非常上镜',
        factCard: { mainColor: '黑', bagType: '小圆筒' },
      });
      expect(r.blockers).toHaveLength(0);
      const hits = r.warnings.filter((w: any) => w.code === 'COLOR_MISMATCH');
      expect(hits.length).toBeGreaterThanOrEqual(1);
      expect(hits.some((w: any) => w.family === '黄' && w.field === 'name')).toBe(true);
    });

    it('事故 2：凯莉包名「蓝白织纹托特」→ 红拦 BAG_SILHOUETTE_MISMATCH（word=托特）', async () => {
      const rules = await loadIntegrityRules();
      const r = rules.checkNameImage({
        name: '蓝白织纹托特',
        description: '蓝白织纹托特包，通勤也拿得出手',
        factCard: { mainColor: '蓝白', bagType: '凯莉' },
      });
      const blockers = r.blockers.filter((b: any) => b.code === 'BAG_SILHOUETTE_MISMATCH');
      expect(blockers).toHaveLength(1);
      expect((blockers[0] as any).word).toBe('托特');
    });

    it('事故 3：绿橙紫渐变描述写「粉到金」→ 黄警 COLOR_MISMATCH ×2（粉、金）', async () => {
      const rules = await loadIntegrityRules();
      const r = rules.checkNameImage({
        name: '绿橙紫渐变云朵包',
        description: '色彩从粉到金自然渐变',
        factCard: { mainColor: '绿橙紫渐变', bagType: '云朵' },
      });
      expect(r.blockers).toHaveLength(0);
      const families = r.warnings
        .filter((w: any) => w.code === 'COLOR_MISMATCH')
        .map((w: any) => w.family)
        .sort();
      expect(families).toEqual(['粉', '金']);
    });
  });

  describe('复检闸本体 enforceProductIntegrityGate（P1-2 修复后契约）', () => {
    it('无 factCard 但文案干净 → lint-only 放行，返回空 warnings（不再返回 null）', async () => {
      const r = await enforceProductIntegrityGate({
        name: '牛皮手提包',
        description: '头层牛皮，通勤也拿得出手',
        specifications: { 材质: '头层牛皮' },
      });
      expect(r).toEqual({ warnings: [] });
    });

    it('P1-2 主案例：不带 specifications 的禁用词（"限时抢购"）→ 400 带明细，闸不可整体跳过', async () => {
      try {
        await enforceProductIntegrityGate({
          name: '限时抢购水桶包',
          description: '手慢无',
        });
        throw new Error('应当被 400 拦下');
      } catch (e: any) {
        expect(e).toBeInstanceOf(BadRequestException);
        const words = (e.getResponse() as any).details.integrity.bannedWords.map((v: any) => v.word);
        expect(words).toEqual(expect.arrayContaining(['限时', '抢购']));
      }
    });

    it('P3 零宽走私："限␈时"（ZWSP 拆词）→ 400，命中明细为剥离后的词面', async () => {
      try {
        await enforceProductIntegrityGate({
          name: '限\u200B时特惠水桶包',
          description: '',
          specifications: { factCard: { colorGroup: '黑', bagType: '水桶' } },
        });
        throw new Error('应当被 400 拦下');
      } catch (e: any) {
        expect(e).toBeInstanceOf(BadRequestException);
        const words = (e.getResponse() as any).details.integrity.bannedWords.map((v: any) => v.word);
        expect(words).toEqual(expect.arrayContaining(['限时', '特惠']));
      }
    });

    it('factCard 形状非法（数组/标量）→ 400，不静默跳过词表冲突复检（席X P3）', async () => {
      await expect(
        enforceProductIntegrityGate({
          name: '蓝白织纹托特',
          description: '',
          specifications: { factCard: ['黑', '水桶'] as any },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        enforceProductIntegrityGate({
          name: '随便',
          description: '',
          specifications: { factCard: '黑' as any },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('旧拼法 mainColor：与 colorGroup 同效参与颜色比对（旧数据不静默失去复检）', async () => {
      // 名字写黄、事实卡（旧拼法）是黑 → 颜色黄警生效（若旧拼法被忽略，此处将无 COLOR_MISMATCH）
      const r = await enforceProductIntegrityGate({
        name: '柠檬黄小圆筒',
        description: '黑色小圆筒包非常上镜',
        specifications: { factCard: { mainColor: '黑', bagType: '小圆筒' } as any },
      });
      expect(r!.warnings.some((w: any) => w.code === 'COLOR_MISMATCH')).toBe(true);
    });

    it('factCard 缺字段（2/4）不静默：空卡+无包型词 → BAG_TYPE_MISSING 红拦；只有主色+文案有包型词 → 黄警补卡', async () => {
      // 空 factCard：文案与卡都无包型词 → 缺包型红拦（不是静默放行）
      await expect(
        enforceProductIntegrityGate({
          name: '牛皮手袋',
          description: '头层牛皮',
          specifications: { factCard: {} as any },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      // 只有 colorGroup：文案有包型词 → FACT_CARD_BAG_MISSING 黄警（信号在，不拦保存）
      const r = await enforceProductIntegrityGate({
        name: '托特包',
        description: '大容量',
        specifications: { factCard: { colorGroup: '黑' } as any },
      });
      expect(r!.warnings.some((w: any) => w.code === 'FACT_CARD_BAG_MISSING')).toBe(true);
    });

    it('hasFactCard 判定：specifications 缺省/数组/无 factCard 均 false', () => {
      expect(hasFactCard(undefined)).toBe(false);
      expect(hasFactCard(null)).toBe(false);
      expect(hasFactCard(['a'] as any)).toBe(false);
      expect(hasFactCard({ 材质: '牛皮' })).toBe(false);
      expect(hasFactCard({ factCard: { colorGroup: '黑', bagType: '水桶' } })).toBe(true);
    });

    it('结构冲突（事故 2 形状，factCard 用存储形状 colorGroup）→ 400 带 details.integrity.blockers', async () => {
      const promise = enforceProductIntegrityGate({
        name: '蓝白织纹托特',
        description: '蓝白织纹托特包，通勤也拿得出手',
        specifications: {
          factCard: { colorGroup: '蓝白', bagType: '凯莉', hardware: '银', occasion: '通勤' },
        },
      });
      await expect(promise).rejects.toBeInstanceOf(BadRequestException);
      try {
        await enforceProductIntegrityGate({
          name: '蓝白织纹托特',
          description: '蓝白织纹托特包，通勤也拿得出手',
          specifications: {
            factCard: { colorGroup: '蓝白', bagType: '凯莉', hardware: '银', occasion: '通勤' },
          },
        });
      } catch (e: any) {
        const resp = e.getResponse() as any;
        expect(resp.details.integrity.blockers.some((b: any) => b.code === 'BAG_SILHOUETTE_MISMATCH')).toBe(true);
      }
    });

    it('禁用词命中（name 带限时/轻奢）→ 400 带 details.integrity.bannedWords', async () => {
      try {
        await enforceProductIntegrityGate({
          name: '限时轻奢水桶包',
          description: '从容的水桶包',
          specifications: { factCard: { colorGroup: '黑', bagType: '水桶' } },
        });
        throw new Error('应当被 400 拦下');
      } catch (e: any) {
        expect(e).toBeInstanceOf(BadRequestException);
        const words = (e.getResponse() as any).details.integrity.bannedWords.map((v: any) => v.word);
        expect(words).toEqual(expect.arrayContaining(['限时', '轻奢']));
      }
    });

    it('合规输入（名实相符+无禁用词）→ 放行，返回 warnings 数组（黄警不拦）', async () => {
      const r = await enforceProductIntegrityGate({
        name: '黑色小圆筒包',
        description: '黑色小圆筒，通勤也拿得出手',
        specifications: {
          factCard: { colorGroup: '黑', bagType: '小圆筒', hardware: '银', occasion: '通勤' },
        },
      });
      expect(r).not.toBeNull();
      expect(Array.isArray(r!.warnings)).toBe(true);
    });

    it('黄警（事故 1 形状：勾黑写黄）→ 不 400，warnings 携带 COLOR_MISMATCH', async () => {
      const r = await enforceProductIntegrityGate({
        name: '柠檬黄小圆筒',
        description: '明亮的柠檬黄背景前，黑色小圆筒包非常上镜',
        specifications: { factCard: { colorGroup: '黑', bagType: '小圆筒' } },
      });
      expect(r).not.toBeNull();
      expect(r!.warnings.some((w: any) => w.code === 'COLOR_MISMATCH')).toBe(true);
    });
  });
});
