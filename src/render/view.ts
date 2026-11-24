// The WebGL view: renderer, camera, sky, fog and sun/hemisphere lighting driven by `LightState`.
import {
  BackSide,
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  Mesh,
  NeutralToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { clamp } from '../core/util';
import type { LightState } from '../world/lighting';

/** Lights are specified in "albedo-relative" units; Three's physical lights need a factor of pi. */
const PI = Math.PI;

const SKY_VS = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w * 0.9999;
}`;

const SKY_FS = /* glsl */ `
varying vec3 vDir;
uniform vec3 uTop; uniform vec3 uBot; uniform vec3 uToSun; uniform vec3 uGlow; uniform float uNight;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main() {
  vec3 dir = normalize(vDir);
  float t = smoothstep(-0.04, 0.6, dir.y);
  vec3 col = mix(uBot, uTop, t);
  float sd = max(dot(dir, uToSun), 0.0);
  col += uGlow * (pow(sd, 64.0) * 1.1 + pow(sd, 7.0) * 0.16);
  vec3 g = floor(dir * 110.0);
  float star = step(0.9965, hash(g)) * uNight * smoothstep(0.08, 0.35, dir.y);
  col += vec3(star);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export interface CameraRig {
  eye: [number, number, number];
  target: [number, number, number];
}

export class GameView {
  readonly scene = new Scene();
  readonly renderer: WebGLRenderer;
  readonly camera = new PerspectiveCamera((0.9 * 180) / PI, 1, 0.4, 320);
  private readonly sun = new DirectionalLight(0xffffff, 1);
  private readonly hemi = new HemisphereLight(0xffffff, 0x444444, 1);
  private readonly sky: Mesh;
  private readonly skyMat: ShaderMaterial;
  private quality = 1;
  private readonly tmp = new Vector3();
  private readonly color = new Color();

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    // Khronos neutral tone mapping keeps colours faithful but rolls off blown-out highlights (noon pavement).
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.scene.fog = new FogExp2(0xcfe4f5, 0.0075);

    const s = this.sun.shadow;
    this.sun.castShadow = true;
    s.mapSize.set(2048, 2048);
    s.camera.near = 1;
    s.camera.far = 160;
    s.camera.left = -45;
    s.camera.right = 45;
    s.camera.top = 45;
    s.camera.bottom = -45;
    s.bias = -0.0004;
    s.normalBias = 0.06;
    this.scene.add(this.sun, this.sun.target, this.hemi);

    this.skyMat = new ShaderMaterial({
      vertexShader: SKY_VS,
      fragmentShader: SKY_FS,
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTop: { value: new Color() },
        uBot: { value: new Color() },
        uToSun: { value: new Vector3(0, 1, 0) },
        uGlow: { value: new Color() },
        uNight: { value: 0 },
      },
    });
    this.sky = new Mesh(new SphereGeometry(250, 24, 12), this.skyMat);
    this.sky.renderOrder = -1;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    this.setQuality(1);
  }

  /** 0.6 / 0.85 / 1.2 style multiplier on the device pixel ratio. Low quality also drops shadows. */
  setQuality(q: number): void {
    this.quality = q;
    const shadows = q >= 0.7;
    this.sun.castShadow = shadows;
    this.sun.shadow.mapSize.set(q < 1 ? 1024 : 2048, q < 1 ? 1024 : 2048);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    this.resize(true);
  }

  resize(force = false): void {
    const c = this.canvas;
    const pr = clamp((window.devicePixelRatio || 1) * this.quality, 0.5, 2);
    const w = Math.max(1, c.clientWidth);
    const h = Math.max(1, c.clientHeight);
    if (force || this.renderer.getPixelRatio() !== pr) this.renderer.setPixelRatio(pr);
    const size = this.renderer.getSize(this.tmp as never) as unknown as { x: number; y: number };
    if (force || size.x !== w || size.y !== h) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Apply time-of-day / weather lighting. `focus` is where the shadow-casting sun looks. */
  applyLight(L: LightState, focus: { x: number; z: number }): void {
    const c = this.color;
    const rgb = (target: Color, v: readonly number[], k = 1) => target.setRGB(v[0] * k, v[1] * k, v[2] * k);
    rgb(this.sun.color, L.sunCol);
    this.sun.intensity = PI;
    this.sun.target.position.set(focus.x, 0, focus.z);
    this.sun.position.set(focus.x + L.toSun[0] * 80, Math.max(8, L.toSun[1] * 80), focus.z + L.toSun[2] * 80);
    this.sun.target.updateMatrixWorld();
    rgb(this.hemi.color, L.sky);
    rgb(this.hemi.groundColor, L.ground);
    this.hemi.intensity = PI;
    rgb(c, L.fogCol);
    (this.scene.fog as FogExp2).color.copy(c);
    (this.scene.fog as FogExp2).density = L.fogDen;

    const u = this.skyMat.uniforms;
    rgb(u.uTop.value, L.skyTop);
    rgb(u.uBot.value, L.skyBot);
    rgb(u.uGlow.value, L.sunGlow);
    u.uToSun.value.set(L.toSun[0], L.toSun[1], L.toSun[2]);
    u.uNight.value = L.night;
  }

  render(rig: CameraRig): void {
    this.resize();
    this.camera.position.set(...rig.eye);
    this.camera.lookAt(...rig.target);
    this.sky.position.copy(this.camera.position);
    this.renderer.render(this.scene, this.camera);
  }

  /** World -> CSS pixel coordinates, or null if behind the camera. */
  project(x: number, y: number, z: number): [number, number] | null {
    const v = this.tmp.set(x, y, z).applyMatrix4(this.camera.matrixWorldInverse);
    if (v.z >= -0.1) return null;
    v.applyMatrix4(this.camera.projectionMatrix);
    return [(v.x * 0.5 + 0.5) * this.canvas.clientWidth, (1 - (v.y * 0.5 + 0.5)) * this.canvas.clientHeight];
  }
}
