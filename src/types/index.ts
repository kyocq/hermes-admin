// Hermes Admin — Real Data Types

export interface Session {
  id: string;
  title: string;
  source: string;
  user_id?: string;
  model?: string;
  started_at: string;
  ended_at?: string | null;
  message_count: number;
  tool_call_count: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  is_active: boolean;
  session_key?: string;
  platform?: string;
}

export interface SessionDetail extends Session {
  messages: HermesMessage[];
}

export interface HermesMessage {
  id: number;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: ToolCall[] | null;
  tool_name?: string;
  tool_call_id?: string;
  timestamp: string;
  token_count?: number;
  reasoning?: string;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
  result?: any;
  id?: string;
}

export interface SkillCategory {
  description: string;
  skills: Skill[];
}

export interface Skill {
  name: string;
  title: string;
  description: string;
  path: string;
  size: number;
}

export interface MemoryEntry {
  name: string;
  content: string;
  size: number;
  modified: string;
}

export interface CronJob {
  id: string;
  name?: string;
  schedule: string;
  prompt: string;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
}

export interface GatewayState {
  pid: number;
  gateway_state: string;
  platforms: Record<string, PlatformState>;
  active_agents: number;
  restart_requested: boolean;
}

export interface PlatformState {
  state: string;
  error_code?: string | null;
  error_message?: string | null;
}

export interface BackgroundProcess {
  session_id: string;
  command: string;
  pid: number;
  started_at: number;
  task_id?: string;
}

export interface HermesConfig {
  model: {
    default: string;
    provider: string;
  };
  display: {
    personality: string;
    compact: boolean;
    streaming: boolean;
  };
  agent: {
    max_turns: number;
    personalities: Record<string, string>;
  };
  memory: {
    memory_enabled: boolean;
    user_profile_enabled: boolean;
  };
  terminal: {
    backend: string;
    timeout: number;
  };
}

export interface Stats {
  total_sessions: number;
  total_messages: number;
  active_sessions: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  gateway_state: string;
  platforms: Record<string, PlatformState>;
  background_processes: number;
  cron_jobs: number;
  active_cron_jobs: number;
}

export interface ToolInfo {
  name: string;
  description: string;
  category: string;
}

// UI Types
export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  message_count: number;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tool_calls?: ToolCall[];
}

export interface Config {
  api_url?: string | null;
  api_key?: string | null;
  default_model?: string | null;
  language?: string | null;
  theme?: string | null;
  [key: string]: any;
}

export interface Task {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
}
