# 🪁 Hermes Agent

Assistente de IA conversacional com ferramentas poderosas, construído com Claude (Anthropic) e FastAPI.

## Funcionalidades

- 💬 **Chat em tempo real** com streaming de respostas
- 🔍 **Busca na web** via DuckDuckGo (sem API key)
- 🧮 **Calculadora** matemática avançada
- 🕐 **Data e hora** em qualquer fuso horário
- 🌐 **Leitura de páginas** web por URL
- 🎨 UI moderna com tema dark e histórico de sessões
- 📱 Responsivo para mobile

## Deploy gratuito no Render.com

### 1. Fork o repositório

Fork este repositório para a sua conta GitHub.

### 2. Crie uma conta no Render.com

Acesse [render.com](https://render.com) e crie uma conta gratuita.

### 3. Novo Web Service

1. Clique em **New → Web Service**
2. Conecte seu repositório GitHub
3. Render detectará o `render.yaml` automaticamente

### 4. Configure a variável de ambiente

Na aba **Environment**, adicione:
```
ANTHROPIC_API_KEY = sk-ant-...
```

Obtenha sua chave em: [console.anthropic.com](https://console.anthropic.com)

### 5. Deploy

Clique em **Deploy** — em ~2 minutos o app estará disponível numa URL pública.

> **Nota:** O plano gratuito do Render hiberna após 15 min de inatividade. A primeira requisição pode demorar ~30s para "acordar".

## Desenvolvimento local

```bash
# Instale as dependências
pip install -r requirements.txt

# Configure a API key
cp .env.example .env
# Edite .env e adicione sua ANTHROPIC_API_KEY

# Rode o servidor
uvicorn app.main:app --reload --port 8000
```

Acesse: http://localhost:8000

## Usando Docker

```bash
docker build -t hermes-agent .
docker run -p 8000:8000 -e ANTHROPIC_API_KEY=sk-ant-... hermes-agent
```

## Estrutura do projeto

```
├── app/
│   ├── main.py       # FastAPI + endpoints SSE
│   ├── agent.py      # Lógica do agente com tool use
│   └── tools.py      # Implementação das ferramentas
├── static/
│   ├── index.html    # Interface web
│   └── app.js        # Lógica do frontend
├── render.yaml       # Configuração Render.com
├── Dockerfile
└── requirements.txt
```

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `ANTHROPIC_API_KEY` | ✅ | Chave da API Anthropic |
