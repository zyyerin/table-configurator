import { useRef, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useTableStore } from '../store/tableStore';
import html2canvas from 'html2canvas';

interface SharePosterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  latestDescription: string;
  lastUserPrompt?: string;
}

export function SharePosterDialog({ isOpen, onClose, latestDescription, lastUserPrompt }: SharePosterDialogProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const parameters = useTableStore(state => state.parameters);
  const [modelSnapshot, setModelSnapshot] = useState<string | null>(null);
  
  // 获取 3D 画布快照
  useEffect(() => {
    if (isOpen) {
      // 短暂延迟以确保最后的一帧绘制完成
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('capture-perfect-snapshot', {
          detail: {
            callback: (dataUrl: string) => {
              setModelSnapshot(dataUrl);
            }
          }
        }));
      }, 50);
    } else {
      setModelSnapshot(null); // 关闭时清空
    }
  }, [isOpen]);

  // 点击弹窗外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && event.target === overlayRef.current) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // 获取AI描述的摘要（最多150个字符）
  const getDescriptionSnippet = () => {
    // 移除参数更新的标记
    const cleanDescription = latestDescription.replace(/\[\s*参数更新\s*:[^\]]*\]/g, '');
    
    // 如果描述很短，直接返回
    if (cleanDescription.length <= 150) return cleanDescription;
    
    // 否则截取前150个字符，并添加省略号
    return cleanDescription.substring(0, 150) + '...';
  };
  
  // 获取合适的标题
  const getPosterTitle = () => {
    if (lastUserPrompt && lastUserPrompt.trim()) {
      // 如果用户输入太长，截断它
      return lastUserPrompt.length > 30 ? 
        lastUserPrompt.substring(0, 27) + '...' : 
        lastUserPrompt;
    }
    return '我的定制桌子';
  };
  
  // 下载海报图片
  const handleDownload = async () => {
    if (!posterRef.current) return;
    
    try {
      const canvas = await html2canvas(posterRef.current, {
        scale: 2, // 提高导出图片的质量
        useCORS: true,
        backgroundColor: null
      });
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = '我的定制桌子设计.png';
      link.click();
    } catch (error) {
      console.error('导出图片失败:', error);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
    >
      <div className="relative max-w-md w-full mx-4 bg-white rounded-lg shadow-2xl overflow-hidden">
        {/* 下载按钮 */}
        <button 
          onClick={handleDownload}
          className="absolute top-3 right-3 p-1.5 bg-black bg-opacity-20 hover:bg-opacity-30 rounded-full text-white z-10 flex items-center gap-1"
          title="下载海报"
        >
          <Download size={20} />
        </button>
        
        {/* 海报内容 */}
        <div 
          ref={posterRef}
          className="p-6 pb-8"
        >
          {/* 标题 */}
          <h2 className="text-2xl font-bold mb-4 text-center">{getPosterTitle()}</h2>
          
          {/* 展示区域（真实3D模型截图） */}
          <div className="w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center mb-6 overflow-hidden">
            {modelSnapshot ? (
              <img 
                src={modelSnapshot} 
                alt="3D模型设计" 
                className="w-full h-full object-cover mix-blend-multiply" 
              />
            ) : (
              <div className="animate-pulse flex flex-col items-center justify-center text-gray-400">
                <div className="w-8 h-8 md:w-12 md:h-12 border-4 border-gray-200 border-t-gray-400 rounded-full animate-spin mb-3"></div>
                <span className="text-sm">正在生成渲染图...</span>
              </div>
            )}
          </div>
          
          {/* 描述 */}
          <div className="mb-6 border-l-4 border-gray-800 pl-4">
            <p className="text-gray-700 italic">{getDescriptionSnippet()}</p>
          </div>
          
          {/* 参数摘要 */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-100 p-2 rounded">
              <span className="font-medium">材料:</span> {
                parameters.material === 'titanium' ? '钛金属' :
                parameters.material === 'bronze' ? '青铜' :
                parameters.material === 'plastic' ? '塑料' : '不锈钢'
              }
            </div>
            <div className="bg-gray-100 p-2 rounded">
              <span className="font-medium">尺寸:</span> {parameters.tableWidth}×{parameters.tableLength} cm
            </div>
            <div className="bg-gray-100 p-2 rounded">
              <span className="font-medium">高度:</span> {parameters.legHeight} cm
            </div>
            <div className="bg-gray-100 p-2 rounded">
              <span className="font-medium">圆角:</span> {parameters.roundedCorners}%
            </div>
          </div>
          
          {/* 底部信息 */}
          <div className="mt-6 pt-4 border-t text-center text-gray-500 text-xs">
            通过MeshRare Table Configurator创建
          </div>
        </div>
      </div>
    </div>
  );
} 