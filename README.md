# Nobios · Bia e Vini

Painel financeiro do casamento: orçamento, fornecedores, contratos, parcelas e pagamentos.

- **GitHub** guarda tudo: o código e os dados (pasta `data/`, um arquivo por registro).
- **Netlify** só publica o app. Cada coisa salva no app vira um commit aqui no GitHub.
- **Sem login.** Quem tiver o link do Netlify vê e altera os dados — compartilhem só entre vocês dois.

---

## Colocar no ar (uma vez, ~15 minutos)

### 1. Criar o repositório no GitHub

1. Em [github.com/new](https://github.com/new), crie um repositório chamado **`nobios`**.
2. Marque **Private** (os valores do casamento ficam visíveis só para vocês no GitHub).
3. Não marque nenhuma opção de README/.gitignore — o projeto já tem.

### 2. Enviar os arquivos do projeto

O projeto tem ~130 arquivos; o jeito mais simples é o **GitHub Desktop** ([desktop.github.com](https://desktop.github.com)):

1. GitHub Desktop → **File → Add local repository** → escolha a pasta `nobios` deste projeto.
   Se ele disser que não é um repositório, clique em **create a repository** nessa mesma pasta.
2. Clique em **Publish repository**, escolha o nome `nobios` e deixe **Keep this code private** marcado.

> Não envie a pasta `node_modules` nem `dist` (o `.gitignore` já cuida disso).

### 3. Criar o token de acesso (para o app gravar no GitHub)

1. GitHub → foto → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Token name:** `nobios-netlify` · **Expiration:** 1 ano (depois do casamento).
3. **Repository access:** *Only select repositories* → `nobios`.
4. **Permissions → Repository permissions → Contents:** **Read and write**. (Metadata: Read-only é automático.)
5. **Generate token** e copie o valor (começa com `github_pat_…`). Ele só aparece uma vez.

### 4. Publicar no Netlify

1. Em [app.netlify.com](https://app.netlify.com), entre com a conta do GitHub.
2. **Add new site → Import an existing project → GitHub** → escolha `nobios`.
3. As configurações de build já vêm do `netlify.toml` — não precisa mudar nada.
4. Antes de publicar, em **Environment variables**, adicione:

   | Nome | Valor |
   | --- | --- |
   | `GITHUB_TOKEN` | o token do passo 3 |
   | `GITHUB_REPO` | `seu-usuario/nobios` |

5. **Deploy**. Em ~1 minuto o app está no ar.
6. (Opcional) **Site configuration → Change site name** → por exemplo `nobios-biaevini` → o link vira `https://nobios-biaevini.netlify.app`.

### 5. Usar

- Abram o link no celular e no computador. No celular: **Compartilhar → Adicionar à Tela de Início** para virar um ícone.
- Tudo o que vocês salvarem vira um commit em `data/`, com mensagens como *"Registrar pagamento"*. Em **Ajustes → Ver histórico** dá para ver quem mudou o quê.
- Se um salvar algo, o outro vê ao voltar para o app ou trocar de tela.

---

## Dia a dia

| Quero… | Como |
| --- | --- |
| Cadastrar, pagar, editar | Pelo app (Netlify). Cada ação = 1 commit no GitHub. |
| Desfazer algo | GitHub → *Commits* → abra o commit → **Revert**. |
| Editar um dado direto | Edite o arquivo em `data/…/*.json` no GitHub. O app mostra na próxima abertura. |
| Mudar o app (código) | Commit no GitHub → o Netlify publica sozinho. |

Gravações que mexem só em `data/` **não** disparam um novo deploy (o `netlify.toml` pula esses builds), então salvar no app é rápido e não gasta minutos de build.

## Problemas comuns

| Mensagem no app | O que fazer |
| --- | --- |
| *Configuração incompleta no Netlify* | Confira `GITHUB_TOKEN` e `GITHUB_REPO` nas variáveis do site e faça **Deploys → Trigger deploy**. |
| *O token do GitHub não tem permissão* | O token precisa de **Contents: Read and write** no repositório `nobios`, e não pode ter expirado. |
| *Repositório … não encontrado* | `GITHUB_REPO` deve ser exatamente `usuario/nobios`. |
| *Pasta "data/" não encontrada* | Rode `npm run data:init` e envie a pasta `data/` para o GitHub. |

---

## Para quem for mexer no código

```bash
npm install
npm run dev          # app com dados de exemplo no navegador (não toca no GitHub)
npm test             # cálculos financeiros + funções contra um GitHub simulado
npm run data:init    # recria data/ do zero (use --exemplo para os dados fictícios, --forcar para substituir)
```

- `src/domain/finance` — todos os cálculos (fonte única dos números).
- `src/data/sources` — `MockDataSource` (navegador) e `HttpDataSource` (GitHub via Netlify). Trocar por outro banco = um arquivo novo aqui.
- `netlify/functions` — `snapshot` (lê tudo numa consulta GraphQL) e `commit` (grava num único commit, refaz se o outro salvou no meio).
