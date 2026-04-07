import axios from 'axios';
import CryptoJS from 'crypto-js';

const API_KEY = import.meta.env.VITE_ZHIPU_API_KEY;
// 智谱API格式可能需要调整
const API_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// 解析API密钥
const parseApiKey = (apiKey: string) => {
  const parts = apiKey.split('.');
  if (parts.length !== 2) {
    throw new Error('Invalid API key format');
  }
  return { id: parts[0], secret: parts[1] };
};

// 生成JWT token
const generateToken = (apiKey: string, secret: string): string => {
  const header = {
    "alg": "HS256",
    "sign_type": "SIGN"
  };

  const payload = {
    "api_key": apiKey,
    "exp": Math.floor(Date.now() / 1000) + 3600,
    "timestamp": Math.floor(Date.now() / 1000)
  };

  const headerBase64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadBase64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signContent = `${headerBase64}.${payloadBase64}`;
  const signature = CryptoJS.HmacSHA256(signContent, secret).toString(CryptoJS.enc.Base64)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerBase64}.${payloadBase64}.${signature}`;
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function generateTableDesign(prompt: string, chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []): Promise<string> {
  try {
    console.log('Starting table design generation with prompt:', prompt);

    if (!API_KEY) {
      throw new Error('API key is not configured');
    }

    // 解析API密钥并生成JWT token
    const { id: apiKey, secret } = parseApiKey(API_KEY);
    const token = generateToken(apiKey, secret);

    // 构建消息历史，将最近的消息添加到上下文中
    const historyMessages = chatHistory.slice(-6).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const systemPrompt = `您是一位专业的桌子设计顾问，擅长根据用户的自然语言需求（例如："加长"、"变蓝"、"想要更高的桌腿"）推导出合适的配置参数并提供设计建议。

核心要求：
1. 回复必须简洁自然，像真人设计师一样与用户交流。
2. 用1-2句话流畅表达设计如何改变并介绍设计特点，切忌直接罗列参数值。
3. 在描述后，结尾处必须加上对应的参数更新标签，标签内只需包含需要更新的参数。

可更改的参数及范围（仅供推理，请勿在回复中重复罗列）：
- 材料：titanium(钛金属)、bronze(青铜)、plastic(塑料)、stainless_steel(不锈钢)
- 桌子宽度：40-120 (cm)
- 桌子长度：80-200 (cm)
- 桌腿高度：60-90 (cm)
- 桌腿宽度：2-10 (cm)
- 桌腿底部宽度：1-8 (cm)
- 桌腿倾斜角度：0-30 (°)
- 桌面厚度：2-8 (cm)
- 桌面圆角：5-95 (%)
- 塑料颜色：仅在材料为plastic时适用，需采用十六进制颜色码（如#FF5733）

重要规则：
- **材质判定**：当用户提到颜色（如蓝色、红色等）且未指定其他材质时，自动将材料设为plastic，并设定相应颜色的十六进制码（如蓝色对应#0055FF, 红色对应#FF0000）。
- **参数键名必须准确**：标签内支持更新的键名只能是："材料"、"桌子宽度"、"桌子长度"、"桌腿高度"、"桌腿宽度"、"桌腿底部宽度"、"桌腿倾斜角度"、"桌面厚度"、"桌面圆角"、"塑料颜色"。
- **去除单位**：在参数更新标签中，参数值不要带任何单位（cm/°/%），只能是纯数值或英文/十六进制字符串。

回复格式（必须严格遵守格式，结尾保留方括号包裹的标签）：
这段描述向用户介绍调整后的设计感受及特点。不要分段，直接在结尾包含更新标记。例如：为您推荐一款轻巧现代的工作桌，改为鲜亮的颜色，桌腿略微内倾，提供稳定支撑且外观时尚。[参数更新: 材料: plastic, 塑料颜色: #FF5733, 桌腿倾斜角度: 5]`;

    const requestBody = {
      model: "glm-4.7-flash",
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...historyMessages,
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      stream: false
    };

    console.log('Request headers:', {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const response = await axios.post(
      API_BASE_URL,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Raw API Response:', JSON.stringify(response.data, null, 2));

    if (!response.data) {
      throw new Error('Empty response from API');
    }

    if (!response.data.choices || !Array.isArray(response.data.choices) || response.data.choices.length === 0) {
      throw new Error('Invalid response format: missing choices array');
    }

    const choice = response.data.choices[0];
    if (!choice.message || !choice.message.content) {
      throw new Error('Invalid response format: missing message content');
    }

    return choice.message.content;
  } catch (error) {
    console.error('Detailed error in generateTableDesign:', error);

    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data;
      const statusCode = error.response?.status;
      const statusText = error.response?.statusText;

      console.error('API Error details:', {
        status: statusCode,
        statusText: statusText,
        data: responseData
      });

      throw new Error(`API调用失败 (${statusCode}): ${responseData?.error?.message || statusText || '未知错误'}`);
    }

    if (error instanceof Error) {
      throw new Error(`生成设计建议时出错: ${error.message}`);
    }

    throw new Error('生成设计建议时发生未知错误');
  }
} 