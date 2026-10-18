#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
build-dist.py — Build de produção (minificado) do Investidor10 Dashboard.

ALLOWLIST: copia APENAS o que o site precisa. Dados reais (carteira-data.js,
backup-*.json, parsed_data.json, firebase-config real) NUNCA entram — a própria
cópia é o portão de privacidade (P26), independentemente de .gitignore/.vercelignore.

Minificação: terser (JS) + clean-css (CSS) via npx — devDependencies, o código
fonte permanece vanilla legível (zero build no runtime).

Uso:  python scripts/build-dist.py   →  gera dist/ deployável
      vercel --prod --yes  (com cwd=dist, após vercel link)
"""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

# ---- ALLOWLIST de deploy (tudo o que o site usa; nada mais entra) ----
ROOT_FILES = [
    "index.html", "styles.css", "sw.js", "manifest.json", "vercel.json",
    "firebase-config.js",
    # engines + app
    "script.js", "panels.js", "real-mode.js", "router.js", "init-carteira.js",
    "data-trust-engine.js", "advanced-engine.js",
    "rebalance-engine.js", "risk-engine.js", "monte-carlo-engine.js",
    "benchmark-engine.js", "tax-engine.js", "mc-worker.js",
]
ROOT_DIRS = ["vendor", "src", "assets"]  # vendor=chart+firebase SDK; src=engines/auth (só código); assets=ícones PWA (manifest)

# Arquivos de src que NUNCA vão (redundância defensiva — allowlist de dirs)
SRC_DENY = ["firebase-config.js", "firebase-debug.log"]


def sh(*cmd):
    # capture_output em BYTES + decode tolerante: npx/terser no Windows emite cp1252,
    # e text=True estoura UnicodeDecodeError no reader thread (falso-negativo de build).
    r = subprocess.run(cmd, capture_output=True, shell=(sys.platform == "win32"))
    out = (r.stdout or b"").decode("utf-8", errors="replace")
    err = (r.stderr or b"").decode("utf-8", errors="replace")
    if r.returncode != 0:
        print(f"ERRO em {' '.join(cmd)}:\n{out}\n{err}")
        sys.exit(1)
    return out


def minify_js(path: Path, out: Path):
    # API node_modules local — npx/CLI quebra em paths com espaço no Windows
    # ("Meu Drive") e emite cp1252. Fallback: copia sem minificar (deploy funcional).
    code = (
        "const fs=require('fs');"
        "try{const T=require('terser');"
        f"T.minify(fs.readFileSync({str(path)!r},'utf8'),{{compress:true,mangle:true,format:{{comments:false}}}})"
        ".then(r=>{if(r.error)throw r.error;fs.writeFileSync('" + str(out).replace("\\", "/") + "',r.code);process.exit(0)})" 
        ".catch(e=>{console.error(e&&e.message||e);process.exit(1)});"
        "}catch(e){console.error('NOMIN:'+ (e&&e.code||e&&e.message||e));process.exit(3)}"
    )
    r = subprocess.run(["node", "-e", code], capture_output=True, shell=False)
    if r.returncode == 0:
        return
    if r.returncode == 3:  # terser não instalado → sem minificar
        print(f"  AVISO: terser ausente — {path.name} copiado SEM minificar")
    else:
        print((r.stderr or b"").decode("utf-8", errors="replace"))
    if path != out:
        shutil.copy2(path, out)


def minify_css(path: Path, out: Path):
    code = (
        "const fs=require('fs');"
        "try{const C=require('clean-css');"
        f"const r=new C().minify(fs.readFileSync({str(path)!r},'utf8'));"
        "if(r.errors&&r.errors.length){console.error(r.errors.join(';'));process.exit(1)}"
        "fs.writeFileSync('" + str(out).replace("\\", "/") + "',r.styles);process.exit(0);"
        "}catch(e){console.error('NOMIN:'+ (e&&e.code||e&&e.message||e));process.exit(3)}"
    )
    r = subprocess.run(["node", "-e", code], capture_output=True, shell=False)
    if r.returncode == 0:
        return
    if r.returncode == 3:
        print(f"  AVISO: clean-css ausente — {path.name} copiado SEM minificar")
    else:
        print((r.stderr or b"").decode("utf-8", errors="replace"))
    shutil.copy2(path, out)


def main():
    # Windows: o dir pode estar preso (CWD de processo/handle) — limpa o CONTEÚDO
    # em vez de remover o diretório; cria se não existir.
    if DIST.exists():
        for child in DIST.iterdir():
            if child.name == ".vercel":
                continue  # link do projeto Vercel — JAMAIS apagar (senão deploy cria projeto rogue)
            if child.is_dir():
                shutil.rmtree(child, ignore_errors=True)
            else:
                child.unlink(missing_ok=True)
    else:
        DIST.mkdir()

    # Link do projeto Vercel: o deploy sai de cwd=dist — o link precisa existir lá
    if (ROOT / ".vercel" / "project.json").exists():
        (DIST / ".vercel").mkdir(exist_ok=True)
        shutil.copy2(ROOT / ".vercel" / "project.json", DIST / ".vercel" / "project.json")

    # 1. JS: copiar + minificar
    total_before = total_after = 0
    for name in ROOT_FILES:
        src = ROOT / name
        if not src.exists():
            print(f"AVISO: {name} não encontrado — pulando")
            continue
        dst = DIST / name
        if name.endswith(".js") and not name.startswith("chart"):
            minify_js(src, dst)
        else:
            shutil.copy2(src, dst)
        total_before += src.stat().st_size
        total_after += dst.stat().st_size

    # 2. Dirs (vendor já é .min — NÃO re-minifica; src = código → minifica)
    for d in ROOT_DIRS:
        target = DIST / d
        shutil.copytree(ROOT / d, target,
                        ignore=shutil.ignore_patterns(*SRC_DENY, "__pycache__"))
        if d != "vendor":
            for js in target.rglob("*.js"):
                before = js.stat().st_size
                minify_js(js, js)
                total_before += before
                total_after += js.stat().st_size

    # vercel.json já copiado acima; vendor sizes somam no before/after
    for f in DIST.rglob("*"):
        pass

    # 3. Relatório
    print(f"dist/ gerado: {total_after/1024:.0f} KB JS+CSS "
          f"(antes {total_before/1024:.0f} KB, {100*(1-total_after/total_before):.0f}% menor)")
    # Sanity: nenhum dado real
    for forbidden in ["carteira-data.js", "backup-carteira", "parsed_data", "carteira-data-real"]:
        hits = list(DIST.rglob(forbidden + "*"))
        if hits:
            print(f"ERRO FATAL: dado sensível no dist: {hits}")
            sys.exit(1)
    print("Sanity OK: nenhum arquivo de dados reais no dist/")


if __name__ == "__main__":
    main()
