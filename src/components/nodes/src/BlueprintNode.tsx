import React, { useState } from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Wand2, 
  Send, 
  X, 
  User, 
  Bot,
  CheckCircle,
  Loader2,
  Code,
  Book,
  FileText,
  Play,
  Save
} from 'lucide-react';


export interface BlueprintNodeData {
  label: string;
  description?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  onGenerate?: (blueprint: string) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface NodeBlueprint {
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  type: 'transform' | 'source' | 'sink';
  language: 'python' | 'typescript';
}

const BlueprintNode: React.FC<NodeProps<BlueprintNodeData>> = ({ 
  data, 
  selected 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(data.isOpen || false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [blueprint, setBlueprint] = useState<NodeBlueprint | null>(null);
  const [requirementsFinal, setRequirementsFinal] = useState(false);
  const [activeTab, setActiveTab] = useState('docs');
  const [documentContent] = useState('# 节点文档\n\n这是一个自定义蓝图节点，可以通过AI对话生成节点逻辑。\n\n## 功能特性\n- 智能对话式需求收集\n- 自动生成节点蓝图\n- 支持多种编程语言\n- 可视化配置界面\n\n## 使用方法\n1. 点击节点打开编辑器\n2. 在聊天窗口描述需求\n3. AI助手会引导完善需求\n4. 确认后生成节点蓝图');
  const [codeContent, setCodeContent] = useState(`# 示例：数据处理节点

def process_data(input_data, config):
    """
    处理输入数据的主函数
    
    Args:
        input_data: 输入数据（DataFrame或字典）
        config: 配置参数
    
    Returns:
        processed_data: 处理后的数据
        metadata: 元数据信息
    """
    
    # 数据验证
    if input_data is None:
        raise ValueError("输入数据不能为空")
    
    # 应用配置
    processed_data = input_data.copy()
    
    # 处理逻辑（待实现）
    # TODO: 根据AI生成的蓝图实现具体逻辑
    
    metadata = {
        "processed_rows": len(processed_data),
        "timestamp": datetime.now().isoformat(),
        "config_applied": config
    }
    
    return processed_data, metadata
`);
  const [isCodeModified, setIsCodeModified] = useState(false);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    addMessage('user', inputText);
    setInputText('');
    
    // 模拟AI回复，澄清需求
    setTimeout(() => {
      const responses = [
        "我理解了，你想要创建一个数据处理节点。能具体说明一下输入数据的格式吗？",
        "好的，这个节点需要处理什么类型的业务逻辑？有特殊的性能要求吗？",
        "明白了，输出结果需要什么格式？还有其他依赖或限制条件吗？",
        "很好！基于我们的讨论，我已经收集到足够的信息来生成节点蓝图。"
      ];
      
      const responseIndex = Math.min(Math.floor(messages.length / 2), responses.length - 1);
      const response = responses[responseIndex];
      if (response) {
        addMessage('assistant', response);
      }
      
      // 在第4轮对话后，标记需求收集完成
      if (messages.length >= 6) {
        setRequirementsFinal(true);
      }
    }, 1000);
  };

  const handleGenerateBlueprint = async () => {
    setIsGenerating(true);
    
    // 模拟蓝图生成过程
    setTimeout(() => {
      const generatedBlueprint: NodeBlueprint = {
        name: "数据处理器",
        description: "基于用户需求生成的数据处理节点，支持自定义转换逻辑",
        inputs: ["input_data: DataFrame", "config: dict"],
        outputs: ["processed_data: DataFrame", "metadata: dict"],
        type: "transform",
        language: "python"
      };
      
      setBlueprint(generatedBlueprint);
      setIsGenerating(false);
      
      addMessage('assistant', 
        `已生成节点蓝图！\n\n**节点名称**: ${generatedBlueprint.name}\n**描述**: ${generatedBlueprint.description}\n**输入**: ${generatedBlueprint.inputs.join(', ')}\n**输出**: ${generatedBlueprint.outputs.join(', ')}\n**类型**: ${generatedBlueprint.type}\n**语言**: ${generatedBlueprint.language}`
      );
    }, 2000);
  };

  const handleConfirmGenerate = () => {
    if (blueprint && data.onGenerate) {
      data.onGenerate(JSON.stringify(blueprint));
    }
    setIsModalOpen(false);
    setMessages([]);
    setBlueprint(null);
    setRequirementsFinal(false);
  };

  const handleSaveCode = () => {
    // 这里可以添加保存到后端的逻辑
    setIsCodeModified(false);
    addMessage('assistant', '代码已保存！');
  };

  const handleRunCode = () => {
    // 这里可以添加执行代码的逻辑
    addMessage('assistant', '代码执行完成！输出结果将显示在运行面板中。');
  };

  const handleCodeChange = (value: string) => {
    setCodeContent(value);
    setIsCodeModified(true);
  };

  return (
    <>
      <div
        className={`blueprint-node bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-dashed border-blue-300 rounded-lg p-3 min-w-[160px] cursor-pointer transition-all hover:shadow-lg ${
          selected ? 'ring-2 ring-blue-500' : ''
        }`}
        onClick={() => setIsModalOpen(true)}
      >
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-blue-900">{data.label}</span>
        </div>
        <div className="text-xs text-blue-700">
          {data.description || '点击开始创建节点'}
        </div>
        <div className="mt-2 flex justify-center">
          <Badge variant="secondary" className="text-xs border-blue-300 text-blue-600">
            蓝图生成器
          </Badge>
        </div>
        
        <Handle type="source" position={Position.Right} />
      </div>

      {/* IDE弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-900/50 to-indigo-900/50 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-2xl w-[1600px] h-[900px] max-w-[95vw] max-h-[95vh] flex flex-col overflow-hidden">
            {/* 标题栏 - 玻璃拟态效果 */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-2">
                  <Code className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-lg font-semibold">节点开发环境</span>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs bg-slate-600 hover:bg-slate-500">
                      多功能 IDE
                    </Badge>
                    {activeTab === 'code' && isCodeModified && (
                      <Badge className="text-xs bg-orange-500 hover:bg-orange-400 animate-pulse">
                        未保存
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeTab === 'code' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveCode}
                      disabled={!isCodeModified}
                      className="gap-1 bg-green-500 hover:bg-green-600 border-green-600 text-white"
                      disabledClassName="bg-slate-500 border-slate-500 text-slate-300"
                    >
                      <Save className="h-3 w-3" />
                      保存
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRunCode}
                      className="gap-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0"
                    >
                      <Play className="h-3 w-3" />
                      运行
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-300 hover:text-white hover:bg-slate-600 rounded-full p-2"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* 主要内容区域：左侧AI聊天 + 右侧IDE */}
            <div className="flex-1 flex min-h-0">
              {/* 左侧：AI聊天面板 */}
              <div className="w-96 flex flex-col bg-gradient-to-b from-white to-slate-50 border-r border-slate-200">
                {/* 聊天标题 */}
                <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-2 shadow-md">
                      <MessageSquare className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">AI 助手</h3>
                      <p className="text-sm text-slate-600">与AI对话生成节点蓝图</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 mt-2">
                    🟢 在线
                  </Badge>
                </div>

                {/* 聊天消息区域 */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center py-8">
                        <div className="bg-gradient-to-brfrom-blue-50 to-indigo-50 rounded-2xl p-6 border border-slate-200 mb-4">
                          <Bot className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                          <p className="text-slate-800 font-medium mb-3 text-lg">
                            👋 你好！我是节点蓝图生成助手
                          </p>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            请描述你想要创建的节点功能，我会帮你澄清需求并生成详细的节点蓝图
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {messages.map((msg, index) => (
                      <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${index === 0 ? 'mt-2' : ''}`}>
                        <div className={`flex items-end gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                            msg.role === 'user' 
                              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg' 
                              : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 border border-slate-300'
                          }`}>
                            {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                          </div>
                          <div className={`rounded-xl px-4 py-3 transition-all duration-300 ${
                            msg.role === 'user'
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                              : 'bg-white text-slate-800 border border-slate-200 shadow-md'
                          }`}>
                            <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                            {msg.role !== 'user' && (
                              <div className="text-xs text-slate-400 mt-1 opacity-70">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isGenerating && (
                      <div className="flex gap-3 justify-start">
                        <div className="flex items-end gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 border border-slate-300 flex items-center justify-center">
                            <Bot className="h-4 w-4" />
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-md">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              正在思考并生成节点蓝图...
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* 聊天输入和生成区域 */}
                <div className="p-4 border-t border-slate-200 bg-gradient-to-b from-white to-slate-50">
                  <div className="flex gap-3 mb-3">
                    <Textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="🚀 描述你想要创建的节点功能..."
                      className="resize-none text-sm bg-white border-slate-200 focus:border-blue-300 focus:ring focus:ring-blue-100 transition-all duration-200 rounded-lg"
                      rows={3}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputText.trim()}
                      size="default"
                      className="gap-1 self-end bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-200"
                    >
                      <Send className="h-3 w-3" />
                      发送
                    </Button>
                  </div>
                  
                  {requirementsFinal && !blueprint && (
                    <div className="mb-3">
                      <Button
                        onClick={handleGenerateBlueprint}
                        disabled={isGenerating}
                        size="sm"
                        className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg shadow-md w-full justify-center transition-all duration-200"
                      >
                        <Wand2 className="h-3 w-3" />
                        ✨ 确认生成节点蓝图
                      </Button>
                    </div>
                  )}
                  
                  {blueprint && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800 text-base">🎉 蓝图生成完成！</span>
                      </div>
                      <div className="bg-white p-3 rounded-lg mb-3 shadow-sm">
                        <h4 className="font-medium text-slate-800 mb-2">蓝图细节:</h4>
                        <div className="space-y-2 text-sm text-slate-600">
                          <div className="flex justify-between">
                            <span className="text-slate-500">节点名称:</span>
                            <span className="font-medium">{blueprint.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">类型:</span>
                            <span className="font-medium capitalize">{blueprint.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">语言:</span>
                            <span className="font-medium">{blueprint.language}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleConfirmGenerate}
                          className="gap-1 bg-green-500 hover:bg-green-600 text-white rounded-lg flex-1 transition-all duration-200"
                        >
                          <CheckCircle className="h-3 w-3" />
                          确认生成节点
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setBlueprint(null);
                            setRequirementsFinal(false);
                          }}
                          className="text-slate-600 hover:text-slate-800 rounded-lg flex-1 border-slate-300 transition-all duration-200"
                        >
                          🔧 重新设计
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 右侧：文档和代码编辑器标签页 */}
              <div className="flex-1 flex flex-col bg-gradient-to-b from-white to-slate-50">
                <Tabs defaultValue="code" onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6">
                    <div className="flex justify-between items-center">
                      <TabsList className="grid w-full grid-cols-2 max-w-md">
                        <TabsTrigger value="docs" className="gap-2 text-sm font-medium transition-all duration-200 border-b-2">
                          <FileText className="h-4 w-4" />
                          📋 文档
                        </TabsTrigger>
                        <TabsTrigger value="code" className="gap-2 text-sm font-medium transition-all duration-200 border-b-2">
                          <Code className="h-4 w-4" />
                          💻 代码
                        </TabsTrigger>
                      </TabsList>
                    </div>
                  </div>

                  {/* 标签页内容 */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <TabsContent value="docs" className="flex-1 mt-0">
                      <div className="h-full p-6">
                        <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border">
                          <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-2 shadow-md">
                              <Book className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-slate-800">节点文档</h3>
                              <p className="text-sm text-slate-600">查看节点功能和参数说明</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs bg-slate-200 text-slate-700">
                            📖 只读模式
                          </Badge>
                        </div>
                        <ScrollArea className="h-[calc(100%-6rem)] bg-white rounded-xl border border-slate-200 shadow-sm">
                          <div className="p-6">
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg border border-slate-200">
                              <div className="prose prose-slate max-w-none">
                                <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-700">
                                  {documentContent}
                                </div>
                              </div>
                            </div>
                          </div>
                        </ScrollArea>
                      </div>
                    </TabsContent>

                    <TabsContent value="code" className="flex-1 mt-0">
                      <div className="h-full p-6">
                        <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border">
                          <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-2 shadow-md">
                              <Code className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-slate-800">代码编辑器</h3>
                              <p className="text-sm text-slate-600">编写和完善节点逻辑</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="text-xs bg-slate-200 text-slate-700">
                              🐍 Python
                            </Badge>
                            <div className="text-xs text-slate-600 flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${isCodeModified ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                              {isCodeModified ? '• 待保存' : '• 已保存'}
                            </div>
                          </div>
                        </div>
                        <div className="h-[calc(100%-6rem)] bg-slate-900 rounded-xl overflow-hidden shadow-lg">
                          {/* 代码编辑器工具栏 */}
                          <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                            <div className="flex items-center gap-2">
                              <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              </div>
                              <span className="text-xs text-slate-400 ml-2">node_script.py</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">UTF-8</span>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-slate-400">Python</span>
                            </div>
                          </div>
                          <div className="h-[calc(100%-2rem)]">
                            <Textarea
                              value={codeContent}
                              onChange={(e) => handleCodeChange(e.target.value)}
                              className="h-full w-full resize-none bg-slate-900 text-slate-100 border-0 font-mono text-sm leading-relaxed p-4 focus-visible:ring-0 focus-visible:ring-offset-0"
                              placeholder="# 在这里编写你的节点代码..."
                              spellCheck={false}
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              {/* 右侧：AI聊天面板 */}
              <div className="w-96 flex flex-col bg-gray-50">
                {/* 聊天标题 */}
                <div className="p-4 border-b bg-white">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">AI 助手</span>
                    <Badge variant="secondary">在线</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    与AI对话生成节点蓝图
                  </p>
                </div>

                {/* 聊天消息区域 */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center py-8">
                        <Bot className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                        <p className="text-gray-600 mb-2">
                          👋 你好！我是节点蓝图生成助手
                        </p>
                        <p className="text-sm text-gray-500">
                          请描述你想要创建的节点功能，我会帮你澄清需求并生成详细的节点蓝图
                        </p>
                      </div>
                    )}
                    
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-start gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            msg.role === 'user' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {msg.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                          </div>
                          <div className={`rounded-xl px-3 py-2 ${
                            msg.role === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-900 border'
                          }`}>
                            <div className="text-xs whitespace-pre-wrap">{msg.content}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isGenerating && (
                      <div className="flex gap-3 justify-start">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                            <Bot className="h-3 w-3" />
                          </div>
                          <div className="bg-white border rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              正在生成节点蓝图...
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* 聊天输入区域 */}
                <div className="p-4 bg-white border-t">
                  <div className="flex gap-2">
                    <Textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="描述你想要创建的节点功能..."
                      className="resize-none text-sm"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputText.trim()}
                      size="sm"
                      className="gap-1 self-end"
                    >
                      <Send className="h-3 w-3" />
                      发送
                    </Button>
                  </div>
                  
                  {requirementsFinal && !blueprint && (
                    <div className="mt-3 flex justify-center">
                      <Button
                        onClick={handleGenerateBlueprint}
                        disabled={isGenerating}
                        size="sm"
                        className="gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <Wand2 className="h-3 w-3" />
                        确认生成节点蓝图
                      </Button>
                    </div>
                  )}
                  
                  {blueprint && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="font-medium text-green-800 text-sm">蓝图生成完成</span>
                      </div>
                      <div className="text-xs text-green-700 space-y-1">
                        <div><strong>节点:</strong> {blueprint.name}</div>
                        <div><strong>类型:</strong> {blueprint.type}</div>
                        <div><strong>语言:</strong> {blueprint.language}</div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleConfirmGenerate}
                          className="gap-1 text-xs"
                        >
                          <CheckCircle className="h-3 w-3" />
                          确认并生成节点
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setBlueprint(null);
                            setRequirementsFinal(false);
                          }}
                          className="text-xs"
                        >
                          重新设计
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BlueprintNode;