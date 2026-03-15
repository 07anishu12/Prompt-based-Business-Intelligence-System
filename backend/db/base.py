from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import model modules so SQLAlchemy metadata is populated whenever Base is used.
from backend.models.connection import DataConnection  # noqa: E402,F401
from backend.models.dashboard import Dashboard  # noqa: E402,F401
from backend.models.llm_query_log import LLMQueryLog  # noqa: E402,F401
from backend.models.query_log import QueryLog  # noqa: E402,F401
from backend.models.user import User  # noqa: E402,F401
from backend.models.widget import Widget  # noqa: E402,F401
