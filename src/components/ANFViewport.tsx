import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { MASS_GAP, recursiveHarmonicFFT, extractSpatialDensity } from '../services/anfService';

interface ANFViewportProps {
  analyser: AnalyserNode | null;
  isMapping?: boolean;
}

export const ANFViewport: React.FC<ANFViewportProps> = ({ analyser, isMapping }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [stats, setStats] = useState({ sync: '39,620 Hz', fps: 0, drawCalls: 0, memory: 0 });

  const analyserRef = useRef(analyser);
  const isMappingRef = useRef(isMapping);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    analyserRef.current = analyser;
    isMappingRef.current = isMapping;
    if (analyser && (!dataArrayRef.current || dataArrayRef.current.length !== analyser.frequencyBinCount)) {
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }
  }, [analyser, isMapping]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: false,
      powerPreference: "high-performance" 
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050505, 1);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    // We'll use sizes for logic but PointsMaterial uses a uniform size.
    // If you specifically want varying sizes per point, ShaderMaterial is needed.
    // Let's use a standard PointsMaterial with a clean sprite/texture or just small squares for stability,
    // or fix the ShaderMaterial pixel size. We'll use ShaderMaterial with FIXED, MUCH SMALLER point sizes.
    const sizes = [];
    const pointCount = 12000;

    for (let i = 0; i < pointCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 4;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      vertices.push(x, y, z);

      const dist = Math.sqrt(x*x + y*y + z*z);
      const isMassGap = Math.abs(dist - 5) < MASS_GAP;
      
      if (isMassGap) {
        colors.push(0, 1, 0.6);
        sizes.push(2.0); // reduced from 8.0
      } else {
        colors.push(0.1, 0.1, 0.2);
        sizes.push(0.5); // reduced from 3.0
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          // Drastically reduced point size scaling to prevent blowing out the screen to white
          gl_PointSize = clamp(size * (20.0 / -mvPosition.z), 1.0, 15.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 xy = gl_PointCoord.xy - vec2(0.5);
          float ll = length(xy);
          if(ll > 0.5) discard;
          float alpha = smoothstep(0.5, 0.2, ll);
          // Scale down RGB slightly to prevent blowout
          gl_FragColor = vec4(vColor * 0.8, alpha * 0.6);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    (pointsRef as any).current = points;

    const ringGeom = new THREE.TorusGeometry(3, 0.015, 16, 100);
    const hitBoxGeom = new THREE.TorusGeometry(3, 0.2, 16, 100);
    const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false });

    const createRing = (color: number) => {
      const ringGroup = new THREE.Group();
      const visualRing = new THREE.Mesh(ringGeom, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 }));
      const hitBox = new THREE.Mesh(hitBoxGeom, hitBoxMat);
      hitBox.userData = { visualRing };
      ringGroup.add(visualRing);
      ringGroup.add(hitBox);
      return { group: ringGroup, hitBox };
    };

    const r1 = createRing(0xff3333);
    const r2 = createRing(0x33ff33);
    const r3 = createRing(0x3333ff);

    r2.group.rotation.y = Math.PI / 2;
    r3.group.rotation.x = Math.PI / 2;

    const ringsGroup = new THREE.Group();
    ringsGroup.add(r1.group, r2.group, r3.group);
    scene.add(ringsGroup);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-10, -10);
    const hitBoxes = [r1.hitBox, r2.hitBox, r3.hitBox];

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    containerRef.current.addEventListener('mousemove', handleMouseMove);
    containerRef.current.addEventListener('mouseleave', () => { mouse.set(-10, -10); });

    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      const pulseTime = performance.now() * 0.002;
      const pulseScale = 1.0 + Math.sin(pulseTime) * 0.02;

      if (pointsRef.current) {
        pointsRef.current.rotation.y += 0.0005;
        pointsRef.current.rotation.x += 0.0002;
        (pointsRef.current.material as THREE.ShaderMaterial).uniforms.time.value += 0.01;
      }
      
      ringsGroup.rotation.z += 0.002;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(hitBoxes);

      hitBoxes.forEach(hb => {
        const visual = hb.userData.visualRing as THREE.Mesh;
        const mat = visual.material as THREE.MeshBasicMaterial;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.3, 0.1);
        visual.scale.lerp(new THREE.Vector3(pulseScale, pulseScale, pulseScale), 0.1);
      });

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const visual = hit.userData.visualRing as THREE.Mesh;
        const mat = visual.material as THREE.MeshBasicMaterial;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.9, 0.2);
        visual.scale.lerp(new THREE.Vector3(1.05, 1.05, 1.05), 0.2);
      }
      
      // Update data mapping on points
      if (isMappingRef.current && analyserRef.current && dataArrayRef.current && pointsRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const normalized = recursiveHarmonicFFT(dataArrayRef.current);
        const { density, gapFlags } = extractSpatialDensity(normalized);
        const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;
        const sizes = pointsRef.current.geometry.attributes.size.array as Float32Array;
        const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;

        for (let i = 0; i < pointCount; i++) {
          const fieldIdx = i % density.length;
          const d = density[fieldIdx] || 0;
          const isGapAngle = (gapFlags[fieldIdx] || 0) > 0.5;

          let baseSize = 3.0;

          if (isGapAngle) {
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.84;
            colors[i * 3 + 2] = 0.0;
            baseSize = 10.0 + (d * 5.0);
          } else if (d > 0.5) {
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.2;
            colors[i * 3 + 2] = 0.1;
            baseSize = 5.0 + (d * 6.0);
          } else {
            const x = positions[i * 3];
            const y = positions[i * 3 + 1];
            const z = positions[i * 3 + 2];
            const dist = Math.sqrt(x*x + y*y + z*z);
            const isMassGap = Math.abs(dist - 5) < MASS_GAP;
            
            if (isMassGap) {
              colors[i * 3] = 0.0;
              colors[i * 3 + 1] = 1.0;
              colors[i * 3 + 2] = 0.6;
              baseSize = 6.0;
            } else {
              colors[i * 3] = 0.1;
              colors[i * 3 + 1] = 0.1;
              colors[i * 3 + 2] = 0.2;
              baseSize = 3.0;
            }
          }
          sizes[i] = sizes[i] + (baseSize - sizes[i]) * 0.2;
        }
        
        pointsRef.current.geometry.attributes.color.needsUpdate = true;
        pointsRef.current.geometry.attributes.size.needsUpdate = true;
      }

      renderer.render(scene, camera);

      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setStats(prev => ({
          ...prev,
          fps: frameCount,
          drawCalls: renderer.info.render.calls,
          memory: renderer.info.memory.geometries
        }));
        frameCount = 0;
        lastTime = now;
      }
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) containerRef.current.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      renderer.forceContextLoss();
      if (containerRef.current && renderer.domElement.parentNode) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-2xl border border-white/10 shadow-2xl group">
      <div ref={containerRef} className="w-full h-full cursor-crosshair" />
      
      <div className="absolute top-4 left-4 font-mono text-[10px] text-emerald-500/80 space-y-1 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isMapping ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
          <span>LATTICE_STATE: {isMapping ? 'RECURSIVE_SCAN' : 'STABLE'}</span>
        </div>
        <div>MASS_GAP_LOCK: ACTIVE</div>
        <div className="text-white/40">SYNC_LOCK: {stats.sync}</div>
      </div>

      <div className="absolute bottom-4 left-4 font-mono text-[10px] space-y-1 pointer-events-none text-blue-400">
        <div className="text-white/60 mb-1 border-b border-white/10 pb-1">WEBGL_ACCELERATOR</div>
        <div>FPS: <span className="text-white">{stats.fps}</span></div>
        <div>DRAW_CALLS: <span className="text-white">{stats.drawCalls}</span></div>
        <div>GEO_MEM: <span className="text-white">{stats.memory}</span> block(s)</div>
      </div>

      <div className="absolute bottom-4 right-4 text-right font-mono text-[10px] text-white/20 pointer-events-none">
        <div>GPU_POWER_PREF: HIGH_PERF</div>
        <div>RHC_v1.1 // GAP_DETECTION</div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-1 h-1 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
      </div>
    </div>
  );
};
