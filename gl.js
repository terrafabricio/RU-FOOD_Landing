// RU-FOOD · Landing — camada WebGL do hero.
// 1) Shader puro (fbm + grão) com as cores da marca atrás do título.
// 2) GI, a Estagiária, em 3D com Three.js: extrudada do path vetorial real da mascote,
//    olhos que seguem o ponteiro e piscam, contorno creme para destacar no vermelho.
// Sem WebGL ou com "reduzir movimento": fica o gradiente CSS e a GI em SVG.
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fraco = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 8) <= 4;
const toque = matchMedia("(hover: none)").matches;
const ponteiro = { x: 0, y: 0, nx: 0.5, ny: 0.5 };
addEventListener("pointermove", (e) => {
  ponteiro.nx = e.clientX / innerWidth;
  ponteiro.ny = e.clientY / innerHeight;
  ponteiro.x = ponteiro.nx * 2 - 1;
  ponteiro.y = -(ponteiro.ny * 2 - 1);
}, { passive: true });

const raiz = document.documentElement;
const hero = document.querySelector(".hero");
let heroVisivel = true;
new IntersectionObserver(([e]) => (heroVisivel = e.isIntersecting)).observe(hero);

// ---------------------------------------------------------------------------
// 1) Shader de fundo
// ---------------------------------------------------------------------------
function iniciarShader() {
  const canvas = document.querySelector("[data-shader]");
  const gl = canvas?.getContext("webgl", { antialias: false, premultipliedAlpha: false });
  if (!gl) return;

  const vs = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
  const fs = `
    precision highp float;
    uniform vec2 u_res; uniform float u_time; uniform vec2 u_mouse; uniform vec2 u_foco;
    float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
    float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
    float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
    void main(){
      vec2 uv = gl_FragCoord.xy / u_res;
      float asp = u_res.x / u_res.y;
      vec2 p = vec2(uv.x*asp, uv.y);
      float t = u_time * .045;
      vec2 q = vec2(fbm(p*1.5 + t), fbm(p*1.5 - t + 3.1));
      float n = fbm(p*1.7 + q*1.4 + t);
      vec2 foco = u_foco + (u_mouse - .5) * vec2(.05, -.05);
      vec2 d = (uv - foco) * vec2(1., 1. / asp); // distância medida em larguras de tela
      float r = length(d) + (n - .5) * .16;
      float mancha = smoothstep(.30, .0, r);
      float borda = smoothstep(.48, .08, r);
      vec3 mostarda = vec3(1.,.769,.145);
      vec3 chama = vec3(1.,.478,.102);
      vec3 ketchup = vec3(.89,.141,.106);
      vec3 fundo = vec3(.722,.106,.075);
      // Base ketchup, bordas em ketchup-deep e um brilho quente atrás da mascote
      float vinheta = smoothstep(.15, 1.05, length((uv - vec2(.38, .62)) * vec2(asp * .55, 1.)));
      vec3 col = mix(ketchup, fundo, vinheta * .85 + (n - .5) * .18);
      col = mix(col, chama, borda * .32);
      col = mix(col, mostarda, mancha * smoothstep(.4, .85, n) * .38);
      col += (hash(gl_FragCoord.xy + fract(u_time)) - .5) * .035;
      gl_FragColor = vec4(col, 1.);
    }`;
  const compilar = (tipo, src) => {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compilar(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compilar(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (n) => gl.getUniformLocation(prog, n);
  const uRes = u("u_res"), uTime = u("u_time"), uMouse = u("u_mouse"), uFoco = u("u_foco");

  const palco = document.querySelector(".hero-palco");
  const escala = Math.min(devicePixelRatio, 1.5) * (fraco ? 0.45 : 0.6); // fundo suave: meia resolução basta
  const foco = { x: 0.75, y: 0.7 };
  function medir() {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * escala));
    canvas.height = Math.max(1, Math.round(r.height * escala));
    gl.viewport(0, 0, canvas.width, canvas.height);
    const pr = palco.getBoundingClientRect();
    foco.x = (pr.left + pr.width / 2 - r.left) / r.width;
    foco.y = 1 - (pr.top + pr.height / 2 - r.top) / r.height;
  }
  medir();
  new ResizeObserver(medir).observe(canvas);
  const m = { x: 0.5, y: 0.5 };
  const t0 = performance.now();
  (function quadro(agora) {
    requestAnimationFrame(quadro);
    if (!heroVisivel) return;
    m.x += (ponteiro.nx - m.x) * 0.04;
    m.y += (ponteiro.ny - m.y) * 0.04;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, reduzir ? 0 : (agora - t0) / 1000);
    gl.uniform2f(uMouse, m.x, m.y);
    gl.uniform2f(uFoco, foco.x, foco.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  })(t0);
}

// ---------------------------------------------------------------------------
// 2) GI em 3D
// ---------------------------------------------------------------------------
const FORMA =
  "M24 0H72A6.8 6.8 0 0 0 78.6 8.4 6.8 6.8 0 0 0 84.4 17.6 7.2 7.2 0 0 0 91.4 27 8.2 8.2 0 0 0 100 37.6V76A24 24 0 0 1 76 100H24A24 24 0 0 1 0 76V24A24 24 0 0 1 24 0Z";
const U = 0.02; // 100 unidades do SVG = 2 unidades na cena

function iniciarGI() {
  const caixa = document.querySelector("[data-gi3d]");
  if (!caixa) return;
  const renderer = new THREE.WebGLRenderer({ antialias: !fraco, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, fraco || toque ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  // O canvas vive numa camada fixa: começa sobre o lugar da GI no hero e,
  // com a rolagem, encolhe até o botão do assistente no canto inferior direito.
  const voo = document.createElement("div");
  voo.className = "gi-voo";
  voo.setAttribute("aria-hidden", "true");
  voo.appendChild(renderer.domElement);
  document.body.appendChild(voo);
  const assistente = document.querySelector("[data-assistente]");
  const botaoDock = document.querySelector("[data-assistente-botao]");
  assistente?.classList.add("tem-3d");

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0.1, 7.2);

  const pmrem = new THREE.PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  cena.add(new THREE.HemisphereLight(0xfff4e0, 0x5a2410, 0.6));
  const sol = new THREE.DirectionalLight(0xfff1dc, 1.6);
  sol.position.set(-3, 4, 5);
  cena.add(sol);
  const contra = new THREE.PointLight(0xffc425, 34, 12);
  contra.position.set(2.6, 1.8, -2);
  cena.add(contra);

  // Corpo: squircle com a mordida, extrudado
  const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${FORMA}"/></svg>`);
  const formas = SVGLoader.createShapes(svg.paths[0]);
  const geo = new THREE.ExtrudeGeometry(formas, {
    depth: 30, curveSegments: 48, bevelEnabled: true,
    bevelThickness: 5, bevelSize: 2.2, bevelOffset: 0, bevelSegments: 8,
  });
  geo.translate(-50, -50, -15);
  geo.scale(U, -U, -U); // SVG tem Y para baixo; duas escalas negativas preservam a orientação das faces
  geo.computeVertexNormals();
  const corpoMat = new THREE.MeshPhysicalMaterial({
    color: 0xe3241b, roughness: 0.4, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3,
    envMapIntensity: 0.35,
  });
  const gi = new THREE.Group();
  const corpo = new THREE.Mesh(geo, corpoMat);
  gi.add(corpo);
  // Contorno creme de adesivo: o mesmo corpo um pouco maior, só com as faces de trás
  const contorno = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xfbf6ee, side: THREE.BackSide }));
  contorno.scale.set(1.075, 1.075, 1.12);
  gi.add(contorno);

  // Olhos: cápsulas marrom-chapa na face da frente
  const frente = 15 * U + 5 * U;
  const olhoGeo = new THREE.CapsuleGeometry(5.1 * U, (18.5 - 10.2) * U, 10, 24);
  const olhoMat = new THREE.MeshStandardMaterial({ color: 0x1c1514, roughness: 0.35, metalness: 0.05, envMapIntensity: 0.6 });
  const olhos = new THREE.Group();
  const olhoE = new THREE.Mesh(olhoGeo, olhoMat);
  const olhoD = new THREE.Mesh(olhoGeo, olhoMat);
  olhoE.position.x = -8.5 * U;
  olhoD.position.x = 8.5 * U;
  [olhoE, olhoD].forEach((o) => o.scale.set(1, 1, 0.38));
  olhos.add(olhoE, olhoD);
  olhos.position.z = frente - 0.005;
  gi.add(olhos);
  cena.add(gi);

  // Sombra macia no "chão"
  const sc = document.createElement("canvas");
  sc.width = sc.height = 128;
  const sx = sc.getContext("2d");
  const grad = sx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(90,20,8,.45)");
  grad.addColorStop(1, "rgba(90,20,8,0)");
  sx.fillStyle = grad;
  sx.fillRect(0, 0, 128, 128);
  const sombra = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.9),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }),
  );
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = -1.55;
  cena.add(sombra);


  // Tamanho: a camada fixa tem o tamanho do lugar da GI no hero
  const base = { w: 1, h: 1 };
  function medir() {
    const r = caixa.getBoundingClientRect();
    base.w = Math.max(1, r.width);
    base.h = Math.max(1, r.height);
    voo.style.width = base.w + "px";
    voo.style.height = base.h + "px";
    renderer.setSize(base.w, base.h, false);
    camera.aspect = base.w / base.h;
    // Mantém a GI inteira mesmo em telas estreitas
    camera.position.z = camera.aspect < 1 ? 7.2 / Math.max(0.62, camera.aspect) : 7.2;
    camera.updateProjectionMatrix();
  }
  medir();
  new ResizeObserver(medir).observe(caixa);

  // Voo: do hero ao canto, guiado pela rolagem
  const suave = (x) => x * x * (3 - 2 * x);
  let ancorada = false;
  function voar() {
    const rolado = window.__rolagem ? window.__rolagem() : scrollY;
    const p = suave(Math.min(1, Math.max(0, rolado / (hero.offsetHeight * 0.62))));
    raiz.style.setProperty("--voo", p.toFixed(3));
    const r = caixa.getBoundingClientRect();
    const de = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    let para = de, escalaFinal = 1;
    if (assistente && botaoDock) {
      const a = assistente.getBoundingClientRect();
      const lado = botaoDock.offsetWidth || 68;
      para = { x: a.right - lado / 2, y: a.bottom - lado / 2 };
      // Fração da altura do canvas ocupada pela GI (corpo + contorno)
      const visivel = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const fracao = 2.35 / visivel;
      escalaFinal = (lado / fracao) / base.h;
    }
    const s = 1 + (escalaFinal - 1) * p;
    // Um arco leve no meio do caminho
    const cx = de.x + (para.x - de.x) * p;
    const cy = de.y + (para.y - de.y) * p - Math.sin(p * Math.PI) * 60;
    voo.style.transform = `translate3d(${(cx - (base.w * s) / 2).toFixed(1)}px, ${(cy - (base.h * s) / 2).toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
    const agoraAncorada = p > 0.985;
    if (agoraAncorada !== ancorada) {
      ancorada = agoraAncorada;
      raiz.classList.toggle("gi-ancorada", ancorada);
    }
    return p;
  }

  // Reações: pulinho ao tocar, olhar para o painel quando ele abre
  let puloEm = -10;
  let painelAberto = false;
  addEventListener("gi:toque", () => (puloEm = relogio.getElapsedTime()));
  addEventListener("gi:painel", (e) => (painelAberto = !!e.detail?.aberto));

  // Animação
  const alvo = { rx: 0, ry: 0, ox: 0, oy: 0 };
  let proximaPiscada = performance.now() + 1500;
  let piscouEm = -1;
  const relogio = new THREE.Clock();
  caixa.classList.add("is-3d");
  // Se o navegador derrubar o WebGL, a GI em SVG volta para o lugar
  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    caixa.classList.remove("is-3d");
    assistente?.classList.remove("tem-3d");
    voo.remove();
  });

  (function quadro(agora) {
    requestAnimationFrame(quadro);
    const t = relogio.getElapsedTime();
    const p = voar();

    // Giro durante o voo; no hero segue o mouse (no celular, balança sozinha)
    const olharMouse = toque ? Math.sin(t * 0.55) * 0.35 : ponteiro.x * 0.45;
    alvo.ry = olharMouse * (1 - p * 0.4) + Math.sin(p * Math.PI) * 0.85;
    alvo.rx = -ponteiro.y * 0.28 * (1 - p * 0.4) + Math.sin(p * Math.PI) * 0.2;
    gi.rotation.y += (alvo.ry - gi.rotation.y) * 0.08;
    gi.rotation.x += (alvo.rx - gi.rotation.x) * 0.08;
    const pulo = t - puloEm < 0.6 ? Math.sin(((t - puloEm) / 0.6) * Math.PI) : 0;
    gi.rotation.z = Math.sin(t * 0.7) * 0.04 + pulo * 0.12;
    gi.position.y = Math.sin(t * 1.1) * 0.08 + pulo * 0.45;
    sombra.scale.setScalar(1 - Math.sin(t * 1.1) * 0.06);
    sombra.material.opacity = Math.max(0, 1 - p * 3);

    // Olhar: segue o ponteiro, sem invadir a mordida; com o painel aberto, olha para ele
    let ox = ponteiro.x * 0.17, oy = ponteiro.y * 0.15;
    if (painelAberto) { ox = -0.14; oy = 0.12; }
    if (ox > 0.08 && oy > 0.04) { ox *= 0.7; oy *= 0.5; }
    alvo.ox += (ox - alvo.ox) * 0.12;
    alvo.oy += (oy - alvo.oy) * 0.12;
    olhos.position.x = alvo.ox;
    olhos.position.y = alvo.oy;

    // Piscadas
    if (agora > proximaPiscada) { piscouEm = agora; proximaPiscada = agora + 2400 + Math.random() * 3000; }
    const pp = (agora - piscouEm) / 180;
    const palpebra = pp >= 0 && pp <= 1 ? 1 - Math.sin(pp * Math.PI) * 0.9 : 1;
    olhoE.scale.y = olhoD.scale.y = palpebra;

    renderer.render(cena, camera);
  })(performance.now());
}

function temWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

if (temWebGL() && !reduzir) {
  try { iniciarShader(); } catch (e) { console.warn("Shader desativado:", e); }
  try { iniciarGI(); } catch (e) { console.warn("GI 3D desativada:", e); }
}
