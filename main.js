/* RU-FOOD · Landing comercial — rolagem, revelações e a GI (2D).
   GSAP + ScrollTrigger + Lenis. A cena 3D e o shader ficam em gl.js. */
(() => {
  const raiz = document.documentElement;
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const toque = matchMedia("(hover: none)").matches;
  const temGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  // ---------- Carregando ----------
  let liberado = false;
  const liberar = () => {
    if (liberado) return;
    liberado = true;
    raiz.classList.add("pronto");
    if (temGsap) introducao();
  };
  addEventListener("load", () => setTimeout(liberar, 250));
  setTimeout(liberar, 2200);

  // ---------- GI em SVG: olhos que seguem o ponteiro ----------
  const ponteiro = { x: innerWidth / 2, y: innerHeight * 0.3, ativo: false };
  addEventListener("pointermove", (e) => {
    ponteiro.x = e.clientX;
    ponteiro.y = e.clientY;
    ponteiro.ativo = true;
  }, { passive: true });

  const gis = [...document.querySelectorAll("[data-gi]")].map((el) => ({
    el,
    olhos: el.querySelector(".gi-olhos"),
    olho: el.querySelectorAll(".gi-olho"),
    forte: el.hasAttribute("data-gi-forte"),
    mola: { x: 0, y: 0, vx: 0, vy: 0 },
    visivel: true,
    proximaPiscada: performance.now() + 1200 + Math.random() * 2000,
    piscouEm: -1,
  }));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      const g = gis.find((x) => x.el === en.target);
      if (g) g.visivel = en.isIntersecting;
    }));
    gis.forEach((g) => io.observe(g.el));
  }
  let antes = performance.now();
  function olhar(agora) {
    const dt = Math.min(0.05, (agora - antes) / 1000);
    antes = agora;
    for (const g of gis) {
      if (!g.visivel || !g.olhos) continue;
      const r = g.el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let ax = 0, ay = 0;
      if (ponteiro.ativo && !toque) {
        const dx = ponteiro.x - cx, dy = ponteiro.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const alcance = g.forte ? 11 : 9;
        const forca = Math.min(1, dist / 260);
        ax = (dx / dist) * alcance * forca;
        ay = (dy / dist) * alcance * forca * 0.85;
      } else {
        // Ociosa: passeia o olhar devagar
        ax = Math.sin(agora / 1600) * 6;
        ay = Math.cos(agora / 2300) * 3;
      }
      // O olho direito nunca invade a mordida (canto superior direito)
      if (ax > 4 && ay < -2) { ax *= 0.7; ay *= 0.5; }
      const m = g.mola;
      m.vx += ((ax - m.x) * 90 - m.vx * 14) * dt;
      m.vy += ((ay - m.y) * 90 - m.vy * 14) * dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      // Piscadas orgânicas
      let palpebra = 1;
      if (!reduzir && agora > g.proximaPiscada) {
        g.piscouEm = agora;
        g.proximaPiscada = agora + 2400 + Math.random() * 3200;
      }
      const p = (agora - g.piscouEm) / 170;
      if (p >= 0 && p <= 1) palpebra = 1 - Math.sin(p * Math.PI) * 0.9;
      g.olhos.setAttribute("transform", `translate(${m.x.toFixed(2)} ${m.y.toFixed(2)})`);
      g.olho.forEach((o) => (o.style.transform = `scaleY(${palpebra.toFixed(3)})`));
    }
    requestAnimationFrame(olhar);
  }
  if (!reduzir) requestAnimationFrame(olhar);

  if (!temGsap) {
    raiz.classList.add("sem-gsap");
    return;
  }

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "power3.out", duration: 0.9 });

  // ---------- Rolagem suave ----------
  let lenis = null;
  if (!reduzir && typeof window.Lenis !== "undefined") {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.lenis = lenis;
  }
  const irPara = (alvo, offset = -84) => {
    if (lenis) lenis.scrollTo(alvo, { offset, duration: 1.4 });
    else {
      const y = typeof alvo === "number" ? alvo : alvo.getBoundingClientRect().top + scrollY + offset;
      scrollTo({ top: y, behavior: reduzir ? "auto" : "smooth" });
    }
  };
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const alvo = id === "#topo" ? 0 : document.querySelector(id);
      if (alvo === null) return;
      e.preventDefault();
      irPara(alvo);
    });
  });

  // ---------- Títulos por palavra ----------
  function dividir(el) {
    const andar = (no) => {
      [...no.childNodes].forEach((filho) => {
        if (filho.nodeType === 3) {
          const partes = filho.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          partes.forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span");
            w.className = "palavra";
            const i = document.createElement("span");
            i.textContent = p;
            w.appendChild(i);
            frag.appendChild(w);
          });
          filho.replaceWith(frag);
        } else if (filho.nodeType === 1 && filho.tagName !== "BR") {
          andar(filho);
        }
      });
    };
    andar(el);
    return el.querySelectorAll(".palavra > span");
  }

  // ---------- Introdução ----------
  function introducao() {
    if (reduzir) return;
    const tl = gsap.timeline({ defaults: { ease: "expo.out", duration: 1.2 } });
    tl.from("[data-hero-linha]", { yPercent: 110, rotate: 4, stagger: 0.09 })
      .from("[data-hero-in]", { y: 24, opacity: 0, stagger: 0.07, duration: 0.9 }, 0.15)
      .from(".hero-palco .flutua, .hero-palco .etiqueta", { scale: 0.6, opacity: 0, stagger: 0.08, ease: "back.out(1.8)", duration: 0.8 }, 0.45);
  }
  if (reduzir) return; // sem animações de rolagem: tudo já visível

  const mm = gsap.matchMedia();

  // Palavras dos títulos
  document.querySelectorAll("[data-split]").forEach((el) => {
    const palavras = dividir(el);
    gsap.from(palavras, {
      yPercent: 115, rotate: 3, duration: 1.1, ease: "expo.out", stagger: 0.06,
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });

  // Revelações simples
  gsap.set("[data-reveal]", { y: 36, opacity: 0 });
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 88%",
    onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, stagger: 0.08, overwrite: true }),
  });
  gsap.utils.toArray("[data-reveal-escala]").forEach((el) => {
    gsap.from(el, { scale: 0.9, y: 60, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 85%" } });
  });

  // Contadores
  document.querySelectorAll("[data-count]").forEach((el) => {
    const fim = +el.dataset.count;
    const obj = { v: 0 };
    gsap.to(obj, {
      v: fim, duration: 1.6, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
      onUpdate: () => (el.textContent = Math.round(obj.v)),
    });
  });

  // ---------- Hero: profundidade ----------
  gsap.utils.toArray("[data-parallax]").forEach((el) => {
    gsap.to(el, { y: +el.dataset.parallax * 2.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  });
  if (!toque) {
    const flutuantes = gsap.utils.toArray(".hero-palco .flutua, .hero-palco .etiqueta").map((el, i) => ({
      x: gsap.quickTo(el, "x", { duration: 0.9, ease: "power3" }),
      fator: (i % 2 ? -1 : 1) * (10 + i * 4),
    }));
    addEventListener("pointermove", (e) => {
      const nx = e.clientX / innerWidth - 0.5;
      flutuantes.forEach((f) => f.x(nx * f.fator));
    }, { passive: true });
  }

  // Palco de dispositivos levanta como o notebook do case
  gsap.fromTo("[data-palco-cena]",
    { rotateX: 26, y: 40, scale: 0.88 },
    { rotateX: 0, y: 0, scale: 1, ease: "none", scrollTrigger: { trigger: "[data-palco]", start: "top 100%", end: "top 20%", scrub: 1 } });
  gsap.fromTo(".palco-iphone",
    { y: 130, z: 90, rotate: 8, opacity: 0.85 },
    { y: 0, z: 90, rotate: 5, opacity: 1, ease: "none", scrollTrigger: { trigger: "[data-palco]", start: "top 95%", end: "top 10%", scrub: 1 } });

  // Inclinação com o ponteiro
  if (!toque) {
    gsap.utils.toArray("[data-tilt], [data-tilt-leve]").forEach((el) => {
      const forca = el.hasAttribute("data-tilt-leve") ? 3 : 7;
      const rx = gsap.quickTo(el, "rotationX", { duration: 0.8, ease: "power3" });
      const ry = gsap.quickTo(el, "rotationY", { duration: 0.8, ease: "power3" });
      gsap.set(el, { transformPerspective: 1200 });
      addEventListener("pointermove", (e) => {
        ry((e.clientX / innerWidth - 0.5) * forca);
        rx(-(e.clientY / innerHeight - 0.5) * forca);
      }, { passive: true });
    });
    // Botões magnéticos
    document.querySelectorAll("[data-magnetic]").forEach((b) => {
      const x = gsap.quickTo(b, "x", { duration: 0.5, ease: "power3" });
      const y = gsap.quickTo(b, "y", { duration: 0.5, ease: "power3" });
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.18);
        y((e.clientY - r.top - r.height / 2) * 0.3);
      });
      b.addEventListener("pointerleave", () => { x(0); y(0); });
    });
  }

  // ---------- Dilema: Vitrine de cenários e ilustrações da marca ----------
  const passos = gsap.utils.toArray(".dilema-passo");
  const cenas = gsap.utils.toArray(".dilema-cena");
  const pontos = gsap.utils.toArray(".dilema-ponto");
  let cenaAtual = -1;

  function mostrarCena(i) {
    if (i === cenaAtual || i < 0 || i >= cenas.length) return;
    cenaAtual = i;
    passos.forEach((el, k) => el.classList.toggle("is-ativo", k === i));
    cenas.forEach((el, k) => el.classList.toggle("is-ativa", k === i));
    pontos.forEach((btn, k) => {
      btn.classList.toggle("is-ativo", k === i);
      btn.setAttribute("aria-selected", k === i ? "true" : "false");
    });

    const cenaEl = cenas[i];
    if (cenaEl) {
      const carimbo = cenaEl.querySelector(".dilema-selo-carimbo");
      if (carimbo) {
        gsap.fromTo(carimbo, { scale: 1.3, rotate: i === 3 ? 0 : -14, opacity: 0 }, { scale: 1, rotate: i === 3 ? 0 : -3, opacity: 1, duration: 0.45, ease: "back.out(2)" });
      }
      const sticker = cenaEl.querySelector(".dilema-sticker");
      if (sticker) {
        gsap.fromTo(sticker, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "elastic.out(1, 0.6)" });
      }
    }
  }

  let stDilema = null;
  mm.add("(min-width: 901px)", () => {
    stDilema = ScrollTrigger.create({
      trigger: "[data-dilema]", start: "top top", end: "+=260%", pin: true, scrub: true,
      onUpdate: (st) => mostrarCena(Math.min(3, Math.floor(st.progress * 4))),
    });
    return () => { stDilema = null; };
  });
  mm.add("(max-width: 900px)", () => {
    ScrollTrigger.create({
      trigger: "[data-dilema-vitrine]", start: "top 80%", end: "bottom 20%",
      onUpdate: (st) => mostrarCena(Math.min(3, Math.floor(st.progress * 4))),
    });
  });

  pontos.forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = +btn.dataset.irPasso;
      if (stDilema) {
        irPara(stDilema.start + ((idx + 0.3) / 4) * (stDilema.end - stDilema.start), 0);
      } else {
        mostrarCena(idx);
      }
    });
  });
  mostrarCena(0);

  // ---------- Como funciona: linhas tracejadas desenhadas na rolagem ----------
  const svgFluxo = document.querySelector(".fluxo-linhas");
  if (svgFluxo) {
    const NS = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(NS, "defs");
    svgFluxo.prepend(defs);
    gsap.utils.toArray("[data-linha]").forEach((linha, i) => {
      const mascara = document.createElementNS(NS, "mask");
      mascara.id = "m-linha-" + i;
      mascara.setAttribute("maskUnits", "userSpaceOnUse");
      const traco = linha.cloneNode();
      traco.removeAttribute("data-linha");
      traco.setAttribute("style", "stroke:#fff;stroke-width:8;stroke-dasharray:none;opacity:1;fill:none");
      mascara.appendChild(traco);
      defs.appendChild(mascara);
      linha.setAttribute("mask", `url(#m-linha-${i})`);
      const comp = traco.getTotalLength();
      gsap.set(traco, { strokeDasharray: comp, strokeDashoffset: comp });
      gsap.to(traco, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: "[data-fluxo]", start: `top+=${i * 140} 75%`, end: `top+=${i * 140 + 380} 45%`, scrub: 1 } });
    });
  }
  gsap.utils.toArray("[data-no]").forEach((no, i) => {
    gsap.from(no, { y: 70, opacity: 0, scale: 0.92, rotate: i % 2 ? 6 : -6, duration: 1.1, ease: "back.out(1.4)", scrollTrigger: { trigger: no, start: "top 85%" } });
    gsap.from(no.querySelector(".no-selo"), { scale: 0, rotate: -90, duration: 0.6, ease: "back.out(2.5)", delay: 0.35, scrollTrigger: { trigger: no, start: "top 85%" } });
  });

  // ---------- App do aluno: demonstração interativa na tela do celular ----------
  const demoBox = document.querySelector("[data-demo]");
  if (demoBox) {
    const demoSlides = gsap.utils.toArray(".demo-slide");
    const demoStatus = document.querySelector("[data-demo-status]");
    const demoLonga = document.querySelector(".demo-longa");
    const demoAviso = document.querySelector(".demo-aviso");
    let slideAtivo = 0;
    let timerDemo = null;

    function trocarDemoSlide(idx) {
      if (idx < 0 || idx >= demoSlides.length) return;
      slideAtivo = idx;
      demoSlides.forEach((s, k) => s.classList.toggle("is-ativo", k === idx));
      const s = demoSlides[idx];
      const ehEscuro = s.hasAttribute("data-escuro");
      if (demoStatus) demoStatus.classList.toggle("is-escuro", ehEscuro);

      if (s.dataset.slide === "semana" && demoLonga) {
        gsap.fromTo(demoLonga, { y: 0 }, { y: "-40%", duration: 2.2, ease: "power1.inOut", delay: 0.4 });
      }
      if (s.dataset.slide === "avaliar" && demoAviso) {
        gsap.fromTo(demoAviso, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5, delay: 0.6 });
      }
    }

    ScrollTrigger.create({
      trigger: "#p-aluno",
      start: "top 75%",
      end: "bottom 25%",
      onToggle: (st) => {
        clearInterval(timerDemo);
        if (st.isActive) {
          timerDemo = setInterval(() => {
            trocarDemoSlide((slideAtivo + 1) % demoSlides.length);
          }, 3200);
        }
      },
    });

    gsap.from(".rotulo-flutua", {
      scale: 0.5, opacity: 0, stagger: 0.14, ease: "back.out(2)", duration: 0.8,
      scrollTrigger: { trigger: "#p-aluno", start: "top 75%" },
    });
  }

  // ---------- Gestão: troca de telas com a rolagem ----------
  const telas = gsap.utils.toArray("[data-telas] img");
  const itens = gsap.utils.toArray("[data-gestao-passos] li");
  const url = document.querySelector("[data-url]");
  const barra = document.querySelector("[data-gestao-barra]");
  let telaAtual = 0;
  function mostrar(i) {
    if (i === telaAtual) return;
    telaAtual = i;
    telas.forEach((t, k) => t.classList.toggle("is-ativa", k === i));
    itens.forEach((t, k) => t.classList.toggle("is-ativo", k === i));
    if (url) url.textContent = "rufood.vercel.app" + telas[i].dataset.urlTela;
    gsap.to(barra, { scaleX: (i + 1) / telas.length, duration: 0.5 });
  }
  gsap.set(barra, { scaleX: 1 / telas.length });
  let stGestao = null;
  mm.add("(min-width: 901px)", () => {
    stGestao = ScrollTrigger.create({
      trigger: "[data-gestao]", start: "top top", end: `+=${telas.length * 55}%`, pin: true, scrub: true,
      onUpdate: (st) => mostrar(Math.min(telas.length - 1, Math.floor(st.progress * telas.length))),
    });
    return () => { stGestao = null; };
  });
  let girar = null;
  mm.add("(max-width: 900px)", () => {
    ScrollTrigger.create({
      trigger: "[data-gestao]", start: "top 70%", end: "bottom 30%",
      onToggle: (st) => {
        clearInterval(girar);
        if (st.isActive) girar = setInterval(() => mostrar((telaAtual + 1) % telas.length), 3200);
      },
    });
    return () => clearInterval(girar);
  });
  document.querySelectorAll("[data-ir]").forEach((b) => b.addEventListener("click", () => {
    const i = +b.dataset.ir;
    if (stGestao) irPara(stGestao.start + ((i + 0.5) / telas.length) * (stGestao.end - stGestao.start), 0);
    else { clearInterval(girar); mostrar(i); }
  }));

  // ---------- GI: conversa ----------
  gsap.from("[data-msg]", {
    y: 24, opacity: 0, scale: 0.94, transformOrigin: "bottom center", stagger: 0.55, duration: 0.6, ease: "back.out(1.6)",
    scrollTrigger: { trigger: "[data-chat]", start: "top 80%" },
  });
  gsap.from(".gi-palco .gi", { scale: 0.6, rotate: -12, opacity: 0, duration: 1.3, ease: "elastic.out(1, .6)", scrollTrigger: { trigger: ".gi-palco", start: "top 80%" } });

  // ---------- Antes × depois ----------
  gsap.utils.toArray("[data-comp]").forEach((linha) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: linha, start: "top 82%" } });
    tl.from(linha, { y: 30, opacity: 0, duration: 0.6 })
      .to(linha.querySelector(".comp-antes span"), { "--risco": "100%", duration: 0.6, ease: "power2.inOut" }, 0.3)
      .from(linha.querySelector(".comp-depois"), { x: 40, opacity: 0, duration: 0.7 }, 0.55);
  });

  // ---------- Cartões ----------
  ScrollTrigger.batch("[data-cartao]", {
    start: "top 88%",
    onEnter: (els) => gsap.from(els, { y: 80, opacity: 0, rotate: () => gsap.utils.random(-3, 3), stagger: 0.1, duration: 1, ease: "expo.out" }),
    once: true,
  });
  // Perfis de acesso: entram como cartas distribuídas na mesa
  ScrollTrigger.batch("[data-perfil]", {
    start: "top 90%",
    onEnter: (els) => gsap.from(els, {
      y: 160, rotationX: -35, rotation: () => gsap.utils.random(-10, 10), opacity: 0, transformOrigin: "50% 100%",
      stagger: 0.09, duration: 1.1, ease: "expo.out",
    }),
    once: true,
  });

  // ---------- Navegação ----------
  const nav = document.querySelector("[data-nav]");
  let ultimoY = 0;
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (st) => {
      const y = st.scroll();
      nav.classList.toggle("is-rolado", y > 40);
      nav.classList.toggle("is-escondido", y > 600 && y > ultimoY + 4);
      if (y < ultimoY - 4 || y < 600) nav.classList.remove("is-escondido");
      ultimoY = y;
    },
  });
  const links = [...document.querySelectorAll(".nav-links a")];
  links.forEach((a) => {
    const sec = document.querySelector(a.getAttribute("href"));
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec, start: "top 50%", end: "bottom 50%",
      onToggle: (st) => st.isActive && links.forEach((l) => l.classList.toggle("is-ativo", l === a)),
    });
  });

  addEventListener("load", () => ScrollTrigger.refresh());
})();
