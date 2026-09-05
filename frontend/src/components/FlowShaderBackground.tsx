import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Detect WebGL capability synchronously to prevent effect-level crashes in sandboxes
const checkWebGLSupport = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
};

export const FlowShaderBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [isSupported] = useState<boolean>(checkWebGLSupport);

  useEffect(() => {
    // If WebGL is not supported, do not attempt to run ThreeJS setup
    if (!isSupported) return;

    const container = containerRef.current;
    if (!container) return;

    let geometry: THREE.PlaneGeometry | null = null;
    let material: THREE.ShaderMaterial | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let animationFrameId: number | null = null;

    try {
      // Scene Setup
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      
      renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true 
      });
      
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Uniforms
      const uniforms = {
        u_time: { value: 1.0 },
        u_mouse: { value: new THREE.Vector2(0, 0) },
        u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        u_color1: { value: new THREE.Color('#0452C8') }, // Primary
        u_color2: { value: new THREE.Color('#FE5750') }, // Secondary
      };

      // Geometry & Material
      geometry = new THREE.PlaneGeometry(2, 2);
      material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader: `
          uniform float u_time;
          uniform vec2 u_mouse;
          uniform vec2 u_resolution;
          uniform vec3 u_color1;
          uniform vec3 u_color2;
          varying vec2 vUv;

          // Simple noise
          vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

          float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy));
            vec2 x0 = v - i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m;
            m = m*m;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 a0 = x - floor(x + 0.5);
            vec3 m0 = 1.0 - 1.11477150180554 * (a0*a0 + h*h);
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
          }

          void main() {
            vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.y, u_resolution.x);
            vec2 m = (u_mouse.xy / u_resolution.xy) * 2.0 - 1.0;
            
            float t = u_time * 0.1;
            
            // Mouse influence
            float d = length(p - m * 0.5);
            float mouseInfluence = smoothstep(0.8, 0.0, d) * 0.5;
            
            // Create multiple layers of noise
            float n = snoise(p * 0.4 + t + mouseInfluence);
            n += 0.4 * snoise(p * 0.8 - t * 0.4 - mouseInfluence * 0.3);
            
            float mixFactor = n * 0.5 + 0.5;
            mixFactor = smoothstep(0.1, 0.9, mixFactor);
            
            vec3 color = mix(u_color1, u_color2, mixFactor);
            
            // Add highlight around mouse
            color += vec3(0.05, 0.08, 0.1) * mouseInfluence;
            
            gl_FragColor = vec4(color, 1.0);
          }
        `,
      });

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // Resize Handler
      const handleResize = () => {
        if (!renderer) return;
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setSize(width, height);
        uniforms.u_resolution.value.set(width, height);
      };

      // Mouse Handler
      const handleMouseMove = (e: MouseEvent) => {
        uniforms.u_mouse.value.x = e.clientX;
        uniforms.u_mouse.value.y = window.innerHeight - e.clientY;
      };

      window.addEventListener('resize', handleResize);
      window.addEventListener('mousemove', handleMouseMove);

      // Animation Loop
      const animate = (time: number) => {
        if (!renderer) return;
        uniforms.u_time.value = time * 0.001;
        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(animate);
      };

      animationFrameId = requestAnimationFrame(animate);

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMouseMove);
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
        }
        if (geometry) geometry.dispose();
         if (material) material.dispose();
        if (renderer) {
          renderer.dispose();
          if (container && renderer.domElement && container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
          }
        }
      };
    } catch (err) {
      console.error("Failed to render ThreeJS flow shader:", err);
    }
  }, [isSupported]);

  if (!isSupported) {
    return (
      <div 
        className="fixed inset-0 -z-50 pointer-events-none opacity-20 bg-gradient-to-tr from-blue-400 via-indigo-100 to-red-100"
        style={{ filter: 'blur(60px)' }}
      />
    );
  }

  return (
    <div 
      id="flow-shader-container"
      ref={containerRef}
      className="fixed inset-0 -z-50 pointer-events-none opacity-30"
      style={{ filter: 'blur(60px)' }}
    />
  );
};
