// 第1層（実測）メトリクスの集約。すべて conversations.json からの計算のみで導出する。
// モデルの自己申告には一切依存しない。

import type { LinearizedConversation } from '../types';
import { computeGptAge, type GptAgeResult } from './gptAge';
import {
  computeInstructionDensity,
  type InstructionDensityResult,
} from './instructionDensity';
import { computeCorrectionRate, type CorrectionResult } from './correctionRate';
import { computeThemeRatio, type ThemeResult } from './themeRatio';

export interface MetricsResult {
  conversationCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  gptAge: GptAgeResult;
  instructionDensity: InstructionDensityResult;
  correction: CorrectionResult;
  themes: ThemeResult;
}

export function computeMetrics(
  convs: LinearizedConversation[],
  nowSeconds?: number,
): MetricsResult {
  let userMessageCount = 0;
  let assistantMessageCount = 0;
  for (const c of convs) {
    for (const m of c.messages) {
      if (m.role === 'user') userMessageCount++;
      else if (m.role === 'assistant') assistantMessageCount++;
    }
  }

  return {
    conversationCount: convs.length,
    userMessageCount,
    assistantMessageCount,
    gptAge: computeGptAge(convs, nowSeconds),
    instructionDensity: computeInstructionDensity(convs),
    correction: computeCorrectionRate(convs),
    themes: computeThemeRatio(convs),
  };
}

export type {
  GptAgeResult,
  InstructionDensityResult,
  CorrectionResult,
  ThemeResult,
};
