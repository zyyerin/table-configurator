import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function SnapshotHelper() {
  const { gl, scene, size } = useThree();

  useEffect(() => {
    const handleSnapshot = (e: Event) => {
      const customEvent = e as CustomEvent;
      
      // 1. 隐藏网格线和不必要的辅助元素
      const grid = scene.getObjectByName('floor-grid');
      const gridVisible = grid ? grid.visible : false;
      if (grid) grid.visible = false;

      // 2. 创建一个专用的拍照摄像机
      const aspect = size.width / size.height;
      // 使用较小 FOV 来模拟长焦镜头
      const snapshotCamera = new THREE.PerspectiveCamera(30, aspect, 0.1, 100);
      
      // 稍微拉远一点距离，并将视点稍微下移，让桌子整体在画面中往上抬一些，给桌腿留出安全边距
      snapshotCamera.position.set(2.8, 2.1, 2.8);
      snapshotCamera.lookAt(0, 0.15, 0);
      snapshotCamera.updateProjectionMatrix();

      // 3. 强制同帧渲染
      gl.render(scene, snapshotCamera);

      // 4. 提取画面数据
      const dataURL = gl.domElement.toDataURL('image/png');

      // 5. 还原场景状态（网格等）
      if (grid) grid.visible = gridVisible;
      
      // 6. 执行回调并返回图片
      if (customEvent.detail?.callback) {
        customEvent.detail.callback(dataURL);
      }
    };

    window.addEventListener('capture-perfect-snapshot', handleSnapshot);
    return () => window.removeEventListener('capture-perfect-snapshot', handleSnapshot);
  }, [gl, scene, size]);

  return null;
}
