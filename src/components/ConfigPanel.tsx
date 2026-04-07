import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Sparkles, Bot, Settings, X, Save, FolderOpen, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTableStore } from '../store/tableStore';
import { generateTableDesign } from '../services/zhipuApi';
import { mockGenerateTableDesign } from '../services/mockApi';
import { SaveDesignDialog } from './SaveDesignDialog';
import { SavedDesignsDrawer } from './SavedDesignsDrawer';
import { SharePosterDialog } from './SharePosterDialog';

// 聊天消息类型
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function ChatMessageBubble({ message, timestamp }: { message: ChatMessage; timestamp: string }) {
  const [showParams, setShowParams] = useState(false);
  
  const paramRegex = /\[\s*参数更新\s*:[\s\S]*?\]/g;
  const paramMatches = message.content.match(paramRegex);
  const mainText = message.content.replace(paramRegex, '').trim();

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {message.role === 'assistant' && (
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
          <Bot size={16} className="text-[color:var(--primary-color)]" />
        </div>
      )}

      <div className={`relative max-w-[85%] group`}>
        <div
          className={`p-3.5 rounded-2xl ${message.role === 'user'
              ? 'bg-[color:var(--primary-color)] text-white rounded-tr-sm shadow-sm'
              : 'bg-gray-100 text-gray-800 rounded-tl-sm'
            }`}
        >
          {mainText && <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{mainText}</div>}
          
          {paramMatches && paramMatches.length > 0 && (
            <div className={`mt-2 ${mainText && message.role === 'assistant' ? 'border-t border-gray-200 pt-2' : ''} ${mainText && message.role === 'user' ? 'border-t border-white/20 pt-2' : ''}`}>
               <button 
                 onClick={() => setShowParams(!showParams)}
                 className={`flex items-center gap-1 text-xs font-medium transition-colors ${message.role === 'user' ? 'text-white/80 hover:text-white' : 'text-[color:var(--primary-color)] hover:opacity-80'}`}
               >
                 <Settings size={14} />
                 <span>系统参数更新</span>
                 {showParams ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
               </button>
               {showParams && (
                 <div className={`mt-2 text-xs font-mono p-2 rounded whitespace-pre-wrap break-all ${message.role === 'user' ? 'bg-black/10' : 'bg-white/60'}`}>
                   {paramMatches.join('\\n')}
                 </div>
               )}
            </div>
          )}
        </div>
        <div
          className={`text-xs text-gray-400 mt-1 opacity-100 transition-opacity ${message.role === 'user' ? 'text-right mr-1' : 'ml-1'
            }`}
        >
          {timestamp}
        </div>
      </div>
    </div>
  );
}

export function ConfigPanel() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMockApi, setUseMockApi] = useState(false); // 控制是否使用模拟API
  const { parameters, updateParameter, calculatePrice } = useTableStore();

  // 聊天历史记录
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  // 控制参数面板展开/折叠 - 默认折叠
  const [isParametersPanelOpen, setIsParametersPanelOpen] = useState(false);
  // 控制活动的参数 Tab
  const [activeTab, setActiveTab] = useState<'dimensions' | 'materials'>('dimensions');

  // 获取灵感相关状态
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [usedPrompts, setUsedPrompts] = useState<Set<string>>(new Set());

  // 保存设计相关状态
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isDesignsDrawerOpen, setIsDesignsDrawerOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // 分享弹窗状态
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  // 聊天历史区域引用，用于自动滚动
  const chatHistoryRef = useRef<HTMLDivElement>(null);



  // 从store中获取圆角参数值
  const roundedCorners = useTableStore(state => state.parameters.roundedCorners);

  // 单独更新圆角参数的函数
  const updateRoundedCorners = (value: number) => {
    updateParameter('roundedCorners', value);
  };

  // 解析AI回答并更新参数
  const parseAndUpdateParameters = (suggestion: string) => {
    try {
      // 单参数更新标记匹配 [参数更新: 参数名: 值]
      const singleParamRegex = /\[\s*参数更新\s*:\s*([^:]+)\s*:\s*([^\]\s,]+)\s*\]/g;

      // 多参数更新标记匹配 [参数更新: 参数1: 值1, 参数2: 值2, ...]
      const multiParamRegex = /\[\s*参数更新\s*:(.*?)\]/;
      let paramFound = false;

      // 先尝试匹配单参数更新格式
      let match;
      while ((match = singleParamRegex.exec(suggestion)) !== null) {
        paramFound = true;
        const paramName = match[1].trim();
        const paramValue = match[2].trim();
        updateParamByName(paramName, paramValue);
      }

      // 如果没找到单参数更新，尝试匹配多参数更新格式
      if (!paramFound) {
        const multiMatch = suggestion.match(multiParamRegex);
        if (multiMatch && multiMatch[1]) {
          paramFound = true;

          // 切分参数对
          const paramPairs = multiMatch[1].split(',');
          for (const pair of paramPairs) {
            // 匹配 "参数名: 值"
            const pairMatch = pair.match(/\s*([^:]+)\s*:\s*([^,\]]+)/);
            if (pairMatch) {
              const paramName = pairMatch[1].trim();
              const rawValue = pairMatch[2].trim();
              // 去除单位后缀，但不处理颜色值
              const paramValue = paramName === '塑料颜色' ? rawValue : rawValue.replace(/cm|%/g, '');
              updateParamByName(paramName, paramValue);
            }
          }
        }
      }

      // 检查是否已找到参数更新标记，如果找到则不需要继续解析
      if (paramFound) {
        return;
      }

      // 提取材料信息
      const materialMatch = suggestion.match(/材料：\s*(titanium|bronze|plastic|stainless_steel)/);
      if (materialMatch) {
        const material = materialMatch[1] as 'titanium' | 'bronze' | 'plastic' | 'stainless_steel';
        updateParameter('material', material);
      }

      // 提取塑料颜色信息
      const plasticColorMatch = suggestion.match(/塑料颜色：\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\([^)]+\))/);
      if (plasticColorMatch && parameters.material === 'plastic') {
        updateParameter('plasticColor', plasticColorMatch[1]);
      }

      // 提取尺寸信息
      const widthMatch = suggestion.match(/桌子宽度：\s*(\d+)cm/);
      const lengthMatch = suggestion.match(/桌子长度：\s*(\d+)cm/);
      const heightMatch = suggestion.match(/桌腿高度：\s*(\d+)cm/);
      const legWidthMatch = suggestion.match(/桌腿宽度：\s*(\d+(?:\.\d+)?)cm/);
      const legMinWidthMatch = suggestion.match(/桌腿底部宽度：\s*(\d+(?:\.\d+)?)cm/);
      const legTiltAngleMatch = suggestion.match(/桌腿倾斜角度：\s*(\d+(?:\.\d+)?)°/);
      const thicknessMatch = suggestion.match(/桌面厚度：\s*(\d+(?:\.\d+)?)cm/);
      const roundedMatch = suggestion.match(/桌面圆角：\s*(\d+)%/);

      if (widthMatch) {
        const width = Math.min(Math.max(parseInt(widthMatch[1]), 40), 120);
        updateParameter('tableWidth', width);
      }
      if (lengthMatch) {
        const length = Math.min(Math.max(parseInt(lengthMatch[1]), 80), 200);
        updateParameter('tableLength', length);
      }
      if (heightMatch) {
        const height = Math.min(Math.max(parseInt(heightMatch[1]), 60), 90);
        updateParameter('legHeight', height);
      }
      if (legWidthMatch) {
        const legWidth = Math.min(Math.max(parseFloat(legWidthMatch[1]), 2), 10);
        updateParameter('legWidth', legWidth);
      }
      if (legMinWidthMatch) {
        const legMinWidth = Math.min(Math.max(parseFloat(legMinWidthMatch[1]), 1), 8);
        updateParameter('legMinWidth', legMinWidth);
      }
      if (legTiltAngleMatch) {
        const legTiltAngle = Math.min(Math.max(parseFloat(legTiltAngleMatch[1]), 0), 30);
        updateParameter('legTiltAngle', legTiltAngle);
      }
      if (thicknessMatch) {
        const thickness = Math.min(Math.max(parseFloat(thicknessMatch[1]), 2), 8);
        updateParameter('tableThickness', thickness);
      }
      if (roundedMatch) {
        const rounded = Math.min(Math.max(parseInt(roundedMatch[1]), 5), 95);
        updateRoundedCorners(rounded);
      }
    } catch (error) {
      console.error('Error parsing AI suggestion:', error);
      setError('无法解析AI的建议，请重试');
    }
  };

  // 根据参数名称更新对应的值
  const updateParamByName = (paramName: string, paramValue: string) => {
    switch (paramName) {
      case '材料':
        if (['titanium', 'bronze', 'plastic', 'stainless_steel'].includes(paramValue)) {
          updateParameter('material', paramValue as any);
        }
        break;
      case '塑料颜色':
        // 验证是否为有效的颜色值（简单检查）
        if (/^#([0-9A-Fa-f]{3}){1,2}$|^rgb\([^)]+\)$/.test(paramValue)) {
          updateParameter('plasticColor', paramValue);
        }
        break;
      case '桌子宽度':
        const width = parseInt(paramValue);
        if (!isNaN(width)) {
          updateParameter('tableWidth', Math.min(Math.max(width, 40), 120));
        }
        break;
      case '桌子长度':
        const length = parseInt(paramValue);
        if (!isNaN(length)) {
          updateParameter('tableLength', Math.min(Math.max(length, 80), 200));
        }
        break;
      case '桌腿高度':
        const height = parseInt(paramValue);
        if (!isNaN(height)) {
          updateParameter('legHeight', Math.min(Math.max(height, 60), 90));
        }
        break;
      case '桌腿宽度':
        const legWidth = parseInt(paramValue);
        if (!isNaN(legWidth)) {
          updateParameter('legWidth', Math.min(Math.max(legWidth, 2), 10));
        }
        break;
      case '桌腿底部宽度':
        const legMinWidth = parseInt(paramValue);
        if (!isNaN(legMinWidth)) {
          updateParameter('legMinWidth', Math.min(Math.max(legMinWidth, 1), 8));
        }
        break;
      case '桌腿倾斜角度':
        const legTiltAngle = parseInt(paramValue);
        if (!isNaN(legTiltAngle)) {
          updateParameter('legTiltAngle', Math.min(Math.max(legTiltAngle, 0), 30));
        }
        break;
      case '桌面厚度':
        const thickness = parseFloat(paramValue);
        if (!isNaN(thickness)) {
          updateParameter('tableThickness', Math.min(Math.max(thickness, 2), 8));
        }
        break;
      case '桌面圆角':
        const rounded = parseInt(paramValue);
        if (!isNaN(rounded)) {
          updateRoundedCorners(Math.min(Math.max(rounded, 5), 95));
        }
        break;
      default:
        console.warn('未知参数名称:', paramName);
    }
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setError(null);

    // 添加用户消息到聊天历史
    const userMessage = { role: 'user' as const, content: prompt, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMessage]);

    try {
      setIsLoading(true);

      // 准备发送给API的聊天历史
      const messageHistory = chatHistory.map(({ role, content }) => ({ role, content }));
      messageHistory.push({ role: 'user', content: prompt });

      let suggestion: string;
      if (useMockApi) {
        suggestion = await mockGenerateTableDesign(prompt, messageHistory);
      } else {
        try {
          suggestion = await generateTableDesign(prompt, messageHistory);
        } catch (apiError) {
          // 真实 API 失败，降级到 mock 并提示用户
          const errMsg = apiError instanceof Error ? apiError.message : '未知错误';
          setError(`⚠️ 真实 API 不可用（${errMsg}），已切换为演示模式`);
          suggestion = await mockGenerateTableDesign(prompt, messageHistory);
          setUseMockApi(true); // 后续请求直接使用模拟API
        }
      }

      // 添加AI响应到聊天历史
      setChatHistory(prev => [...prev, { role: 'assistant', content: suggestion, timestamp: new Date() }]);

      parseAndUpdateParameters(suggestion);
    } catch (error) {
      setError('生成设计建议时出错: ' + (error instanceof Error ? error.message : '请重试'));
    } finally {
      setIsLoading(false);
      setPrompt('');
    }
  };

  const handleSurpriseMe = async () => {
    setIsGeneratingIdea(true);

    // 扩展的提示库，按类别分组
    const surprisePrompts = {
      创意风格: [
        "设计一张宇宙飞船形状的未来派餐桌",
        "设计一张看起来像是漂浮在空中的悬浮桌",
        "设计一张树形桌子，桌腿像树根一样蜿蜒曲折",
        "设计一张集成了水族箱的特色餐桌"
      ],
      实用功能: [
        "设计一张现代简约的办公桌，注重实用性",
        "我需要一张适合家庭使用的大餐桌",
        "设计一张适合小型公寓的节省空间的书桌",
        "给我一张复古风格的工作台设计"
      ],
      特殊场景: [
        "设计一张适合狭小阳台的折叠桌",
        "设计一张适合远程工作的人体工学电脑桌",
        "设计一张可以变形为床的多功能桌",
        "设计一张适合露营使用的便携桌"
      ],
      材质挑战: [
        "设计一张混合使用玻璃和木材的桌子",
        "设计一张环保回收材料制作的时尚桌子",
        "设计一张大理石面配铜腿的奢华桌子",
        "设计一张有机玻璃制成的透明桌子"
      ],
      文化灵感: [
        "设计一张受北欧极简主义启发的桌子",
        "设计一张带有中国传统工艺元素的书桌",
        "设计一张日式禅风低矮茶桌",
        "设计一张美式复古工业风格的餐桌"
      ]
    };

    // 与当前设计参数联动的提示
    const materialSuggestions = {
      'titanium': [
        "我想要一张更轻薄的钛金属桌子",
        "如何让钛金属桌面看起来更有质感？",
        "设计一张太空风格的钛金属办公桌"
      ],
      'plastic': [
        `我想尝试${parameters.plasticColor === '#FFFFFF' ? '彩色' : '不同颜色的'}塑料桌子`,
        "如何让塑料材质看起来更高档？",
        "设计一张艺术感强的彩色塑料餐桌"
      ],
      'bronze': [
        "设计一张带有古典风格的青铜桌",
        "如何让青铜桌与现代家居搭配？",
        "带有雕花装饰的青铜桌腿设计"
      ],
      'stainless_steel': [
        "极简风格不锈钢餐桌设计",
        "工业风格不锈钢办公桌",
        "给不锈钢桌面增加一些温暖感"
      ]
    };

    // 尺寸相关建议
    const sizeSuggestions = [];
    if (parameters.tableWidth < 70) {
      sizeSuggestions.push("我需要一张更宽的桌子");
    } else if (parameters.tableWidth > 100) {
      sizeSuggestions.push("这张桌子能否设计得窄一些？");
    }

    if (parameters.legHeight < 70) {
      sizeSuggestions.push("我想要一张更高的桌子");
    } else if (parameters.legHeight > 80) {
      sizeSuggestions.push("这张桌子能否矮一些？");
    }

    if (parameters.roundedCorners < 30) {
      sizeSuggestions.push("我希望桌子的圆角更大一些");
    } else if (parameters.roundedCorners > 70) {
      sizeSuggestions.push("我想要桌子的圆角小一些");
    }

    // 情感元素/场景描述
    const emotions = [
      "我刚搬了新家，想要一张能让人眼前一亮的",
      "朋友们常来我家聚会，我需要一张",
      "我是一名设计师，希望有一张能展示我个性的",
      "我的空间有限但追求品质，想要一张"
    ];

    // 决定提示类型的策略
    let finalPrompt = "";
    const promptStrategy = Math.random();

    // 30%概率使用与当前材质相关的提示
    if (promptStrategy < 0.3 && materialSuggestions[parameters.material]) {
      const materialPrompts = materialSuggestions[parameters.material];
      finalPrompt = materialPrompts[Math.floor(Math.random() * materialPrompts.length)];
    }
    // 20%概率使用与当前尺寸相关的提示
    else if (promptStrategy < 0.5 && sizeSuggestions.length > 0) {
      finalPrompt = sizeSuggestions[Math.floor(Math.random() * sizeSuggestions.length)];
    }
    // 50%概率使用随机类别的提示
    else {
      // 随机选择一个类别
      const categories = Object.keys(surprisePrompts);
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];

      // 从选中类别中随机选择一个提示
      const promptsInCategory = surprisePrompts[randomCategory as keyof typeof surprisePrompts];
      const randomPrompt = promptsInCategory[Math.floor(Math.random() * promptsInCategory.length)];

      // 50%概率添加情感元素
      if (Math.random() > 0.5) {
        const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
        finalPrompt = `${randomEmotion} ${randomPrompt}`;
      } else {
        finalPrompt = randomPrompt;
      }
    }

    // 避免重复的提示
    let attempts = 0;
    while (usedPrompts.has(finalPrompt) && attempts < 10) {
      // 重新生成提示
      const categories = Object.keys(surprisePrompts);
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const promptsInCategory = surprisePrompts[randomCategory as keyof typeof surprisePrompts];
      finalPrompt = promptsInCategory[Math.floor(Math.random() * promptsInCategory.length)];
      attempts++;
    }

    // 记录已使用的提示
    setUsedPrompts(prev => new Set([...prev, finalPrompt]));

    // 模拟思考过程
    setTimeout(() => {
      setPrompt(finalPrompt);
      setIsGeneratingIdea(false);
    }, 800);
  };

  // 切换API模式
  const toggleApiMode = () => {
    setUseMockApi(!useMockApi);
  };



  // 保存成功提示自动消失
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => {
        setSaveSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  // 当聊天历史更新时，滚动到底部
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // 格式化价格显示
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // 快速提示按钮处理
  const handleQuickPrompt = (text: string) => {
    setPrompt(prev => prev ? `${prev} ${text}` : text);
  };

  // 清空聊天记录
  const clearChatHistory = () => {
    setChatHistory([]);
  };

  // 处理保存设计
  const handleOpenSaveDialog = () => {
    setIsSaveDialogOpen(true);
  };

  // 处理打开设计
  const handleOpenDesignsDrawer = () => {
    setIsDesignsDrawerOpen(true);
  };

  // 处理保存成功
  const handleDesignSaved = (designId: string) => {
    setSaveSuccess('设计已成功保存！');

    // 3秒后清除成功提示
    setTimeout(() => {
      setSaveSuccess(null);
    }, 3000);
  };

  // 处理分享按钮点击
  const handleOpenShareDialog = () => {
    setIsShareDialogOpen(true);
  };

  return (
    <div className="relative flex h-full flex-col p-6 overflow-hidden bg-white">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-800">
          {isParametersPanelOpen ? '参数设置' : 'AI Table Designer'}
        </h2>
        <div className="flex items-center gap-2">
          {isParametersPanelOpen ? (
            <button
              onClick={() => setIsParametersPanelOpen(false)}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          ) : (
            chatHistory.length > 0 && (
              <button
                onClick={clearChatHistory}
                className="text-xs text-gray-500 hover:text-red-500 transition-colors"
              >
                清空对话
              </button>
            )
          )}
        </div>
      </div>

      {/* 成功提示 */}
      {saveSuccess && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-3 mb-4 rounded shadow-sm text-sm">
          {saveSuccess}
        </div>
      )}

      {/* Scrollable Main Area */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin hide-scrollbar relative">
        {isParametersPanelOpen ? (
          /* ================================
                   PARAMETERS PANEL
             ================================ */
          <div className="flex flex-col h-full animate-fade-in pb-4">
            {/* Tabs Header */}
            <div className="flex p-1 bg-gray-100/80 rounded-lg mb-4 flex-shrink-0">
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'dimensions'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                  }`}
                onClick={() => setActiveTab('dimensions')}
              >
                尺寸
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'materials'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                  }`}
                onClick={() => setActiveTab('materials')}
              >
                材料
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'dimensions' && (
              <div className="space-y-5 animate-fade-in pr-2">
                {/* 桌子宽度 */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-600">桌子宽度</label>
                    <span className="text-sm font-bold text-[color:var(--primary-color)]">{parameters.tableWidth} cm</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={40} max={120} step={1}
                    value={parameters.tableWidth}
                    onChange={(e) => updateParameter('tableWidth', Number(e.target.value))}
                  />
                </div>

                {/* 桌子长度 */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-600">桌子长度</label>
                    <span className="text-sm font-bold text-[color:var(--primary-color)]">{parameters.tableLength} cm</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={80} max={200} step={1}
                    value={parameters.tableLength}
                    onChange={(e) => updateParameter('tableLength', Number(e.target.value))}
                  />
                </div>

                {/* 桌腿高度 */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-600">桌腿高度</label>
                    <span className="text-sm font-bold text-[color:var(--primary-color)]">{parameters.legHeight} cm</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={60} max={90} step={1}
                    value={parameters.legHeight}
                    onChange={(e) => updateParameter('legHeight', Number(e.target.value))}
                  />
                </div>

                {/* 桌腿宽度 */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-600">桌腿宽度</label>
                    <span className="text-sm font-bold text-[color:var(--primary-color)]">{parameters.legWidth} cm</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={2} max={10} step={1}
                    value={parameters.legWidth}
                    onChange={(e) => updateParameter('legWidth', Number(e.target.value))}
                  />
                </div>

                {/* 桌腿底部宽度 */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-600">桌腿底部宽度</label>
                    <span className="text-sm font-bold text-[color:var(--primary-color)]">{parameters.legMinWidth} cm</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={1} max={8} step={0.5}
                    value={parameters.legMinWidth}
                    onChange={(e) => updateParameter('legMinWidth', Number(e.target.value))}
                  />
                </div>

                {/* 桌腿倾斜角度 */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-600">桌腿倾斜角度</label>
                    <span className="text-sm font-bold text-[color:var(--primary-color)]">{parameters.legTiltAngle}°</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={0} max={30} step={1}
                    value={parameters.legTiltAngle}
                    onChange={(e) => updateParameter('legTiltAngle', Number(e.target.value))}
                  />
                </div>

                {/* 桌面厚度 */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-600">桌面厚度</label>
                    <span className="text-sm font-bold text-[color:var(--primary-color)]">{parameters.tableThickness} cm</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={2} max={8} step={0.1}
                    value={parameters.tableThickness}
                    onChange={(e) => updateParameter('tableThickness', Math.round(Number(e.target.value) * 10) / 10)}
                  />
                </div>

                {/* 桌面圆角 */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-600">桌面圆角</label>
                    <span className="text-sm font-bold text-[color:var(--primary-color)]">{parameters.roundedCorners}%</span>
                  </div>
                  <input
                    type="range"
                    className="param-slider"
                    min={5} max={95} step={1}
                    value={parameters.roundedCorners}
                    onChange={(e) => updateRoundedCorners(Number(e.target.value))}
                  />
                </div>
              </div>
            )}

            {activeTab === 'materials' && (
              <div className="space-y-3 animate-fade-in pr-2">
                {[
                  { id: 'titanium', name: '钛金属 (Titanium)', desc: '轻量、高强度、现代感' },
                  { id: 'bronze', name: '青铜 (Bronze)', desc: '古典、高档、温暖' },
                  { id: 'plastic', name: '塑料 (Plastic)', desc: '轻便、实惠、多色选择' },
                  { id: 'stainless_steel', name: '不锈钢 (Stainless Steel)', desc: '耐用、现代、易清洁' }
                ].map((mat) => (
                  <div
                    key={mat.id}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${parameters.material === mat.id
                        ? 'bg-blue-50/50 border-2 border-[color:var(--primary-color)] shadow-sm'
                        : 'border border-gray-200 hover:border-[color:var(--primary-color)] hover:bg-gray-50'
                      }`}
                    onClick={() => updateParameter('material', mat.id as any)}
                  >
                    <div className="font-semibold text-gray-800">{mat.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{mat.desc}</div>
                  </div>
                ))}

                {/* 塑料颜色选择器，仅在选择塑料材质时显示 */}
                {parameters.material === 'plastic' && (
                  <div className="p-4 border border-gray-100 bg-gray-50/50 rounded-xl mt-4 animate-fade-in text-sm">
                    <div className="font-medium text-gray-700 mb-3">选择塑料颜色</div>
                    <div className="flex flex-wrap gap-2">
                      {['#C97B84', '#C06C48', '#D4B896', '#F0EDE8', '#7DAA92', '#5B9EA6', '#5B7FA6', '#2C2C2C'].map((color) => (
                        <div
                          key={color}
                          className={`w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110 shadow-sm ${parameters.plasticColor === color ? 'ring-2 ring-offset-2 ring-[color:var(--primary-color)]' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => updateParameter('plasticColor', color)}
                          title={color}
                        />
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <label className="text-sm text-gray-600 block mb-2">自定义颜色</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={parameters.plasticColor}
                          onChange={(e) => updateParameter('plasticColor', e.target.value)}
                          className="h-10 w-16 p-1 bg-white border border-gray-200 cursor-pointer rounded"
                        />
                        <span className="font-mono text-gray-600 uppercase bg-white border border-gray-200 px-3 py-1.5 rounded shadow-sm">{parameters.plasticColor}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ================================
                   CHAT PANEL
             ================================ */
          <div className="flex flex-col h-full animate-fade-in">
            <div
              ref={chatHistoryRef}
              className="flex-1 overflow-y-auto pr-2 pb-2 scrollbar-thin"
            >
              {chatHistory.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-500 py-10 w-full">
                    <Bot size={32} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">描述您想要的桌子，AI将为您自动设计</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatHistory.map((message, index) => (
                    <ChatMessageBubble key={index} message={message} timestamp={formatTime(message.timestamp)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 底部固定区域 (只有在聊天模式下才显示输入框和快捷按钮) */}
      <div className="flex-shrink-0 pt-3 flex flex-col gap-3 mt-1 bg-white z-10 w-full relative">
        {!isParametersPanelOpen && (
          <>
            {/* Quick Prompts */}
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none hide-scrollbar mask-edge">
              <button
                type="button"
                className="flex-shrink-0 px-3 py-1.5 bg-blue-50 text-[color:var(--primary-color)] border border-blue-100 rounded-full text-xs flex items-center gap-1.5 hover:bg-blue-100 transition-colors font-medium"
                onClick={handleSurpriseMe}
                disabled={isLoading || isGeneratingIdea}
              >
                <Sparkles size={14} className={isGeneratingIdea ? 'animate-spin' : ''} />
                {isGeneratingIdea ? '灵感闪现...' : '获取灵感'}
              </button>
              <button onClick={() => handleQuickPrompt("圆角更大一些")} className="flex-shrink-0 text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 transition-colors whitespace-nowrap">圆角 +</button>
              <button onClick={() => handleQuickPrompt("细桌腿")} className="flex-shrink-0 text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 transition-colors whitespace-nowrap">细桌腿</button>
              <button onClick={() => handleQuickPrompt("钛金属材质")} className="flex-shrink-0 text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 transition-colors whitespace-nowrap">钛金属</button>
              <button onClick={() => handleQuickPrompt("蓝色塑料")} className="flex-shrink-0 text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 transition-colors whitespace-nowrap">蓝色塑料</button>
              <button onClick={() => handleQuickPrompt("适合几人使用？")} className="flex-shrink-0 text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 transition-colors whitespace-nowrap">使用人数</button>
            </div>

            {/* Input Form */}
            <form onSubmit={handlePromptSubmit} className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述桌子设计..."
                className="w-full h-24 p-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[color:var(--primary-color)] focus:bg-white resize-none transition-all text-[15px]"
                disabled={isLoading}
              />
              {error && (
                <div className="absolute -top-7 right-0 text-red-500 text-xs font-medium">
                  {error}
                </div>
              )}
              <button
                type="submit"
                className={`absolute bottom-3 right-3 p-2 rounded-lg transition-all ${!prompt.trim() || isLoading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[color:var(--primary-color)] text-white shadow-sm hover:shadow-md hover:scale-105'
                  }`}
                disabled={isLoading || !prompt.trim()}
              >
                <ArrowRight size={18} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </form>
          </>
        )}

        {/* 价格与操作栏 */}
        <div className="flex items-center justify-between pt-2 mt-1">
          {!isParametersPanelOpen ? (
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 font-medium">估算价格</span>
              <span className="text-xl font-bold tracking-tight text-gray-900">{formatPrice(calculatePrice())}</span>
            </div>
          ) : (
            <div className="flex-1"></div>
          )}

          <div className="flex gap-2 ml-auto w-full sm:w-auto">
            {!isParametersPanelOpen && (
              <button
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 font-medium transition-colors text-sm"
                onClick={() => setIsParametersPanelOpen(true)}
              >
                <Settings size={16} />
                <span>参数设置</span>
              </button>
            )}

            <button
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white hover:bg-gray-800 shadow-sm font-medium transition-colors text-sm"
              onClick={handleOpenShareDialog}
            >
              <Share2 size={16} />
              <span>分享设计</span>
            </button>
          </div>
        </div>
      </div>


      {/* 保存设计对话框 */}
      <SaveDesignDialog
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        onSaved={handleDesignSaved}
      />

      {/* 已保存设计抽屉 */}
      <SavedDesignsDrawer
        isOpen={isDesignsDrawerOpen}
        onClose={() => setIsDesignsDrawerOpen(false)}
      />

      {/* 分享海报弹窗 */}
      <SharePosterDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        latestDescription={chatHistory.length > 0 ?
          chatHistory.filter(msg => msg.role === 'assistant').pop()?.content || '' :
          '一张现代风格的自定义桌子'}
        lastUserPrompt={chatHistory.length > 0 ?
          chatHistory.filter(msg => msg.role === 'user').pop()?.content || '' :
          ''}
      />
    </div>
  );
}
