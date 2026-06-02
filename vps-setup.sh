#!/bin/bash
# =============================================================================
# Hermes Agent — Script de Instalação Automática para VPS
# Testado em: Ubuntu 22.04 / 24.04 (AMD64 e ARM64)
# Uso: curl -fsSL https://raw.githubusercontent.com/maikongsp/hermes-agent/main/vps-setup.sh | bash
# =============================================================================

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${BLUE}→${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1"; exit 1; }

echo -e "${BOLD}"
echo "╔══════════════════════════════════════════════════╗"
echo "║       🪁 Hermes Agent — Instalação VPS           ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── 1. Requisitos mínimos ────────────────────────────────
info "Verificando requisitos do sistema..."
RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
if [ "$RAM_MB" -lt 512 ]; then
  err "RAM insuficiente: ${RAM_MB}MB. Mínimo: 512MB."
fi
log "RAM: ${RAM_MB}MB — OK"

# ── 2. Atualizar sistema ─────────────────────────────────
info "Atualizando pacotes do sistema..."
apt-get update -qq && apt-get upgrade -y -qq
log "Sistema atualizado"

# ── 3. Instalar dependências base ───────────────────────
info "Instalando dependências base..."
apt-get install -y -qq \
  curl wget git unzip \
  build-essential libssl-dev \
  python3 python3-pip python3-venv \
  ripgrep
log "Dependências instaladas"

# ── 4. Instalar Hermes Agent ────────────────────────────
info "Instalando Hermes Agent (Nous Research)..."
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash -s -- --skip-setup
log "Hermes Agent instalado"

# ── 5. Configurar modelo gratuito ──────────────────────
info "Configurando modelo gratuito..."
hermes config set model.default "stepfun/step-3.7-flash:free" 2>/dev/null || true
hermes config set model.provider "nous" 2>/dev/null || true
log "Modelo gratuito configurado: stepfun/step-3.7-flash:free"

# ── 6. Criar serviço systemd ────────────────────────────
HERMES_USER="${SUDO_USER:-$USER}"
HERMES_HOME=$(eval echo "~$HERMES_USER")

info "Criando serviço systemd para o gateway..."
cat > /etc/systemd/system/hermes-gateway.service << EOF
[Unit]
Description=Hermes Agent Gateway
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$HERMES_USER
WorkingDirectory=$HERMES_HOME
ExecStart=/usr/local/bin/hermes gateway start
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=HOME=$HERMES_HOME

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
log "Serviço systemd criado: hermes-gateway.service"

# ── 7. Configurar firewall (se ufw estiver instalado) ──
if command -v ufw &>/dev/null; then
  info "Configurando firewall..."
  ufw allow 22/tcp  comment "SSH" 2>/dev/null || true
  ufw allow 8080/tcp comment "Hermes web (opcional)" 2>/dev/null || true
  log "Firewall configurado"
fi

# ── 8. Criar arquivo de configuração rápida ────────────
cat > "$HERMES_HOME/.hermes/QUICK_START.md" << 'EOF'
# Hermes Agent — Início Rápido

## 1. Autenticar no Nous Portal (gratuito)
```bash
hermes auth add nous --type oauth
# Abra a URL no browser e autorize
```

## 2. Iniciar chat interativo
```bash
hermes
```

## 3. Configurar Telegram (para acesso remoto)
```bash
# Crie um bot em @BotFather no Telegram
# Copie o token e adicione ao .env:
echo "TELEGRAM_BOT_TOKEN=seu_token_aqui" >> ~/.hermes/.env
echo "TELEGRAM_ALLOWED_USERS=seu_telegram_id" >> ~/.hermes/.env

# Iniciar gateway
hermes gateway install
sudo systemctl enable --now hermes-gateway
```

## 4. Modelos gratuitos disponíveis
- stepfun/step-3.7-flash:free  (256K contexto)
- openrouter/owl-alpha          (gratuito)

## 5. Comandos úteis
- hermes               → chat interativo
- hermes setup         → assistente de configuração
- hermes update        → atualizar para versão mais recente
- hermes status        → ver status de todas as integrações
EOF

echo ""
echo -e "${BOLD}${GREEN}"
echo "╔══════════════════════════════════════════════════╗"
echo "║          ✅ Instalação Concluída!                ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "${BOLD}Próximos passos:${NC}"
echo ""
echo -e "  ${BLUE}1.${NC} Autenticar no Nous Portal (modelo gratuito):"
echo -e "     ${YELLOW}hermes auth add nous --type oauth${NC}"
echo ""
echo -e "  ${BLUE}2.${NC} Iniciar o Hermes:"
echo -e "     ${YELLOW}hermes${NC}"
echo ""
echo -e "  ${BLUE}3.${NC} (Opcional) Configurar Telegram para acesso remoto:"
echo -e "     Veja: ${YELLOW}~/.hermes/QUICK_START.md${NC}"
echo ""
echo -e "  ${BLUE}4.${NC} (Opcional) Ativar como serviço permanente:"
echo -e "     ${YELLOW}sudo systemctl enable --now hermes-gateway${NC}"
echo ""
