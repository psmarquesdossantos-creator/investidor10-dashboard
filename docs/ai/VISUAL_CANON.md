# VISUAL CANON — Investidor10 Dashboard

**Fonte única para padrão visual. Não criar estilos isolados sem razão.**

---

## THEME TOKENS

> **RECONCILIAÇÃO 2026-10-16 (código é a verdade):** o namespace real é `--color-*`
> (não `--primary`/`--bg-*`/`--text-*`). Tema default = **light (Material)**;
> dark via `@media (prefers-color-scheme: dark)` + override manual
> `html[data-theme="dark"|"light"]` (styles.css:107-184). Texto semântico usa
> tokens `-text`/`-ink` com contraste AA documentado no próprio CSS.

### Colors (namespace real `--color-*` — styles.css:5-38)

```css
/* Primary — IDENTIDADE CORPORATIVA (NÃO MUDAR) */
--color-primary: #1A73E8;
--color-primary-dark: #1557B0;
--color-primary-light: #E8F0FE;   /* light | #1E3A5F no dark */
--color-border-focus: #1A73E8;

/* Semantic */
--color-secondary: #34A853;         /* verde financeiro */
--color-secondary-dark: #2D924A;
--color-secondary-light: #E6F4EA;  /* light | #14532D no dark */
--color-accent: #F9AB00;
--color-accent-light: #FEF3C7;     /* light | #3D3400 no dark */
--color-error: #EA4335;
--color-error-light: #FCE8E6;      /* light | #450A0A no dark */

/* Surfaces — LIGHT (default) */
--color-bg: #F8F9FA;               /* page background */
--color-bg-white: #FFFFFF;         /* header, dropdowns */
--color-bg-card: #FFFFFF;          /* cards */
--color-border: #DADCE0;
--color-border-light: #E8EAED;

/* Surfaces — DARK (prefers-color-scheme / data-theme="dark") */
--color-bg: #020617;
--color-bg-white: #0F172A;
--color-bg-card: #0F172A;
--color-border: #334155;
--color-border-light: #1E293B;

/* Text — LIGHT */
--color-text: #202124;             /* headings, primary text */
--color-text-secondary: #5F6368;
--color-text-muted: #5F6368;

/* Text — DARK */
--color-text: #F8FAFC;
--color-text-secondary: #CBD5E1;
--color-text-muted: #94A3B8;

/* Texto semântico AA (usar estes, nunca a cor pura sobre fundo claro) */
--color-success-text: #14672F;     /* 6.97:1 branco | dark: #4CBF6E */
--color-danger-text: #C5221F;      /* 5.80:1 branco | dark: #F28B82 */
--color-primary-ink: #1557B0;      /* 6.95:1 branco | dark: #8AB4F8 */

/* Tags por classe de ativo (bg + texto, AA nos dois temas) */
--tag-stocks-bg/text: #E8F0FE / #1557B0;  /* Ações */
--tag-fiis-bg/text: #E6F4EA / #14672F;    /* FIIs */
--tag-etfs-bg/text: #FEF3C7 / #7A5A00;    /* ETFs */
--tag-fixed-bg/text: #E0E7FF / #3730A3;   /* Renda fixa */
--tag-crypto-bg/text: #F3E8FF / #6D28D9;  /* Cripto */
--tag-bdr-bg/text: #FFE0E0 / #9B2C2C;     /* BDRs */
```

### Typography

```css
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Scale real (styles.css:56-64) — namespace --font-size-* */
--font-size-xs: 0.7rem;      /* 11px — labels, badges */
--font-size-sm: 0.8125rem;   /* 13px — subtitles, meta */
--font-size-base: 0.875rem;  /* 14px — body */
--font-size-md: 0.9375rem;   /* 15px — inputs */
--font-size-lg: 1rem;        /* 16px — section titles */
--font-size-xl: 1.125rem;    /* 18px — card titles */
--font-size-2xl: 1.25rem;    /* 20px — metric values */
--font-size-3xl: 1.5rem;     /* 24px — hero metrics */
--font-size-4xl: 1.875rem;   /* 30px — page titles */

/* Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Spacing

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

### Radius

```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;
```

### Shadows

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
--shadow-md: 0 4px 12px rgba(0,0,0,0.4);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.5);
--shadow-focus: 0 0 0 3px var(--focus-ring);
```

---

## COMPONENT SPECS

### Cards

```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  transition: border-color 0.2s, background 0.2s;
}
.card:hover { border-color: var(--border-hover); }
```

### Tables

```css
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: var(--text-base); min-width: 900px; }
.th { text-align: left; padding: var(--space-2) var(--space-3); font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); font-weight: var(--font-semibold); border-bottom: 1px solid var(--border); background: rgba(0,0,0,0.2); white-space: nowrap; }
.td { padding: var(--space-3) var(--space-3); border-bottom: 1px solid var(--border); font-size: var(--text-base); white-space: nowrap; }
.tr:hover { background: var(--bg-card-hover); }
```

### Buttons

```css
.btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
  color: white;
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(26, 115, 232, 0.3); }

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}
.btn-ghost:hover { background: var(--bg-card); color: var(--text-primary); }

.btn-danger {
  background: var(--danger-light);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.btn-success {
  background: var(--success-light);
  color: var(--success);
  border: 1px solid rgba(16, 185, 129, 0.3);
}
```

### Badges

```css
.badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}
.badge-acao { background: rgba(59, 130, 246, 0.15); color: var(--cat-acao); }
.badge-fii { background: rgba(139, 92, 246, 0.15); color: var(--cat-fii); }
.badge-etf { background: rgba(245, 197, 66, 0.15); color: var(--cat-etf); }
.badge-rf { background: rgba(16, 185, 129, 0.15); color: var(--cat-rf); }
.badge-cripto { background: rgba(245, 158, 11, 0.15); color: var(--cat-cripto); }

/* Confidence badges (Data Trust) */
.badge-confidence-high { background: rgba(16, 185, 129, 0.15); color: var(--success); }
.badge-confidence-medium { background: rgba(245, 197, 66, 0.15); color: var(--warning); }
.badge-confidence-low { background: rgba(239, 68, 68, 0.15); color: var(--danger); }
```

### States (OBRIGATÓRIOS em todo componente)

```css
/* Loading */
.skeleton { background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-card-hover) 50%, var(--bg-card) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: var(--radius-md); }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* Empty */
.empty-state { text-align: center; padding: var(--space-8); color: var(--text-muted); }
.empty-state-icon { font-size: 32px; margin-bottom: var(--space-3); opacity: 0.5; }

/* Error */
.error-state { border-color: var(--danger); background: var(--danger-light); color: var(--danger); padding: var(--space-3); border-radius: var(--radius-md); }

/* Data State (Governança) */
.data-state-available { color: var(--success); }
.data-state-partial { color: var(--warning); }
.data-state-unavailable { color: var(--text-muted); }
.data-state-tracking { color: var(--info); }
.data-state-stale { color: var(--danger); }
.data-state-loading { color: var(--text-muted); }
.data-state-error { color: var(--danger); }
```

### Charts (Chart.js)

```css
.chart-container { position: relative; height: 260px; }
/* Textual summaries OBRIGATÓRIOS para a11y */
.chart-summary { position: absolute; left: -9999px; } /* screen reader only */

/* Default colors per category */
--chart-acao: #3B82F6;
--chart-fii: #8B5CF6;
--chart-etf: #F5C542;
--chart-rf: #10B981;
--chart-cripto: #F59E0B;
```

### Mobile Navigation

```css
/* Sidebar */
.sidebar { width: 260px; position: fixed; height: 100vh; transform: translateX(-100%); transition: transform 0.3s ease; z-index: 100; }
.sidebar.open { transform: translateX(0); }
.mobile-menu-btn { display: none; }
@media (max-width: 900px) { .mobile-menu-btn { display: flex; } }

/* Touch targets */
.touch-target { min-height: 44px; min-width: 44px; display: flex; align-items: center; justify-content: center; }
```

### Responsive Breakpoints

```css
/* Viewports testados */
@media (max-width: 1920px) { /* desktop large */ }
@media (max-width: 1366px) { /* desktop standard */ }
@media (max-width: 1100px) { /* charts stack */ }
@media (max-width: 900px) { /* sidebar collapse */ }
@media (max-width: 768px) { /* tablet */ }
@media (max-width: 430px) { /* mobile large */ }
@media (max-width: 390px) { /* mobile standard */ }
```

### Accessibility (WCAG 2.1 AA)

```css
/* Focus visible */
*:focus-visible { outline: none; box-shadow: var(--shadow-focus); }

/* Skip link */
.skip-link { position: absolute; top: -100%; left: 0; background: var(--primary); color: white; padding: var(--space-2) var(--space-4); z-index: 1000; }
.skip-link:focus { top: 0; }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* High contrast support */
@media (prefers-contrast: high) {
  :root { --border: #FFFFFF; --text-muted: #CCCCCC; }
}
```

---

## APPROVED REFERENCES

```
- styles.css (source of truth — tokens definidos aqui)
- index.html (component usage examples)
- real-mode.js (dynamic rendering patterns)
```

---

## REJECTED PATTERNS (DO NOT COPY)

```
- Glow excessivo / box-shadow enormes
- Glassmorphism em tudo
- Dezenas de microcards
- Rainbow charts (cores não semânticas)
- Gradientes por toda parte
- Sombras grandes sem propósito
- Animações >300ms
- Desktop comprimido no mobile
```

---

## DESIGN PRINCIPLES

> **Premium não é**: neon, blur excessivo, microcards, dashboard cheio de números
>
> **Premium vem de**: hierarquia clara, espaçamento, tipografia, alinhamento, proporção, consistência, clareza, estados honestos, densidade alta mas organizada, responsividade real