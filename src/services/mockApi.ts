// 模拟智谱AI服务，用于在API连接问题未解决时进行测试

export async function mockGenerateTableDesign(prompt: string, chatHistory: Array<{role: 'user' | 'assistant'; content: string}> = []): Promise<string> {
  // 模拟API延迟
  return new Promise((resolve) => {
    setTimeout(() => {
      // 简单的关键词匹配逻辑
      const materialMatch = prompt.match(/材料(应该|要|必须)?是?(钛金属|titanium|青铜|bronze|塑料|plastic|不锈钢|stainless)/i);
      const colorMatch = prompt.match(/颜色(应该|要|必须)?是?(蓝色|blue|红色|red|绿色|green|黄色|yellow|黑色|black|白色|white)/i);
      const peopleMatch = prompt.match(/(.*?)(一|两|三|四|五|六|七|八|\d+)人(.*?)/) || prompt.match(/适合(.*?)(\d+)人/);
      
      // 默认参数
      let material = 'stainless_steel';
      let color = '#000000';
      let tableWidth = 80;
      let tableLength = 160;
      let legHeight = 75;
      
      // 材料匹配
      if (materialMatch) {
        if (materialMatch[0].includes('钛') || materialMatch[0].includes('titanium')) material = 'titanium';
        else if (materialMatch[0].includes('铜') || materialMatch[0].includes('bronze')) material = 'bronze';
        else if (materialMatch[0].includes('塑料') || materialMatch[0].includes('plastic')) material = 'plastic';
        else if (materialMatch[0].includes('不锈钢') || materialMatch[0].includes('stainless')) material = 'stainless_steel';
      }
      
      // 颜色匹配(同时设置材料为塑料)
      if (colorMatch) {
        material = 'plastic';
        if (colorMatch[0].includes('蓝') || colorMatch[0].includes('blue')) color = '#0055FF';
        else if (colorMatch[0].includes('红') || colorMatch[0].includes('red')) color = '#FF0000';
        else if (colorMatch[0].includes('绿') || colorMatch[0].includes('green')) color = '#00FF00';
        else if (colorMatch[0].includes('黄') || colorMatch[0].includes('yellow')) color = '#FFFF00';
        else if (colorMatch[0].includes('黑') || colorMatch[0].includes('black')) color = '#000000';
        else if (colorMatch[0].includes('白') || colorMatch[0].includes('white')) color = '#FFFFFF';
      }
      
      if (peopleMatch) {
        let people = 4; // 默认4人
        
        if (peopleMatch[0].includes('一人') || peopleMatch[0].includes('1人')) people = 1;
        else if (peopleMatch[0].includes('两人') || peopleMatch[0].includes('2人')) people = 2;
        else if (peopleMatch[0].includes('三人') || peopleMatch[0].includes('3人')) people = 3;
        else if (peopleMatch[0].includes('四人') || peopleMatch[0].includes('4人')) people = 4;
        else if (peopleMatch[0].includes('五人') || peopleMatch[0].includes('5人')) people = 5;
        else if (peopleMatch[0].includes('六人') || peopleMatch[0].includes('6人')) people = 6;
        else if (peopleMatch[0].includes('七人') || peopleMatch[0].includes('7人')) people = 7;
        else if (peopleMatch[0].includes('八人') || peopleMatch[0].includes('8人')) people = 8;
        else if (peopleMatch[1]) {
          const parsed = parseInt(peopleMatch[1]);
          if (!isNaN(parsed)) people = parsed;
        }
        
        // 根据人数生成合适的桌子尺寸
        const length = 80 + people * 10;
        const width = 60 + Math.floor(people / 2) * 10;
        
        return `[mock] 针对${people}人使用的需求，我建议以下尺寸:

桌子宽度：${width}cm
桌子长度：${length}cm

这个尺寸能确保每个人都有足够的活动空间。材质方面，不锈钢既美观又耐用，非常适合${people}人使用场景。
[参数更新: 桌子宽度: ${width}, 桌子长度: ${length}, 材料: stainless_steel]`;
      }
      
      // 根据提示词选择回复内容
      if (prompt.includes('圆角') || prompt.includes('圆形')) {
        const roundedCorners = prompt.includes('大圆角') ? 75 : 30;
        resolve(`[mock] 为您设计一款现代风格的圆角桌面，圆角处理让整体外观更加柔和流畅，减少意外碰撞风险，${material === 'plastic' ? `采用${color === '#0055FF' ? '蓝色' : color === '#FF0000' ? '红色' : color === '#00FF00' ? '绿色' : color === '#FFFF00' ? '黄色' : color === '#000000' ? '黑色' : '白色'}塑料材质，` : material === 'titanium' ? '采用高级钛金属材质，' : material === 'bronze' ? '采用典雅青铜材质，' : '采用耐用不锈钢材质，'}桌腿设计简约而稳固。
[参数更新: 材料: ${material}, 桌子宽度: ${tableWidth}, 桌子长度: ${tableLength}, 桌腿高度: ${legHeight}, 桌面圆角: ${roundedCorners}${material === 'plastic' ? `, 塑料颜色: ${color}` : ''}]`);
      } else if (prompt.includes('现代') || prompt.includes('简约')) {
        resolve(`[mock] 为您打造一款极简现代风格的餐桌，线条简洁流畅，${material === 'plastic' ? `采用${color === '#0055FF' ? '蓝色' : color === '#FF0000' ? '红色' : color === '#00FF00' ? '绿色' : color === '#FFFF00' ? '黄色' : color === '#000000' ? '黑色' : '白色'}塑料材质，` : material === 'titanium' ? '采用高级钛金属材质，' : material === 'bronze' ? '采用典雅青铜材质，' : '采用耐用不锈钢材质，'}桌面保持简洁设计，搭配修长的桌腿，创造出轻盈通透的视觉效果。
[参数更新: 材料: ${material}, 桌子宽度: ${tableWidth}, 桌子长度: ${tableLength}, 桌腿高度: ${legHeight}, 桌腿宽度: 3, 桌腿底部宽度: 3, 桌腿倾斜角度: 0${material === 'plastic' ? `, 塑料颜色: ${color}` : ''}]`);
      } else if (prompt.includes('传统') || prompt.includes('古典')) {
        resolve(`[mock] 为您设计一款古典风格的餐桌，${material === 'plastic' ? `虽然使用了${color === '#0055FF' ? '蓝色' : color === '#FF0000' ? '红色' : color === '#00FF00' ? '绿色' : color === '#FFFF00' ? '黄色' : color === '#000000' ? '黑色' : '白色'}塑料材质，但依然` : material === 'titanium' ? '采用高贵的钛金属材质，' : material === 'bronze' ? '采用古朴的青铜材质，完美' : '采用精致的不锈钢材质，'}保留了传统家具的厚重感，桌腿弧线优美，桌面边缘处理精细，展现出非凡的工艺和品质。
[参数更新: 材料: ${material}, 桌子宽度: 85, 桌子长度: 180, 桌腿高度: 72, 桌腿宽度: 6, 桌腿底部宽度: 4, 桌腿倾斜角度: 0, 桌面厚度: 5${material === 'plastic' ? `, 塑料颜色: ${color}` : ''}]`);
      } else if (prompt.includes('工业') || prompt.includes('loft')) {
        resolve(`[mock] 为您设计一款工业风格的餐桌，${material === 'plastic' ? `虽然使用${color === '#0055FF' ? '蓝色' : color === '#FF0000' ? '红色' : color === '#00FF00' ? '绿色' : color === '#FFFF00' ? '黄色' : color === '#000000' ? '黑色' : '白色'}塑料材质较为特殊，但依然能` : material === 'titanium' ? '采用精工钛金属材质，完美' : material === 'bronze' ? '选用做旧青铜材质，恰到好处地' : '选用哑光不锈钢材质，完美'}体现出粗犷的工业质感，坚固的桌腿略微内倾，强调结构美感，桌面厚实有力，打造出兼具实用性与设计感的空间。
[参数更新: 材料: ${material}, 桌子宽度: 90, 桌子长度: 180, 桌腿高度: 75, 桌腿宽度: 5, 桌腿底部宽度: 4, 桌腿倾斜角度: 8, 桌面厚度: 4${material === 'plastic' ? `, 塑料颜色: ${color}` : ''}]`);
      } else {
        // 随机创意建议
        const suggestions = [
          `[mock] 为您设计一款兼具美观与实用性的多功能桌子，${material === 'plastic' ? `采用${color === '#0055FF' ? '蓝色' : color === '#FF0000' ? '红色' : color === '#00FF00' ? '绿色' : color === '#FFFF00' ? '黄色' : color === '#000000' ? '黑色' : '白色'}塑料材质，既轻盈又耐用，` : material === 'titanium' ? '采用高级钛金属材质，轻盈坚固，' : material === 'bronze' ? '采用高雅青铜材质，质感出众，' : '采用优质不锈钢材质，坚固耐用，'}桌面采用小圆角设计增加安全性，桌腿略微内倾提供稳定支撑，无论是作为工作桌还是餐桌都非常适合。
[参数更新: 材料: ${material}, 桌子宽度: 75, 桌子长度: 150, 桌腿高度: 73, 桌腿宽度: 4, 桌腿底部宽度: 3, 桌腿倾斜角度: 5, 桌面厚度: 3, 桌面圆角: 15${material === 'plastic' ? `, 塑料颜色: ${color}` : ''}]`,
          
          `[mock] 为您打造一款极简主义风格的桌子，${material === 'plastic' ? `采用${color === '#0055FF' ? '蓝色' : color === '#FF0000' ? '红色' : color === '#00FF00' ? '绿色' : color === '#FFFF00' ? '黄色' : color === '#000000' ? '黑色' : '白色'}塑料材质，突显现代感，` : material === 'titanium' ? '采用珍贵钛金属材质，质感非凡，' : material === 'bronze' ? '采用精致青铜材质，温暖优雅，' : '采用精工不锈钢材质，简约大方，'}桌面采用中等圆角处理，四根桌腿保持垂直设计，营造出稳定感与几何美感的平衡，适合现代简约的家居环境。
[参数更新: 材料: ${material}, 桌子宽度: 80, 桌子长度: 160, 桌腿高度: 75, 桌腿宽度: 3.5, 桌腿底部宽度: 3.5, 桌腿倾斜角度: 0, 桌面厚度: 2.5, 桌面圆角: 25${material === 'plastic' ? `, 塑料颜色: ${color}` : ''}]`,
          
          `[mock] 为您定制一款融合当代设计与实用功能的桌子，${material === 'plastic' ? `选用${color === '#0055FF' ? '蓝色' : color === '#FF0000' ? '红色' : color === '#00FF00' ? '绿色' : color === '#FFFF00' ? '黄色' : color === '#000000' ? '黑色' : '白色'}塑料材质，让空间更富活力，` : material === 'titanium' ? '选用高档钛金属材质，展现品味，' : material === 'bronze' ? '选用古典青铜材质，彰显文化底蕴，' : '选用优质不锈钢材质，经久耐用，'}适中的尺寸与高度符合人体工学设计，锥形桌腿由上至下逐渐收窄，赋予家具轻盈感的同时确保稳定性。
[参数更新: 材料: ${material}, 桌子宽度: 85, 桌子长度: 170, 桌腿高度: 74, 桌腿宽度: 5, 桌腿底部宽度: 2.5, 桌腿倾斜角度: 0, 桌面厚度: 3, 桌面圆角: 10${material === 'plastic' ? `, 塑料颜色: ${color}` : ''}]`
        ];
        
        const randomIndex = Math.floor(Math.random() * suggestions.length);
        resolve(suggestions[randomIndex]);
      }
    }, 800); // 模拟800ms延迟
  });
} 