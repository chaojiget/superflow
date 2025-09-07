import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Share2, Link2, UploadCloud } from 'lucide-react';
import WorkflowStudio from './WorkflowStudio';
import StudioPage from './studio/StudioPage';
import { IdeasPageComponent } from './ideas/src/IdeasPage';
import { RunCenterPage } from './run-center/RunCenterPage';

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


  return (
    <div className="h-screen w-full">
      <Tabs defaultValue="studio" className="h-full flex flex-col">
        {/* 顶部导航栏 */}
        <div className="h-16 px-6 flex items-center justify-between border-b bg-white shadow-sm relative z-50">
          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold text-gray-900">Superflow 平台</span>
            <Badge variant="secondary" className="rounded-full">
              模拟
            </Badge>
          </div>
          
          {/* Tabs 导航 */}
          <div className="flex items-center">
            <TabsList className="flex gap-2 bg-gray-50 rounded-lg p-1">
              <TabsTrigger value="studio">工作流编排 Studio</TabsTrigger>
              <TabsTrigger value="ideas">想法转蓝图</TabsTrigger>
              <TabsTrigger value="run-center">运行中心</TabsTrigger>
              <TabsTrigger value="legacy-studio">旧版 Studio</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="gap-2">
              <Share2 className="h-4 w-4" />
              暴露为 API
            </Button>
            <Button variant="secondary" className="gap-2">
              <Link2 className="h-4 w-4" />
              注册为 MCP 工具
            </Button>
            <Button className="gap-2">
              <UploadCloud className="h-4 w-4" />
              发布此版本
            </Button>
          </div>
        </div>
        
        {/* Tab 内容区域 */}
        <div className="flex-1 min-h-0">
          <TabsContent value="studio" className="h-full m-0">
            <StudioPage />
          </TabsContent>
          
          <TabsContent value="ideas" className="h-full m-0 p-6">
            <IdeasPageComponent />
          </TabsContent>
          
          <TabsContent value="run-center" className="h-full m-0 p-6">
            <RunCenterPage logs={mockLogs} />
          </TabsContent>
          
          <TabsContent value="legacy-studio" className="h-full m-0">
            <WorkflowStudio />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default App;
