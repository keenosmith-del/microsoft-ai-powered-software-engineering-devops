import importlib.util
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ACTION_AGENT_PATH = PROJECT_ROOT / "agents" / "engineering_action_agent.py"


spec = importlib.util.spec_from_file_location(
    "project_engineering_action_agent",
    ACTION_AGENT_PATH,
)

if spec is None or spec.loader is None:
    raise ImportError(
        f"Could not load Engineering Action Agent from {ACTION_AGENT_PATH}"
    )


module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


EngineeringActionAgent = module.EngineeringActionAgent
