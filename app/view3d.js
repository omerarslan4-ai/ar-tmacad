/* ArıtmaCAD — hafif WebGL 3B görüntüleyici (kütüphanesiz, birleştirilmiş tamponlar) */
(function (C) {
  'use strict';
  const M = C.M;
  const m4 = {
    persp: (fov, asp, n, f) => { const t = 1 / Math.tan(fov / 2), r = 1 / (n - f); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (n + f) * r, -1, 0, 0, 2 * n * f * r, 0]; },
    ortho: (l, r, b, t, n, f) => [2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1],
    look: (e, c, u) => { const z = M.norm(M.sub(e, c)), x = M.norm(M.cross(u, z)), y = M.cross(z, x); return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -M.dot(x, e), -M.dot(y, e), -M.dot(z, e), 1]; },
    inv: m => {
      const a = m, o = new Array(16);
      o[0] = a[5] * a[10] * a[15] - a[5] * a[11] * a[14] - a[9] * a[6] * a[15] + a[9] * a[7] * a[14] + a[13] * a[6] * a[11] - a[13] * a[7] * a[10];
      o[4] = -a[4] * a[10] * a[15] + a[4] * a[11] * a[14] + a[8] * a[6] * a[15] - a[8] * a[7] * a[14] - a[12] * a[6] * a[11] + a[12] * a[7] * a[10];
      o[8] = a[4] * a[9] * a[15] - a[4] * a[11] * a[13] - a[8] * a[5] * a[15] + a[8] * a[7] * a[13] + a[12] * a[5] * a[11] - a[12] * a[7] * a[9];
      o[12] = -a[4] * a[9] * a[14] + a[4] * a[10] * a[13] + a[8] * a[5] * a[14] - a[8] * a[6] * a[13] - a[12] * a[5] * a[10] + a[12] * a[6] * a[9];
      o[1] = -a[1] * a[10] * a[15] + a[1] * a[11] * a[14] + a[9] * a[2] * a[15] - a[9] * a[3] * a[14] - a[13] * a[2] * a[11] + a[13] * a[3] * a[10];
      o[5] = a[0] * a[10] * a[15] - a[0] * a[11] * a[14] - a[8] * a[2] * a[15] + a[8] * a[3] * a[14] + a[12] * a[2] * a[11] - a[12] * a[3] * a[10];
      o[9] = -a[0] * a[9] * a[15] + a[0] * a[11] * a[13] + a[8] * a[1] * a[15] - a[8] * a[3] * a[13] - a[12] * a[1] * a[11] + a[12] * a[3] * a[9];
      o[13] = a[0] * a[9] * a[14] - a[0] * a[10] * a[13] - a[8] * a[1] * a[14] + a[8] * a[2] * a[13] + a[12] * a[1] * a[10] - a[12] * a[2] * a[9];
      o[2] = a[1] * a[6] * a[15] - a[1] * a[7] * a[14] - a[5] * a[2] * a[15] + a[5] * a[3] * a[14] + a[13] * a[2] * a[7] - a[13] * a[3] * a[6];
      o[6] = -a[0] * a[6] * a[15] + a[0] * a[7] * a[14] + a[4] * a[2] * a[15] - a[4] * a[3] * a[14] - a[12] * a[2] * a[7] + a[12] * a[3] * a[6];
      o[10] = a[0] * a[5] * a[15] - a[0] * a[7] * a[13] - a[4] * a[1] * a[15] + a[4] * a[3] * a[13] + a[12] * a[1] * a[7] - a[12] * a[3] * a[5];
      o[14] = -a[0] * a[5] * a[14] + a[0] * a[6] * a[13] + a[4] * a[1] * a[14] - a[4] * a[2] * a[13] - a[12] * a[1] * a[6] + a[12] * a[2] * a[5];
      o[3] = -a[1] * a[6] * a[11] + a[1] * a[7] * a[10] + a[5] * a[2] * a[11] - a[5] * a[3] * a[10] - a[9] * a[2] * a[7] + a[9] * a[3] * a[6];
      o[7] = a[0] * a[6] * a[11] - a[0] * a[7] * a[10] - a[4] * a[2] * a[11] + a[4] * a[3] * a[10] + a[8] * a[2] * a[7] - a[8] * a[3] * a[6];
      o[11] = -a[0] * a[5] * a[11] + a[0] * a[7] * a[9] + a[4] * a[1] * a[11] - a[4] * a[3] * a[9] - a[8] * a[1] * a[7] + a[8] * a[3] * a[5];
      o[15] = a[0] * a[5] * a[10] - a[0] * a[6] * a[9] - a[4] * a[1] * a[10] + a[4] * a[2] * a[9] + a[8] * a[1] * a[6] - a[8] * a[2] * a[5];
      let det = a[0] * o[0] + a[1] * o[4] + a[2] * o[8] + a[3] * o[12]; if (!det) return null; det = 1 / det;
      return o.map(v => v * det);
    },
    xf: (m, v) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * v[3], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * v[3], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * v[3], m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * v[3]],
    mul: (a, b) => { const o = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; },
  };
  /* gerçekçi gölgeleme: güneş (sıcak) + karşı dolgu ışığı + gök/zemin yarıküre ortam ışığı; yüzeylerde hafif malzeme dokusu (beton benekleri) */
  const VS = `attribute vec3 p;attribute vec3 n;attribute vec3 c;uniform mat4 mvp;uniform vec3 ld;uniform float lit;varying vec3 vc;varying vec3 wp;varying float vl;
void main(){wp=p;gl_Position=mvp*vec4(p,1.0);vec3 nn=normalize(n);float d=max(dot(nn,ld),0.0);float f=max(dot(nn,normalize(vec3(-ld.x,-ld.y,0.35))),0.0);float h=0.5+0.5*nn.z;
vec3 L=vec3(1.0,0.97,0.9)*0.62*d+vec3(0.85,0.9,1.0)*0.16*f+mix(vec3(0.30,0.29,0.27),vec3(0.42,0.45,0.50),h);vl=lit;vc=lit>0.5?c*L:c;}`;
  const FS = `precision highp float;varying vec3 vc;varying vec3 wp;varying float vl;uniform float al;uniform vec4 cp;uniform float cpOn;uniform float tex;uniform vec4 ov;uniform float inv;
float hs(vec3 q){return fract(sin(dot(q,vec3(12.9898,78.233,37.719)))*43758.5453);}
void main(){if(cpOn>0.5&&dot(cp.xyz,wp)+cp.w<0.0)discard;vec3 col=vc;
if(vl>0.5&&tex>0.5){vec3 q=wp*14.0;float nz=hs(floor(q))*0.6+hs(floor(q*0.37))*0.4;col*=0.955+0.07*nz;}
if(ov.a>0.5)col=ov.rgb;
if(inv>0.5&&vl<0.5){float lum=dot(col,vec3(0.299,0.587,0.114));float sat=max(col.r,max(col.g,col.b))-min(col.r,min(col.g,col.b));if(lum>0.82&&sat<0.2)col=vec3(0.08);}
gl_FragColor=vec4(col,al);}`;
  /* malzeme dokulu yüzeyler: renk dokusu + eğim (bump) haritası, piksel başına ışık */
  const TVS = `attribute vec3 p;attribute vec3 n;attribute vec2 uv;attribute vec3 tg;uniform mat4 mvp;varying vec3 wp;varying vec3 vn;varying vec2 vuv;varying vec3 vt;
void main(){wp=p;vn=n;vuv=uv;vt=tg;gl_Position=mvp*vec4(p,1.0);}`;
  const TFS = `precision highp float;varying vec3 wp;varying vec3 vn;varying vec2 vuv;varying vec3 vt;uniform sampler2D tc;uniform sampler2D tn;uniform vec3 ld;uniform float al;uniform vec4 cp;uniform float cpOn;uniform float bump;
void main(){if(cpOn>0.5&&dot(cp.xyz,wp)+cp.w<0.0)discard;vec3 N=normalize(vn);vec3 T=vt-N*dot(vt,N);T=length(T)>1e-5?normalize(T):vec3(1.0,0.0,0.0);vec3 B=cross(N,T);
vec2 s=texture2D(tn,vuv).rg*2.0-1.0;vec3 nn=normalize(N-bump*1.6*(T*s.x+B*s.y));
float d=max(dot(nn,ld),0.0);float f=max(dot(nn,normalize(vec3(-ld.x,-ld.y,0.35))),0.0);float h=0.5+0.5*nn.z;
vec3 L=vec3(1.0,0.97,0.9)*0.62*d+vec3(0.85,0.9,1.0)*0.16*f+mix(vec3(0.30,0.29,0.27),vec3(0.42,0.45,0.50),h);
vec3 c=texture2D(tc,vuv).rgb;gl_FragColor=vec4(c*L,al);}`;
  /* su: yarı saydam, hafif dalga (normal sapması + parıltı), havalandırmada köpük */
  const WVS = `attribute vec3 p;attribute vec3 n;attribute vec3 c;uniform mat4 mvp;varying vec3 wp;varying vec3 vn;varying vec3 vc;void main(){wp=p;vn=n;vc=c;gl_Position=mvp*vec4(p,1.0);}`;
  const WFS = `precision highp float;varying vec3 wp;varying vec3 vn;varying vec3 vc;uniform vec3 ld;uniform vec3 eye;uniform float tm;uniform float al;uniform float foam;uniform float wa;uniform vec4 cp;uniform float cpOn;
void main(){if(cpOn>0.5&&dot(cp.xyz,wp)+cp.w<0.0)discard;vec3 N=normalize(vn);float top=N.z>0.8?1.0:0.0;vec2 q=wp.xy;float t=tm;
if(top>0.5){float dx=cos(q.x*1.7+t*1.1)*0.85+cos((q.x*0.8+q.y*1.4)*3.0+t*2.1)*0.36+cos(q.x*5.3-q.y*2.1+t*2.9)*0.18;float dy=cos(q.y*2.3-t*1.3)*0.8+cos((q.x*0.8+q.y*1.4)*3.0+t*2.1)*0.63+sin(q.y*4.7+t*2.3)*0.15;N=normalize(vec3(-dx*0.06*wa,-dy*0.06*wa,1.0));}
vec3 V=normalize(eye-wp);float d=max(dot(N,ld),0.0);vec3 R=reflect(-ld,N);float sp=pow(max(dot(R,V),0.0),70.0)*0.55*top;float fr=pow(1.0-max(dot(N,V),0.0),3.0)*top;
vec3 col=vc*(0.62+0.42*d)+vec3(0.75,0.85,0.95)*fr*0.35+vec3(1.0)*sp;
if(foam>0.5&&top>0.5){vec2 g=floor(q*14.0+vec2(t*0.6,t*0.35));float r=fract(sin(dot(g,vec2(12.9898,78.233)))*43758.5453);if(r>0.9)col=mix(col,vec3(0.93,0.92,0.88),0.65);}
gl_FragColor=vec4(col,top>0.5?al:al*0.8);}`;
  /* arka plan: gökyüzü / ufuk / zemin (SketchUp benzeri), beyaz ya da siyah */
  const BVS = `attribute vec2 q;varying vec2 v;void main(){v=q;gl_Position=vec4(q,0.9999,1.0);}`;
  const BFS = `precision highp float;varying vec2 v;uniform mat4 imvp;uniform vec3 eye;uniform float mode;
void main(){vec4 a=imvp*vec4(v,-1.0,1.0);vec4 b=imvp*vec4(v,1.0,1.0);vec3 pa=a.xyz/a.w,pb=b.xyz/b.w;vec3 d=normalize(pb-pa);
if(mode<0.5){float t=clamp(d.z,0.0,1.0);vec3 sky=mix(vec3(0.94,0.96,0.98),vec3(0.62,0.76,0.92),pow(t,0.55));vec3 gr=mix(vec3(0.80,0.79,0.75),vec3(0.66,0.66,0.62),clamp(-d.z*3.0,0.0,1.0));
gl_FragColor=vec4(d.z>=0.0?sky:gr,1.0);}else if(mode<1.5){gl_FragColor=vec4(1.0,1.0,1.0,1.0);}else{gl_FragColor=vec4(0.11,0.12,0.14,1.0);}}`;

  class View3D {
    constructor(canvas) {
      this.cv = canvas;
      const gl = this.gl = canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: true });
      if (!gl) { this.failed = true; return; }
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o)); return o; };
      const pr = this.pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
      this.loc = { p: gl.getAttribLocation(pr, 'p'), n: gl.getAttribLocation(pr, 'n'), c: gl.getAttribLocation(pr, 'c'), mvp: gl.getUniformLocation(pr, 'mvp'), ld: gl.getUniformLocation(pr, 'ld'), lit: gl.getUniformLocation(pr, 'lit'), al: gl.getUniformLocation(pr, 'al'), cp: gl.getUniformLocation(pr, 'cp'), cpOn: gl.getUniformLocation(pr, 'cpOn') };
      this.loc.tex = gl.getUniformLocation(pr, 'tex'); this.loc.ov = gl.getUniformLocation(pr, 'ov'); this.loc.inv = gl.getUniformLocation(pr, 'inv');
      const tp = this.tp = gl.createProgram(); gl.attachShader(tp, sh(gl.VERTEX_SHADER, TVS)); gl.attachShader(tp, sh(gl.FRAGMENT_SHADER, TFS)); gl.linkProgram(tp);
      this.tloc = { p: gl.getAttribLocation(tp, 'p'), n: gl.getAttribLocation(tp, 'n'), uv: gl.getAttribLocation(tp, 'uv'), tg: gl.getAttribLocation(tp, 'tg'), mvp: gl.getUniformLocation(tp, 'mvp'), ld: gl.getUniformLocation(tp, 'ld'), al: gl.getUniformLocation(tp, 'al'), cp: gl.getUniformLocation(tp, 'cp'), cpOn: gl.getUniformLocation(tp, 'cpOn'), bump: gl.getUniformLocation(tp, 'bump'), tc: gl.getUniformLocation(tp, 'tc'), tn: gl.getUniformLocation(tp, 'tn') };
      this.anis = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic'); this.gltex = new Map(); this.matBufs = [];
      const wpg = this.wp = gl.createProgram(); gl.attachShader(wpg, sh(gl.VERTEX_SHADER, WVS)); gl.attachShader(wpg, sh(gl.FRAGMENT_SHADER, WFS)); gl.linkProgram(wpg);
      this.wloc = { p: gl.getAttribLocation(wpg, 'p'), n: gl.getAttribLocation(wpg, 'n'), c: gl.getAttribLocation(wpg, 'c'), mvp: gl.getUniformLocation(wpg, 'mvp'), ld: gl.getUniformLocation(wpg, 'ld'), eye: gl.getUniformLocation(wpg, 'eye'), tm: gl.getUniformLocation(wpg, 'tm'), al: gl.getUniformLocation(wpg, 'al'), foam: gl.getUniformLocation(wpg, 'foam'), wa: gl.getUniformLocation(wpg, 'wa'), cp: gl.getUniformLocation(wpg, 'cp'), cpOn: gl.getUniformLocation(wpg, 'cpOn') }; this.waterBufs = [];
      const bp = this.bp = gl.createProgram(); gl.attachShader(bp, sh(gl.VERTEX_SHADER, BVS)); gl.attachShader(bp, sh(gl.FRAGMENT_SHADER, BFS)); gl.linkProgram(bp);
      this.bloc = { q: gl.getAttribLocation(bp, 'q'), imvp: gl.getUniformLocation(bp, 'imvp'), eye: gl.getUniformLocation(bp, 'eye'), mode: gl.getUniformLocation(bp, 'mode') };
      this.bq = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.bq); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      this.buf = { tri: null, line: null, grid: null }; this.trans = [];
      this.yaw = -55 * Math.PI / 180; this.pitch = 32 * Math.PI / 180; this.dist = 50; this.t = [0, 0, 0];
      this.elev = 0; this.plane = 'OTO'; this.orbitLeft = false; this.infer = true; this.shift = false; this.cursor = null; this.snapHit = null; this.cands = [];
      this.persp = true; this.edges = true; this.showLines = true; this.dirty = true; this.needBuild = true; this.origin = [0, 0, 0];
      this.ovc = document.createElement('canvas'); this.ovc.className = 'v3ov'; canvas.parentElement.appendChild(this.ovc);
      this.bind();
      const loop = () => { if (this.ovc.style.display !== (this.visible() ? '' : 'none')) this.ovc.style.display = this.visible() ? '' : 'none'; if (this.visible()) { if (this.needBuild) this.build(); if (this.waterBufs && this.waterBufs.length && C.state.v3wave !== false) { const tn = performance.now(); if (!this._wt || tn - this._wt > 40) { this._wt = tn; this.dirty = true; } } if (this.dirty) { this.dirty = false; this.draw(); } } requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
    visible() { return this.cv.offsetParent !== null; }
    resize() { const r = this.cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; this.W = r.width; this.H = r.height; this.cv.width = Math.max(1, r.width * d); this.cv.height = Math.max(1, r.height * d); if (this.ovc) { this.ovc.width = this.cv.width; this.ovc.height = this.cv.height; } this.dirty = true; }
    invalidate() { this.needBuild = true; this.dirty = true; }
    drawWater(mvp, ld) {
      const gl = this.gl, L = this.wloc, ey = this.eye(); gl.useProgram(this.wp); gl.uniformMatrix4fv(L.mvp, false, new Float32Array(mvp)); gl.uniform3f(L.ld, ld[0], ld[1], ld[2]); gl.uniform3f(L.eye, ey[0], ey[1], ey[2]);
      gl.uniform1f(L.tm, C.state.v3wave === false ? 0 : performance.now() / 1000); gl.uniform1f(L.cpOn, this.clip ? 1 : 0); if (this.clip) gl.uniform4f(L.cp, this.clip[0], this.clip[1], this.clip[2], this.clip[3]);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      for (const w of this.waterBufs) { gl.uniform1f(L.al, w.al); gl.uniform1f(L.foam, w.foam); gl.uniform1f(L.wa, w.wa); gl.bindBuffer(gl.ARRAY_BUFFER, w.b.b);
        gl.enableVertexAttribArray(L.p); gl.vertexAttribPointer(L.p, 3, gl.FLOAT, false, 36, 0); gl.enableVertexAttribArray(L.n); gl.vertexAttribPointer(L.n, 3, gl.FLOAT, false, 36, 12); gl.enableVertexAttribArray(L.c); gl.vertexAttribPointer(L.c, 3, gl.FLOAT, false, 36, 24); gl.drawArrays(gl.TRIANGLES, 0, w.b.n); }
      gl.depthMask(true); gl.disable(gl.BLEND); gl.useProgram(this.pr);
    }
    texFor(k) { // malzeme dokusu → GL dokuları (renk + eğim), tekrarlı, mipmap
      if (this.gltex.has(k)) return this.gltex.get(k); const im = C.dokuImages && C.dokuImages(k); if (!im) return null; const gl = this.gl;
      const mkT = (cv) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); if (this.anis) gl.texParameterf(gl.TEXTURE_2D, this.anis.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(this.anis.MAX_TEXTURE_MAX_ANISOTROPY_EXT))); return t; };
      const r = { tc: mkT(im.col), tn: mkT(im.slope) }; this.gltex.set(k, r); return r;
    }
    drawMat(mvp, ld, xa) {
      const gl = this.gl, L = this.tloc; gl.useProgram(this.tp); gl.uniformMatrix4fv(L.mvp, false, new Float32Array(mvp)); gl.uniform3f(L.ld, ld[0], ld[1], ld[2]);
      gl.uniform1f(L.cpOn, this.clip ? 1 : 0); if (this.clip) gl.uniform4f(L.cp, this.clip[0], this.clip[1], this.clip[2], this.clip[3]);
      gl.uniform1i(L.tc, 0); gl.uniform1i(L.tn, 1); gl.uniform1f(L.al, xa > 0.001 ? 1 - xa : 1);
      if (xa > 0.001) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); }
      for (const mb of this.matBufs) {
        const tx = this.texFor(mb.k); if (!tx) continue;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tx.tc); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tx.tn); gl.activeTexture(gl.TEXTURE0);
        gl.uniform1f(L.bump, mb.bump);
        gl.bindBuffer(gl.ARRAY_BUFFER, mb.b.b);
        gl.enableVertexAttribArray(L.p); gl.vertexAttribPointer(L.p, 3, gl.FLOAT, false, 44, 0);
        gl.enableVertexAttribArray(L.n); gl.vertexAttribPointer(L.n, 3, gl.FLOAT, false, 44, 12);
        gl.enableVertexAttribArray(L.uv); gl.vertexAttribPointer(L.uv, 2, gl.FLOAT, false, 44, 24);
        gl.enableVertexAttribArray(L.tg); gl.vertexAttribPointer(L.tg, 3, gl.FLOAT, false, 44, 32);
        gl.drawArrays(gl.TRIANGLES, 0, mb.b.n);
      }
      gl.disableVertexAttribArray(L.uv); gl.disableVertexAttribArray(L.tg);
      if (xa > 0.001) { gl.depthMask(true); gl.disable(gl.BLEND); }
      gl.useProgram(this.pr);
    }
    makeBuf(arrs, stride) { const gl = this.gl; const data = new Float32Array(arrs); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return { b, n: data.length / stride }; }
    build() {
      this.needBuild = false; if (!C.doc) return;
      this.hoverFace = null; this.hoverEnt = null; this.hoverId = null;
      const gl = this.gl; for (const k in this.buf) if (this.buf[k]) gl.deleteBuffer(this.buf[k].b); for (const tb of this.trans || []) gl.deleteBuffer(tb.b.b); this.trans = []; const transT = new Map(); const matT = new Map(); const waterT = new Map(); for (const wb of this.waterBufs || []) gl.deleteBuffer(wb.b.b); this.waterBufs = []; for (const mb of this.matBufs || []) gl.deleteBuffer(mb.b.b); this.matBufs = [];
      const bb = C.extents() || [0, 0, 10, 10];
      // sahne merkezi sabit kalır (yeni çizimde nesneler kaymasın); yalnız çok uzaklaşınca (hassasiyet için) taşınır ve kamera telafi edilir
      const cen = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2, 0], prevO = this.origin;
      if (!this.originSet || M.dist2(cen, prevO) > 5000) { if (this.originSet) this.t = [this.t[0] + prevO[0] - cen[0], this.t[1] + prevO[1] - cen[1], this.t[2]]; this.origin = cen; this.originSet = true; }
      const o = this.origin;
      const tri = [], lin = [], linX = []; let zmin = 0, zmax = 0; // linX: sonsuz yardımcı çizgiler (XLINE) — model sınırına / tümünü göstere katılmaz
      const colOf = aci => { const c = C.aciRgb(aci === 7 ? 9 : aci); return [c[0] / 255, c[1] / 255, c[2] / 255]; };
      const skip2d = new Set(['sheet', 'dim', 'kot', 'text']);
      const selIds = new Set((C.sel || []).map(e => e.id)), SEL = [0.3, 0.65, 1];
      const pk = { pos: [], nrm: [], ent: [], rng: [] }, boxes = [], segs = [], esegs = [], don = [], dpos = [], dsegs = [];
      const bbOf = () => [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      const bbAdd = (b, x, y, z) => { if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (z < b[2]) b[2] = z; if (x > b[3]) b[3] = x; if (y > b[4]) b[4] = y; if (z > b[5]) b[5] = z; };
      for (const e of C.doc.ents) {
        if (!C.layer(e.layer).on) continue;
        const t = C.entTris(e), isSel = selIds.has(e.id);
        const col = colOf(C.entColor(e)), b3 = bbOf();
        { // çok parçalı nesne (3B donatı): üçgen yerine çizgi — ayrı tampon, yakalama adayı üretmez
          const L3 = C.T[e.type] && C.T[e.type].lines3, l3 = L3 ? L3(e, isSel) : null;
          if (l3) { const c = isSel ? SEL : (l3.col || col), q = l3.seg, i0 = dpos.length; for (let i = 0; i < q.length; i += 6) { don.push(q[i] - o[0], q[i + 1] - o[1], q[i + 2], 0, 0, 1, c[0], c[1], c[2], q[i + 3] - o[0], q[i + 4] - o[1], q[i + 5], 0, 0, 1, c[0], c[1], c[2]); dpos.push(q[i], q[i + 1], q[i + 2], q[i + 3], q[i + 4], q[i + 5]); bbAdd(b3, q[i], q[i + 1], q[i + 2]); bbAdd(b3, q[i + 3], q[i + 4], q[i + 5]); } if (b3[0] !== Infinity) { if (b3[2] < zmin) zmin = b3[2]; if (b3[5] > zmax) zmax = b3[5]; boxes.push({ e, bb: b3 }); dsegs.push({ e, bb: b3, i0, i1: dpos.length }); } continue; }
        }
        if (t && t.pos.length) {
          let conc = (e.type === 'tank' || e.type === 'ctank' || e.type === 'wall' || e.type === 'slab') ? [0.72, 0.72, 0.70] : e.type === 'kati' && C.entColor(e) === 7 ? [0.86, 0.85, 0.80] : col;
          if (isSel) conc = [conc[0] * 0.45 + SEL[0] * 0.55, conc[1] * 0.45 + SEL[1] * 0.55, conc[2] * 0.45 + SEL[2] * 0.55];
          const i0 = pk.ent.length;
          const tc = t.col && e.color === 256 ? t.col : null, eAl = C.entAlpha ? C.entAlpha(e) : 1;
          if (e.type === 'su' && C.SU_TUR) { const tu = C.SU_TUR[e.tur] || C.SU_TUR.temiz, key = e.tur || 'temiz'; if (!waterT.has(key)) waterT.set(key, { al: tu[2], foam: key === 'havalandirma' ? 1 : 0, wa: tu[3], arr: [] }); const wa = waterT.get(key).arr, wc = isSel ? [0.4, 0.7, 1] : tu[1]; for (let i = 0; i < t.pos.length; i += 3) wa.push(t.pos[i] - o[0], t.pos[i + 1] - o[1], t.pos[i + 2], t.nrm[i], t.nrm[i + 1], t.nrm[i + 2], wc[0], wc[1], wc[2]); for (let i = 0; i < t.pos.length; i += 9) { pk.ent.push(e); for (let k = 0; k < 9; k++) pk.pos.push(t.pos[i + k]); pk.nrm.push(t.nrm[i], t.nrm[i + 1], t.nrm[i + 2]); bbAdd(b3, t.pos[i], t.pos[i + 1], t.pos[i + 2]); } pk.rng.push({ e, i0, i1: pk.ent.length, bb: b3 }); boxes.push({ e, bb: b3 }); if (isSel) for (const [a2, b2] of t.edges) lin.push(a2[0] - o[0], a2[1] - o[1], a2[2], 0, 0, 1, ...SEL, b2[0] - o[0], b2[1] - o[1], b2[2], 0, 0, 1, ...SEL); continue; }
          let DK = null; if (!isSel && C.state.v3mat !== false && C.dokuUV && C.dokuHas && C.dokuHas(e)) { try { DK = C.dokuUV(e, t.pos, t.nrm); DK.dst = DK.mk.map(m => { if (!m) return null; const key = m.k + '|' + (+m.bump || 0); if (!matT.has(key)) matT.set(key, { k: m.k, bump: +m.bump || 0, arr: [] }); return matT.get(key).arr; }); } catch (er) { DK = null; } }
          for (let i = 0; i < t.pos.length; i += 3) { const z = t.pos[i + 2]; if (z < zmin) zmin = z; if (z > zmax) zmax = z; bbAdd(b3, t.pos[i], t.pos[i + 1], z); let cc = conc; if (tc && tc[i] >= 0) { cc = [tc[i], tc[i + 1], tc[i + 2]]; if (isSel) cc = [cc[0] * 0.45 + SEL[0] * 0.55, cc[1] * 0.45 + SEL[1] * 0.55, cc[2] * 0.45 + SEL[2] * 0.55]; } const aT = t.al && t.al[(i / 9) | 0] != null ? t.al[(i / 9) | 0] : eAl; const ti = (i / 9) | 0; if (DK && DK.use[ti] && aT >= 0.995) { const vi = (i / 3) | 0, k3 = vi % 3; DK.dst[ti].push(t.pos[i] - o[0], t.pos[i + 1] - o[1], z, t.nrm[i], t.nrm[i + 1], t.nrm[i + 2], DK.uv[ti * 6 + k3 * 2], DK.uv[ti * 6 + k3 * 2 + 1], DK.tg[i], DK.tg[i + 1], DK.tg[i + 2]); continue; } const dst = aT < 0.995 ? (transT.get(Math.round(aT * 20)) || (transT.set(Math.round(aT * 20), []), transT.get(Math.round(aT * 20)))) : tri; dst.push(t.pos[i] - o[0], t.pos[i + 1] - o[1], z, t.nrm[i], t.nrm[i + 1], t.nrm[i + 2], cc[0], cc[1], cc[2]); }
          for (let i = 0; i < t.pos.length; i += 9) { pk.ent.push(e); for (let k = 0; k < 9; k++) pk.pos.push(t.pos[i + k]); pk.nrm.push(t.nrm[i] + t.nrm[i + 3] + t.nrm[i + 6], t.nrm[i + 1] + t.nrm[i + 4] + t.nrm[i + 7], t.nrm[i + 2] + t.nrm[i + 5] + t.nrm[i + 8]); }
          pk.rng.push({ e, i0, i1: pk.ent.length, bb: b3 });
          for (const [a, b] of t.edges) esegs.push(e, a[0], a[1], a[2], b[0], b[1], b[2]);
          if (this.edges || isSel) { const ec = isSel ? SEL : [0.12, 0.13, 0.15]; for (const [a, b] of t.edges) lin.push(a[0] - o[0], a[1] - o[1], a[2], 0, 0, 1, ...ec, b[0] - o[0], b[1] - o[1], b[2], 0, 0, 1, ...ec); }
          boxes.push({ e, bb: b3 });
          continue;
        }
        if (!this.showLines || skip2d.has(e.type)) continue;
        for (const pr of C.prims(e)) {
          const c = isSel ? SEL : colOf(C.entColor(e, pr.color));
          for (const [a, b] of C.primSegs(pr)) { segs.push(e, a[0], a[1], a[2] || 0, b[0], b[1], b[2] || 0); bbAdd(b3, a[0], a[1], a[2] || 0); bbAdd(b3, b[0], b[1], b[2] || 0); (e.type === 'xline' ? linX : lin).push(a[0] - o[0], a[1] - o[1], a[2] || 0, 0, 0, 1, ...c, b[0] - o[0], b[1] - o[1], b[2] || 0, 0, 0, 1, ...c); }
        }
        if (b3[0] !== Infinity) boxes.push({ e, bb: b3 });
      }
      this.pk = pk; this.boxes = boxes; this.segs = segs; this.esegs = esegs; this.dsegs = dsegs; this.dpos = dpos;
      const cands = [], seenC = new Set();
      const addC = (p, k, e) => { const key = p[0].toFixed(3) + ',' + p[1].toFixed(3) + ',' + (p[2] || 0).toFixed(3); if (seenC.has(key) || cands.length > 30000) return; seenC.add(key); cands.push({ p: [p[0], p[1], p[2] || 0], k, e }); };
      for (const e of C.doc.ents) { if (!C.layer(e.layer).on || e.type === 'sheet') continue; try { for (const sp of C.snapPts(e)) if (sp.k !== 'ins' || e.type === 'blk') addC(sp.p, sp.k, e); } catch (err) { } }
      for (let i = 0; i < lin.length; i += 9) addC([lin[i] + o[0], lin[i + 1] + o[1], lin[i + 2]], 'end', null); const linN = lin.length; for (const v of linX) lin.push(v);
      const noMid = new Set(['pipe', 'blk', 'fit', 'valve', 'pump']);
      for (let i = 0; i < esegs.length; i += 7) { const e = esegs[i]; addC([esegs[i + 1], esegs[i + 2], esegs[i + 3]], 'end', e); addC([esegs[i + 4], esegs[i + 5], esegs[i + 6]], 'end', e); if (!noMid.has(e.type)) addC([(esegs[i + 1] + esegs[i + 4]) / 2, (esegs[i + 2] + esegs[i + 5]) / 2, (esegs[i + 3] + esegs[i + 6]) / 2], 'mid', e); }
      if (C.insaatSnap3D) { try { for (const c of C.insaatSnap3D()) addC(c.p, c.k, c.e); } catch (err) { } }
      this.cands = cands;
      this.buf.tri = tri.length ? this.makeBuf(tri, 9) : null;
      this.buf.line = lin.length ? this.makeBuf(lin, 9) : null;
      this.buf.don = don.length ? this.makeBuf(don, 9) : null;
      for (const [k, w] of waterT) if (w.arr.length) this.waterBufs.push({ k, al: w.al, foam: w.foam, wa: w.wa, b: this.makeBuf(w.arr, 9) });
      for (const [, m] of matT) if (m.arr.length) this.matBufs.push({ k: m.k, bump: m.bump, b: this.makeBuf(m.arr, 11) });
      for (const [k, arr] of transT) if (arr.length) this.trans.push({ al: Math.max(0.03, k / 20), b: this.makeBuf(arr, 9) }); this.trans.sort((a, b) => b.al - a.al);

      let gb = [Infinity, Infinity, -Infinity, -Infinity];
      for (const [, m] of matT) for (let i = 0; i < m.arr.length; i += 11) { const x = m.arr[i], y = m.arr[i + 1]; if (x < gb[0]) gb[0] = x; if (y < gb[1]) gb[1] = y; if (x > gb[2]) gb[2] = x; if (y > gb[3]) gb[3] = y; }
      for (const arr of [tri, lin.slice(0, linN)]) for (let i = 0; i < arr.length; i += 9) { const x = arr[i], y = arr[i + 1]; if (x < gb[0]) gb[0] = x; if (y < gb[1]) gb[1] = y; if (x > gb[2]) gb[2] = x; if (y > gb[3]) gb[3] = y; }
      for (const d of dsegs) { const b = d.bb; if (b[0] - o[0] < gb[0]) gb[0] = b[0] - o[0]; if (b[1] - o[1] < gb[1]) gb[1] = b[1] - o[1]; if (b[3] - o[0] > gb[2]) gb[2] = b[3] - o[0]; if (b[4] - o[1] > gb[3]) gb[3] = b[4] - o[1]; }
      if (gb[0] === Infinity) gb = [-5, -5, 5, 5];
      this.gc = [(gb[0] + gb[2]) / 2, (gb[1] + gb[3]) / 2];
      this.size = Math.max(gb[2] - gb[0], gb[3] - gb[1], zmax - zmin, 1);
      // zemin ızgarası
      const w = Math.max(this.size, 10) * 0.75; let st = Math.pow(10, Math.floor(Math.log10(w / 5))); const gx = Math.round((this.gc[0] + o[0]) / st) * st - o[0], gy = Math.round((this.gc[1] + o[1]) / st) * st - o[1]; const gx0 = 0; const g = [], gc = [0.3, 0.33, 0.37];
      const n = Math.ceil(w / st);
      for (let i = -n; i <= n; i++) { g.push(gx + i * st, gy - n * st, 0, 0, 0, 1, ...gc, gx + i * st, gy + n * st, 0, 0, 0, 1, ...gc, gx - n * st, gy + i * st, 0, 0, 0, 1, ...gc, gx + n * st, gy + i * st, 0, 0, 0, 1, ...gc); }
      this.buf.grid = this.makeBuf(g, 9);
      // kesit düzlemi: kesme denklemi (sahne koordinatında) + kesit yüzeyi (kapak) ve düzlem çerçevesi
      this.clip = null; if (this.buf.cap) { gl.deleteBuffer(this.buf.cap.b); this.buf.cap = null; } if (this.buf.cpl) { gl.deleteBuffer(this.buf.cpl.b); this.buf.cpl = null; }
      const kp = C.activeSectionPlane ? C.activeSectionPlane() : null;
      if (kp) { const r = C.sectionPlaneGeom(kp, o); if (r) { this.clip = r.eq; if (r.cap.length) this.buf.cap = this.makeBuf(r.cap, 9); if (r.frame.length) this.buf.cpl = this.makeBuf(r.frame, 9); } }
      this.zr = [zmin, zmax];
      this.stats = { tris: tri.length / 27 + [...matT.values()].reduce((q, m) => q + m.arr.length / 33, 0), lines: (lin.length + don.length) / 18 };
      if (this.onStats) this.onStats(this.stats);
      this.dirty = true;
    }
    /* f < 1 yakınlaş, f > 1 uzaklaş; (sx, sy) verilirse o noktaya doğru. Çok yaklaşınca hedef ileri taşınır (yakınlaşma takılmaz). */
    zoomBy(f, sx, sy) {
      const P = sx != null ? this.pivotAt(sx, sy) : null, minD = Math.max(0.05, (this.size || 20) * 0.002);
      let nd = this.dist * f;
      if (f < 1 && nd < minD) { const fw = M.norm(M.sub(this.t, this.eye())), step = Math.max(minD * 0.5, this.dist * (1 - f)); this.t = M.add(this.t, M.mul(fw, step)); nd = Math.max(minD, nd); this.dist = nd; this.dirty = true; return; }
      nd = Math.min(nd, (this.size || 20) * 200); const k = nd / this.dist; if (P) this.t = M.add(P, M.mul(M.sub(this.t, P), k)); this.dist = nd; this.dirty = true;
    }
    fit() { if (this.needBuild) this.build(); this.t = [(this.gc || [0, 0])[0], (this.gc || [0, 0])[1], ((this.zr || [0, 0])[0] + (this.zr || [0, 0])[1]) / 2]; this.dist = (this.size || 20) * 1.5; this.dirty = true; }
    preset(k) {
      const D = Math.PI / 180;
      if (k === 'ust') { this.yaw = -90 * D; this.pitch = 89.9 * D; } else if (k === 'on') { this.yaw = -90 * D; this.pitch = 0; } else if (k === 'sag') { this.yaw = 0; this.pitch = 0; } else { this.yaw = -55 * D; this.pitch = 32 * D; }
      this.fit();
    }
    /* gezinme: imlecin altındaki noktayı (yüzey ya da çalışma düzlemi) eksen alarak döndür, gerçek ölçekte kaydır, ileri / geri git */
    pivotAt(sx, sy) { let p = null; try { const f = this.pick(sx, sy); if (f) p = f.p; } catch (e) { } if (!p) { try { p = this.workPoint(sx, sy); } catch (e) { } } if (!p) return null; const q = [p[0] - this.origin[0], p[1] - this.origin[1], p[2]]; return M.dist(q, this.eye()) > this.dist * 30 ? null : q; }
    orbitBy(dx, dy, pivot) {
      const k = 0.0045 * (C.state.orbitSpeed || 1); let dyaw = -dx * k, dp = dy * k; const np = Math.max(-1.55, Math.min(1.5707, this.pitch + dp)); dp = np - this.pitch;
      if (pivot) { // kamerayı (göz ve hedef) pivot çevresinde döndür
        const rot = (v, ax, a) => { const c = Math.cos(a), s = Math.sin(a), d = M.dot(ax, v), cr = M.cross(ax, v); return [v[0] * c + cr[0] * s + ax[0] * d * (1 - c), v[1] * c + cr[1] * s + ax[1] * d * (1 - c), v[2] * c + cr[2] * s + ax[2] * d * (1 - c)]; };
        let v = M.sub(this.t, pivot); v = rot(v, [0, 0, 1], dyaw); const y2 = this.yaw + dyaw; v = rot(v, [Math.sin(y2), -Math.cos(y2), 0], dp); this.t = M.add(pivot, v);
      }
      this.yaw += dyaw; this.pitch = np; this.dirty = true;
    }
    panBy(dx, dy) { const wpp = (this.persp ? 2 * this.dist * Math.tan(22.5 * Math.PI / 180) : 2 * this.dist * Math.tan(22.5 * Math.PI / 180)) / Math.max(1, this.H); const r = [-Math.sin(this.yaw), Math.cos(this.yaw), 0], u = M.cross(M.norm(M.sub(this.t, this.eye())), r); this.t = M.sub(this.t, M.add(M.mul(r, dx * wpp), M.mul(u, dy * wpp))); this.dirty = true; }
    moveBy(fw, rt, up) { const f = [-Math.cos(this.yaw), -Math.sin(this.yaw), 0], r = [-Math.sin(this.yaw), Math.cos(this.yaw), 0], st = Math.max(0.2, this.dist * 0.06); this.t = M.add(this.t, M.add(M.add(M.mul(f, fw * st), M.mul(r, rt * st)), [0, 0, up * st])); this.dirty = true; }
    eye() { const cp = Math.cos(this.pitch); return [this.t[0] + this.dist * cp * Math.cos(this.yaw), this.t[1] + this.dist * cp * Math.sin(this.yaw), this.t[2] + this.dist * Math.sin(this.pitch)]; }
    draw() {
      const gl = this.gl; if (!this.W) this.resize();
      gl.viewport(0, 0, this.cv.width, this.cv.height);
      const bgm = { ufuk: 0, beyaz: 1, siyah: 2 }[C.state.v3bg || 'ufuk'] ?? 0, light = bgm < 2;
      if (light) gl.clearColor(1, 1, 1, 1); else gl.clearColor(0.11, 0.12, 0.14, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      const asp = this.W / Math.max(1, this.H), far = this.dist * 20 + this.size * 10, near = Math.max(0.01, this.dist / 1000);
      const P = this.persp ? m4.persp(45 * Math.PI / 180, asp, near, far) : (() => { const h = this.dist * Math.tan(22.5 * Math.PI / 180); return m4.ortho(-h * asp, h * asp, -h, h, -far, far); })();
      const up = Math.abs(this.pitch) > 1.55 ? [Math.cos(this.yaw + Math.PI), Math.sin(this.yaw + Math.PI), 0] : [0, 0, 1];
      const V = m4.look(this.eye(), this.t, up);
      const mvp = m4.mul(P, V); this.mvp = mvp; this.imvp = m4.inv(mvp);
      if (bgm === 0 && this.imvp) { gl.useProgram(this.bp); gl.disable(gl.DEPTH_TEST); gl.uniformMatrix4fv(this.bloc.imvp, false, new Float32Array(this.imvp)); gl.uniform1f(this.bloc.mode, bgm); gl.bindBuffer(gl.ARRAY_BUFFER, this.bq); gl.enableVertexAttribArray(this.bloc.q); gl.vertexAttribPointer(this.bloc.q, 2, gl.FLOAT, false, 8, 0); gl.drawArrays(gl.TRIANGLES, 0, 6); gl.disableVertexAttribArray(this.bloc.q); gl.enable(gl.DEPTH_TEST); }
      gl.useProgram(this.pr); gl.uniformMatrix4fv(this.loc.mvp, false, new Float32Array(mvp));
      gl.uniform1f(this.loc.tex, C.state.v3tex === false ? 0 : 1); gl.uniform4f(this.loc.ov, 0, 0, 0, 0); gl.uniform1f(this.loc.inv, light ? 1 : 0);
      const ld = M.norm([0.35, -0.5, 0.8]); gl.uniform3f(this.loc.ld, ld[0], ld[1], ld[2]);
      const drawBuf = (b, mode, lit) => {
        if (!b) return; gl.bindBuffer(gl.ARRAY_BUFFER, b.b);
        gl.enableVertexAttribArray(this.loc.p); gl.vertexAttribPointer(this.loc.p, 3, gl.FLOAT, false, 36, 0);
        gl.enableVertexAttribArray(this.loc.n); gl.vertexAttribPointer(this.loc.n, 3, gl.FLOAT, false, 36, 12);
        gl.enableVertexAttribArray(this.loc.c); gl.vertexAttribPointer(this.loc.c, 3, gl.FLOAT, false, 36, 24);
        gl.uniform1f(this.loc.lit, lit ? 1 : 0); gl.uniform1f(this.loc.al, b.al != null ? b.al : 1); gl.drawArrays(mode, 0, b.n);
      };
      gl.uniform1f(this.loc.cpOn, 0); gl.depthMask(false); if (light) gl.uniform4f(this.loc.ov, 0.70, 0.72, 0.74, 1); if (C.state.v3grid !== false) drawBuf(this.buf.grid, gl.LINES, false); gl.uniform4f(this.loc.ov, 0, 0, 0, 0); gl.depthMask(true);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1, 1);
      const setClip = on => { gl.uniform1f(this.loc.cpOn, on && this.clip ? 1 : 0); if (this.clip) gl.uniform4f(this.loc.cp, this.clip[0], this.clip[1], this.clip[2], this.clip[3]); };
      setClip(true);
      const xa = Math.max(0, Math.min(0.95, +C.state.v3alpha || 0)); // şeffaflık (röntgen): bina içi odalar, kapılar görünür
      if (xa > 0.001 && this.buf.tri) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); drawBuf({ b: this.buf.tri.b, n: this.buf.tri.n, al: 1 - xa }, gl.TRIANGLES, true); gl.depthMask(true); gl.disable(gl.BLEND); }
      else drawBuf(this.buf.tri, gl.TRIANGLES, true);
      if (this.matBufs && this.matBufs.length) this.drawMat(mvp, ld, xa);
      gl.disable(gl.POLYGON_OFFSET_FILL);
      drawBuf(this.buf.line, gl.LINES, false);
      if (this.buf.don) drawBuf(this.buf.don, gl.LINES, false);
      setClip(false); if (this.buf.cap) { gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1, -1); drawBuf(this.buf.cap, gl.TRIANGLES, true); gl.disable(gl.POLYGON_OFFSET_FILL); } if (this.buf.cpl) drawBuf(this.buf.cpl, gl.LINES, false); setClip(true);
      if (this.trans && this.trans.length) { // saydam yüzeyler (arazi altı zemin bloğu vb.)
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
        for (const tb of this.trans) drawBuf({ b: tb.b.b, n: tb.b.n, al: tb.al }, gl.TRIANGLES, true);
        gl.depthMask(true); gl.disable(gl.BLEND);
      }
      if (this.waterBufs && this.waterBufs.length) this.drawWater(mvp, ld);
      // etkileşim katmanı: önizleme, lastik çizgi, imleç
      const ov = [], o = this.origin, push = (a, b, c) => ov.push(a[0] - o[0], a[1] - o[1], a[2] || 0, 0, 0, 1, ...c, b[0] - o[0], b[1] - o[1], b[2] || 0, 0, 0, 1, ...c);
      if (this.cursor && C.cmd.waiting) {
        const cp = this.cursor, L = this.dist * 0.025;
        if (C.cmd.preview) { try { for (const pr of C.cmd.preview(cp) || []) for (const [a, b] of C.primSegs(pr)) push(a, b, [1, 0.85, 0.2]); } catch (e) { } }
        const AX = [[1, 0.3, 0.3], [0.3, 0.95, 0.35], [0.4, 0.6, 1], [1, 0.4, 1], [1, 0.4, 1]];
        if (C.cmd.base && C.cmd.rubber !== false) push(C.cmd.base, cp, this.axisHit != null ? AX[this.axisHit] : C.cmd.axisLock ? [1, 0.55, 0.2] : [0.7, 0.75, 0.8]);
        if (C.cmd.base && this.axisHit != null) { const b0 = M.p3(C.cmd.base), u = M.norm(M.sub(cp, b0)), H = this.dist * 0.08; push(cp, M.add(cp, M.mul(u, H)), AX[this.axisHit]); }
        if (this.hoverPoly) { const hp = this.hoverPoly, hc = [1, 0.85, 0.2]; for (let i = 0; i < hp.length; i++) push(hp[i], hp[(i + 1) % hp.length], hc); const c0 = hp.reduce((s, q) => M.add(s, q), [0, 0, 0]).map(v => v / hp.length); for (let i = 0; i < hp.length; i += Math.max(1, Math.floor(hp.length / 12))) push(c0, M.lerp(c0, hp[i], 0.85), [0.75, 0.62, 0.15]); }
        if (C.cmd.base && (this.shift || this.plane === 'Z')) { const b0 = M.p3(C.cmd.base), H = this.dist * 0.6; push([b0[0], b0[1], b0[2] - H], [b0[0], b0[1], b0[2] + H], [0.35, 0.55, 1]); }
        const cc = this.snapHit ? [0.25, 1, 0.4] : this.faceHit ? [0.55, 0.55, 1] : [1, 1, 1], LL = this.snapHit ? L * 1.6 : L;
        push([cp[0] - LL, cp[1], cp[2]], [cp[0] + LL, cp[1], cp[2]], cc); push([cp[0], cp[1] - LL, cp[2]], [cp[0], cp[1] + LL, cp[2]], cc); push([cp[0], cp[1], cp[2] - LL], [cp[0], cp[1], cp[2] + LL], [0.4, 0.6, 1]);
      }
      if (this.hoverEnt && !C.cmd.waiting || (this.hoverEnt && C.cmd.waiting && C.cmd.waiting.kind === 'sel')) {
        const he = this.hoverEnt, hc = [1, 0.85, 0.25];
        if (C.byId(he.id)) { const t = C.entTris(he); if (t && t.edges.length) { for (const [a, b] of t.edges.slice(0, 20000)) push(a, b, hc); } else for (const pr of C.prims(he)) for (const [a, b] of C.primSegs(pr)) push(a, b, hc); }
      }
      if (this.hoverFace && !C.cmd.waiting) { const hp = this.hoverFace; for (let i = 0; i < hp.length; i++) push(hp[i], hp[(i + 1) % hp.length], [1, 0.85, 0.25]); }
      this.showTag(); this.drawMarks();
      if (ov.length) {
        if (!this.ovBuf) this.ovBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.ovBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ov), gl.DYNAMIC_DRAW);
        setClip(false); gl.disable(gl.DEPTH_TEST); drawBuf({ b: this.ovBuf, n: ov.length / 9 }, gl.LINES, false); gl.enable(gl.DEPTH_TEST);
      }
    }
    drawMarks() {
      const c = this.ovc; if (!c) return; const g = c.getContext('2d'), d = window.devicePixelRatio || 1;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.setTransform(d, 0, 0, d, 0, 0);
      if (C.h3) { try { C.h3.draw(this, g); } catch (er) { } }
      const sf = C.selFace; if (sf && C.byId(sf.e.id)) {
        const loops = [sf.pts, ...(sf.holes || [])].map(L => L.map(p => this.project(p))); if (loops[0].every(Boolean)) {
          g.beginPath(); for (const L of loops) { if (!L.every(Boolean)) continue; L.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); }
          g.fillStyle = 'rgba(70,140,255,.28)'; g.fill('evenodd'); g.strokeStyle = '#4a8cff'; g.lineWidth = 2; g.stroke();
          g.fillStyle = 'rgba(120,170,255,.5)'; const b = loops[0].reduce((a, q) => [Math.min(a[0], q[0]), Math.min(a[1], q[1]), Math.max(a[2], q[0]), Math.max(a[3], q[1])], [1e9, 1e9, -1e9, -1e9]);
          g.save(); g.clip('evenodd'); for (let x = b[0]; x < b[2]; x += 7) for (let y = b[1] + ((x / 7) % 2) * 3.5; y < b[3]; y += 7) g.fillRect(x, y, 1.6, 1.6); g.restore();
        }
      } else if (sf) C.selFace = null;
      const E = C.cmd; if (!this.cursor || !E.waiting) return;
      if (this.hoverEdge && E.hover === 'edge') { const a = this.project(this.hoverEdge.a), b = this.project(this.hoverEdge.b); if (a && b) { g.strokeStyle = '#ffcc33'; g.lineWidth = 5; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.globalAlpha = 1; } }
      for (const lp of E.lockPts || []) { const q = this.project(lp.p); if (!q) continue; g.fillStyle = 'rgba(255,150,40,.35)'; g.strokeStyle = '#ff9628'; g.lineWidth = 2; g.beginPath(); g.arc(q[0], q[1], 7, 0, Math.PI * 2); g.fill(); g.stroke(); }
      if (this.alignRef && this.cursor) { const a = this.project(this.alignRef), b = this.project(this.cursor); if (a && b) { g.save(); g.setLineDash([4, 4]); g.strokeStyle = '#ff9628'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore(); } } // hizalama kılavuzu
      const h = this.snapHit; if (!h) return; const q = this.project(h.p); if (!q) return; const [x, y] = q;
      g.strokeStyle = h.k === 'face' ? '#ff9628' : '#33ff66'; g.lineWidth = 2; g.beginPath();
      switch (h.k) {
        case 'end': g.rect(x - 6, y - 6, 12, 12); break;
        case 'mid': g.moveTo(x, y - 7); g.lineTo(x + 7, y + 6); g.lineTo(x - 7, y + 6); g.closePath(); break;
        case 'cen': g.arc(x, y, 7, 0, Math.PI * 2); break;
        case 'qua': g.moveTo(x, y - 7); g.lineTo(x + 7, y); g.lineTo(x, y + 7); g.lineTo(x - 7, y); g.closePath(); break;
        case 'int': g.moveTo(x - 6, y - 6); g.lineTo(x + 6, y + 6); g.moveTo(x + 6, y - 6); g.lineTo(x - 6, y + 6); break;
        case 'per': g.moveTo(x - 7, y + 6); g.lineTo(x + 7, y + 6); g.moveTo(x - 7, y + 6); g.lineTo(x - 7, y - 7); g.moveTo(x - 7, y); g.lineTo(x, y); g.lineTo(x, y + 6); break;
        case 'nea': g.moveTo(x - 6, y - 6); g.lineTo(x + 6, y - 6); g.lineTo(x - 6, y + 6); g.lineTo(x + 6, y + 6); g.closePath(); break;
        case 'fcen': g.arc(x, y, 7, 0, Math.PI * 2); g.moveTo(x - 10, y); g.lineTo(x + 10, y); g.moveTo(x, y - 10); g.lineTo(x, y + 10); break;
        case 'ins': g.rect(x - 6, y - 6, 12, 12); g.moveTo(x, y - 6); g.lineTo(x, y + 6); g.moveTo(x - 6, y); g.lineTo(x + 6, y); break;
        default: g.arc(x, y, 8, 0, Math.PI * 2);
      }
      g.stroke();
    }
    showTag() {
      if (!this.tagEl) { this.tagEl = document.createElement('div'); this.tagEl.className = 'v3tag'; this.cv.parentElement.appendChild(this.tagEl); }
      let txt = this.inferTag || ''; const E = C.cmd;
      if (this.cursor && E.waiting) { if (E.tagFn) { try { txt = E.tagFn(this.cursor) + (txt ? ' · ' + txt : ''); } catch (er) { } } else if (E.base && E.rubber !== false && E.waiting.kind === 'pt') { const b = M.p3(E.base), c = this.cursor; let an = Math.atan2(c[1] - b[1], c[0] - b[0]) / Math.PI * 180; if (an < 0) an += 360; const dz = (c[2] || 0) - (b[2] || 0); txt = (txt ? txt + ' · ' : '') + M.fmt(M.dist(b, c), 3) + ' m · ∠ ' + (+an.toFixed(1)) + '°' + (Math.abs(dz) > 1e-6 ? ' · Δz ' + M.fmt(dz, 3) : ''); } }
      const show = this.cursor && E.waiting && txt && this.mouse;
      this.tagEl.style.display = show ? 'block' : 'none';
      if (show) { this.tagEl.textContent = txt; const r = this.cv.getBoundingClientRect(), pr = this.cv.parentElement.getBoundingClientRect(); this.tagEl.style.left = (this.mouse[0] + r.left - pr.left + 16) + 'px'; this.tagEl.style.top = (this.mouse[1] + r.top - pr.top + 14) + 'px'; }
    }
    /* ekran -> çalışma düzlemi (z = elev) ; yakalama */
    project(p) { if (!this.mvp) return null; const o = this.origin, v = m4.xf(this.mvp, [p[0] - o[0], p[1] - o[1], p[2] || 0, 1]); if (v[3] <= 1e-9) return null; return [(v[0] / v[3] + 1) / 2 * this.W, (1 - v[1] / v[3]) / 2 * this.H]; }
    ray(sx, sy) { if (!this.imvp) return null; const x = sx / this.W * 2 - 1, y = 1 - sy / this.H * 2; const a = m4.xf(this.imvp, [x, y, -1, 1]), b = m4.xf(this.imvp, [x, y, 1, 1]); const o = this.origin; return [[a[0] / a[3] + o[0], a[1] / a[3] + o[1], a[2] / a[3]], [b[0] / b[3] + o[0], b[1] / b[3] + o[1], b[2] / b[3]]]; }
    planePoint(sx, sy, z) {
      const r = this.ray(sx, sy); if (!r) return null; const [a, b] = r, d = M.sub(b, a), dz = d[2];
      const eye = this.eye(), o = this.origin, tgt = [this.t[0] + o[0], this.t[1] + o[1], this.t[2]];
      if (Math.abs(dz) > 1e-12) { const t = (z - a[2]) / dz; if (t >= 0) { const p = [a[0] + d[0] * t, a[1] + d[1] * t, z]; if (M.dist(p, [eye[0] + o[0], eye[1] + o[1], eye[2]]) < this.dist * 25) return p; } }
      // yatay düzlem görünmüyorsa (ufuk üstü / yandan bakış): hedeften geçen ekrana dik düzlem
      const vn = M.norm(M.sub(tgt, [eye[0] + o[0], eye[1] + o[1], eye[2]])), den = M.dot(d, vn); if (Math.abs(den) < 1e-12) return null;
      const t2 = M.dot(M.sub(tgt, a), vn) / den; return M.add(a, M.mul(d, t2));
    }
    snapAt(sx, sy) {
      if (!C.state.osnap) return null; const K = C.state.snapKinds, TOL = 12; let best = null, bd = TOL;
      const tmp = C.tempSnapEnts(), tc = []; for (const e of tmp) for (const sp of C.snapPts(e)) tc.push({ p: M.p3(sp.p), k: sp.k, e: null });
      /* görünürlük: bir yüzün arkasında (ör. perdenin içinde) kalan nokta yakalanmaz */
      const vis = (p, q) => { const r0 = this.ray(q[0], q[1]); if (!r0) return true; const h = this.pick(q[0], q[1]); if (!h) return true; const D = M.dist(r0[0], p), tol = Math.max(0.01, D * 0.002); return M.dist(r0[0], h.p) >= D - tol; };
      { const cl = []; for (const c of tc.length ? tc.concat(this.cands) : this.cands) { if (!K[c.k]) continue; const q = this.project(c.p); if (!q) continue; const d = Math.hypot(q[0] - sx, q[1] - sy); if (d < TOL) cl.push({ c, q, d }); }
        cl.sort((x, y) => x.d - y.d); for (const it of cl.slice(0, 8)) if (vis(it.c.p, it.q)) { bd = it.d; best = it.c; break; } }
      if (K.fcen !== false && C.facePoly) { // yüz merkezi (ağırlık merkezi)
        const f = this.pick(sx, sy); if (f) { let fp = null; try { fp = C.facePoly(f.e, f.ti, f.n); } catch (er) { } if (fp) { const c = C.polyCentroid3(fp.pts, fp.n), q = c && this.project(c); if (q) { const d = Math.hypot(q[0] - sx, q[1] - sy); if (d < Math.max(bd, 14) && (!best || d < bd)) { bd = d; best = { p: c, k: 'fcen', e: f.e }; } } } }
      }
      if (best || !(K.int || K.per || K.nea)) return best;
      const near = [];
      const ts = []; for (const e of tmp) for (let i = 1; i < e.pts.length; i++) ts.push(null, ...e.pts[i - 1], ...e.pts[i]);
      for (const S of [ts, this.segs || [], this.esegs || []]) for (let i = 0; i < S.length; i += 7) {
        const a = [S[i + 1], S[i + 2], S[i + 3]], b = [S[i + 4], S[i + 5], S[i + 6]], pa = this.project(a), pb = this.project(b); if (!pa || !pb) continue;
        const dx = pb[0] - pa[0], dy = pb[1] - pa[1], L2 = dx * dx + dy * dy; let t = L2 > 1e-9 ? ((sx - pa[0]) * dx + (sy - pa[1]) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t));
        const d = Math.hypot(pa[0] + dx * t - sx, pa[1] + dy * t - sy); if (d < TOL) near.push({ e: S[i], a, b, pa, pb, t, d });
      }
      if (!near.length) return null; near.sort((x, y) => x.d - y.d); const nn = near.slice(0, 60);
      if (K.int) for (let i = 0; i < nn.length; i++) for (let j = i + 1; j < nn.length; j++) {
        const A = nn[i], B = nn[j], r = M.segInt(A.pa, A.pb, B.pa, B.pb); if (!r || r.t < -1e-6 || r.t > 1 + 1e-6 || r.u < -1e-6 || r.u > 1 + 1e-6) continue;
        const pA = M.lerp(A.a, A.b, r.t), pB = M.lerp(B.a, B.b, r.u); if (M.dist(pA, pB) > Math.max(1e-4, (this.size || 1) * 1e-5)) continue;
        const d = Math.hypot(r.p[0] - sx, r.p[1] - sy); if (d < bd && vis(pA, r.p)) { bd = d; best = { p: pA, k: 'int', e: A.e }; }
      }
      if (best) return best;
      if (K.int) { // kenar × yüz kesişimi: bir elemanın kenarının başka elemanın yüzüne girdiği köşe (ör. döşeme kenarı ile perde yüzü)
        const faces = []; for (const [ox, oy] of [[0, 0], [-8, 0], [8, 0], [0, -8], [0, 8]]) { const f = this.pick(sx + ox, sy + oy); if (f && !faces.some(g => g.e === f.e && M.dot(g.n, f.n) > 0.999 && Math.abs(M.dot(M.sub(f.p, g.p), g.n)) < 1e-4)) faces.push(f); }
        for (const A of nn) for (const f of faces) { if (A.e === f.e || (f.e && A.e === f.e.id)) continue; const v = M.sub(A.b, A.a), den = M.dot(v, f.n); if (Math.abs(den) < 1e-9 * Math.max(1, M.len(v))) continue;
          const t = M.dot(M.sub(f.p, A.a), f.n) / den; if (t < -1e-6 || t > 1 + 1e-6) continue; const X = M.add(A.a, M.mul(v, t)), q = this.project(X); if (!q) continue; const d = Math.hypot(q[0] - sx, q[1] - sy); if (d < bd) { bd = d; best = { p: X, k: 'int', e: f.e }; } }
        if (best) return best;
      }
      const base = C.cmd.base && C.cmd.waiting ? M.p3(C.cmd.base) : null;
      if (K.per && base) for (const A of nn) {
        const v = M.sub(A.b, A.a), L2 = M.dot(v, v); if (L2 < 1e-12) continue; const t = M.dot(M.sub(base, A.a), v) / L2; if (t < 0 || t > 1) continue;
        const f = M.add(A.a, M.mul(v, t)); if (M.dist(f, base) < 1e-6) continue; const q = this.project(f); if (!q) continue; const d = Math.hypot(q[0] - sx, q[1] - sy); if (d < bd && vis(f, q)) { bd = d; best = { p: f, k: 'per', e: A.e }; }
      }
      if (best) return best;
      if (K.nea) { const A = nn[0]; return { p: M.lerp(A.a, A.b, A.t), k: 'nea', e: A.e }; }
      return null;
    }
    /* çalışma düzlemi: XY (yatay), XZ / YZ (düşey), Z (tabandan düşey doğru) ; Shift = geçici Z */
    workPoint(sx, sy) {
      const r = this.ray(sx, sy); if (!r) return null; const [a, b2] = r, d = M.sub(b2, a), base = C.cmd.base ? M.p3(C.cmd.base) : null;
      const mode = this.shift && base ? 'Z' : (this.plane === 'OTO' ? 'XY' : this.plane);
      if (mode === 'Z' && base) { // ışına en yakın düşey doğru noktası
        const w = M.sub(a, base), ux = [0, 0, 1], b = M.dot(d, ux), c = M.dot(d, d), dd = M.dot(ux, w), e = M.dot(d, w), den = c - b * b;
        if (Math.abs(den) < 1e-12) return null; const t = (c * dd - b * e) / den; return [base[0], base[1], base[2] + t];
      }
      if (mode === 'XZ' || mode === 'YZ') { const k = mode === 'XZ' ? 1 : 0, v0 = base ? base[k] : 0; if (Math.abs(d[k]) < 1e-12) return null; const t = (v0 - a[k]) / d[k]; if (t < 0) return null; return M.add(a, M.mul(d, t)); }
      return this.planePoint(sx, sy, base ? (base[2] || 0) : this.elev);
    }
    /* ışın - üçgen: ekrandaki noktanın altındaki yüz {p, n, e, ti, t} */
    pick(sx, sy, filter) {
      const r = this.ray(sx, sy); if (!r || !this.pk) return null; const a = r[0], d = M.norm(M.sub(r[1], r[0])), P = this.pk.pos, N = this.pk.nrm;
      const inv = [1 / d[0], 1 / d[1], 1 / d[2]];
      const boxHit = b => { let t0 = -Infinity, t1 = Infinity; for (let k = 0; k < 3; k++) { let u = (b[k] - 1e-6 - a[k]) * inv[k], v = (b[k + 3] + 1e-6 - a[k]) * inv[k]; if (u > v) { const w = u; u = v; v = w; } if (u > t0) t0 = u; if (v < t1) t1 = v; } return t1 >= Math.max(t0, 0); };
      let best = null;
      for (const g of this.pk.rng) {
        if (filter && !filter(g.e)) continue; if (!boxHit(g.bb)) continue;
        for (let i = g.i0; i < g.i1; i++) {
          const j = i * 9, p0 = [P[j], P[j + 1], P[j + 2]], e1 = [P[j + 3] - p0[0], P[j + 4] - p0[1], P[j + 5] - p0[2]], e2 = [P[j + 6] - p0[0], P[j + 7] - p0[1], P[j + 8] - p0[2]];
          const h = M.cross(d, e2), det = M.dot(e1, h); if (Math.abs(det) < 1e-14) continue;
          const f = 1 / det, s0 = M.sub(a, p0), u = f * M.dot(s0, h); if (u < -1e-9 || u > 1 + 1e-9) continue;
          const q = M.cross(s0, e1), v = f * M.dot(d, q); if (v < -1e-9 || u + v > 1 + 1e-9) continue;
          const t = f * M.dot(e2, q); if (t <= 0) continue;
          if (this.clip) { const c = this.clip, o = this.origin, hx = a[0] + d[0] * t - o[0], hy = a[1] + d[1] * t - o[1], hz = a[2] + d[2] * t; if (c[0] * hx + c[1] * hy + c[2] * hz + c[3] < -1e-6) continue; } // kesit düzleminin gizlediği kısım seçilmez
          const tol = Math.max(1e-6, t * 1e-7), flat = g.e.type === 'kati' && Math.abs(g.e.h || 0) < 1e-9;
          if (!best || t < best.t - tol || (Math.abs(t - best.t) <= tol && flat && !best.flat)) {
            let n = M.norm(M.cross(e1, e2)); const vn = [N[i * 3], N[i * 3 + 1], N[i * 3 + 2]]; if (M.dot(n, vn) < 0) n = M.mul(n, -1);
            if (flat && M.dot(n, d) > 0) n = M.mul(n, -1); // tek yüz: bakan tarafa
            best = { t, p: M.add(a, M.mul(d, t)), n, e: g.e, ti: i - g.i0, gi: i, flat };
          }
        }
      }
      return best;
    }
    /* ekranda çizgiye en yakın varlık (önünde yüz varsa gizli sayılır) */
    pickLine(sx, sy, tolPx = 7) {
      const S = this.segs || [], D = this.dsegs || []; if ((!S.length && !D.length) || !this.mvp) return null;
      let best = null, bd = tolPx;
      for (const g of D) { // çizgi olarak çizilen nesneler: önce kutunun ekran izdüşümüyle ele
        const e = g.e, b = g.bb; if (C.layer(e.layer).lock) continue;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, tam = true; for (let k = 0; k < 8; k++) { const p = this.project([b[k & 1 ? 3 : 0], b[k & 2 ? 4 : 1], b[k & 4 ? 5 : 2]]); if (!p) { tam = false; break; } if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
        if (tam && (sx < x0 - tolPx || sx > x1 + tolPx || sy < y0 - tolPx || sy > y1 + tolPx)) continue;
        const Q = this.dpos; for (let i = g.i0; i < g.i1; i += 6) { const a = [Q[i], Q[i + 1], Q[i + 2]], c = [Q[i + 3], Q[i + 4], Q[i + 5]], pa = this.project(a), pb = this.project(c); if (!pa || !pb) continue; const dx = pb[0] - pa[0], dy = pb[1] - pa[1], L2 = dx * dx + dy * dy; let t = L2 > 1e-9 ? ((sx - pa[0]) * dx + (sy - pa[1]) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(pa[0] + dx * t - sx, pa[1] + dy * t - sy); if (d < bd) { bd = d; best = { e, p: M.lerp(a, c, t), d }; } }
      }
      for (let i = 0; i < S.length; i += 7) {
        const e = S[i]; if (C.layer(e.layer).lock) continue;
        const a = [S[i + 1], S[i + 2], S[i + 3]], b = [S[i + 4], S[i + 5], S[i + 6]], pa = this.project(a), pb = this.project(b); if (!pa || !pb) continue;
        const dx = pb[0] - pa[0], dy = pb[1] - pa[1], L2 = dx * dx + dy * dy;
        let t = L2 > 1e-9 ? ((sx - pa[0]) * dx + (sy - pa[1]) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t));
        const d = Math.hypot(pa[0] + dx * t - sx, pa[1] + dy * t - sy);
        if (d < bd || (best && Math.abs(d - bd) < 0.5 && best.e !== e && e.type === 'line')) { bd = d; best = { e, p: M.lerp(a, b, t), d }; }
      }
      if (!best) return null;
      const f = this.pick(sx, sy), r = this.ray(sx, sy);
      if (f && r) { const dl = M.dist(r[0], best.p); if (f.t < dl - Math.max(1e-3, dl * 0.01)) return null; }
      return best;
    }
    /* 3B nesne kenarı (ağ kenarları) — pahlama vb. için */
    pickEdge(sx, sy, tolPx = 9) {
      const S = this.esegs; if (!S || !S.length || !this.mvp) return null; let best = null, bd = tolPx;
      for (let i = 0; i < S.length; i += 7) {
        const a = [S[i + 1], S[i + 2], S[i + 3]], b = [S[i + 4], S[i + 5], S[i + 6]], pa = this.project(a), pb = this.project(b); if (!pa || !pb) continue;
        const dx = pb[0] - pa[0], dy = pb[1] - pa[1], L2 = dx * dx + dy * dy; let t = L2 > 1e-9 ? ((sx - pa[0]) * dx + (sy - pa[1]) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t));
        const d = Math.hypot(pa[0] + dx * t - sx, pa[1] + dy * t - sy); if (d < bd) { bd = d; best = { e: S[i], a, b, p: M.lerp(a, b, t) }; }
      }
      if (!best) return null;
      const f = this.pick(sx, sy), r = this.ray(sx, sy); if (f && r) { const dl = M.dist(r[0], best.p); if (f.t < dl - Math.max(2e-3, dl * 0.01)) return null; }
      return best;
    }
    /* tıklanan / imleç altındaki varlık: çizgi > yakalama noktası > yüz */
    hitEnt(sx, sy) {
      const l = this.pickLine(sx, sy); if (l) return l;
      const h = this.snapAt(sx, sy); if (h && h.e && h.k !== 'fcen') return h;
      return this.pick(sx, sy);
    }
    /* imleç: yakalama > kilit > yüzey > çalışma düzlemi ; eksen çıkarımı (kırmızı X, yeşil Y, mavi Z) */
    pointAt(sx, sy) {
      const E = C.cmd; this.axisHit = null; this.faceHit = null; this.inferTag = ''; this.alignRef = null;
      const hit = E.noSnap ? null : this.snapAt(sx, sy); this.snapHit = hit;
      const base = E.base ? M.p3(E.base) : null, r = this.ray(sx, sy);
      const lineNear = (o, u) => { if (!r) return null; const a = r[0], d = M.sub(r[1], r[0]), w = M.sub(a, o), b = M.dot(d, u), c = M.dot(d, d), dd = M.dot(u, w), e = M.dot(d, w), den = c - b * b; if (Math.abs(den) < 1e-12) return null; const t = (c * dd - b * e) / den; return M.add(o, M.mul(u, t)); };
      // ORTO (F8) 3B'de: imlece ekranda en yakın X / Y / Z ekseni (taban noktasından) — AutoCAD orto gibi yatay ve düşey çizim
      const orto3 = () => { if (!base || !r) return null; let bd = Infinity, bu = null, bk = -1; [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((u, k) => { const s0 = this.project(base), s1 = this.project(M.add(base, u)); if (!s0 || !s1) return; const vx = s1[0] - s0[0], vy = s1[1] - s0[1], l = Math.hypot(vx, vy); if (l < 1e-6) return; const dd = Math.abs((sx - s0[0]) * vy - (sy - s0[1]) * vx) / l; if (dd < bd) { bd = dd; bu = u; bk = k; } }); if (bu) this.axisHit = bk; return bu; };
      if (E.axisLock) {
        const L = E.axisLock, u = M.norm(L.d);
        for (const lp of E.lockPts || []) { const q = this.project(lp.p); if (q && Math.hypot(q[0] - sx, q[1] - sy) < 16) { this.snapHit = { p: lp.p, k: 'face' }; this.inferTag = lp.name; return M.p3(lp.p); } }
        if (hit) { this.inferTag = 'Hizada: ' + this.snapName(hit); return M.add(L.o, M.mul(u, M.dot(M.sub(M.p3(hit.p), L.o), u))); }
        const f = C.state.snapKinds.face !== false ? this.pick(sx, sy) : null; // imleç altındaki yüzün düzlemi ile kesişim
        if (f) { const den = M.dot(u, f.n); if (Math.abs(den) > 0.2) { const t = M.dot(M.sub(f.p, L.o), f.n) / den, q = M.add(L.o, M.mul(u, t)), sq = this.project(q); if (Math.abs(t) > 1e-6 && sq && Math.hypot(sq[0] - sx, sq[1] - sy) < 40) { this.inferTag = 'Yüzey hizasında'; return q; } } }
        const p = lineNear(L.o, u); if (p) this.inferTag = 'Yüz normali'; return p;
      }
      if (hit) { // SketchUp gibi: imleç X / Y / Z ekseni üstündeyse yakalanan nokta eksene izdüşürülür (dik / düz çizgi, "hizada"); ORTO açıksa da
        const hp = M.p3(hit.p);
        if (base && !this.shift && C.state.snapKinds.axis !== false && M.dist(hp, base) > 1e-9) {
          let bd = 14, bk = -1, bq = null; const axes = E.plane3 ? [E.plane3.ux, E.plane3.uy] : [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
          axes.forEach((u, k) => { if (!u) return; const q = lineNear(base, u); if (!q || M.dist(q, base) < 1e-9) return; const s2 = this.project(q); if (!s2) return; const dd = Math.hypot(s2[0] - sx, s2[1] - sy); if (dd < bd) { bd = dd; bk = k; bq = u; } });
          if (bq) { const q = M.add(base, M.mul(bq, M.dot(M.sub(hp, base), bq))); if (M.dist(q, hp) > 1e-7 && M.dist(q, base) > 1e-9) { this.axisHit = E.plane3 ? 3 + bk : bk; this.inferTag = ['Kırmızı eksen (X)', 'Yeşil eksen (Y)', 'Mavi eksen (Z)', 'Düzlem ekseni', 'Düzlem ekseni'][this.axisHit] + ' · hizada: ' + this.snapName(hit); this.alignRef = hp; return q; } }
          if (C.state.ortho && hit.k !== 'per') { const u = orto3(), q = u ? M.add(base, M.mul(u, M.dot(M.sub(hp, base), u))) : null; if (q && M.dist(q, hp) > 1e-7) { this.inferTag = 'ORTO ' + ['X', 'Y', 'Z'][this.axisHit] + ' · hizada: ' + this.snapName(hit); this.alignRef = hp; return q; } }
        }
        this.inferTag = this.snapName(hit); return hp; }
      let p = null;
      if (E.plane3 && r) { const pl = E.plane3, d = M.sub(r[1], r[0]), den = M.dot(d, pl.n); if (Math.abs(den) > 1e-12) { const t = M.dot(M.sub(pl.o, r[0]), pl.n) / den; if (t > 0) p = M.add(r[0], M.mul(d, t)); } }
      const freeMode = !(this.shift && base) && ((this.plane === 'OTO' && C.state.snapKinds.face !== false) || E.hover);
      if (!p && freeMode) { const f = this.pick(sx, sy); if (f) { this.faceHit = f; p = f.p; this.inferTag = 'Yüzeyde'; } }
      if (!p) p = this.workPoint(sx, sy);
      if (p && base && !(this.shift || this.plane === 'Z') && C.state.snapKinds.axis !== false) { // eksen çıkarımı
        let bd = 14, bk = -1, bq = null; const axes = E.plane3 ? [E.plane3.ux, E.plane3.uy] : [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        axes.forEach((u, k) => { if (!u) return; const q = lineNear(base, u); if (!q || M.dist(q, base) < 1e-9) return; const s = this.project(q); if (!s) return; const dd = Math.hypot(s[0] - sx, s[1] - sy); if (dd < bd) { bd = dd; bk = k; bq = q; } });
        if (bq) { p = bq; this.axisHit = E.plane3 ? 3 + bk : bk; this.faceHit = null; this.inferTag = ['Kırmızı eksen (X)', 'Yeşil eksen (Y)', 'Mavi eksen (Z)', 'Düzlem ekseni', 'Düzlem ekseni'][this.axisHit]; }
      }
      if (p && !this.axisHit && this.axisHit !== 0 && C.state.ortho && base && !this.shift) { const u = orto3(); if (u) { const q = lineNear(base, u); if (q) { p = q; this.faceHit = null; this.inferTag = 'ORTO ' + ['X (yatay)', 'Y (yatay)', 'Z (düşey)'][this.axisHit]; } } }
      return p;
    }
    snapName(h) { return { end: 'Uç nokta', mid: 'Orta nokta', cen: 'Merkez', qua: 'Çeyrek', ins: 'Ekleme', int: 'Kesişim', nea: 'En yakın', per: 'Dik', face: 'Yüzey', fcen: 'Yüz merkezi' }[h.k] || h.k; }
    bind() {
      const cv = this.cv; let drag = null;
      const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      const selecting = () => { const w = C.cmd.waiting; return !this.orbitLeft && !this.panLeft && (!w ? !C.cmd.running : w.kind === 'sel'); };
      const boxEl = () => { if (!this.boxEl) { this.boxEl = document.createElement('div'); this.boxEl.className = 'v3box'; cv.parentElement.appendChild(this.boxEl); } return this.boxEl; };
      cv.addEventListener('contextmenu', e => e.preventDefault());
      document.addEventListener('keydown', e => { // ok tuşları: ileri / geri / sağ / sol, PageUp/Down: yukarı / aşağı (Shift: hızlı)
        if (!this.visible() || e.ctrlKey || e.altKey || e.metaKey) return; const ae = document.activeElement;
        if (ae && ae !== document.body && !(ae.id === 'cmd' && !ae.value) && ae !== cv) return;
        if (['+', '=', 'Add'].includes(e.key) || e.code === 'NumpadAdd') { e.preventDefault(); e.stopPropagation(); this.zoomBy(e.shiftKey && e.key !== '+' ? 0.5 : 0.75, this.W / 2, this.H / 2); return; } // + yakınlaş
        if (['-', '_', 'Subtract'].includes(e.key) || e.code === 'NumpadSubtract') { e.preventDefault(); e.stopPropagation(); this.zoomBy(e.shiftKey ? 2 : 1 / 0.75, this.W / 2, this.H / 2); return; } // − uzaklaş
        if (e.key === 'Home' || (e.key === '*' || e.code === 'NumpadMultiply')) { e.preventDefault(); e.stopPropagation(); this.fit(); return; } // Home / * = tümünü göster
        const k = { ArrowUp: [1, 0, 0], ArrowDown: [-1, 0, 0], ArrowLeft: [0, -1, 0], ArrowRight: [0, 1, 0], PageUp: [0, 0, 1], PageDown: [0, 0, -1] }[e.key]; if (!k) return;
        e.preventDefault(); e.stopPropagation(); const m = e.shiftKey ? 3 : 1; this.moveBy(k[0] * m, k[1] * m, k[2] * m);
      }, true);
      cv.addEventListener('pointerdown', e => { { const [hx, hy] = pos(e); if (C.h3 && !C.cmd.running && C.h3.down(this, hx, hy, e)) { cv.setPointerCapture(e.pointerId); drag = null; return; } } cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); if (e.button === 1) e.preventDefault(); drag = { x, y, x0: x, y0: y, b: e.button, sh: e.shiftKey, moved: false, box: e.button === 0 && !e.shiftKey && selecting() }; drag.mode = e.button === 1 ? (e.shiftKey ? 'orbit' : 'pan') : e.button === 2 ? (e.shiftKey ? 'pan' : 'orbit') : ((this.panLeft || e.shiftKey) ? 'pan' : 'orbit'); if (!drag.box && drag.mode === 'orbit') drag.pivot = this.pivotAt(x, y); if (drag.mode === 'pan' && !drag.box) cv.style.cursor = 'grabbing'; });
      cv.addEventListener('pointermove', e => {
        const [x, y] = pos(e); this.mouse = [x, y];
        if (C.h3 && C.h3.drag) { C.h3.move(this, x, y, e); return; }
        if (C.h3 && !drag && !C.cmd.running && C.h3.hover(this, x, y)) return;
        if (drag) {
          const dx = x - drag.x, dy = y - drag.y; drag.x = x; drag.y = y;
          if (Math.hypot(x - drag.x0, y - drag.y0) > 4) drag.moved = true;
          if (drag.moved) {
            if (drag.box) { const bx = boxEl(), r = cv.getBoundingClientRect(), pr = cv.parentElement.getBoundingClientRect(), cross = x < drag.x0; Object.assign(bx.style, { display: 'block', left: (Math.min(x, drag.x0) + r.left - pr.left) + 'px', top: (Math.min(y, drag.y0) + r.top - pr.top) + 'px', width: Math.abs(x - drag.x0) + 'px', height: Math.abs(y - drag.y0) + 'px' }); bx.classList.toggle('cross', cross); }
            else if (drag.mode === 'orbit') this.orbitBy(dx, dy, drag.pivot); // AutoCAD gibi: orta tuş = kaydır, Shift+orta / sağ tuş = döndür
            else this.panBy(dx, dy);
            this.dirty = true;
          }
        }
        this.shift = e.shiftKey && !drag;
        const w = C.cmd.waiting;
        if (w && (w.kind === 'pt' || w.kind === 'num')) {
          const p = this.pointAt(x, y); if (p) { this.cursor = p; C.cmd.cursor = p; }
          this.hoverPoly = C.cmd.hover === 'face' && C.hoverFace ? C.hoverFace(this, p) : null;
          this.hoverEdge = C.cmd.hover === 'edge' ? this.pickEdge(x, y) : null;
          this.dirty = true; if (this.onCursor) this.onCursor(this.cursor, this.snapHit);
        } else {
          if (this.cursor) { this.cursor = null; this.dirty = true; }
          if (!drag && (!w || w.kind === 'sel')) {
            const h = this.hitEnt(x, y), faceMode = h && h.ti != null && !w && C.facePoly; const he = h && h.e ? h.e : null, id = he ? he.id + (faceMode ? ':' + h.ti : '') : null;
            if (id !== this.hoverId) { this.hoverId = id; this.hoverEnt = faceMode ? null : he; let fp = null; if (faceMode) { try { fp = C.facePoly(h.e, h.ti, h.n); } catch (er) { } } this.hoverFace = fp ? fp.pts : null; cv.style.cursor = id ? 'pointer' : ''; this.dirty = true; }
          }
          else if (this.hoverEnt || this.hoverFace) { this.hoverEnt = null; this.hoverFace = null; this.hoverId = null; this.dirty = true; }
        }
      });
      cv.addEventListener('pointerup', e => {
        if (C.h3 && C.h3.drag) { C.h3.up(this); return; }
        const d = drag; drag = null; const [x, y] = pos(e); if (d && d.mode === 'pan') cv.style.cursor = this.panLeft ? 'grab' : '';
        if (d && d.box && d.moved) { boxEl().style.display = 'none'; this.boxSelect(d.x0, d.y0, x, y, x < d.x0); return; }
        if (!d || d.moved) return;
        if (d.b === 2) { if (!C.cmd.running && C.entMenu) { const h = this.hitEnt(x, y); const ent = h && h.e ? h.e : (C.sel.length === 1 ? C.sel[0] : null); if (ent) { C.entMenu(ent, e.clientX, e.clientY); return; } } C.cmd.enter(); return; }
        if (d.b !== 0) return;
        const w = C.cmd.waiting;
        if (w && (w.kind === 'pt' || w.kind === 'num')) { this.shift = e.shiftKey; const p = this.pointAt(x, y); if (p) { const fh = this.faceHit || ((this.plane === 'OTO' || C.cmd.hover) && !this.axisHit && this.axisHit !== 0 ? this.pick(x, y) : null); C.cmd.lastFace = fh ? Object.assign({}, fh, { p }) : null; C.cmd.lastEdge = C.cmd.hover === 'edge' ? this.pickEdge(x, y) : null; C.cmd.click(p); } return; }
        const hit = this.hitEnt(x, y);
        if (hit && hit.e && hit.ti != null && !w && !C.cmd.running && !e.ctrlKey && !e.shiftKey && C.facePoly) { // yüz seçimi (SketchUp gibi; çift tık = tüm nesne)
          const fp = C.facePoly(hit.e, hit.ti, hit.n);
          if (fp) { C.selFace = { e: hit.e, ti: hit.ti, n: fp.n, pts: fp.pts, holes: fp.holes, p: hit.p }; C.sel = []; C.emit('selection'); this.dirty = true; return; }
        }
        if (C.selFace) { C.selFace = null; this.dirty = true; }
        if (hit && hit.e) { if (w && w.kind === 'sel') C.cmd.selectAdd([hit.e]); else if (!C.cmd.running) { C.sel = C.sel.includes(hit.e) ? C.sel.filter(q => q !== hit.e) : (e.ctrlKey || e.shiftKey ? C.sel.concat([hit.e]) : [hit.e]); C.emit('selection'); } }
        else if (!w && !C.cmd.running && (C.sel.length || !e.ctrlKey)) { C.sel = []; C.emit('selection'); }
      });
      cv.addEventListener('pointerleave', () => { this.mouse = null; if (this.hoverEnt || this.hoverFace) { this.hoverEnt = null; this.hoverFace = null; this.hoverId = null; this.dirty = true; } if (this.cursor) { this.cursor = null; this.dirty = true; } });
      cv.addEventListener('wheel', e => { // imlecin altındaki noktaya doğru yakınlaş / uzaklaş (fare tekerleği, touchpad, Ctrl+tekerlek)
        e.preventDefault(); const [x, y] = pos(e);
        let dy = e.deltaY; if (e.deltaMode === 1) dy *= 40; else if (e.deltaMode === 2) dy *= this.H || 800; // satır / sayfa birimli tekerlekler
        if (!dy) return; dy = Math.max(-600, Math.min(600, dy));
        this.zoomBy(Math.pow(1.0015, dy * (C.state.zoomSpeed || 1)), x, y);
      }, { passive: false });
      cv.addEventListener('auxclick', e => { if (e.button === 1 && e.detail === 2) { e.preventDefault(); this.fit(); } }); // orta tuş çift tık = tümünü göster (AutoCAD gibi)
      cv.addEventListener('dblclick', e => { if (C.cmd.running) return; const [x, y] = pos(e); const h = this.hitEnt(x, y); if (h && h.e) { C.selFace = null; C.sel = [h.e]; C.emit('selection'); if (C.openProps) C.openProps(); } else this.fit(); });
    }
    /* pencere (soldan sağa: tamamen içinde) / kesişen (sağdan sola) seçim */
    boxSelect(x0, y0, x1, y1, cross) {
      const bx = [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)], out = [];
      for (const { e, bb } of this.boxes || []) {
        if (C.layer(e.layer).lock) continue;
        const cs = []; for (let i = 0; i < 8; i++) { const q = this.project([bb[i & 1 ? 3 : 0], bb[i & 2 ? 4 : 1], bb[i & 4 ? 5 : 2]]); if (q) cs.push(q); }
        if (!cs.length) continue;
        const sb = [Math.min(...cs.map(q => q[0])), Math.min(...cs.map(q => q[1])), Math.max(...cs.map(q => q[0])), Math.max(...cs.map(q => q[1]))];
        const inside = sb[0] >= bx[0] && sb[1] >= bx[1] && sb[2] <= bx[2] && sb[3] <= bx[3];
        const over = !(sb[2] < bx[0] || sb[0] > bx[2] || sb[3] < bx[1] || sb[1] > bx[3]);
        if (cross ? over : inside) out.push(e);
      }
      const w = C.cmd.waiting; C.selFace = null;
      if (w && w.kind === 'sel') C.cmd.selectAdd(out);
      else if (!C.cmd.running) { const ids = new Set(C.sel.map(q => q.id)); C.sel = C.sel.concat(out.filter(q => !ids.has(q.id))); C.emit('selection'); }
    }
  }
  View3D.SHADERS = { VS, FS, TVS, TFS, WVS, WFS, BVS, BFS }; // html3b.js: dışa aktarılan HTML aynı ışık ve renkle çizer
  C.View3D = View3D;
})(window.C);
