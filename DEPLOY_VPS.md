# 🪁 Hermes Agent — Deploy em VPS Gratuita

## Melhor opção: Oracle Cloud Always Free

**O que você ganha de graça para sempre:**
- 4 vCPUs ARM (Ampere A1)
- 24 GB de RAM
- 200 GB de disco NVMe
- Largura de banda generosa

---

## Passo a Passo: Oracle Cloud

### 1. Criar conta gratuita

1. Acesse **[oracle.com/cloud/free](https://oracle.com/cloud/free)**
2. Clique em **"Start for free"**
3. Preencha nome, e-mail, país → **Brasil** está disponível
4. Adicione cartão de crédito (não será cobrado — só para verificação)
5. Confirme o e-mail e finalize o cadastro

> Selecione a região mais próxima: **Brazil East (São Paulo)** ou **US East (Ashburn)**

---

### 2. Criar a VM gratuita (Ampere A1)

1. No painel Oracle Cloud, vá em **Compute → Instances → Create Instance**
2. Clique em **"Change shape"** e selecione:
   - **Shape series:** Ampere
   - **Shape:** `VM.Standard.A1.Flex`
   - **OCPUs:** 4 · **Memory:** 24 GB
3. Em **Image**, selecione: **Ubuntu 22.04 (aarch64)**
4. Em **Networking**: deixe padrão (VCN automática)
5. Em **SSH Keys**: adicione sua chave pública SSH (ou baixe a gerada)
6. Clique em **Create**

Aguarde ~2 minutos até o status ficar **Running**.

---

### 3. Liberar portas no firewall Oracle

Por padrão, a Oracle bloqueia tudo exceto porta 22. Libere as necessárias:

**No painel Oracle Cloud:**
1. Vá em **Networking → Virtual Cloud Networks → [sua VCN] → Security Lists**
2. Clique em **"Add Ingress Rules"** e adicione:

| Source CIDR | Protocol | Port | Descrição |
|-------------|----------|------|-----------|
| 0.0.0.0/0   | TCP      | 22   | SSH |
| 0.0.0.0/0   | TCP      | 80   | HTTP (opcional) |
| 0.0.0.0/0   | TCP      | 443  | HTTPS (opcional) |

**No próprio servidor Ubuntu (iptables):**
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

---

### 4. Conectar ao servidor via SSH

```bash
ssh ubuntu@<IP_DA_SUA_VM>
# ou se criou como root:
ssh root@<IP_DA_SUA_VM>
```

---

### 5. Instalar o Hermes Agent

```bash
# Instalação automática (um comando)
curl -fsSL https://raw.githubusercontent.com/maikongsp/hermes-agent/main/vps-setup.sh | bash
```

Ou manualmente:
```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

---

### 6. Autenticar no Nous Portal (modelo gratuito)

```bash
hermes auth add nous --type oauth
# → Aparecerá uma URL e um código
# → Abra a URL no browser e autorize
```

Depois configure o modelo gratuito:
```bash
hermes config set model.default "stepfun/step-3.7-flash:free"
hermes config set model.provider "nous"
```

---

### 7. Iniciar o Hermes

```bash
hermes
```

---

### 8. (Recomendado) Acesso via Telegram — use de qualquer lugar!

Assim você pode falar com o Hermes pelo Telegram do celular:

```bash
# 1. Crie um bot no @BotFather (Telegram) e pegue o token

# 2. Descubra seu Telegram ID: envie uma mensagem para @userinfobot

# 3. Configure
echo "TELEGRAM_BOT_TOKEN=1234567890:AAxxxx..." >> ~/.hermes/.env
echo "TELEGRAM_ALLOWED_USERS=123456789" >> ~/.hermes/.env

# 4. Instale e ative o gateway como serviço permanente
hermes gateway install
sudo systemctl enable --now hermes-gateway

# 5. Verifique
sudo systemctl status hermes-gateway
```

Agora você pode mandar mensagens para o seu bot no Telegram e o Hermes responde de qualquer lugar!

---

## Alternativa: Google Cloud Always Free

Para quem não quer usar Oracle:

1. Acesse **[cloud.google.com/free](https://cloud.google.com/free)**
2. Crie um projeto → **Compute Engine → Create VM**
3. Selecione:
   - Machine type: **e2-micro** (1GB RAM)
   - Region: **us-west1, us-central1 ou us-east1** (gratuito nesses)
   - OS: **Ubuntu 22.04 LTS**
   - Disk: **30 GB standard** (gratuito)
4. Crie e conecte via SSH
5. Execute o script de instalação acima

> Nota: 1GB RAM é suficiente para o Hermes com modelo gratuito leve.

---

## Resumo

| Plataforma | RAM | CPU | Disk | Região BR | Cartão |
|-----------|-----|-----|------|-----------|--------|
| **Oracle Cloud** ⭐ | 24 GB | 4 ARM | 200 GB | ✅ São Paulo | Obrigatório |
| Google Cloud | 1 GB | 2 micro | 30 GB | ❌ só US | Obrigatório |
| AWS (12 meses) | 1 GB | 1 | 30 GB | ✅ | Obrigatório |
