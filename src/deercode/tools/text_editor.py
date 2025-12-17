from typing import Optional, Literal
import os
from langchain.tools import tool

@tool("text_editor", parse_docstring=True)
def text_editor_tool(
    file_path: str,
    content: Optional[str] = None,
    mode: Literal["write", "append", "read"] = "write"
):
    """Edit or view a file.

    Use this tool to:
    - Create new files
    - Modify existing files
    - Append content to files
    - Read file contents

    Args:
        file_path: The absolute path to the file to edit or view.
        content: The content to write or append to the file. Required for "write" and "append" modes.
        mode: The operation mode - "write" (overwrite file), "append" (add to end), or "read" (view content).

    Returns:
        A message indicating the result of the operation, or the file contents for "read" mode.
    """
    try:
        if mode == "read":
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        elif mode == "write":
            if content is None:
                return "Error: Content is required for write mode"
            # Ensure parent directory exists
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            return f"Successfully wrote to file: {file_path}"
        elif mode == "append":
            if content is None:
                return "Error: Content is required for append mode"
            # Ensure parent directory exists
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "a", encoding="utf-8") as f:
                f.write(content)
            return f"Successfully appended to file: {file_path}"
        else:
            return f"Error: Invalid mode '{mode}'. Supported modes: 'write', 'append', 'read'"
    except Exception as e:
        return f"Error: {str(e)}"
