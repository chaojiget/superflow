import React, { useState } from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Wand2, 
  Send, 
  X, 
  User, 
  Bot,
  CheckCircle,
  Loader2,
  FileText
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

      {/* 聊天弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl w-[1000px] h-[700px] max-w-[95vw] max-h-[95vh] flex flex-col">
            {/* 标题栏 */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-blue-600" />
                <span className="text-lg font-semibold">节点蓝图生成器</span>
                <Badge variant="secondary">AI 助手</Badge>
                <Badge variant="secondary" className="text-green-600 ml-2">IDE 模式</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* IDE功能头部 */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">📋 文档预览</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {data.description || "AI节点将通过对话生成自定义处理节点"}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="font-medium text-sm">🧠 AI助手</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {messages.length > 0 ? "正在对话中..." : "等待开始对话"}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    {blueprint ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                    )}
                    <span className="font-medium text-sm">
                      {blueprint ? "✅ 蓝图已生成" : "🔄 蓝图生成中"}
                    </span>
                  </div>
                  {blueprint && (
                    <p className="text-xs text-gray-600">
                      {blueprint.name} ({blueprint.type})
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
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
                      <div className={`flex items-start gap-2 max-w-[70%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          msg.role === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </div>
                        <div className={`rounded-2xl px-4 py-2 ${
                          msg.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isGenerating && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="bg-gray-100 rounded-2xl px-4 py-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            正在生成节点蓝图...
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <Separator />

              <div className="p-4">
                <div className="flex gap-2">
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="描述你想要创建的节点功能..."
                    className="resize-none"
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
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    发送
                  </Button>
                </div>
                
                {requirementsFinal && !blueprint && (
                  <div className="mt-3 flex justify-center">
                    <Button
                      onClick={handleGenerateBlueprint}
                      disabled={isGenerating}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <Wand2 className="h-4 w-4" />
                      确认生成节点蓝图
                    </Button>
                  </div>
                )}
                
                {blueprint && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">蓝图生成完成</span>
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
                        className="gap-1"
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
      )}
    </>
  );
};

export default BlueprintNode;