from enum import Enum
from pydantic import BaseModel, Field
from langchain.tools import tool

class TodoStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"

class TodoPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"

class TodoItem(BaseModel):
    """Representation of a TODO item."""

    id: int = Field(..., ge=0)
    content: str = Field(..., min_length=1)
    priority: TodoPriority = Field(default=TodoPriority.medium)
    status: TodoStatus = Field(default=TodoStatus.pending)

@tool("todo_write", parse_docstring=True)
def todo_write_tool(items: list[TodoItem]):
    """Update the entire TODO list with the latest items.

    Args:
        items: A list of TodoItem objects.
    """
    return f"Successfully updated the TODO list with {len(items)} items."