// ==== WebGL пост-обработка: bloom + грейдинг + CRT-вайб ====
const VS = `attribute vec2 p; varying vec2 uv;
void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;

const BRIGHT_FS = `precision mediump float; varying vec2 uv; uniform sampler2D tex;
void main(){ vec3 c = texture2D(tex,uv).rgb;
 float l = dot(c, vec3(0.299,0.587,0.114));
 float w = smoothstep(0.55,0.85,l);
 gl_FragColor = vec4(c*w,1.); }`;

const BLUR_FS = `precision mediump float; varying vec2 uv; uniform sampler2D tex; uniform vec2 dir;
void main(){ vec3 s = texture2D(tex,uv).rgb*0.227;
 s += (texture2D(tex,uv+dir*1.384).rgb + texture2D(tex,uv-dir*1.384).rgb)*0.316;
 s += (texture2D(tex,uv+dir*3.230).rgb + texture2D(tex,uv-dir*3.230).rgb)*0.070;
 gl_FragColor = vec4(s,1.); }`;

const COMP_FS = `precision mediump float; varying vec2 uv;
uniform sampler2D scene, light, bloom; uniform float time, dark;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec2 q = uv;
  // лёгкая хроматика по краям
  vec2 cc = q-0.5; float r2 = dot(cc,cc);
  vec3 sc;
  sc.r = texture2D(scene, q+cc*0.004*r2).r;
  sc.g = texture2D(scene, q).g;
  sc.b = texture2D(scene, q-cc*0.004*r2).b;
  vec4 li = texture2D(light, q);
  vec3 bl = texture2D(bloom, q).rgb;
  vec3 col = sc*(1.0-li.a) + li.rgb*li.a;   // ночная тень
  col += bl*0.85;                            // bloom
  // тёплый грейдинг
  col = pow(col, vec3(0.96,1.0,1.05));
  float luma = dot(col, vec3(0.333));
  col = mix(vec3(luma), col, 1.12);
  col += vec3(0.03,0.02,0.0)* (1.0-dark);    // дневное тепло
  col += vec3(0.01,0.02,0.05)* dark;         // ночная прохлада
  // виньетка
  float vig = smoothstep(0.95,0.35,length(cc)*1.1);
  col *= mix(0.75,1.0,vig);
  // зерно
  col += (hash(q*vec2(1920.,1080.)+time)*2.0-1.0)*0.028;
  // сканлайны едва заметные
  col *= 1.0 - 0.05*sin(q.y*1080.0*3.14159);
  gl_FragColor = vec4(col,1.);
}`;

function sh(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
  return s;
}
function prog(gl, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(p, sh(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p); return p;
}

export function createPostFX(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return null;
  const pBright = prog(gl, BRIGHT_FS), pBlur = prog(gl, BLUR_FS), pComp = prog(gl, COMP_FS);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  function makeTex(w, h) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function makeFBO(t) {
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return f;
  }
  let sceneT = makeTex(2, 2), lightT = makeTex(2, 2);
  let bw = 2, bh = 2, bT1, bT2, bF1, bF2;

  function resize() {
    const w = canvas.width >> 1, h = canvas.height >> 1;
    if (w === bw && h === bh) return;
    bw = w; bh = h;
    if (bT1) { gl.deleteTexture(bT1); gl.deleteTexture(bT2); }
    bT1 = makeTex(bw, bh); bT2 = makeTex(bw, bh);
    bF1 = makeFBO(bT1); bF2 = makeFBO(bT2);
  }

  function quad(p) {
    gl.useProgram(p);
    const loc = gl.getAttribLocation(p, 'p');
    gl.enableVertexAttribArray(loc);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  function upload(tex, source) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPREMULTIPLY_COLORS_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  return {
    render(sceneCanvas, lightCanvas, time, dark) {
      resize();
      // загрузить сцену в sceneT (nearest для пиксельности)
      gl.bindTexture(gl.TEXTURE_2D, sceneT);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sceneCanvas.width, sceneCanvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, sceneCanvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      upload(lightT, lightCanvas);

      // bright
      quad(pBright);
      gl.bindFramebuffer(gl.FRAMEBUFFER, bF1);
      gl.viewport(0, 0, bw, bh);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sceneT);
      gl.uniform1i(gl.getUniformLocation(pBright, 'tex'), 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // blur ping-pong
      quad(pBlur);
      gl.uniform1i(gl.getUniformLocation(pBlur, 'tex'), 0);
      for (let i = 0; i < 2; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, bF2);
        gl.uniform2f(gl.getUniformLocation(pBlur, 'dir'), 1 / bw, 0);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, bT1);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, bF1);
        gl.uniform2f(gl.getUniformLocation(pBlur, 'dir'), 0, 1 / bh);
        gl.bindTexture(gl.TEXTURE_2D, bT2);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      // composite
      quad(pComp);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sceneT);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, lightT);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, bT1);
      gl.uniform1i(gl.getUniformLocation(pComp, 'scene'), 0);
      gl.uniform1i(gl.getUniformLocation(pComp, 'light'), 1);
      gl.uniform1i(gl.getUniformLocation(pComp, 'bloom'), 2);
      gl.uniform1f(gl.getUniformLocation(pComp, 'time'), time);
      gl.uniform1f(gl.getUniformLocation(pComp, 'dark'), dark);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
