# Usar imagem oficial do Node.js (versão leve)
FROM node:20-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração de dependências
COPY package*.json ./

# Copiar a pasta prisma (necessário para o script postinstall)
COPY prisma ./prisma/

# Instalar todas as dependências (incluindo devDependencies para o build)
RUN npm install

# Copiar o restante do código fonte
COPY . .

# Gerar o cliente Prisma (garantia extra caso o postinstall falhe)
RUN npx prisma generate

# Compilar a aplicação (gera a pasta dist)
RUN npm run build

# Expor a porta da aplicação
EXPOSE 3000

# Comando para iniciar a aplicação em produção
CMD ["npm", "run", "start:prod"]
