#!/bin/bash

#===============================================================================
#
#          FILE: install.sh
#
#         USAGE: curl -fsSL https://raw.githubusercontent.com/AlfaStage/LumeCine/main/install.sh | bash
#                ou
#                wget -qO- https://raw.githubusercontent.com/AlfaStage/LumeCine/main/install.sh | bash
#
#   DESCRIPTION: Script de instalação automática do LumeCine
#                Addon Stremio para streaming de conteúdo
#
#        AUTHOR: LumeCine Team
#       VERSION: 1.0.0
#
#===============================================================================

#===============================================================================
# DETECÇÃO DE PIPE - Se executado via curl | bash, baixa e re-executa
#===============================================================================
if [ ! -t 0 ]; then
    # Stdin não é um terminal (executando via pipe)
    SCRIPT_URL="https://raw.githubusercontent.com/AlfaStage/LumeCine/main/install.sh"
    TEMP_SCRIPT="/tmp/lumecine_install_$$.sh"
    
    echo "Detectado execução via pipe. Baixando script para execução interativa..."
    
    # Baixar script para arquivo temporário
    if command -v curl &> /dev/null; then
        curl -fsSL "$SCRIPT_URL" -o "$TEMP_SCRIPT"
    elif command -v wget &> /dev/null; then
        wget -qO "$TEMP_SCRIPT" "$SCRIPT_URL"
    else
        echo "Erro: curl ou wget não encontrado!"
        exit 1
    fi
    
    chmod +x "$TEMP_SCRIPT"
    
    # Re-executar o script interativamente
    exec bash "$TEMP_SCRIPT" "$@"
    exit $?
fi

set -e

#===============================================================================
# CORES E FORMATAÇÃO
#===============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color
BOLD='\033[1m'

#===============================================================================
# VARIÁVEIS GLOBAIS
#===============================================================================
INSTALL_DIR="/opt/lumecine"
REPO_URL="https://github.com/AlfaStage/LumeCine.git"
NODE_VERSION="20"
DB_NAME="lumecine"
DB_USER="lumecine"
DB_PASS=""
APP_PORT="3000"
APP_DOMAIN=""
TMDB_KEY=""
OMDB_KEY=""
PROVIDERS_URL="https://raw.githubusercontent.com/AlfaStage/LumeCine/refs/heads/main/PROVIDERS_URL.txt"
SERVER_IP=""

#===============================================================================
# FUNÇÕES DE UTILIDADE
#===============================================================================

print_banner() {
    clear
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                   ║"
    echo "║     ██╗     ██╗   ██╗███╗   ███╗███████╗ ██████╗██╗███╗   ██╗███████╗    ║"
    echo "║     ██║     ██║   ██║████╗ ████║██╔════╝██╔════╝██║████╗  ██║██╔════╝    ║"
    echo "║     ██║     ██║   ██║██╔████╔██║█████╗  ██║     ██║██╔██╗ ██║█████╗      ║"
    echo "║     ██║     ██║   ██║██║╚██╔╝██║██╔══╝  ██║     ██║██║╚██╗██║██╔══╝      ║"
    echo "║     ███████╗╚██████╔╝██║ ╚═╝ ██║███████╗╚██████╗██║██║ ╚████║███████╗    ║"
    echo "║     ╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝╚═╝╚═╝  ╚═══╝╚══════╝    ║"
    echo "║                                                                   ║"
    echo "║                  Instalador Automático v1.0.0                     ║"
    echo "║                                                                   ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

log_step() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}${BOLD}▶ $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script precisa ser executado como root (sudo)"
        exit 1
    fi
}

get_server_ip() {
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || hostname -I | awk '{print $1}')
}

generate_password() {
    tr -dc 'A-Za-z0-9!@#$%^&*' </dev/urandom | head -c 32
}

#===============================================================================
# DETECÇÃO DO SISTEMA
#===============================================================================

detect_os() {
    log_step "Detectando Sistema Operacional"
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
        OS_NAME=$PRETTY_NAME
    elif [ -f /etc/redhat-release ]; then
        OS="rhel"
        OS_NAME=$(cat /etc/redhat-release)
    else
        log_error "Sistema operacional não suportado!"
        exit 1
    fi
    
    log_success "Sistema detectado: ${OS_NAME}"
    
    # Verificar arquitetura
    ARCH=$(uname -m)
    log_info "Arquitetura: ${ARCH}"
    
    # Verificar memória
    TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
    log_info "Memória RAM: ${TOTAL_MEM}MB"
    
    if [ "$TOTAL_MEM" -lt 1024 ]; then
        log_warning "Memória RAM baixa. Recomendado: mínimo 1GB"
    fi
    
    # Verificar espaço em disco
    DISK_FREE=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    log_info "Espaço livre em disco: ${DISK_FREE}GB"
    
    if [ "$DISK_FREE" -lt 5 ]; then
        log_error "Espaço em disco insuficiente. Mínimo: 5GB"
        exit 1
    fi
}

detect_existing_services() {
    log_step "Verificando Serviços Existentes"
    
    # Verificar Node.js
    if command -v node &> /dev/null; then
        NODE_INSTALLED=$(node -v)
        log_info "Node.js encontrado: ${NODE_INSTALLED}"
    else
        log_info "Node.js: Não instalado"
    fi
    
    # Verificar Docker
    if command -v docker &> /dev/null; then
        DOCKER_INSTALLED=$(docker -v | cut -d' ' -f3 | tr -d ',')
        log_info "Docker encontrado: ${DOCKER_INSTALLED}"
    else
        log_info "Docker: Não instalado"
    fi
    
    # Verificar PostgreSQL
    if command -v psql &> /dev/null; then
        PSQL_INSTALLED=$(psql -V | cut -d' ' -f3)
        log_info "PostgreSQL encontrado: ${PSQL_INSTALLED}"
    else
        log_info "PostgreSQL: Não instalado (será usado via Docker)"
    fi
    
    # Verificar Nginx
    if command -v nginx &> /dev/null; then
        NGINX_INSTALLED=$(nginx -v 2>&1 | cut -d'/' -f2)
        log_info "Nginx encontrado: ${NGINX_INSTALLED}"
    else
        log_info "Nginx: Não instalado"
    fi
    
    # Verificar PM2
    if command -v pm2 &> /dev/null; then
        PM2_INSTALLED=$(pm2 -v)
        log_info "PM2 encontrado: ${PM2_INSTALLED}"
    else
        log_info "PM2: Não instalado"
    fi
    
    # Verificar portas em uso
    log_info "Verificando portas..."
    
    if ss -tuln | grep -q ":80 "; then
        log_warning "Porta 80 já está em uso"
    fi
    
    if ss -tuln | grep -q ":443 "; then
        log_warning "Porta 443 já está em uso"
    fi
    
    if ss -tuln | grep -q ":3000 "; then
        log_warning "Porta 3000 já está em uso"
    fi
    
    if ss -tuln | grep -q ":5432 "; then
        log_warning "Porta 5432 (PostgreSQL) já está em uso"
    fi
}

#===============================================================================
# COLETA DE DADOS DO USUÁRIO
#===============================================================================

collect_user_data() {
    log_step "Configuração do LumeCine"
    
    echo -e "${WHITE}Por favor, forneça as informações necessárias para a instalação:${NC}\n"
    
    # Domínio
    echo -e "${CYAN}1. Domínio${NC}"
    echo -e "   Digite o domínio que será usado (ex: lumecine.example.com)"
    echo -e "   ${YELLOW}Nota: O domínio já deve estar apontando para o IP deste servidor${NC}"
    read -p "   Domínio: " APP_DOMAIN
    
    while [ -z "$APP_DOMAIN" ]; do
        log_warning "Domínio é obrigatório!"
        read -p "   Domínio: " APP_DOMAIN
    done
    
    echo ""
    
    # TMDB API Key
    echo -e "${CYAN}2. TMDB API Key${NC}"
    echo -e "   Obtenha sua chave em: https://www.themoviedb.org/settings/api"
    echo -e "   ${YELLOW}Esta chave é OBRIGATÓRIA para o funcionamento${NC}"
    read -p "   TMDB Key: " TMDB_KEY
    
    while [ -z "$TMDB_KEY" ]; do
        log_warning "TMDB Key é obrigatória!"
        read -p "   TMDB Key: " TMDB_KEY
    done
    
    echo ""
    
    # OMDB API Key (opcional)
    echo -e "${CYAN}3. OMDB API Key (Opcional)${NC}"
    echo -e "   Obtenha sua chave em: https://www.omdbapi.com/apikey.aspx"
    echo -e "   ${YELLOW}Limite: 1000 requisições/dia. Deixe em branco para pular${NC}"
    read -p "   OMDB Key (Enter para pular): " OMDB_KEY
    
    echo ""
    
    # Senha do banco de dados
    echo -e "${CYAN}4. Senha do Banco de Dados${NC}"
    echo -e "   Será usada para o PostgreSQL"
    echo -e "   ${YELLOW}Deixe em branco para gerar uma senha automática${NC}"
    read -sp "   Senha (oculta): " DB_PASS_INPUT
    echo ""
    
    if [ -z "$DB_PASS_INPUT" ]; then
        DB_PASS=$(generate_password)
        log_info "Senha gerada automaticamente"
    else
        DB_PASS="$DB_PASS_INPUT"
    fi
    
    echo ""
    
    # Porta da aplicação
    echo -e "${CYAN}5. Porta da Aplicação${NC}"
    echo -e "   Porta interna onde o LumeCine irá rodar"
    echo -e "   ${YELLOW}Padrão: 3000${NC}"
    read -p "   Porta [3000]: " APP_PORT_INPUT
    
    if [ -n "$APP_PORT_INPUT" ]; then
        APP_PORT="$APP_PORT_INPUT"
    fi
    
    echo ""
    
    # Confirmar instalação
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}${BOLD}Resumo da Configuração:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${BLUE}Domínio:${NC}      ${APP_DOMAIN}"
    echo -e "  ${BLUE}TMDB Key:${NC}     ${TMDB_KEY:0:10}..."
    echo -e "  ${BLUE}OMDB Key:${NC}     ${OMDB_KEY:-Não configurado}"
    echo -e "  ${BLUE}Porta:${NC}        ${APP_PORT}"
    echo -e "  ${BLUE}DB User:${NC}      ${DB_USER}"
    echo -e "  ${BLUE}DB Name:${NC}      ${DB_NAME}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    read -p "Confirmar e iniciar instalação? (s/n): " CONFIRM
    
    if [[ ! "$CONFIRM" =~ ^[Ss]$ ]]; then
        log_error "Instalação cancelada pelo usuário"
        exit 1
    fi
}

#===============================================================================
# INSTALAÇÃO DE DEPENDÊNCIAS
#===============================================================================

update_system() {
    log_step "Atualizando Sistema"
    
    case $OS in
        ubuntu|debian)
            apt-get update -qq
            apt-get upgrade -y -qq
            apt-get install -y -qq curl wget git nano build-essential ca-certificates gnupg lsb-release
            ;;
        centos|rhel|fedora|rocky|almalinux)
            if command -v dnf &> /dev/null; then
                dnf update -y -q
                dnf install -y -q curl wget git nano gcc-c++ make ca-certificates
            else
                yum update -y -q
                yum install -y -q curl wget git nano gcc-c++ make ca-certificates
            fi
            ;;
        *)
            log_error "Sistema operacional não suportado: ${OS}"
            exit 1
            ;;
    esac
    
    log_success "Sistema atualizado"
}

install_nodejs() {
    log_step "Instalando Node.js ${NODE_VERSION}"
    
    # Verificar se já está instalado na versão correta
    if command -v node &> /dev/null; then
        CURRENT_NODE=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$CURRENT_NODE" -ge "$NODE_VERSION" ]; then
            log_success "Node.js já está instalado (v${CURRENT_NODE})"
            return
        fi
    fi
    
    case $OS in
        ubuntu|debian)
            curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
            apt-get install -y -qq nodejs
            ;;
        centos|rhel|fedora|rocky|almalinux)
            curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
            if command -v dnf &> /dev/null; then
                dnf install -y -q nodejs
            else
                yum install -y -q nodejs
            fi
            ;;
    esac
    
    log_success "Node.js instalado: $(node -v)"
    log_success "NPM instalado: $(npm -v)"
}

install_docker() {
    log_step "Instalando Docker"
    
    if command -v docker &> /dev/null; then
        log_success "Docker já está instalado"
        
        # Garantir que o serviço está rodando
        systemctl start docker 2>/dev/null || true
        systemctl enable docker 2>/dev/null || true
        return
    fi
    
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh
    rm /tmp/get-docker.sh
    
    systemctl start docker
    systemctl enable docker
    
    log_success "Docker instalado: $(docker -v | cut -d' ' -f3 | tr -d ',')"
}

install_nginx() {
    log_step "Instalando Nginx"
    
    if command -v nginx &> /dev/null; then
        log_success "Nginx já está instalado"
        return
    fi
    
    case $OS in
        ubuntu|debian)
            apt-get install -y -qq nginx
            ;;
        centos|rhel|fedora|rocky|almalinux)
            if command -v dnf &> /dev/null; then
                dnf install -y -q nginx
            else
                yum install -y -q nginx
            fi
            ;;
    esac
    
    systemctl start nginx
    systemctl enable nginx
    
    log_success "Nginx instalado"
}

install_pm2() {
    log_step "Instalando PM2"
    
    if command -v pm2 &> /dev/null; then
        log_success "PM2 já está instalado"
        return
    fi
    
    npm install -g pm2 --silent
    
    log_success "PM2 instalado: $(pm2 -v)"
}

install_certbot() {
    log_step "Instalando Certbot"
    
    if command -v certbot &> /dev/null; then
        log_success "Certbot já está instalado"
        return
    fi
    
    case $OS in
        ubuntu|debian)
            apt-get install -y -qq certbot python3-certbot-nginx
            ;;
        centos|rhel|rocky|almalinux)
            if command -v dnf &> /dev/null; then
                dnf install -y -q certbot python3-certbot-nginx
            else
                yum install -y -q certbot python3-certbot-nginx
            fi
            ;;
        fedora)
            dnf install -y -q certbot python3-certbot-nginx
            ;;
    esac
    
    log_success "Certbot instalado"
}

#===============================================================================
# CONFIGURAÇÃO DO BANCO DE DADOS
#===============================================================================

setup_database() {
    log_step "Configurando PostgreSQL via Docker"
    
    # Verificar se já existe um container com esse nome
    if docker ps -a --format '{{.Names}}' | grep -q "^lumecine-db$"; then
        log_warning "Container lumecine-db já existe"
        
        # Verificar se está rodando
        if docker ps --format '{{.Names}}' | grep -q "^lumecine-db$"; then
            log_success "PostgreSQL já está rodando"
            return
        else
            log_info "Iniciando container existente..."
            docker start lumecine-db
            log_success "PostgreSQL iniciado"
            return
        fi
    fi
    
    # Criar volume para persistência
    docker volume create lumecine_pgdata 2>/dev/null || true
    
    # Iniciar PostgreSQL
    docker run -d \
        --name lumecine-db \
        --restart always \
        -e POSTGRES_USER="${DB_USER}" \
        -e POSTGRES_PASSWORD="${DB_PASS}" \
        -e POSTGRES_DB="${DB_NAME}" \
        -p 5432:5432 \
        -v lumecine_pgdata:/var/lib/postgresql/data \
        postgres:16-alpine
    
    log_info "Aguardando PostgreSQL inicializar..."
    sleep 5
    
    # Verificar se está rodando
    if docker ps --format '{{.Names}}' | grep -q "^lumecine-db$"; then
        log_success "PostgreSQL configurado e rodando"
    else
        log_error "Falha ao iniciar PostgreSQL"
        docker logs lumecine-db
        exit 1
    fi
}

#===============================================================================
# INSTALAÇÃO DO LUMECINE
#===============================================================================

install_lumecine() {
    log_step "Instalando LumeCine"
    
    # Criar diretório de instalação
    if [ -d "$INSTALL_DIR" ]; then
        log_warning "Diretório ${INSTALL_DIR} já existe"
        read -p "Deseja sobrescrever? (s/n): " OVERWRITE
        if [[ "$OVERWRITE" =~ ^[Ss]$ ]]; then
            rm -rf "$INSTALL_DIR"
        else
            log_info "Mantendo instalação existente"
        fi
    fi
    
    # Clonar repositório
    if [ ! -d "$INSTALL_DIR" ]; then
        log_info "Clonando repositório..."
        git clone "$REPO_URL" "$INSTALL_DIR"
    fi
    
    cd "$INSTALL_DIR"
    
    # Criar arquivo .env
    log_info "Criando arquivo de configuração .env..."
    cat > .env << EOF
# Environment
NODE_ENV="production"

# Application
APP_PORT=${APP_PORT}
APP_URL="https://${APP_DOMAIN}"

# Proxy (opcional)
PROXY_URL=""

# Database
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"

# TMDB (obrigatório)
TMDB_KEY="${TMDB_KEY}"

# OMDB (opcional)
OMDB_KEY="${OMDB_KEY}"

# Providers Configuration URL
PROVIDERS_URL="${PROVIDERS_URL}"
EOF

    log_success "Arquivo .env criado"
    
    # Instalar dependências
    log_info "Instalando dependências do Node.js..."
    npm install --silent
    
    # Gerar Prisma Client
    log_info "Gerando Prisma Client..."
    npx prisma generate
    
    # Aplicar migrations
    log_info "Aplicando migrations do banco de dados..."
    npx prisma db push
    
    # Build da aplicação
    log_info "Compilando aplicação..."
    npm run build
    
    log_success "LumeCine instalado com sucesso"
}

#===============================================================================
# CONFIGURAÇÃO DO NGINX
#===============================================================================

configure_nginx() {
    log_step "Configurando Nginx"
    
    # Criar configuração do site
    cat > /etc/nginx/sites-available/lumecine << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${APP_DOMAIN};

    # Logs
    access_log /var/log/nginx/lumecine.access.log;
    error_log /var/log/nginx/lumecine.error.log;

    # Proxy para a aplicação
    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Aumentar limite de upload
    client_max_body_size 100M;
}
EOF

    # Criar link simbólico (se não existir)
    if [ ! -f /etc/nginx/sites-enabled/lumecine ]; then
        ln -sf /etc/nginx/sites-available/lumecine /etc/nginx/sites-enabled/
    fi
    
    # Remover site padrão
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    
    # Testar configuração
    nginx -t
    
    # Reiniciar Nginx
    systemctl restart nginx
    
    log_success "Nginx configurado"
}

#===============================================================================
# CONFIGURAÇÃO SSL
#===============================================================================

setup_ssl() {
    log_step "Configurando SSL com Let's Encrypt"
    
    log_info "Obtendo certificado SSL para ${APP_DOMAIN}..."
    
    # Tentar obter certificado
    if certbot --nginx -d "$APP_DOMAIN" --non-interactive --agree-tos --email "admin@${APP_DOMAIN}" --redirect; then
        log_success "Certificado SSL obtido e configurado"
        
        # Configurar renovação automática
        if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
            (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | crontab -
            log_success "Renovação automática configurada"
        fi
    else
        log_warning "Não foi possível obter certificado SSL automaticamente"
        log_info "Você pode tentar manualmente com: certbot --nginx -d ${APP_DOMAIN}"
    fi
}

#===============================================================================
# CONFIGURAÇÃO DO PM2
#===============================================================================

setup_pm2() {
    log_step "Configurando PM2"
    
    cd "$INSTALL_DIR"
    
    # Parar aplicação se já estiver rodando
    pm2 delete lumecine 2>/dev/null || true
    
    # Iniciar aplicação
    pm2 start npm --name "lumecine" -- run start:prod
    
    # Salvar configuração
    pm2 save
    
    # Configurar startup
    pm2 startup systemd -u root --hp /root 2>/dev/null || pm2 startup
    
    log_success "PM2 configurado"
}

#===============================================================================
# CONFIGURAÇÃO DO FIREWALL
#===============================================================================

setup_firewall() {
    log_step "Configurando Firewall"
    
    # UFW (Ubuntu/Debian)
    if command -v ufw &> /dev/null; then
        ufw allow 22/tcp
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw --force enable
        log_success "UFW configurado"
    # Firewalld (CentOS/RHEL)
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
        log_success "Firewalld configurado"
    else
        log_warning "Nenhum firewall detectado"
    fi
}

#===============================================================================
# FINALIZAÇÃO
#===============================================================================

print_summary() {
    get_server_ip
    
    clear
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                   ║"
    echo "║          ✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO! ✅                  ║"
    echo "║                                                                   ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}${BOLD}📌 INFORMAÇÕES DO SERVIDOR${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${BLUE}IP do Servidor:${NC}     ${WHITE}${BOLD}${SERVER_IP}${NC}"
    echo -e "  ${BLUE}Domínio:${NC}            ${WHITE}${APP_DOMAIN}${NC}"
    echo -e "  ${BLUE}Porta:${NC}              ${WHITE}${APP_PORT}${NC}"
    echo ""
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}${BOLD}🔗 URLs DO LUMECINE${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${BLUE}Addon URL:${NC}          ${WHITE}${BOLD}https://${APP_DOMAIN}/manifest.json${NC}"
    echo -e "  ${BLUE}Catálogo:${NC}           ${WHITE}https://${APP_DOMAIN}/catalog${NC}"
    echo ""
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}${BOLD}⚙️  CONFIGURAÇÃO DE DNS${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  Configure o seguinte registro DNS para seu domínio:"
    echo ""
    echo -e "  ${YELLOW}Tipo:${NC}    A"
    echo -e "  ${YELLOW}Nome:${NC}    ${APP_DOMAIN}"
    echo -e "  ${YELLOW}Valor:${NC}   ${SERVER_IP}"
    echo -e "  ${YELLOW}TTL:${NC}     3600 (ou automático)"
    echo ""
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}${BOLD}🗄️  BANCO DE DADOS${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${BLUE}Host:${NC}               localhost:5432"
    echo -e "  ${BLUE}Usuário:${NC}            ${DB_USER}"
    echo -e "  ${BLUE}Banco:${NC}              ${DB_NAME}"
    echo -e "  ${BLUE}Senha:${NC}              ${DB_PASS}"
    echo ""
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}${BOLD}📝 COMANDOS ÚTEIS${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${YELLOW}Ver logs:${NC}           pm2 logs lumecine"
    echo -e "  ${YELLOW}Reiniciar:${NC}          pm2 restart lumecine"
    echo -e "  ${YELLOW}Parar:${NC}              pm2 stop lumecine"
    echo -e "  ${YELLOW}Status:${NC}             pm2 status"
    echo -e "  ${YELLOW}Logs do DB:${NC}         docker logs lumecine-db"
    echo ""
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}${BOLD}📁 ARQUIVOS IMPORTANTES${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${BLUE}Diretório:${NC}          ${INSTALL_DIR}"
    echo -e "  ${BLUE}Configuração:${NC}       ${INSTALL_DIR}/.env"
    echo -e "  ${BLUE}Nginx:${NC}              /etc/nginx/sites-available/lumecine"
    echo ""
    
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}${BOLD}🎉 Para usar no Stremio, adicione a URL acima nos addons!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Salvar informações em arquivo
    cat > "${INSTALL_DIR}/INSTALL_INFO.txt" << EOF
========================================
LUMECINE - INFORMAÇÕES DE INSTALAÇÃO
========================================

Data: $(date)

SERVIDOR:
- IP: ${SERVER_IP}
- Domínio: ${APP_DOMAIN}
- Porta: ${APP_PORT}

URLs:
- Addon: https://${APP_DOMAIN}/manifest.json

BANCO DE DADOS:
- Host: localhost:5432
- Usuário: ${DB_USER}
- Banco: ${DB_NAME}
- Senha: ${DB_PASS}

DIRETÓRIOS:
- Instalação: ${INSTALL_DIR}
- Configuração: ${INSTALL_DIR}/.env
- Nginx: /etc/nginx/sites-available/lumecine

COMANDOS:
- Logs: pm2 logs lumecine
- Reiniciar: pm2 restart lumecine
- Status: pm2 status
========================================
EOF

    log_info "Informações salvas em: ${INSTALL_DIR}/INSTALL_INFO.txt"
}

#===============================================================================
# MAIN
#===============================================================================

main() {
    print_banner
    check_root
    
    # Fase 1: Detecção
    detect_os
    detect_existing_services
    
    # Fase 2: Coleta de dados
    collect_user_data
    
    # Fase 3: Instalação
    update_system
    install_nodejs
    install_docker
    install_nginx
    install_pm2
    install_certbot
    
    # Fase 4: Configuração
    setup_database
    install_lumecine
    configure_nginx
    setup_ssl
    setup_pm2
    setup_firewall
    
    # Fase 5: Finalização
    print_summary
}

# Executar
main "$@"
