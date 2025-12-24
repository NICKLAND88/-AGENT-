
export enum AgentCategory {
  ANALYSIS = '分析型',
  EXECUTION = '执行型',
  VERIFICATION = '验证型'
}

export enum StepStatus {
  WAITING = 'WAITING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED'
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  instruction: string;
  category: AgentCategory;
  priority: number; // 1-5
  dependencies: string[]; // Agent IDs
  isPinned?: boolean;
}

export interface TaskStep {
  id: string;
  agentId: string;
  status: StepStatus;
  output?: string;
  error?: string;
}

export interface WorkflowTask {
  id: string;
  title: string;
  description: string;
  steps: TaskStep[];
  createdAt: number;
  status: StepStatus;
  tags: string[];
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  apiBaseUrl: string;
  apiTimeout: number;
  maxHistory: number;
  autoFoldHistory: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  action: string;
  detail: string;
}
