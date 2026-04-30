# Nosso Norte Financas

Migracao em andamento do app financeiro de HTML unico para uma SPA React organizada com Vite, agora com empacotamento mobile via Capacitor.

## Ambiente

1. Copie `.env.example` para `.env`.
2. Preencha as variaveis `VITE_FIREBASE_*`.
3. Defina `VITE_BRAPI_TOKEN`.
4. `VITE_GEMINI_API_KEY` e opcional. Se ficar vazio, a chave pode continuar sendo informada pela tela de configuracoes.
5. Para publicar em GitHub Pages de um repo proprio, ajuste `VITE_PUBLIC_BASE` ou deixe o workflow preencher isso automaticamente.

## Scripts

- `npm run dev`: inicia o app web localmente.
- `npm run build`: compila o app para producao.
- `npm run test`: roda testes unitarios e smoke test.
- `npm run mobile:sync`: gera o build web e sincroniza o projeto Android.
- `npm run mobile:open:android`: abre o projeto Android no Android Studio.

## Estrutura

- `src/App.jsx`: orquestracao principal do app.
- `src/components/`: telas, modais e blocos extraidos do legado.
- `src/domain/finance/`: calculos financeiros protegidos por testes.
- `src/services/firebase.js`: inicializacao Firebase via `import.meta.env`.
- `src/config/`: dados estaticos e configuracoes de runtime.
- `legacy/index.legacy.html`: copia intacta do HTML original.
- `android/`: shell mobile Android gerado por Capacitor.

## Mobile

O app mobile usa o mesmo build web do Vite dentro do container Android do Capacitor.

Fluxo basico:

1. `npm install`
2. `npm run mobile:sync`
3. `npm run mobile:open:android`

## GitHub Pages

O projeto ja inclui workflow em `.github/workflows/deploy-pages.yml`.

Para publicar em um repo novo:

1. Crie um repositorio vazio no GitHub.
2. Configure os `Secrets and variables` com as chaves `VITE_*` do `.env.example`.
3. Envie este projeto para a branch `main` do repo novo.
4. Em `Settings > Pages`, deixe a fonte como `GitHub Actions`.

O workflow ja calcula a `base` automaticamente como `/<nome-do-repo>/`, que e o formato esperado para GitHub Pages em repositorios de projeto.

## Estrategia de migracao

O objetivo segue o mesmo: reduzir risco em etapas pequenas, preservar comportamento e so melhorar arquitetura quando a equivalencia estiver validada por build e testes.
