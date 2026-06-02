import math
import re
from datetime import datetime

import httpx

TOOL_DEFINITIONS = [
    {
        "name": "web_search",
        "description": (
            "Pesquisa na web por informações atuais. Use para eventos recentes, "
            "fatos, notícias ou qualquer coisa que exija informações atualizadas."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "A consulta de busca"},
                "num_results": {
                    "type": "integer",
                    "description": "Número de resultados (padrão: 5)",
                    "default": 5,
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "calculator",
        "description": (
            "Realiza cálculos matemáticos. Suporta aritmética básica, "
            "trigonometria, logaritmos, etc."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Expressão matemática (ex: '2+2', 'sqrt(16)', 'sin(pi/2)')",
                }
            },
            "required": ["expression"],
        },
    },
    {
        "name": "get_datetime",
        "description": "Obtém a data e hora atuais.",
        "input_schema": {
            "type": "object",
            "properties": {
                "timezone": {
                    "type": "string",
                    "description": "Fuso horário (ex: 'UTC', 'America/Sao_Paulo'). Padrão: UTC.",
                    "default": "UTC",
                }
            },
        },
    },
    {
        "name": "fetch_webpage",
        "description": "Busca e lê o conteúdo de uma página web a partir de uma URL específica.",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "A URL a ser buscada"}
            },
            "required": ["url"],
        },
    },
]


def execute_tool(name: str, input_data: dict) -> str:
    try:
        if name == "web_search":
            return _web_search(input_data.get("query", ""), input_data.get("num_results", 5))
        if name == "calculator":
            return _calculator(input_data.get("expression", ""))
        if name == "get_datetime":
            return _get_datetime(input_data.get("timezone", "UTC"))
        if name == "fetch_webpage":
            return _fetch_webpage(input_data.get("url", ""))
        return f"Ferramenta desconhecida: {name}"
    except Exception as exc:
        return f"Erro ao executar '{name}': {exc}"


def _web_search(query: str, num_results: int = 5) -> str:
    try:
        from duckduckgo_search import DDGS

        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=num_results))

        if not results:
            return "Nenhum resultado encontrado."

        lines = []
        for i, r in enumerate(results, 1):
            lines.append(f"{i}. **{r.get('title', 'Sem título')}**")
            lines.append(f"   URL: {r.get('href', '')}")
            lines.append(f"   {r.get('body', '')}")
            lines.append("")
        return "\n".join(lines)
    except Exception as exc:
        return f"Erro na busca: {exc}"


def _calculator(expression: str) -> str:
    allowed = {k: v for k, v in math.__dict__.items() if not k.startswith("_")}
    allowed.update({"abs": abs, "round": round, "min": min, "max": max, "pow": pow})

    # Allow only safe characters
    if re.search(r"[^0-9+\-*/().^%,\s a-zA-Z_]", expression):
        return "Expressão contém caracteres inválidos."

    try:
        result = eval(expression, {"__builtins__": {}}, allowed)  # noqa: S307
        return str(result)
    except Exception as exc:
        return f"Erro no cálculo: {exc}"


def _get_datetime(timezone: str = "UTC") -> str:
    try:
        from zoneinfo import ZoneInfo

        now = datetime.now(ZoneInfo(timezone))
        return now.strftime("%Y-%m-%d %H:%M:%S %Z (%A, %d de %B de %Y)")
    except Exception:
        now = datetime.utcnow()
        return now.strftime("%Y-%m-%d %H:%M:%S UTC (%A, %d de %B de %Y)")


def _fetch_webpage(url: str) -> str:
    try:
        with httpx.Client(timeout=15, follow_redirects=True) as client:
            resp = client.get(
                url, headers={"User-Agent": "Mozilla/5.0 (compatible; HermesAgent/1.0)"}
            )
            resp.raise_for_status()

        text = resp.text
        text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL)
        text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text).strip()

        return text[:4000] + ("..." if len(text) > 4000 else "")
    except Exception as exc:
        return f"Erro ao buscar URL: {exc}"
