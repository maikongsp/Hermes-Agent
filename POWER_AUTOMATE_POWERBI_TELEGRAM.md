# Guia: Power Automate → Export Power BI para PDF → Enviar ao Telegram

**Report ID:** `b4feba87-c631-4e3e-ad7d-c850b0b8da04`  
**Tenant ID:** `7d22fc10-a25b-4c6d-8c46-798734f11df2`  
**Telegram Bot Token:** `8886246787:AAHPIY4hDc9FdwaAFFzsASNobUCMMR-DsfA`  
**Telegram Chat ID:** `6543789291`

---

## Índice

1. [Como encontrar o Workspace ID no navegador](#1-como-encontrar-o-workspace-id-no-navegador)
2. [Caminho A — Usuário Power BI Pro (conector nativo)](#caminho-a--usuário-power-bi-pro-conector-nativo)
3. [Caminho B — Usuário Power BI Free (Assinatura de relatório + trigger de e-mail)](#caminho-b--usuário-power-bi-free-assinatura-de-relatório--trigger-de-e-mail)
4. [Ação HTTP: enviar arquivo ao Telegram (sendDocument)](#4-ação-http-enviar-arquivo-ao-telegram-senddocument)
5. [Alternativa: OneDrive como etapa intermediária](#5-alternativa-onedrive-como-etapa-intermediária)
6. [Solução de problemas comuns](#6-solução-de-problemas-comuns)

---

## 1. Como encontrar o Workspace ID no navegador

1. Abra o **Power BI Service** em [https://app.powerbi.com](https://app.powerbi.com).
2. No painel esquerdo, clique no **Workspace** que contém o relatório desejado.
3. Observe a URL no navegador. O formato será:

   ```
   https://app.powerbi.com/groups/<WORKSPACE_ID>/list
   ```

   Exemplo:
   ```
   https://app.powerbi.com/groups/a1b2c3d4-e5f6-7890-abcd-ef1234567890/list
   ```

4. O GUID entre `/groups/` e `/list` é o seu **Workspace ID**.

   > **Dica:** se a URL mostrar `/me/` ao invés de `/groups/GUID/`, você está no "Meu Workspace" — nesse caso o Workspace ID é `me` ou use `00000000-0000-0000-0000-000000000000` nos conectores.

---

## Caminho A — Usuário Power BI Pro (conector nativo)

> **Pré-requisito:** licença Power BI Pro ou Premium Per User (PPU) **e** permissão de pelo menos *Viewer* no workspace.

### Passo 1 — Criar o fluxo agendado

1. Acesse [https://make.powerautomate.com](https://make.powerautomate.com).
2. Clique em **+ Criar** → **Fluxo de nuvem agendado**.
3. Preencha:
   - **Nome do fluxo:** `PowerBI PDF → Telegram`
   - **Início:** data/hora de hoje
   - **Repetir a cada:** `1` **Dia**
4. Clique em **Criar**.

---

### Passo 2 — Adicionar a ação "Exportar para arquivo (relatórios do Power BI)"

1. Clique em **+ Nova etapa**.
2. Pesquise por `Power BI` e selecione o conector **Power BI**.
3. Escolha a ação **Exportar para arquivo (relatórios do Power BI)** *(Export To File for Power BI Reports)*.
4. Se solicitado, faça login com sua conta Microsoft que tem acesso ao relatório.
5. Preencha os campos:

   | Campo | Valor |
   |---|---|
   | **ID do Workspace** | *(selecione na lista ou cole o GUID obtido no passo 1)* |
   | **ID do Relatório** | `b4feba87-c631-4e3e-ad7d-c850b0b8da04` |
   | **Formato de Exportação** | `PDF` |

6. Clique em **Mostrar opções avançadas** (opcional) para definir páginas específicas ou configurações de locale.

---

### Passo 3 — Adicionar atraso para aguardar a exportação (recomendado)

> A exportação pode levar alguns segundos. Adicionar um delay evita erros.

1. Clique em **+ Nova etapa** → pesquise `Atraso` → selecione **Atraso**.
2. Configure:
   - **Contagem:** `30`
   - **Unidade:** `Segundo`

---

### Passo 4 — Obter o conteúdo do arquivo exportado

A ação de exportação do Power BI retorna o conteúdo binário do arquivo diretamente na saída. Você referenciará a saída desta ação na etapa de envio ao Telegram.

- A saída relevante é: **`body`** (ou **`File Content`**) da ação *Exportar para arquivo*.
- No Power Automate, isso é acessado via expressão dinâmica:
  ```
  outputs('Exportar_para_arquivo_(relatórios_do_Power_BI)')?['body']
  ```

---

### Passo 5 — Enviar ao Telegram

Siga a [seção 4](#4-ação-http-enviar-arquivo-ao-telegram-senddocument) deste guia.

---

## Caminho B — Usuário Power BI Free (Assinatura de relatório + trigger de e-mail)

> **Pré-requisito:** acesso de leitura ao relatório. O Power BI enviará o PDF por e-mail via assinatura agendada.

### Passo 1 — Criar uma Assinatura de Relatório no Power BI

1. Abra o relatório em [https://app.powerbi.com](https://app.powerbi.com).
2. No menu superior, clique em **Assinar** (ícone de envelope ou menu `...` → **Assinar**).
3. Clique em **+ Adicionar nova assinatura**.
4. Configure:
   - **Nome da assinatura:** `Export Diário PDF`
   - **Frequência:** `Diariamente`
   - **Hora:** o horário desejado (ex: `07:00`)
   - **Formato:** `PDF` *(se disponível na sua licença)*
   - **Destinatários:** adicione o e-mail que o Power Automate vai monitorar
5. Clique em **Salvar e fechar**.

   > **Atenção:** usuários Free só podem enviar para si mesmos. Se a opção PDF não aparecer, o Power BI enviará um PNG/imagem embutida no e-mail.

---

### Passo 2 — Criar o fluxo com trigger de e-mail

1. Em [https://make.powerautomate.com](https://make.powerautomate.com), clique em **+ Criar** → **Fluxo de nuvem automatizado**.
2. Pesquise por `Quando um novo e-mail chegar` e selecione o conector **Office 365 Outlook** → ação **Quando um novo e-mail chega (V3)**.
3. Configure o trigger:

   | Campo | Valor |
   |---|---|
   | **Pasta** | Caixa de Entrada |
   | **De** | `no-reply@powerbi.microsoft.com` |
   | **Assunto contém** | `Export Diário PDF` *(ou parte do nome da assinatura)* |
   | **Incluir Anexos** | `Sim` |
   | **Somente com Anexos** | `Sim` |

---

### Passo 3 — Extrair o anexo PDF do e-mail

1. Clique em **+ Nova etapa** → **Aplicar a cada um** *(Apply to each)*.
2. No campo **Selecionar uma saída das etapas anteriores**, selecione **Anexos** (Attachments) do trigger de e-mail.
3. Dentro do loop, adicione uma condição:
   - **Condição:** `Nome do Anexo` **termina com** `.pdf`
4. No ramo **Se sim**, continue para o passo 4.

---

### Passo 4 — Obter conteúdo do anexo

Dentro do ramo **Se sim**:
1. Adicione a ação **Obter Anexo (V2)** do Outlook:
   - **ID da Mensagem:** `ID da Mensagem` *(saída dinâmica do trigger)*
   - **ID do Anexo:** `ID` *(saída dinâmica do loop)*
2. O conteúdo binário estará disponível em:
   ```
   outputs('Obter_Anexo_(V2)')?['body/contentBytes']
   ```

---

### Passo 5 — Enviar ao Telegram

Siga a [seção 4](#4-ação-http-enviar-arquivo-ao-telegram-senddocument) deste guia.

---

## 4. Ação HTTP: enviar arquivo ao Telegram (sendDocument)

> Esta etapa é igual para o Caminho A e Caminho B.

### Opção 4A — Envio direto via multipart/form-data (método recomendado)

O Telegram aceita upload de arquivo binário via `multipart/form-data`. O conector HTTP do Power Automate suporta isso com a seguinte configuração:

1. Clique em **+ Nova etapa** → pesquise `HTTP` → selecione a ação **HTTP**.

2. Configure os campos:

   | Campo | Valor |
   |---|---|
   | **Método** | `POST` |
   | **URI** | `https://api.telegram.org/bot8886246787:AAHPIY4hDc9FdwaAFFzsASNobUCMMR-DsfA/sendDocument` |

3. Em **Cabeçalhos (Headers)**, adicione:

   ```
   Content-Type    multipart/form-data; boundary=----PowerAutomateBoundary
   ```

4. Em **Corpo (Body)**, cole o template abaixo — substituindo `<<CONTEUDO_BASE64>>` pela expressão dinâmica do conteúdo do arquivo:

   ```
   ------PowerAutomateBoundary
   Content-Disposition: form-data; name="chat_id"

   6543789291
   ------PowerAutomateBoundary
   Content-Disposition: form-data; name="caption"

   Relatório Power BI — @{formatDateTime(utcNow(), 'dd/MM/yyyy')}
   ------PowerAutomateBoundary
   Content-Disposition: form-data; name="document"; filename="relatorio.pdf"
   Content-Type: application/pdf

   @{base64ToBinary(outputs('Exportar_para_arquivo_(relatórios_do_Power_BI)')?['body'])}
   ------PowerAutomateBoundary--
   ```

   > **Nota:** Na prática, o conector HTTP do Power Automate tem limitações com binário puro no corpo multipart. Se essa abordagem retornar erro `400`, use a **Opção 4B** abaixo.

---

### Opção 4B — Envio via URL pré-assinada (método mais confiável)

Esta abordagem usa a API `sendDocument` com o parâmetro `document` como URL de download, ou usa o método `sendDocument` com upload base64 via `application/json`. Porém, a Telegram Bot API **não aceita base64 diretamente** — o mais confiável é usar o OneDrive como etapa intermediária (veja [seção 5](#5-alternativa-onedrive-como-etapa-intermediária)).

---

### Opção 4C — Enviar como mensagem de texto com link (fallback simples)

Se o objetivo for apenas notificar via Telegram (sem o arquivo em si):

1. Ação **HTTP**:

   | Campo | Valor |
   |---|---|
   | **Método** | `POST` |
   | **URI** | `https://api.telegram.org/bot8886246787:AAHPIY4hDc9FdwaAFFzsASNobUCMMR-DsfA/sendMessage` |
   | **Cabeçalhos** | `Content-Type: application/json` |

2. **Corpo (Body):**
   ```json
   {
     "chat_id": "6543789291",
     "text": "✅ Relatório Power BI exportado com sucesso em @{formatDateTime(utcNow(), 'dd/MM/yyyy HH:mm')} UTC. Acesse: https://app.powerbi.com/groups/<WORKSPACE_ID>/reports/b4feba87-c631-4e3e-ad7d-c850b0b8da04",
     "parse_mode": "HTML"
   }
   ```

---

## 5. Alternativa: OneDrive como etapa intermediária

Esta é a abordagem **mais robusta** para enviar o PDF como arquivo ao Telegram quando o multipart/form-data apresentar problemas.

### Passo 5.1 — Salvar o PDF no OneDrive

1. Adicione a ação **Criar arquivo** do conector **OneDrive for Business**.
2. Configure:

   | Campo | Valor |
   |---|---|
   | **Caminho da Pasta** | `/RelatoriosPowerBI` *(crie esta pasta no OneDrive)* |
   | **Nome do Arquivo** | `relatorio_@{formatDateTime(utcNow(), 'yyyyMMdd')}.pdf` |
   | **Conteúdo do Arquivo** | *(saída dinâmica `body` da ação de exportação do Power BI)* |

---

### Passo 5.2 — Criar um link de compartilhamento

1. Adicione a ação **Criar link de compartilhamento** do OneDrive:

   | Campo | Valor |
   |---|---|
   | **ID** | `ID` *(saída dinâmica da ação "Criar arquivo")* |
   | **Tipo de Link** | `view` |
   | **Escopo** | `anonymous` |

2. A saída **`webUrl`** conterá o link de acesso direto ao arquivo.

---

### Passo 5.3 — Enviar link ao Telegram

1. Ação **HTTP**:

   | Campo | Valor |
   |---|---|
   | **Método** | `POST` |
   | **URI** | `https://api.telegram.org/bot8886246787:AAHPIY4hDc9FdwaAFFzsASNobUCMMR-DsfA/sendMessage` |
   | **Cabeçalhos** | `Content-Type: application/json` |

2. **Corpo:**
   ```json
   {
     "chat_id": "6543789291",
     "text": "📊 <b>Relatório Power BI</b>\n📅 Data: @{formatDateTime(utcNow(), 'dd/MM/yyyy')}\n📎 <a href=\"@{outputs('Criar_link_de_compartilhamento')?['body/webUrl']}\">Clique aqui para baixar o PDF</a>",
     "parse_mode": "HTML"
   }
   ```

---

### Passo 5.4 — (Opcional) Excluir o arquivo do OneDrive após envio

Para não acumular arquivos:

1. Adicione a ação **Excluir arquivo** do OneDrive.
2. **ID:** saída `ID` da ação "Criar arquivo".

---

## 6. Solução de problemas comuns

| Problema | Causa provável | Solução |
|---|---|---|
| Erro `403` na exportação Power BI | Sem permissão de exportação | Solicitar ao admin do workspace permissão `Export` ou usar o Caminho B |
| Erro `400` no HTTP do Telegram | multipart malformado | Usar OneDrive como intermediário (Seção 5) |
| Fluxo agendado não dispara | Fuso horário errado | No trigger de recorrência, clique em "Mostrar opções avançadas" e defina o **Fuso Horário** como `(UTC-03:00) Brasília` |
| PDF não aparece como anexo no e-mail | Licença Power BI Free | O formato PDF só é enviado por e-mail em licenças Pro; usuários Free recebem imagem PNG |
| Telegram retorna `chat not found` | Chat ID errado | Envie `/start` ao bot e verifique o chat_id via `https://api.telegram.org/bot<TOKEN>/getUpdates` |
| Arquivo muito grande (>50MB) | Limite da API Telegram | Comprimir o relatório ou enviar apenas páginas específicas via filtros na exportação |

---

## Resumo do Fluxo Completo (Caminho A — Pro)

```
[Recorrência: Diária às HH:MM]
         ↓
[Power BI: Exportar para arquivo PDF]
         ↓
[Atraso: 30 segundos]
         ↓
[OneDrive: Criar arquivo]  ←── mais confiável
         ↓
[OneDrive: Criar link de compartilhamento]
         ↓
[HTTP POST → Telegram sendMessage com link]
         ↓
[OneDrive: Excluir arquivo] (opcional)
```

---

*Guia criado para o Hermes Agent — base de conhecimento Telegram.*
