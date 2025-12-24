
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Settings, 
  Users, 
  Database, 
  Play, 
  History, 
  Trash2, 
  Plus, 
  Copy, 
  ChevronRight, 
  ChevronDown, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Save, 
  Download, 
  Upload,
  Moon,
  Sun,
  Monitor,
  Search,
  Pause,
  RotateCcw
} from 'lucide-react';
import { 
  Agent, 
  AgentCategory, 
  StepStatus, 
  WorkflowTask, 
  TaskStep, 
  AppSettings, 
  LogEntry 
} from './types';
import { 
  DEFAULT_AGENTS, 
  INITIAL_SETTINGS, 
  STORAGE_KEYS 
} from './constants';
import { runAgentExecution } from './geminiService';

// --- Components ---

const PanelHeader: React.FC<{ title: string; icon: React.ReactNode; children?: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
    <div className="flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <h2 className="font-bold text-sm tracking-wide uppercase">{title}</h2>
    </div>
    <div className="flex items-center gap-2">
      {children}
    </div>
  </div>
);

const Badge: React.FC<{ status: StepStatus }> = ({ status }) => {
  const styles = {
    [StepStatus.WAITING]: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
    [StepStatus.RUNNING]: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 node-flash",
    [StepStatus.COMPLETED]: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    [StepStatus.FAILED]: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    [StepStatus.PAUSED]: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  };
  const labels = {
    [StepStatus.WAITING]: "等待中",
    [StepStatus.RUNNING]: "执行中",
    [StepStatus.COMPLETED]: "已完成",
    [StepStatus.FAILED]: "失败",
    [StepStatus.PAUSED]: "暂停",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

// --- Main App ---

const App: React.FC = () => {
  // State
  const [agents, setAgents] = useState<Agent[]>([]);
  const [history, setHistory] = useState<WorkflowTask[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'input' | 'output' | 'history'>('input');
  const [leftWidth, setLeftWidth] = useState(400);
  const [rightWidth, setRightWidth] = useState(300);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  
  // Execution State
  const [currentTask, setCurrentTask] = useState<WorkflowTask | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const executionRef = useRef<boolean>(false);

  // Initialize Data
  useEffect(() => {
    const savedAgents = localStorage.getItem(STORAGE_KEYS.AGENTS);
    const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const savedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);

    if (savedAgents) setAgents(JSON.parse(savedAgents));
    else setAgents(DEFAULT_AGENTS);

    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    if (savedLogs) setLogs(JSON.parse(savedLogs));
    
    // Theme setup
    const theme = (JSON.parse(savedSettings || '{}').theme) || 'system';
    applyTheme(theme);
  }, []);

  // Save Data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
  }, [agents]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }, [history]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    applyTheme(settings.theme);
  }, [settings]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  }, [logs]);

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const root = window.document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const addLog = (action: string, detail: string) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      action,
      detail
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  // Agent Handlers
  const saveAgent = (agent: Agent) => {
    if (agents.find(a => a.id === agent.id)) {
      setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
      addLog('更新Agent', `Agent: ${agent.name}`);
    } else {
      setAgents(prev => [...prev, agent]);
      addLog('创建Agent', `Agent: ${agent.name}`);
    }
    setIsAgentModalOpen(false);
    setEditingAgent(null);
  };

  const deleteAgent = (id: string) => {
    setAgents(prev => prev.filter(a => a.id !== id));
    addLog('删除Agent', `ID: ${id}`);
  };

  const copyAgent = (agent: Agent) => {
    const newAgent = { ...agent, id: Date.now().toString(), name: `${agent.name} (副本)` };
    setAgents(prev => [...prev, newAgent]);
    addLog('复制Agent', `从: ${agent.name}`);
  };

  // Workflow Handlers
  const startTask = async () => {
    if (selectedAgentIds.length === 0 || !taskDescription) {
      alert("请选择至少一个Agent并输入任务描述");
      return;
    }

    const newSteps: TaskStep[] = selectedAgentIds.map(id => ({
      id: Math.random().toString(36).substr(2, 9),
      agentId: id,
      status: StepStatus.WAITING,
    }));

    const newTask: WorkflowTask = {
      id: Date.now().toString(),
      title: taskTitle || `新任务 ${new Date().toLocaleTimeString()}`,
      description: taskDescription,
      steps: newSteps,
      createdAt: Date.now(),
      status: StepStatus.RUNNING,
      tags: [],
    };

    setCurrentTask(newTask);
    setIsExecuting(true);
    executionRef.current = true;
    addLog('启动任务', newTask.title);

    // Execute steps sequentially
    let context = "";
    const updatedSteps = [...newSteps];

    for (let i = 0; i < updatedSteps.length; i++) {
      if (!executionRef.current) break;

      const step = updatedSteps[i];
      const agent = agents.find(a => a.id === step.agentId);
      
      if (!agent) continue;

      // Update UI to running
      updatedSteps[i] = { ...step, status: StepStatus.RUNNING };
      setCurrentTask(prev => prev ? { ...prev, steps: [...updatedSteps] } : null);

      try {
        const result = await runAgentExecution(
          'gemini-3-flash-preview', 
          agent.instruction, 
          taskDescription, 
          context
        );
        
        context += `\n\n[${agent.name}输出]:\n${result}`;
        updatedSteps[i] = { ...updatedSteps[i], status: StepStatus.COMPLETED, output: result };
      } catch (err: any) {
        updatedSteps[i] = { ...updatedSteps[i], status: StepStatus.FAILED, error: err.message };
        break; // Stop on failure
      }

      setCurrentTask(prev => prev ? { ...prev, steps: [...updatedSteps] } : null);
    }

    const finalStatus = updatedSteps.every(s => s.status === StepStatus.COMPLETED) 
      ? StepStatus.COMPLETED 
      : StepStatus.FAILED;

    const finishedTask = { ...newTask, steps: updatedSteps, status: finalStatus };
    setHistory(prev => [finishedTask, ...prev].slice(0, settings.maxHistory));
    setIsExecuting(false);
    executionRef.current = false;
  };

  const stopExecution = () => {
    executionRef.current = false;
    setIsExecuting(false);
    addLog('终止任务', '用户手动中断');
  };

  const clearHistory = () => {
    if (confirm("确定清空所有历史记录吗？")) {
      setHistory([]);
      addLog('清理数据', '历史记录已清空');
    }
  };

  const exportData = () => {
    const data = { agents, history, settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent_platform_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    addLog('导出数据', '完成系统备份');
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.agents) setAgents(data.agents);
        if (data.history) setHistory(data.history);
        if (data.settings) setSettings(data.settings);
        addLog('导入数据', '配置已恢复');
        alert("导入成功");
      } catch (err) {
        alert("导入失败，格式错误");
      }
    };
    reader.readAsText(file);
  };

  // Drag Handlers
  const startResize = (direction: 'left' | 'right') => (e: React.MouseEvent) => {
    const startX = e.clientX;
    const startLeft = leftWidth;
    const startRight = rightWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (direction === 'left') {
        const delta = moveEvent.clientX - startX;
        setLeftWidth(Math.max(250, Math.min(600, startLeft + delta)));
      } else {
        const delta = startX - moveEvent.clientX;
        setRightWidth(Math.max(200, Math.min(500, startRight + delta)));
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden text-sm ${settings.fontSize === 'small' ? 'text-xs' : settings.fontSize === 'large' ? 'text-base' : 'text-sm'}`}>
      {/* Top Header */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-900 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Users size={18} />
          </div>
          <h1 className="font-bold text-lg tracking-tight">多AGENT协作平台 <span className="text-[10px] font-normal opacity-50 ml-1 italic">v1.2 PRD-Optimized</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="设置"
          >
            <Settings size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <button 
            onClick={() => setSettings(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }))}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {settings.theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-slate-600" />}
          </button>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
          <button 
            onClick={exportData}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
          >
            <Database size={16} />
            <span className="hidden sm:inline font-medium">数据管理</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left: Input & Agent Config (30%) */}
        <div 
          style={{ width: `${leftWidth}px` }}
          className="flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 transition-[width] duration-75"
        >
          <PanelHeader title="任务配置" icon={<Plus size={16} />}>
             <button 
              onClick={() => { setEditingAgent(null); setIsAgentModalOpen(true); }}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
            >
              <Plus size={14} /> 新增Agent
            </button>
          </PanelHeader>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
            {/* Task Title & Desc */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">任务名称</label>
                <input 
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="给您的协同任务起个名字..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">需求描述</label>
                <textarea 
                  value={taskDescription}
                  onChange={e => setTaskDescription(e.target.value)}
                  placeholder="详细描述您希望智能体协作完成的任务内容..."
                  className="w-full h-32 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
                />
              </div>
            </div>

            {/* Agent Selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex justify-between items-center">
                <span>智能体编排 ({selectedAgentIds.length})</span>
                <span className="text-[10px] font-normal opacity-60">点击选择顺序</span>
              </label>
              <div className="space-y-2">
                {agents.map(agent => (
                  <div 
                    key={agent.id}
                    className={`group p-3 border rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                      selectedAgentIds.includes(agent.id) 
                        ? 'border-primary bg-primary/5 shadow-inner' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                    onClick={() => {
                      if (selectedAgentIds.includes(agent.id)) {
                        setSelectedAgentIds(prev => prev.filter(id => id !== agent.id));
                      } else {
                        setSelectedAgentIds(prev => [...prev, agent.id]);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        selectedAgentIds.includes(agent.id) ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        {selectedAgentIds.indexOf(agent.id) !== -1 ? selectedAgentIds.indexOf(agent.id) + 1 : <Users size={16} />}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-700 dark:text-slate-200">{agent.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span className="capitalize">{agent.role}</span> • {agent.category}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingAgent(agent); setIsAgentModalOpen(true); }}
                        className="p-1 hover:text-primary"
                      ><Settings size={14} /></button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); copyAgent(agent); }}
                        className="p-1 hover:text-primary"
                      ><Copy size={14} /></button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteAgent(agent.id); }}
                        className="p-1 hover:text-red-500"
                      ><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <button 
              onClick={isExecuting ? stopExecution : startTask}
              disabled={selectedAgentIds.length === 0 || !taskDescription}
              className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg ${
                isExecuting 
                ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                : 'bg-primary hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-primary/20'
              }`}
            >
              {isExecuting ? <><Pause size={20} fill="currentColor" /> 中断任务</> : <><Play size={20} fill="currentColor" /> 开始协作</>}
            </button>
          </div>
        </div>

        {/* Resizer */}
        <div 
          className="w-1 cursor-col-resize hover:bg-primary transition-colors bg-transparent z-20 shrink-0"
          onMouseDown={startResize('left')}
        />

        {/* Middle: Visualization & Output (50%) */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 overflow-hidden min-w-[300px]">
          <PanelHeader title="执行面板" icon={<Play size={16} />}>
            {currentTask && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${(currentTask.steps.filter(s => s.status === StepStatus.COMPLETED).length / currentTask.steps.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {Math.round((currentTask.steps.filter(s => s.status === StepStatus.COMPLETED).length / currentTask.steps.length) * 100)}%
                  </span>
                </div>
                <Badge status={currentTask.status} />
              </div>
            )}
          </PanelHeader>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-[size:24px_24px]">
            {!currentTask ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center">
                  <Play size={32} strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-600 dark:text-slate-300">暂无运行中任务</p>
                  <p className="text-sm">在左侧配置任务并启动工作流</p>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-8 py-10 relative">
                {currentTask.steps.map((step, idx) => {
                  const agent = agents.find(a => a.id === step.agentId);
                  return (
                    <div key={step.id} className="relative z-10">
                      <div className={`p-6 bg-white dark:bg-slate-900 border rounded-2xl shadow-xl transition-all duration-300 ${
                        step.status === StepStatus.RUNNING ? 'border-primary ring-4 ring-primary/10' : 'border-slate-200 dark:border-slate-800'
                      }`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-bold border border-slate-200 dark:border-slate-700">
                              {idx + 1}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-800 dark:text-slate-100">{agent?.name}</h3>
                              <p className="text-xs text-slate-400">{agent?.role}</p>
                            </div>
                          </div>
                          <Badge status={step.status} />
                        </div>
                        
                        {step.status === StepStatus.RUNNING && (
                          <div className="flex items-center gap-3 py-4 text-primary italic text-sm">
                            <Loader2 className="animate-spin" size={16} />
                            智能体正在思考中...
                          </div>
                        )}

                        {step.output && (
                          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">输出结果</span>
                              <button 
                                onClick={() => navigator.clipboard.writeText(step.output || '')}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                <Copy size={12} /> 复制
                              </button>
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                              {step.output}
                            </div>
                          </div>
                        )}

                        {step.error && (
                          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <div>{step.error}</div>
                          </div>
                        )}
                      </div>

                      {idx < currentTask.steps.length - 1 && (
                        <div className="absolute left-11 top-full h-8 w-0.5 bg-slate-200 dark:bg-slate-800 -z-0"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Resizer */}
        <div 
          className="w-1 cursor-col-resize hover:bg-primary transition-colors bg-transparent z-20 shrink-0"
          onMouseDown={startResize('right')}
        />

        {/* Right: History (20%) */}
        <aside 
          style={{ width: `${rightWidth}px` }}
          className="flex flex-col border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 overflow-hidden"
        >
          <PanelHeader title="历史记录" icon={<History size={16} />}>
            <button 
              onClick={clearHistory}
              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 rounded"
              title="清空历史"
            >
              <Trash2 size={16} />
            </button>
          </PanelHeader>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 italic text-xs">
                暂无历史记录
              </div>
            ) : (
              history.map(item => (
                <div 
                  key={item.id}
                  className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary transition-colors cursor-pointer group"
                  onClick={() => {
                    setCurrentTask(item);
                    setTaskTitle(item.title);
                    setTaskDescription(item.description);
                    setSelectedAgentIds(item.steps.map(s => s.agentId));
                  }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-xs truncate max-w-[150px]">{item.title}</h4>
                    <span className="text-[9px] text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    <Badge status={item.status} />
                    <span className="text-[9px] text-slate-400">• {item.steps.length} 个步骤</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="mt-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-[10px] text-primary flex items-center gap-0.5">
                      <RotateCcw size={10} /> 任务复现
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistory(prev => prev.filter(h => h.id !== item.id));
                      }}
                      className="text-[10px] text-red-400 hover:text-red-600"
                    >删除</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Logs Section (Mini) */}
          <div className="h-32 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">操作日志</span>
              <span className="text-[9px] text-slate-300">保留最新100条</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar text-[9px] font-mono space-y-1">
              {logs.map(log => (
                <div key={log.id} className="flex gap-2 text-slate-500 dark:text-slate-400">
                  <span className="opacity-40">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                  <span className="text-primary font-bold">{log.action}:</span>
                  <span className="truncate">{log.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Agent Creation/Edit Modal */}
      {isAgentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="text-primary" /> {editingAgent ? '编辑智能体' : '新建智能体'}
              </h2>
              <button onClick={() => setIsAgentModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">智能体名称</label>
                  <input 
                    defaultValue={editingAgent?.name} 
                    id="agentName"
                    placeholder="例如: 技术架构师"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">分类</label>
                  <select 
                    id="agentCategory"
                    defaultValue={editingAgent?.category || AgentCategory.EXECUTION}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  >
                    {Object.values(AgentCategory).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">角色/职能</label>
                <input 
                  defaultValue={editingAgent?.role} 
                  id="agentRole"
                  placeholder="例如: 负责微服务架构设计与技术选型"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">系统提示词 (Instruction)</label>
                <textarea 
                  defaultValue={editingAgent?.instruction} 
                  id="agentInstruction"
                  placeholder="告诉智能体它应该如何思考和行动..."
                  className="w-full h-32 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none"
                />
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex-1 space-y-2">
                   <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">执行优先级 (1-5)</label>
                   <input 
                    type="range" min="1" max="5" 
                    id="agentPriority"
                    defaultValue={editingAgent?.priority || 3}
                    className="w-full accent-primary"
                  />
                </div>
                <div className="text-xl font-bold text-primary w-8 text-center pt-4">
                  {editingAgent?.priority || 3}
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsAgentModalOpen(false)}
                className="px-5 py-2 text-slate-500 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >取消</button>
              <button 
                onClick={() => {
                  const name = (document.getElementById('agentName') as HTMLInputElement).value;
                  const role = (document.getElementById('agentRole') as HTMLInputElement).value;
                  const instruction = (document.getElementById('agentInstruction') as HTMLTextAreaElement).value;
                  const category = (document.getElementById('agentCategory') as HTMLSelectElement).value as AgentCategory;
                  const priority = parseInt((document.getElementById('agentPriority') as HTMLInputElement).value);
                  
                  if (!name || !instruction) return alert("名称和提示词必填");

                  saveAgent({
                    id: editingAgent?.id || Date.now().toString(),
                    name,
                    role,
                    instruction,
                    category,
                    priority,
                    dependencies: editingAgent?.dependencies || [],
                  });
                }}
                className="px-8 py-2 bg-primary text-white font-bold rounded-xl hover:bg-blue-600 shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
              >
                <Save size={18} /> 保存配置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Settings className="text-primary" /> 系统设置
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <section className="space-y-4">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">通用外观</h3>
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl">
                  <span className="font-medium">颜色主题</span>
                  <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
                    <button 
                      onClick={() => setSettings(s => ({ ...s, theme: 'light' }))}
                      className={`p-2 rounded-lg ${settings.theme === 'light' ? 'bg-white shadow text-primary' : 'text-slate-500'}`}
                    ><Sun size={16} /></button>
                    <button 
                      onClick={() => setSettings(s => ({ ...s, theme: 'system' }))}
                      className={`p-2 rounded-lg ${settings.theme === 'system' ? 'bg-white shadow text-primary' : 'text-slate-500'}`}
                    ><Monitor size={16} /></button>
                    <button 
                      onClick={() => setSettings(s => ({ ...s, theme: 'dark' }))}
                      className={`p-2 rounded-lg ${settings.theme === 'dark' ? 'bg-white shadow text-primary' : 'text-slate-500'}`}
                    ><Moon size={16} /></button>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl">
                  <span className="font-medium">字体大小</span>
                  <select 
                    value={settings.fontSize}
                    onChange={(e) => setSettings(s => ({ ...s, fontSize: e.target.value as any }))}
                    className="bg-transparent border-none outline-none font-bold text-primary text-right"
                  >
                    <option value="small">小</option>
                    <option value="medium">中</option>
                    <option value="large">大</option>
                  </select>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">数据管理</h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center justify-center gap-2 py-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors font-bold text-sm">
                    <Upload size={16} /> 导入配置
                    <input type="file" onChange={importData} className="hidden" />
                  </label>
                  <button 
                    onClick={exportData}
                    className="flex items-center justify-center gap-2 py-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-bold text-sm"
                  >
                    <Download size={16} /> 导出配置
                  </button>
                </div>
                <button 
                  onClick={() => {
                    if (confirm("彻底清空所有配置和历史数据吗？")) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="w-full py-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold rounded-xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> 重置所有应用数据
                </button>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
