# Deploy no Vercel

Este projeto está configurado para deploy no Vercel.

## Passos para Deploy

### 1. Instalar Vercel CLI (Opcional)
```bash
npm i -g vercel
```

### 2. Deploy via Vercel CLI
```bash
vercel
```

### 3. Deploy via Dashboard do Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Add New Project"
3. Importe seu repositório do GitHub/GitLab/Bitbucket
4. O Vercel detectará automaticamente as configurações do `vercel.json`
5. Clique em "Deploy"

## Configurações Importantes

### Variáveis de Ambiente

Se você estiver usando variáveis de ambiente (como `EXPO_PUBLIC_TOOLKIT_URL`), adicione-as no dashboard do Vercel:

1. Vá em Project Settings
2. Clique em "Environment Variables"
3. Adicione suas variáveis:
   - `EXPO_PUBLIC_TOOLKIT_URL` = sua URL do toolkit

### Build Settings

O projeto usa as seguintes configurações (já definidas em `vercel.json`):
- **Build Command**: `npx expo export -p web`
- **Output Directory**: `dist`
- **Install Command**: `bun install`

### Rewrite Rules

O projeto usa SPA routing, então todas as rotas são redirecionadas para `index.html`.

## Requisitos

- Node.js 18+ ou Bun
- Expo SDK 54+

## Problemas Comuns

### Erro de Build
Se o build falhar, verifique:
1. Todas as dependências estão instaladas
2. Não há erros de TypeScript
3. As variáveis de ambiente estão configuradas

### Erro 404 nas Rotas
Certifique-se de que o `vercel.json` tem as regras de rewrite corretas.

### Performance
Para melhor performance:
1. Use imagens otimizadas
2. Minimize o uso de bibliotecas pesadas
3. Implemente code splitting quando possível
