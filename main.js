/* RU-FOOD · Landing comercial — rolagem, revelações, interações e a GI (2D).
   GSAP + ScrollTrigger + Lenis. A cena 3D e o shader ficam em gl.js.
   Interações (menu, copiar, dilema, painel, demo) funcionam com e sem animação;
   os efeitos de rolagem e mouse só ligam com GSAP e sem "reduzir movimento". */
(() => {
  const raiz = document.documentElement;
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const toque = matchMedia("(hover: none)").matches;
  const desktop = matchMedia("(min-width: 901px)");
  const { gsap, ScrollTrigger } = window;
  const temGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
  const animar = temGsap && !reduzir;
  if (!temGsap) raiz.classList.add("sem-gsap");
  if (temGsap) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: "expo.out", duration: 0.9 }); // ≈ cubic-bezier(.16, 1, .3, 1) do sistema
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  // ---------- Carregando ----------
  let liberado = false;
  const liberar = () => {
    if (liberado) return;
    liberado = true;
    raiz.classList.add("pronto");
    if (animar) introducao();
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
      if (agora > g.proximaPiscada) {
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

  // ---------- Rolagem suave ----------
  let lenis = null;
  if (animar && typeof window.Lenis !== "undefined") {
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

  // ---------- Menu do celular ----------
  const menu = document.querySelector("[data-menu]");
  const menuAbrir = document.querySelector("[data-menu-abrir]");
  let menuAberto = false;
  let menuTimer = null;
  const focaveis = () => [...menu.querySelectorAll("a[href], button:not([disabled])")];
  function abrirMenu() {
    if (!menu || menuAberto) return;
    menuAberto = true;
    clearTimeout(menuTimer);
    menu.hidden = false;
    void menu.offsetWidth; // aplica o estado inicial antes da transição
    menu.classList.add("is-aberto");
    menuAbrir.setAttribute("aria-expanded", "true");
    raiz.classList.add("menu-aberto");
    lenis?.stop();
    menu.querySelector(".menu-fechar")?.focus({ preventScroll: true });
  }
  function fecharMenu(devolverFoco = true) {
    if (!menu || !menuAberto) return;
    menuAberto = false;
    menu.classList.remove("is-aberto");
    menuAbrir.setAttribute("aria-expanded", "false");
    raiz.classList.remove("menu-aberto");
    lenis?.start();
    menuTimer = setTimeout(() => { if (!menuAberto) menu.hidden = true; }, reduzir ? 0 : 420);
    if (devolverFoco) menuAbrir.focus({ preventScroll: true });
  }
  if (menu && menuAbrir) {
    menuAbrir.addEventListener("click", () => (menuAberto ? fecharMenu() : abrirMenu()));
    menu.querySelectorAll("[data-menu-fechar]").forEach((el) => el.addEventListener("click", () => fecharMenu()));
    // Links do menu: fecha antes de rolar (o handler de âncoras vem depois)
    menu.querySelectorAll(".menu-folha a").forEach((a) => a.addEventListener("click", () => fecharMenu(false)));
    addEventListener("keydown", (e) => {
      if (!menuAberto) return;
      if (e.key === "Escape") { e.preventDefault(); fecharMenu(); return; }
      if (e.key !== "Tab") return;
      const f = focaveis();
      const primeiro = f[0], ultimo = f[f.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    });
    matchMedia("(min-width: 1081px)").addEventListener("change", (e) => e.matches && fecharMenu(false));
  }

  // ---------- Âncoras ----------
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const alvo = id === "#topo" ? 0 : document.querySelector(id);
      if (alvo === null) return;
      e.preventDefault();
      irPara(alvo);
      if (id !== "#topo" && history.replaceState) history.replaceState(null, "", id);
    });
  });

  // ---------- Copiar e-mails e endereços ----------
  const anuncio = document.querySelector("[data-anuncio]");
  async function copiarTexto(texto) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
        return true;
      }
    } catch { /* cai no plano B */ }
    const campo = document.createElement("textarea");
    campo.value = texto;
    campo.setAttribute("readonly", "");
    campo.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(campo);
    campo.select();
    campo.setSelectionRange(0, texto.length);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    campo.remove();
    return ok;
  }
  document.querySelectorAll("[data-copiar]").forEach((botao) => {
    const rotulo = botao.querySelector("span");
    const original = rotulo ? rotulo.textContent : "";
    let volta = null;
    botao.addEventListener("click", async () => {
      const texto = botao.dataset.copiar;
      const ok = await copiarTexto(texto);
      botao.classList.toggle("is-copiado", ok);
      if (rotulo) rotulo.textContent = ok ? "Copiado!" : "Selecione e copie";
      if (anuncio) anuncio.textContent = ok ? `Copiado: ${texto}` : `Não deu para copiar. Endereço: ${texto}`;
      if (ok && animar) gsap.fromTo(botao, { scale: 0.92 }, { scale: 1, duration: 0.5, ease: "back.out(3)" });
      clearTimeout(volta);
      volta = setTimeout(() => {
        botao.classList.remove("is-copiado");
        if (rotulo) rotulo.textContent = original;
      }, 2200);
    });
  });

  // ---------- Navegação: sombra, esconder ao descer, link ativo ----------
  const nav = document.querySelector("[data-nav]");
  let ultimoY = scrollY;
  function navRolagem() {
    const y = scrollY;
    nav.classList.toggle("is-rolado", y > 40);
    if (menuAberto) return;
    if (y > 600 && y > ultimoY + 4) nav.classList.add("is-escondido");
    else if (y < ultimoY - 4 || y < 600) nav.classList.remove("is-escondido");
    ultimoY = y;
  }
  addEventListener("scroll", navRolagem, { passive: true });
  navRolagem();
  nav.addEventListener("focusin", () => nav.classList.remove("is-escondido"));

  const links = [...document.querySelectorAll(".nav-links a")];
  if ("IntersectionObserver" in window) {
    const secoes = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
    const ioNav = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (!en.isIntersecting) return;
      const id = "#" + en.target.id;
      links.forEach((l) => l.classList.toggle("is-ativo", l.getAttribute("href") === id));
    }), { rootMargin: "-50% 0px -50% 0px" });
    secoes.forEach((s) => ioNav.observe(s));
  }

  // ---------- Dilema: vitrine de cenários ----------
  const dilema = document.querySelector("[data-dilema]");
  const passos = [...document.querySelectorAll(".dilema-passo")];
  const cenas = [...document.querySelectorAll(".dilema-cena")];
  const pontos = [...document.querySelectorAll(".dilema-ponto")];
  const TEMPO_DILEMA = 4200;
  let cenaAtual = -1;
  let stDilema = null;
  let autoDilema = null;

  function mostrarCena(i) {
    if (i === cenaAtual || i < 0 || i >= cenas.length) return;
    cenaAtual = i;
    passos.forEach((el, k) => el.classList.toggle("is-ativo", k === i));
    cenas.forEach((el, k) => {
      el.classList.toggle("is-ativa", k === i);
      el.toggleAttribute("inert", k !== i);
    });
    pontos.forEach((btn, k) => {
      btn.classList.toggle("is-ativo", k === i);
      btn.setAttribute("aria-selected", k === i ? "true" : "false");
    });
    if (!animar) return;
    const cena = cenas[i];
    const carimbo = cena.querySelector(".dilema-selo-carimbo");
    if (carimbo) gsap.fromTo(carimbo, { scale: 1.3, rotate: i === 3 ? 0 : -14, opacity: 0 }, { scale: 1, rotate: i === 3 ? 0 : -3, opacity: 1, duration: 0.45, ease: "back.out(2)" });
    const sticker = cena.querySelector(".dilema-sticker");
    if (sticker) gsap.fromTo(sticker, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "elastic.out(1, 0.6)" });
    gsap.fromTo(cena.querySelectorAll(".dilema-consequencias li, .dilema-lado"), { y: 14, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.07, duration: 0.5, delay: 0.1 });
  }
  function pararAutoDilema() {
    clearInterval(autoDilema);
    autoDilema = null;
    dilema?.classList.remove("is-auto");
  }
  function iniciarAutoDilema() {
    pararAutoDilema();
    if (!dilema) return;
    dilema.style.setProperty("--dilema-tempo", TEMPO_DILEMA + "ms");
    dilema.classList.add("is-auto");
    autoDilema = setInterval(() => mostrarCena((cenaAtual + 1) % cenas.length), TEMPO_DILEMA);
  }
  pontos.forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = +btn.dataset.irPasso;
      if (stDilema) {
        irPara(stDilema.start + ((idx + 0.3) / cenas.length) * (stDilema.end - stDilema.start), 0);
        return;
      }
      mostrarCena(idx);
      if (autoDilema) iniciarAutoDilema(); // recomeça a contagem a partir do toque
    });
  });
  // Deslizar o dedo na vitrine troca o cenário (celular)
  const vitrine = document.querySelector("[data-dilema-vitrine]");
  if (vitrine) {
    let x0 = null, y0 = null;
    vitrine.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    vitrine.addEventListener("touchend", (e) => {
      if (x0 === null || stDilema) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      mostrarCena((cenaAtual + (dx < 0 ? 1 : cenas.length - 1)) % cenas.length);
      if (autoDilema) iniciarAutoDilema();
    }, { passive: true });
  }
  mostrarCena(0);

  // ---------- Painel de gestão: troca de telas ----------
  const telas = [...document.querySelectorAll("[data-telas] img")];
  const itens = [...document.querySelectorAll("[data-gestao-passos] li")];
  const barra = document.querySelector("[data-gestao-barra]");
  let telaAtual = 0;
  let stGestao = null;
  let girar = null;
  const escalaBarra = (v) => {
    if (!barra) return;
    if (animar) gsap.to(barra, { scaleX: v, duration: 0.5 });
    else barra.style.transform = `scaleX(${v})`;
  };
  function mostrarTela(i) {
    if (i === telaAtual || !telas[i]) return;
    telaAtual = i;
    telas.forEach((t, k) => t.classList.toggle("is-ativa", k === i));
    itens.forEach((t, k) => {
      t.classList.toggle("is-ativo", k === i);
      t.querySelector("button")?.setAttribute("aria-pressed", k === i ? "true" : "false");
    });
    escalaBarra((i + 1) / telas.length);
  }
  itens.forEach((t, k) => t.querySelector("button")?.setAttribute("aria-pressed", k === 0 ? "true" : "false"));
  if (barra) barra.style.transform = `scaleX(${1 / telas.length})`;
  document.querySelectorAll("[data-ir]").forEach((b) => b.addEventListener("click", () => {
    const i = +b.dataset.ir;
    if (stGestao) irPara(stGestao.start + ((i + 0.5) / telas.length) * (stGestao.end - stGestao.start), 0);
    else {
      mostrarTela(i);
      if (girar) { clearInterval(girar); girar = setInterval(() => mostrarTela((telaAtual + 1) % telas.length), 3600); }
    }
  }));

  // ---------- App do aluno: o celular se apresenta sozinho ----------
  const demoBox = document.querySelector("[data-demo]");
  const demoSlides = [...document.querySelectorAll(".demo-slide")];
  const demoStatus = document.querySelector("[data-demo-status]");
  const demoLonga = document.querySelector(".demo-longa");
  const demoAviso = document.querySelector(".demo-aviso");
  const dedo = document.querySelector("[data-dedo]");
  // Onde o "dedo" toca antes de sair de cada tela (em % da tela do app)
  const TOQUE_SAIDA = { bemvindo: [50, 89], semana: [37, 96], dia: [85, 41], avaliar: [83, 96] };
  const TOQUE_ENTRADA = { avaliar: [81, 37] };
  let slideAtivo = 0;
  let timerDemo = null;

  function trocarDemoSlide(idx) {
    if (!demoSlides[idx]) return;
    slideAtivo = idx;
    demoSlides.forEach((s, k) => s.classList.toggle("is-ativo", k === idx));
    const s = demoSlides[idx];
    demoStatus?.classList.toggle("is-escuro", s.hasAttribute("data-escuro"));
    if (!animar) {
      if (demoAviso) demoAviso.style.opacity = s.dataset.slide === "avaliar" ? 1 : 0;
      return;
    }
    gsap.fromTo(s, { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" });
    if (s.dataset.slide === "semana" && demoLonga) {
      gsap.fromTo(demoLonga, { y: 0 }, { y: "-40%", duration: 2.2, ease: "power1.inOut", delay: 0.4 });
    }
    if (s.dataset.slide === "avaliar") {
      if (TOQUE_ENTRADA.avaliar) setTimeout(() => tocar(TOQUE_ENTRADA.avaliar), 350);
      if (demoAviso) gsap.fromTo(demoAviso, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5, delay: 0.75 });
    } else if (demoAviso) gsap.set(demoAviso, { opacity: 0 });
  }
  function tocar([x, y]) {
    if (!dedo || !animar) return;
    dedo.classList.remove("is-toque");
    gsap.timeline()
      .set(dedo, { left: x + "%", top: y + "%", opacity: 0, scale: 1.3 })
      .to(dedo, { opacity: 1, scale: 1, duration: 0.22, ease: "power2.out" })
      .add(() => { void dedo.offsetWidth; dedo.classList.add("is-toque"); })
      .to(dedo, { scale: 0.82, duration: 0.1, yoyo: true, repeat: 1, ease: "power1.inOut" })
      .to(dedo, { opacity: 0, duration: 0.25 }, "+=0.12");
  }
  function cicloDemo() {
    clearTimeout(timerDemo);
    const alvo = TOQUE_SAIDA[demoSlides[slideAtivo].dataset.slide];
    timerDemo = setTimeout(() => {
      if (alvo) {
        tocar(alvo);
        timerDemo = setTimeout(avancarDemo, 480);
      } else avancarDemo();
    }, 2700);
  }
  function avancarDemo() {
    trocarDemoSlide((slideAtivo + 1) % demoSlides.length);
    cicloDemo();
  }
  if (demoBox && !animar) {
    // Sem animação: mostra a tela de escolha do prato, parada
    const dia = demoSlides.findIndex((s) => s.dataset.slide === "dia");
    trocarDemoSlide(dia < 0 ? 0 : dia);
  }

  // ---------- Copiar, menu e controles prontos: daqui para baixo, só animação ----------
  if (!animar) {
    if (barra) barra.style.transform = `scaleX(${(telaAtual + 1) / telas.length})`;
    return;
  }

  const mm = gsap.matchMedia();

  // ---------- Títulos por palavra / leitura palavra a palavra ----------
  function dividir(el, mascara) {
    const andar = (no) => {
      [...no.childNodes].forEach((filho) => {
        if (filho.nodeType === 3) {
          const partes = filho.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          partes.forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span");
            if (mascara) {
              w.className = "palavra";
              const i = document.createElement("span");
              i.textContent = p;
              w.appendChild(i);
            } else {
              w.className = "ler-p";
              w.textContent = p;
            }
            frag.appendChild(w);
          });
          filho.replaceWith(frag);
        } else if (filho.nodeType === 1 && filho.tagName !== "BR") {
          andar(filho);
        }
      });
    };
    andar(el);
    return el.querySelectorAll(mascara ? ".palavra > span" : ".ler-p");
  }

  // ---------- Introdução ----------
  function introducao() {
    const tl = gsap.timeline({ defaults: { ease: "expo.out", duration: 1.2 } });
    tl.from("[data-hero-linha]", { yPercent: 110, rotate: 4, stagger: 0.09 })
      .from("[data-hero-in]", { y: 24, opacity: 0, stagger: 0.07, duration: 0.9 }, 0.15)
      .from(".hero-palco .flutua, .hero-palco .etiqueta", { scale: 0.6, opacity: 0, stagger: 0.08, ease: "back.out(1.8)", duration: 0.8 }, 0.45)
      .from(".palco", { y: 80, opacity: 0, duration: 1.4 }, 0.35);
  }

  // Barra de progresso da leitura
  gsap.to("[data-progresso]", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

  // Palavras dos títulos
  document.querySelectorAll("[data-split]").forEach((el) => {
    const palavras = dividir(el, true);
    gsap.from(palavras, {
      yPercent: 115, rotate: 3, duration: 1.1, ease: "expo.out", stagger: 0.06,
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });

  // Parágrafos que "acendem" conforme a leitura
  document.querySelectorAll("[data-ler]").forEach((p) => {
    const palavras = dividir(p, false);
    gsap.fromTo(palavras, { opacity: 0.16 }, {
      opacity: 1, ease: "none", stagger: 0.08,
      scrollTrigger: { trigger: p, start: "top 82%", end: "bottom 52%", scrub: true },
    });
  });

  // Revelações simples
  // Entradas do sistema: sobem 40px, escala .96 → 1, cascata de 80ms
  gsap.set("[data-reveal]", { y: 40, scale: 0.96, opacity: 0, transformOrigin: "50% 100%" });
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 88%",
    onEnter: (els) => gsap.to(els, { y: 0, scale: 1, opacity: 1, stagger: 0.08, overwrite: true }),
  });
  gsap.utils.toArray("[data-reveal-escala]").forEach((el) => {
    gsap.from(el, { scale: 0.9, y: 60, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 85%" } });
  });

  // Contadores
  document.querySelectorAll("[data-count]").forEach((el) => {
    const fim = +el.dataset.count;
    const obj = { v: 0 };
    el.textContent = "0";
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
  mm.add("(min-width: 901px)", () => {
    // O texto do hero recua enquanto o palco de dispositivos sobe
    gsap.to(".hero-texto", { y: -70, opacity: 0.25, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "40% top", scrub: true } });
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

  // ---------- Faixa infinita: acelera e inverte com a rolagem ----------
  const trilho = document.querySelector("[data-faixa-trilho]");
  if (trilho) {
    trilho.innerHTML += trilho.innerHTML;
    const loop = gsap.to(trilho, { xPercent: -50, duration: 32, ease: "none", repeat: -1 });
    loop.totalTime(32 * 200); // margem para tocar ao contrário sem bater no início
    let sentido = 1;
    ScrollTrigger.create({
      start: 0, end: "max",
      onUpdate: (st) => {
        sentido = st.direction;
        const impulso = Math.min(5, Math.abs(st.getVelocity()) / 320);
        gsap.to(loop, {
          timeScale: sentido * (1 + impulso), duration: 0.25, overwrite: true,
          onComplete: () => gsap.to(loop, { timeScale: sentido, duration: 1.1, overwrite: true }),
        });
      },
    });
    gsap.from(".faixa", { yPercent: 60, opacity: 0, duration: 1, scrollTrigger: { trigger: ".faixa", start: "top 98%" } });
  }

  // ---------- Seções coloridas abrem como cortina ----------
  mm.add({ grande: "(min-width: 901px)", pequeno: "(max-width: 900px)" }, (ctx) => {
    const lado = ctx.conditions.grande ? 4 : 3;
    const raio = ctx.conditions.grande ? 48 : 28;
    gsap.utils.toArray("[data-cortina]").forEach((sec) => {
      gsap.fromTo(sec,
        { clipPath: `inset(0% ${lado}% 0% ${lado}% round ${raio}px)` },
        { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none", scrollTrigger: { trigger: sec, start: "top 96%", end: "top 30%", scrub: true } });
    });
  });

  // ---------- Profundidade dos mockups na rolagem ----------
  gsap.utils.toArray("[data-prof]").forEach((el) => {
    const v = +el.dataset.prof;
    gsap.fromTo(el, { "--py": `${v}px` }, {
      "--py": `${-v}px`, ease: "none",
      scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  // ---------- Mouse: inclinação, botões magnéticos, brilho e cursor ----------
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

    // Brilho que acompanha o mouse dentro dos cartões
    addEventListener("pointermove", (e) => {
      const el = e.target.closest?.(".cartao, .perfil, .no, .onde a");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    }, { passive: true });

    // Cursor com rastro
    const cursor = document.createElement("div");
    cursor.className = "cursor";
    cursor.setAttribute("aria-hidden", "true");
    document.body.appendChild(cursor);
    const cx = gsap.quickTo(cursor, "x", { duration: 0.45, ease: "power3" });
    const cy = gsap.quickTo(cursor, "y", { duration: 0.45, ease: "power3" });
    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      cursor.classList.add("is-visivel");
      cx(e.clientX);
      cy(e.clientY);
      const t = e.target;
      cursor.classList.toggle("is-alvo", !!t.closest?.("a, button"));
      cursor.classList.toggle("is-escuro", !!t.closest?.(".dilema, .gi-secao, .acessos, .faixa, .cartao--escuro, .cartao--ketchup"));
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => cursor.classList.remove("is-visivel"));
  }

  // ---------- Dilema: fixado no desktop, automático no celular ----------
  mm.add("(min-width: 901px)", () => {
    pararAutoDilema();
    stDilema = ScrollTrigger.create({
      trigger: "[data-dilema]", start: "top top", end: "+=260%", pin: true, scrub: true,
      onUpdate: (st) => mostrarCena(Math.min(cenas.length - 1, Math.floor(st.progress * cenas.length))),
    });
    return () => { stDilema = null; };
  });
  mm.add("(max-width: 900px)", () => {
    ScrollTrigger.create({
      trigger: "[data-dilema-vitrine]", start: "top 85%", end: "bottom 15%",
      onToggle: (st) => (st.isActive ? iniciarAutoDilema() : pararAutoDilema()),
    });
    return () => pararAutoDilema();
  });

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

  // ---------- App do aluno: a demo roda enquanto está na tela ----------
  if (demoBox) {
    ScrollTrigger.create({
      trigger: "#p-aluno", start: "top 75%", end: "bottom 25%",
      onToggle: (st) => (st.isActive ? cicloDemo() : clearTimeout(timerDemo)),
    });
    gsap.from(".rotulo-flutua", {
      scale: 0.5, opacity: 0, stagger: 0.14, ease: "back.out(2)", duration: 0.8,
      scrollTrigger: { trigger: "#p-aluno", start: "top 75%" },
    });
    gsap.from(demoBox, { y: 80, rotate: -4, opacity: 0, duration: 1.3, ease: "expo.out", scrollTrigger: { trigger: demoBox, start: "top 88%" } });
  }

  // ---------- Painel de gestão: fixado no desktop, automático no celular ----------
  mm.add("(min-width: 901px)", () => {
    stGestao = ScrollTrigger.create({
      trigger: "[data-gestao]", start: "top top", end: `+=${telas.length * 55}%`, pin: true, scrub: true,
      onUpdate: (st) => mostrarTela(Math.min(telas.length - 1, Math.floor(st.progress * telas.length))),
    });
    return () => { stGestao = null; };
  });
  mm.add("(max-width: 900px)", () => {
    ScrollTrigger.create({
      trigger: "[data-gestao]", start: "top 70%", end: "bottom 30%",
      onToggle: (st) => {
        clearInterval(girar);
        girar = st.isActive ? setInterval(() => mostrarTela((telaAtual + 1) % telas.length), 3600) : null;
      },
    });
    return () => { clearInterval(girar); girar = null; };
  });

  // ---------- GI: conversa ----------
  gsap.from("[data-msg]", {
    y: 24, opacity: 0, scale: 0.94, transformOrigin: "bottom center", stagger: 0.55, duration: 0.6, ease: "back.out(1.6)",
    scrollTrigger: { trigger: "[data-chat]", start: "top 80%" },
  });
  gsap.from(".gi-palco .gi", { scale: 0.6, rotate: -12, opacity: 0, duration: 1.3, ease: "elastic.out(1, .6)", scrollTrigger: { trigger: ".gi-palco", start: "top 80%" } });
  gsap.from(".gi-acoes span", { y: 20, opacity: 0, stagger: 0.08, duration: 0.7, scrollTrigger: { trigger: ".gi-acoes", start: "top 88%" } });

  // ---------- Antes × depois ----------
  gsap.utils.toArray("[data-comp]").forEach((linha) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: linha, start: "top 85%" } });
    tl.from(linha, { y: 30, opacity: 0, duration: 0.6 })
      .to(linha.querySelector(".comp-antes span"), { "--risco": "100%", duration: 0.6, ease: "power2.inOut" }, 0.3)
      .from(linha.querySelector(".comp-depois"), { x: 40, opacity: 0, duration: 0.7 }, 0.55);
  });

  // ---------- Cartões e perfis (estado inicial já escondido: sem piscar) ----------
  gsap.set("[data-cartao]", { y: 80, opacity: 0 });
  ScrollTrigger.batch("[data-cartao]", {
    start: "top 90%", once: true,
    onEnter: (els) => gsap.fromTo(els,
      { y: 80, opacity: 0, rotate: () => gsap.utils.random(-3, 3) },
      { y: 0, opacity: 1, rotate: 0, stagger: 0.1, duration: 1, ease: "expo.out" }),
  });
  gsap.set("[data-perfil]", { y: 140, opacity: 0, transformOrigin: "50% 100%" });
  ScrollTrigger.batch("[data-perfil]", {
    start: "top 92%", once: true,
    onEnter: (els) => gsap.fromTo(els,
      { y: 140, rotationX: -35, rotation: () => gsap.utils.random(-10, 10), opacity: 0 },
      { y: 0, rotationX: 0, rotation: 0, opacity: 1, stagger: 0.09, duration: 1.1, ease: "expo.out", clearProps: "transform" }),
  });

  // ---------- Final ----------
  gsap.from(".dupla-telefones", { y: 120, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".dupla-telefones", start: "top 90%" } });

  // ScrollTriggers criados fora da ordem da página (cortinas, faixa) precisam ser
  // recalculados na ordem certa por causa das seções fixadas.
  ScrollTrigger.sort();
  const recalcular = () => ScrollTrigger.refresh();
  addEventListener("load", recalcular);
  document.fonts?.ready.then(recalcular);
})();
