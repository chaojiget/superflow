import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Share2, Link2, UploadCloud, FolderOpen } from 'lucide-react';
import WorkflowStudio from './WorkflowStudio';
import StudioPage from './studio/StudioPage';
import { IdeasPageComponent } from './ideas/src/IdeasPage';
import { RunCenterPage } from './run-center/RunCenterPage';

// 工作流类型定义
interface Workflow {
  id: string;
  name: string;
  description: string;
  folder: string;
  status: string;
}

// 简化样式，避免过度装饰
const easyStyles = `
  .data-\[state\=active\]\:bg-gradient-to-r[data-state="active"], 
  [data-state="active"].data-\[state\=active\]\:bg-gradient-to-r {
    background-image: linear-gradient(to right, #3b82f6, #8b5cf6) !important;
  }
`;

if (!document.head.querySelector('#easy-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'easy-styles';
  styleSheet.textContent = easyStyles;
  document.head.appendChild(styleSheet);
}

// 添加响应式媒体查询
const responsiveStyles = `
  @media (max-width: 1024px) {
    .app-header {
      flex-direction: column !important;
      height: auto !important;
      padding: 12px 16px !important;
      gap: 8px !important;
    }
    
    .app-header > div {
      flex: none !important;
    }
    
    .app-header .flex.items-center.gap-2 {
      flex-wrap: wrap !important;
      gap: 6px !important;
    }
    
    .app-header button {
      font-size: 12px !important;
      padding: 6px 10px !important;
    }
    
    .app-header .text-xl {
      font-size: 16px !important;
    }
    
    .app-header .w-3.h-3 {
      width: 8px !important;
      height: 8px !important;
    }
    
    .tab-content-wrapper {
      padding: 8px !important;
    }
    
    .tab-content-card {
      border-radius: 12px !important;
      padding: 12px !important;
    }
  }
  
  @media (max-width: 768px) {
    .app-header {
      padding: 8px 12px !important;
      gap: 6px !important;
    }
    
    .app-header .flex.items-center.gap-4 {
      gap: 4px !important;
    }
    
    .app-header button {
      font-size: 11px !important;
      padding: 4px 8px !important;
      border-radius: 8px !important;
    }
    
    .app-header .text-xl {
      font-size: 14px !important;
    }
    
    .app-header .gap-2 {
      gap: 4px !important;
    }
  }
`;

if (!document.head.querySelector('#app-responsive-styles')) {
  const respStyleSheet = document.createElement('style');
  respStyleSheet.id = 'app-responsive-styles';
  respStyleSheet.textContent = responsiveStyles;
  document.head.appendChild(respStyleSheet);
}

const App: React.FC = () => {
  const [mockLogs] = useState([
    {
      id: '1',
      node: 'ingest',
      status: 'success' as const,
      message: '数据摄取完成',
      runId: 'run-001',
      traceId: 'trace-001'
    },
    {
      id: '2', 
      node: 'clean',
      status: 'running' as const,
      message: '数据清洗中...',
      runId: 'run-002',
      traceId: 'trace-002'
    }
  ]);

  // 工作流项目列表
  const [workflows] = useState<Workflow[]>([
    { 
      id: 'data-pipeline', 
      name: '数据管道', 
      description: '数据处理和机器学习工作流',
      folder: 'workflows/data-pipeline',
      status: 'active'
    },
    { 
      id: 'ai-training', 
      name: 'AI 训练', 
      description: '模型训练和评估流程',
      folder: 'workflows/ai-training',
      status: 'draft'
    },
    { 
      id: 'web-scraping', 
      name: '网络爬虫', 
      description: '数据采集和清洗工作流',
      folder: 'workflows/web-scraping',
      status: 'active'
    },
    { 
      id: 'image-processing', 
      name: '图像处理', 
      description: '批量图像处理管道',
      folder: 'workflows/image-processing',
      status: 'archived'
    }
  ]);

  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow>(() => {
    const defaultWorkflow = workflows.find(w => w.status === 'active') || workflows[0];
    if (!defaultWorkflow) {
      throw new Error('至少需要一个工作流');
    }
    return defaultWorkflow;
  });


  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Tabs defaultValue="studio" className="h-full flex flex-col w-full">
        {/* 顶部导航栏 - 简约响应式布局 */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between shadow-lg border-b bg-gradient-to-r from-white via-gray-50 to-blue-50 p-3 gap-2 min-h-[64px] relative z-50" style={{animationDuration: '0.6s'}}>
          {/* 左侧：Logo、徽章和工作流选择器 */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse flex-shrink-0"></div>
            <h1 className="text-xl font-bold text-gray-900">
              Superflow 平台
            </h1>
            <Badge variant="outline" className="text-xs border-gray-300 bg-white/70">
              模拟
            </Badge>
            
            {/* 工作流选择器 */}
            <div className="flex items-center gap-2 ml-4">
              <FolderOpen className="w-4 h-4 text-gray-600" />
              <Select 
                value={currentWorkflow.id} 
                onValueChange={(value) => {
                  const workflow = workflows.find(w => w.id === value);
                  if (workflow) {
                    setCurrentWorkflow(workflow);
                  }
                }}
              >
                <SelectTrigger className="w-48 text-sm bg-white/80 border-gray-200 hover:bg-white">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{currentWorkflow.name}</span>
                    <Badge 
                      variant={currentWorkflow.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {currentWorkflow.status === 'active' ? '活跃' : 
                       currentWorkflow.status === 'draft' ? '草稿' : '归档'}
                    </Badge>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {workflows.map((workflow) => (
                    <SelectItem key={workflow.id} value={workflow.id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col">
                          <span className="font-medium">{workflow.name}</span>
                          <span className="text-xs text-gray-500">{workflow.description}</span>
                        </div>
                        <Badge 
                          variant={workflow.status === 'active' ? 'default' : 'secondary'}
                          className="ml-2 text-xs"
                        >
                          {workflow.status === 'active' ? '活跃' : 
                           workflow.status === 'draft' ? '草稿' : '归档'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Tabs 导航 - 简单清晰 */}
          <div className="flex flex-wrap items-center gap-2">
            <TabsList className="flex flex-wrap gap-1 bg-white/50 backdrop-blur border border-white/20 rounded-lg p-1">
              {[
                { value: 'studio', icon: '🎨', label: '工作流' },
                { value: 'ideas', icon: '💡', label: '想法蓝图' },
                { value: 'run-center', icon: '⚡', label: '运行中心' },
                { value: 'legacy-studio', icon: '📋', label: '旧版' },
              ].map(({ value, icon, label }) => (
                <TabsTrigger 
                  key={value}
                  value={value}
                  className="px-2 py-1 lg:px-3 lg:py-2 rounded-md text-xs lg:text-sm font-medium transition-all duration-200 hover:bg-white/50 whitespace-nowrap
                    data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm
                    data-[state=inactive]:text-gray-700 data-[state=inactive]:bg-transparent"
                >
                  {icon}<span className="ml-1 hidden lg:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          
          {/* 右侧按钮组 - 修复版*/}
          <div className="flex flex-wrap items-center gap-2">
            {/* 工作流信息提示 */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-gray-600 bg-white/60 px-2 py-1 rounded-md border">
              <span>项目：</span>
              <code className="bg-gray-100 px-1 rounded text-xs">{currentWorkflow.folder}</code>
            </div>
            
            <Button size="sm" variant="secondary" className="gap-1.5 whitespace-nowrap border border-gray-200 hover:bg-gray-50 text-xs lg:text-sm">
              <Share2 className="w-3 h-3 lg:w-4 lg:h-4" />
              暴露为 API
            </Button>
            <Button size="sm" variant="secondary" className="gap-1.5 whitespace-nowrap border border-gray-200 hover:bg-gray-50 text-xs lg:text-sm">
              <Link2 className="w-3 h-3 lg:w-4 lg:h-4" />
              注册为 MCP 工具
            </Button>
            <Button size="sm" className="gap-1.5 whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white text-xs lg:text-sm">
              <UploadCloud className="w-3 h-3 lg:w-4 lg:h-4" />
              发布此版本
            </Button>
          </div>
        </div>
        
        {/* Tab 内容区域 - 修复过度装饰 */}
        <div className="flex-1 min-h-0 p-1 lg:p-2">
          <TabsContent value="studio" className="h-full m-0">
            <StudioPage currentWorkflow={currentWorkflow} />
          </TabsContent>
          <TabsContent value="ideas" className="h-full m-0 p-4">
            <div className="h-full flex flex-col">
              {/* 工作流上下文提示 */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <FolderOpen className="w-4 h-4" />
                  <span>当前工作流：<strong>{currentWorkflow.name}</strong></span>
                  <span className="text-blue-600">({currentWorkflow.folder})</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">{currentWorkflow.description}</p>
              </div>
              <div className="flex-1">
                <IdeasPageComponent />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="run-center" className="h-full m-0 p-4">
            <div className="h-full flex flex-col">
              {/* 工作流上下文提示 */}
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-green-800">
                  <FolderOpen className="w-4 h-4" />
                  <span>运行中心 - {currentWorkflow.name}</span>
                  <Badge variant="secondary" className="text-xs border-green-300">
                    {currentWorkflow.status === 'active' ? '活跃' : 
                     currentWorkflow.status === 'draft' ? '草稿' : '归档'}
                  </Badge>
                </div>
              </div>
              <div className="flex-1">
                <RunCenterPage logs={mockLogs} />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="legacy-studio" className="h-full m-0">
            <div className="h-full flex flex-col">
              {/* 工作流上下文提示 */}
              <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg mx-4 mt-4">
                <div className="flex items-center gap-2 text-sm text-purple-800">
                  <FolderOpen className="w-4 h-4" />
                  <span>旧版Studio - {currentWorkflow.name}</span>
                  <Badge variant="outline" className="text-xs border-purple-300">
                    {currentWorkflow.status === 'active' ? '活跃' : 
                     currentWorkflow.status === 'draft' ? '草稿' : '归档'}
                  </Badge>
                </div>
                <p className="text-xs text-purple-600 mt-1">{currentWorkflow.description}</p>
              </div>
              <div className="flex-1">
                <WorkflowStudio currentWorkflow={currentWorkflow} />
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default App;
