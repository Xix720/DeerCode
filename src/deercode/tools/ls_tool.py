from typing import Optional, List
import os
import glob
from langchain.tools import tool

@tool("ls", parse_docstring=True)
def ls_tool(
    path: str, match: Optional[List[str]] = None, ignore: Optional[List[str]] = None
) -> str:
    """Lists files and directories in a given path. Optionally provide an array of glob patterns to match and ignore.

    Args:
        path: The absolute path to list files and directories from. Relative paths are **not** allowed.
        match: An optional array of glob patterns to match.
        ignore: An optional array of glob patterns to ignore.
    """
    # Validate path is absolute
    if not os.path.isabs(path):
        return f"Error: Path must be absolute, got relative path: {path}"
    
    # Validate path exists
    if not os.path.exists(path):
        return f"Error: Path does not exist: {path}"
    
    try:
        # Get all entries in the path
        entries = os.listdir(path)
        
        # Full paths for all entries
        full_paths = [os.path.join(path, entry) for entry in entries]
        
        # Filter by match patterns if provided
        if match:
            matched_paths = []
            for pattern in match:
                # Use glob to find matches
                glob_pattern = os.path.join(path, pattern)
                matched_paths.extend(glob.glob(glob_pattern))
            # Remove duplicates
            full_paths = list(set(matched_paths))
        
        # Filter out ignored patterns if provided
        if ignore:
            filtered_paths = []
            for full_path in full_paths:
                # Check if path matches any ignore pattern
                ignore_path = False
                for pattern in ignore:
                    if glob.fnmatch.fnmatch(os.path.basename(full_path), pattern):
                        ignore_path = True
                        break
                if not ignore_path:
                    filtered_paths.append(full_path)
            full_paths = filtered_paths
        
        # Sort the paths
        full_paths.sort()
        
        # Format the output
        result = []
        for full_path in full_paths:
            entry_name = os.path.basename(full_path)
            if os.path.isdir(full_path):
                result.append(f"{entry_name}/")
            else:
                result.append(entry_name)
        
        return "\n".join(result)
    except Exception as e:
        return f"Error: {str(e)}"
