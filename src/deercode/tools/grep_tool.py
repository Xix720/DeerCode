from typing import Optional, Literal
import subprocess
import os
from langchain.tools import tool

@tool("grep", parse_docstring=True)
def grep_tool(
    pattern: str,
    path: Optional[str] = None,
    glob: Optional[str] = None,
    output_mode: Literal[
        "content", "files_with_matches", "count"
    ] = "files_with_matches",
    B: Optional[int] = None,
    A: Optional[int] = None,
    C: Optional[int] = None,
    n: Optional[bool] = None,
    i: Optional[bool] = None,
    type: Optional[str] = None,
    head_limit: Optional[int] = None,
    multiline: Optional[bool] = False,
) -> str:
    """A powerful search tool built on ripgrep for searching file contents with regex patterns.

    ALWAYS use this tool for search tasks. NEVER invoke `grep` or `rg` as a Bash command.
    Supports full regex syntax, file filtering, and various output modes.

    Args:
        pattern: The regular expression pattern to search for in file contents.
                Uses ripgrep syntax - literal braces need escaping (e.g., `interface\\{\\}` for `interface{}`).
        path: File or directory to search in. Defaults to current working directory if not specified.
        glob: Glob pattern to filter files (e.g., "*.js", "*.{ts,tsx}").
        output_mode: Output mode - "content" shows matching lines with optional context,
                    "files_with_matches" shows only file paths (default),
                    "count" shows match counts per file.
        B: Number of lines to show before each match. Only works with output_mode="content".
        A: Number of lines to show after each match. Only works with output_mode="content".
        C: Number of lines to show before and after each match. Only works with output_mode="content".
        n: Show line numbers in output. Only works with output_mode="content".
        i: Enable case insensitive search.
        type: File type to search (e.g., "js", "py", "rust", "go", "java").
             More efficient than glob for standard file types.
        head_limit: Limit output to first N lines/entries. Works across all output modes.
        multiline: Enable multiline mode where patterns can span lines and . matches newlines.
                  Default is False (single-line matching only).

    Returns:
        Search results as a string.
    """
    # Build the ripgrep command
    cmd = ["rg"]
    
    # Set output mode
    if output_mode == "files_with_matches":
        cmd.append("--files-with-matches")
    elif output_mode == "count":
        cmd.append("--count")
    
    # Add context lines if specified
    if B is not None:
        cmd.extend(["--before-context", str(B)])
    if A is not None:
        cmd.extend(["--after-context", str(A)])
    if C is not None:
        cmd.extend(["--context", str(C)])
    
    # Add line numbers if specified
    if n:
        cmd.append("--line-number")
    
    # Add case insensitive if specified
    if i:
        cmd.append("--ignore-case")
    
    # Add file type filter if specified
    if type:
        cmd.extend(["--type", type])
    
    # Add glob pattern if specified
    if glob:
        cmd.extend(["--glob", glob])
    
    # Add multiline mode if specified
    if multiline:
        cmd.append("--multiline")
        cmd.append("--multiline-dotall")
    
    # Add pattern
    cmd.append(pattern)
    
    # Add path if specified
    if path:
        cmd.append(path)
    
    try:
        # Execute the command
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            cwd=os.getcwd()
        )
        
        output = result.stdout.strip()
        
        # Apply head_limit if specified
        if head_limit:
            lines = output.split('\n')
            output = '\n'.join(lines[:head_limit])
        
        return output
    except subprocess.CalledProcessError as e:
        # If no matches found, return empty string
        if e.returncode == 1:
            return ""
        return f"Error: {e.stderr.strip()}"
    except Exception as e:
        return f"Error: {str(e)}"
