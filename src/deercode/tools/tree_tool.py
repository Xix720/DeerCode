from typing import Optional
import os
from langchain.tools import tool

@tool("tree", parse_docstring=True)
def tree_tool(
    path: Optional[str] = None,
    max_depth: Optional[int] = 3,
) -> str:
    """Display directory structure in a tree format, similar to the 'tree' command.

    Shows files and directories in a hierarchical tree structure.
    Automatically excludes common ignore patterns (version control, dependencies, build artifacts, etc.).

    Args:
        path: Directory path to display. Defaults to current working directory if not specified.
        max_depth: Maximum depth to traverse. The max_depth should be less than or equal to 3. Defaults to 3.

    Returns:
        A tree-structured view of the directory as a string.
    """
    # Set default path if not provided
    if path is None:
        path = os.getcwd()
    
    # Validate path exists
    if not os.path.exists(path):
        return f"Error: Path does not exist: {path}"
    
    # Validate path is a directory
    if not os.path.isdir(path):
        return f"Error: Path is not a directory: {path}"
    
    # Validate max_depth
    if max_depth is None:
        max_depth = 3
    elif max_depth < 1:
        return f"Error: max_depth must be at least 1, got: {max_depth}"
    elif max_depth > 3:
        return f"Error: max_depth must be less than or equal to 3, got: {max_depth}"
    
    # Common ignore patterns
    ignore_patterns = [
        ".git", ".gitignore",
        "__pycache__", "*.pyc", "*.pyo",
        "node_modules", "package-lock.json", "yarn.lock",
        "dist", "build", "target",
        ".venv", "venv", "env",
        ".idea", "*.swp", "*.swo",
        ".DS_Store"
    ]
    
    def should_ignore(entry: str) -> bool:
        """Check if an entry should be ignored based on common patterns."""
        for pattern in ignore_patterns:
            if entry == pattern or entry.endswith(pattern):
                return True
        return False
    
    def build_tree(directory: str, current_depth: int = 0) -> list:
        """Recursively build the tree structure."""
        tree_lines = []
        
        # Get entries and filter out ignored ones
        entries = []
        for entry in os.listdir(directory):
            if not should_ignore(entry):
                entries.append(entry)
        
        # Sort entries: directories first, then files
        entries.sort(key=lambda x: (not os.path.isdir(os.path.join(directory, x)), x.lower()))
        
        for i, entry in enumerate(entries):
            full_path = os.path.join(directory, entry)
            
            # Determine prefix based on position and depth
            if current_depth == 0:
                prefix = ""
            else:
                if i == len(entries) - 1:
                    prefix = "│   " * (current_depth - 1) + "└── "
                else:
                    prefix = "│   " * (current_depth - 1) + "├── "
            
            # Add the entry line
            if os.path.isdir(full_path):
                tree_lines.append(f"{prefix}{entry}/")
            else:
                tree_lines.append(f"{prefix}{entry}")
            
            # Recursively add children if it's a directory and we haven't reached max depth
            if os.path.isdir(full_path) and current_depth < max_depth:
                tree_lines.extend(build_tree(full_path, current_depth + 1))
        
        return tree_lines
    
    try:
        # Build the tree
        tree_lines = build_tree(path)
        
        # Add the root directory at the top
        tree_output = f"{os.path.basename(path)}/\n" + "\n".join(tree_lines)
        
        return tree_output
    except Exception as e:
        return f"Error: {str(e)}"
