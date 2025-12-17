from typing import Optional
import pexpect
import os
from langchain.tools import tool

@tool("bash", parse_docstring=True)
def bash_tool(command: str, reset_cwd: Optional[bool] = False):
    """Execute a standard bash command in a keep-alive shell, and return the output if successful or error message if failed.

    Use this tool to perform:
    - Create directories
    - Install dependencies
    - Start development server
    - Run tests and linting
    - Git operations

    Never use this tool to perform any harmful or dangerous operations.

    Use `ls`, `grep` and `tree` tools for file system operations instead of this tool.

    Args:
        command: The command to execute.
        reset_cwd: Whether to reset the current working directory to the project root directory.
    """
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
    
    if reset_cwd:
        current_dir = project_root
    else:
        current_dir = os.getcwd()
    
    try:
        # Use pexpect to execute the command
        process = pexpect.spawn(
            "bash", 
            args=["-c", command],
            cwd=current_dir,
            timeout=30
        )
        process.expect(pexpect.EOF)
        output = process.before.decode("utf-8").strip()
        exit_code = process.wait()
        
        if exit_code == 0:
            return output
        else:
            return f"Error (exit code {exit_code}): {output}"
    except pexpect.TIMEOUT:
        return f"Error: Command timed out after 30 seconds"
    except Exception as e:
        return f"Error: {str(e)}"
