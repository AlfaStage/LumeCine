# LumeCine - Addon para Stremio

O LumeCine é um addon para Stremio que permite acessar um enorme catálogo de filmes e séries de múltiplos provedores de streaming.

## 🎬 Provedores Disponíveis

| Provedor | Status | Descrição |
|----------|--------|-----------|
| **RedeCanais** | ✅ Ativo | Filmes e séries dublados/legendados |
| **SuperflixAPI** | ✅ Ativo | Streaming via TMDB/IMDB IDs |
| **Vizer** | 🔜 Em breve | Catálogo adicional |

## 🚀 Instalação em Servidor (VPS)

### Requisitos
- VPS com Ubuntu 20.04+ (ou similar)
- Mínimo 1GB RAM
- Domínio apontando para o IP do servidor

### Instalação Automática (Um comando)

```bash
curl -fsSL https://raw.githubusercontent.com/AlfaStage/LumeCine/main/install.sh | sudo bash
```

ou

```bash
wget -qO- https://raw.githubusercontent.com/AlfaStage/LumeCine/main/install.sh | sudo bash
```

O script irá:
- Detectar seu sistema operacional
- Perguntar as configurações necessárias (domínio, chave TMDB, etc.)
- Instalar todas as dependências (Node.js, Docker, PostgreSQL, Nginx, PM2)
- Configurar SSL automático com Let's Encrypt
- Iniciar a aplicação

### Instalação Manual

```bash
# 1. Clonar repositório
git clone https://github.com/AlfaStage/LumeCine.git
cd LumeCine

# 2. Copiar e configurar .env
cp .env.example .env
nano .env

# 3. Instalar dependências
npm install

# 4. Configurar banco de dados
npx prisma generate
npx prisma db push

# 5. Build e iniciar
npm run build
npm run start:prod
```

## ⚙️ Variáveis de Ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `APP_PORT` | Sim | Porta da aplicação (padrão: 3000) |
| `APP_URL` | Sim | URL pública (ex: https://lumecine.example.com) |
| `DATABASE_URL` | Sim | String de conexão PostgreSQL |
| `TMDB_KEY` | Sim | Chave da API TMDB |
| `OMDB_KEY` | Não | Chave da API OMDB (limite: 1000/dia) |
| `PROVIDERS_URL` | Não | URL com configuração dos provedores |

## 📱 Uso no Stremio

Após a instalação, adicione o addon no Stremio com a URL:

```
https://seu-dominio.com/manifest.json
```

## 🙏 Créditos

Este projeto é um fork do **[Reflux](https://github.com/Nightfruit/reflux)** criado por [@mrsev7en](https://github.com/mrsev7en).

Agradecimentos especiais ao trabalho original que tornou este projeto possível.

## 📄 Licença

Este projeto está licenciado sob a Licença MIT — veja o arquivo [LICENSE](LICENSE) para mais detalhes.
