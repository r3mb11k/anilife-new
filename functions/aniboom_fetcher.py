import sys
import os
import json
import traceback

# --- 1. Диагностика и безопасный импорт ---
# Этот блок поможет нам понять, что не так в окружении Python.

def run_diagnostics():
    """Проверяет наличие необходимых библиотек и пути."""
    diagnostics = {
        "python_version": sys.version,
        "python_executable": sys.executable,
        "cwd": os.getcwd(),
        "sys_path": sys.path,
        "imports": {}
    }
    
    # Попытка импортировать зависимости
    try:
        import requests
        diagnostics["imports"]["requests"] = "OK"
    except ImportError:
        diagnostics["imports"]["requests"] = "FAILED"

    try:
        import bs4
        diagnostics["imports"]["bs4"] = "OK"
    except ImportError:
        diagnostics["imports"]["bs4"] = "FAILED"

    # Попытка импортировать наш парсер
    try:
        project_root = os.path.dirname(os.path.dirname(__file__))
        parsers_path = os.path.join(project_root, 'AnimeParsers-main', 'src')
        if parsers_path not in sys.path:
            sys.path.insert(0, parsers_path)
        
        from anime_parsers_ru import AniboomParser
        diagnostics["imports"]["AniboomParser"] = "OK"
        return True, diagnostics, None
    except Exception as e:
        diagnostics["imports"]["AniboomParser"] = f"FAILED: {e}"
        return False, diagnostics, traceback.format_exc()

# --- 2. Основная логика ---

def safe_fast_search(parser, title):
    try:
        return parser.fast_search(title)
    except Exception:
        return []

def get_description(primary_title, secondary_title):
    """Эффективно получает описание, пробуя оба названия."""
    try:
        from anime_parsers_ru import AniboomParser
        parser = AniboomParser()

        # Шаг 1: Пробуем найти по основному (русскому) названию
        fast_results = safe_fast_search(parser, primary_title)
        
        # Шаг 2: Если не нашли, пробуем по запасному (оригинальному)
        if not fast_results:
            fast_results = safe_fast_search(parser, secondary_title)
            if not fast_results:
                return {"description": None, "error": f"Not found with '{primary_title}' or '{secondary_title}'"}

        # Шаг 3: Получаем детальную информацию для первого найденного результата
        first_result_link = fast_results[0].get('link')
        if not first_result_link:
            return {"description": None, "error": "First result has no link."}
            
        anime_details = parser.anime_info(first_result_link)
        description = anime_details.get('description')

        if not description or not description.strip():
             return {"description": None, "error": f"Description is empty for found anime"}

        return {"description": description.strip()}

    except Exception as e:
        return {"description": None, "error": f"An exception occurred: {e}", "traceback": traceback.format_exc()}


def main():
    # Проверяем, переданы ли аргументы
    if len(sys.argv) < 3:
        # Если нет - запускаем диагностику
        success, diagnostics_data, tb = run_diagnostics()
        if not success:
            print(json.dumps({"error": "Diagnostics failed", "diagnostics": diagnostics_data, "traceback": tb}, indent=2), flush=True)
        else:
            print(json.dumps({"error": "Missing titles. Expected russian and original titles."}), flush=True)
        sys.exit(1)

    # Выполняем основную логику с двумя названиями
    russian_title = sys.argv[1]
    original_title = sys.argv[2]
    result = get_description(russian_title, original_title)
    print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main() 