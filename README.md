# Francy Scripts

App de scripts de atendimento WhatsApp para a Farmácia Francy da Torre.

## Publicando este repositório no GitHub (primeira vez)

1. Crie o repositório **público** `francyscripts` na sua conta (`allanrsantiago`), vazio (sem README/gitignore automáticos).
2. Nesta pasta, rode:

```bash
git init
git add .
git commit -m "Versão inicial"
git branch -M main
git remote add origin https://github.com/allanrsantiago/francyscripts.git
git push -u origin main
```

## Publicando uma nova versão (atualização automática)

Sempre que fizer alterações no app:

1. Atualize o número de versão em `package.json` (campo `"version"`), por exemplo de `1.0.0` para `1.0.1`.
2. Suba as alterações normais:

```bash
git add .
git commit -m "Descrição da mudança"
git push
```

3. Crie e envie a tag da versão (precisa começar com `v` e bater com o `version` do `package.json`):

```bash
git tag v1.0.1
git push --tags
```

4. Isso dispara automaticamente o workflow do GitHub Actions (aba **Actions** do repositório), que builda o instalador do Windows e o publica em **Releases**. Leva alguns minutos.
5. Todo mundo que já tem o Francy Scripts instalado recebe a atualização sozinho na próxima vez que abrir o app (ela baixa em segundo plano e se aplica ao fechar o programa).

## Rodando localmente para testar

```bash
npm install
npm start
```

## Gerando o instalador manualmente (sem publicar)

```bash
npm run dist
```

O instalador fica em `dist/FrancyScripts-Instalador.exe`.
