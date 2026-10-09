# RU-FOOD · Landing comercial

Página de apresentação da plataforma, separada do app (`web/`). Site estático: HTML, CSS, GSAP + ScrollTrigger, Lenis, Three.js e um shader WebGL. Sem build.

## Rodar localmente

```bash
python3 -m http.server 8090 --directory landing
```

Abra http://localhost:8090.

## Arquivos

| Arquivo | O que tem |
|---|---|
| `index.html` | Conteúdo e copy (storytelling em 6 capítulos + acessos) |
| `styles.css` | Tokens da marca e mockups de iPhone, MacBook, iPad, navegador e TV em CSS |
| `main.js` | Rolagem (Lenis), revelações e seções fixadas (GSAP), olhos da GI em SVG |
| `gl.js` | Shader WebGL do hero e a GI em 3D (Three.js) |
| `design-dna.json` | Análise da referência (case Tahdani, Behance) aplicada à marca RU-FOOD |
| `assets/telas/` | Capturas reais do app (aluno, totem, TV, painel) em WebP |

## Links de acesso

Os botões de perfil abrem `https://rufood.vercel.app/admin/entrar?email=…` com o e-mail já preenchido; a pessoa só digita a senha. O preenchimento depende da mudança em `web/src/app/admin/entrar/entrar-cliente.tsx`, então o app precisa estar publicado com ela.

## Atualizar as capturas

As telas foram capturadas do app rodando local (`npm --prefix web run dev`, com `ADMIN_PREVIEW=1`) em 390×844 @3x (celular), 1180×820 @2x (totem) e 1440×900 @2x (painel), e convertidas para WebP.

## Publicar

Projeto Vercel próprio com a raiz em `landing/`:

```bash
cd landing && vercel deploy --prod
```
