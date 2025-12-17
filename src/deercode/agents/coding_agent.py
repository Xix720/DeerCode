import os
from langchain_openai import ChatOpenAI
from langchain.agents import create_agent
from langchain.tools import BaseTool
from langgraph.checkpoint.memory import InMemorySaver
from ..tools.bash_tool import bash_tool
from ..tools.grep_tool import grep_tool
from ..tools.ls_tool import ls_tool
from ..tools.tree_tool import tree_tool
from ..tools.todo_tools import todo_write_tool
from ..prompts.coding_agent import code_sp
def init_chat_model():
    return ChatOpenAI(
        model="ep-20251118111454-bdl9s",
        base_url="https://ark-cn-beijing.bytedance.net/api/v3",
        api_key="e77dbd11-8641-4b5e-b9d6-9095a1dc0059",
        temperature=0,
        max_tokens=8 * 1024,
        extra_body={
            "thinking": {
                "type": "disabled"  # 如果需要推理，这里可以设置为 "auto"
            }
        }
    )

def create_coding_agent(plugin_tools: list[BaseTool] = [], **kwargs):
    """Create a coding agent.

    Args:
        plugin_tools: Additional tools to add to the agent.
        **kwargs: Additional keyword arguments to pass to the agent.

    Returns:
        The coding agent.
    """
    return create_agent(
        model=init_chat_model(),
        tools=[
            bash_tool,
            grep_tool,
            ls_tool,
            todo_write_tool,
            tree_tool,
            *plugin_tools, # 为将来的扩展性做准备，我们将在第下一章的 MCP 节中做介绍
        ],
        system_prompt=code_sp,
        **kwargs,
    )
    
coding_agent = create_coding_agent()