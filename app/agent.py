import asyncio
from typing import AsyncGenerator

import anthropic

from app.tools import TOOL_DEFINITIONS, execute_tool

SYSTEM_PROMPT = """Você é Hermes, um assistente de IA inteligente e útil com acesso a ferramentas poderosas.

Você pode:
- 🔍 Pesquisar na web por informações atuais
- 🧮 Realizar cálculos matemáticos
- 🕐 Verificar a data e hora atual
- 🌐 Buscar e ler páginas da web

Seja prestativo, preciso e conciso. Ao usar ferramentas, explique brevemente o que está fazendo.
Responda sempre no mesmo idioma que o usuário escrever. Seja natural e amigável."""


class HermesAgent:
    def __init__(self, session_id: str) -> None:
        self.client = anthropic.AsyncAnthropic()
        self.session_id = session_id
        self.history: list[dict] = []
        self.model = "claude-sonnet-4-6"

    def get_history(self) -> list[dict]:
        safe = []
        for msg in self.history:
            if isinstance(msg["content"], str):
                safe.append({"role": msg["role"], "content": msg["content"]})
            elif isinstance(msg["content"], list):
                # Flatten tool interaction content for display
                texts = []
                for block in msg["content"]:
                    if isinstance(block, dict):
                        if block.get("type") == "text":
                            texts.append(block["text"])
                    elif hasattr(block, "type"):
                        if block.type == "text":
                            texts.append(block.text)
                if texts:
                    safe.append({"role": msg["role"], "content": " ".join(texts)})
        return safe

    async def chat(self, user_message: str) -> AsyncGenerator[dict, None]:
        self.history.append({"role": "user", "content": user_message})

        while True:
            text_content = ""
            tool_uses: list = []

            async with self.client.messages.stream(
                model=self.model,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=self.history,
                tools=TOOL_DEFINITIONS,
            ) as stream:
                async for event in stream:
                    event_type = getattr(event, "type", None)
                    if event_type == "content_block_delta":
                        delta = getattr(event, "delta", None)
                        if delta and getattr(delta, "type", None) == "text_delta":
                            text_content += delta.text
                            yield {"type": "text", "content": delta.text}

                final_message = await stream.get_final_message()
                stop_reason = final_message.stop_reason

                for block in final_message.content:
                    if block.type == "tool_use":
                        tool_uses.append(block)

            self.history.append({"role": "assistant", "content": final_message.content})

            if stop_reason != "tool_use" or not tool_uses:
                break

            tool_results = []
            for tool_use in tool_uses:
                yield {"type": "tool_start", "name": tool_use.name, "input": tool_use.input}

                result = await asyncio.get_event_loop().run_in_executor(
                    None, execute_tool, tool_use.name, tool_use.input
                )

                display = result[:800] if len(result) > 800 else result
                yield {"type": "tool_result", "name": tool_use.name, "result": display}

                tool_results.append(
                    {"type": "tool_result", "tool_use_id": tool_use.id, "content": result}
                )

            self.history.append({"role": "user", "content": tool_results})
