
import { Agent, AgentCategory, AppSettings } from './types';

export const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'agent-1',
    name: '代码审计专家',
    role: '安全分析师',
    instruction: '你是一名资深代码审计专家。请分析用户提供的代码，识别潜在的安全漏洞和性能瓶颈。',
    category: AgentCategory.ANALYSIS,
    priority: 1,
    dependencies: [],
  },
  {
    id: 'agent-2',
    name: '逻辑架构师',
    role: '系统设计',
    instruction: '你负责将需求转化为清晰的技术架构逻辑。请给出模块化设计的具体建议。',
    category: AgentCategory.EXECUTION,
    priority: 2,
    dependencies: [],
  },
  {
    id: 'agent-3',
    name: '质量保障官',
    role: '测试开发',
    instruction: '你负责对前序输出进行验证。请评估生成内容的逻辑严密性并输出测试方案。',
    category: AgentCategory.VERIFICATION,
    priority: 3,
    dependencies: [],
  }
];

export const INITIAL_SETTINGS: AppSettings = {
  theme: 'system',
  fontSize: 'medium',
  apiBaseUrl: 'https://generativelanguage.googleapis.com',
  apiTimeout: 30000,
  maxHistory: 100,
  autoFoldHistory: true,
};

export const STORAGE_KEYS = {
  AGENTS: 'fa_agents',
  HISTORY: 'fa_history',
  SETTINGS: 'fa_settings',
  LOGS: 'fa_logs',
};
