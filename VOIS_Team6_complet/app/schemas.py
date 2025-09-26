from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


# USERS
class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password: str
    is_admin: Optional[bool] = False


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    is_admin: bool
    team_id: Optional[int] = None
    aprobat: bool

    class Config:
        orm_mode = True


# TASKS
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[int] = None
    team_id: Optional[int] = None
    progress: int = Field(0, ge=0, le=100)
    status: Literal["pending", "in_progress", "done"] = "pending"
    deadline: Optional[datetime] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[int] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    status: Optional[Literal["pending", "in_progress", "done"]] = None
    deadline: Optional[datetime] = None
    team_id: Optional[int] = None


class TaskRead(TaskBase):
    id: int
    progress: int
    status: str

    class Config:
        orm_mode = True


# TEAMS
class TeamBase(BaseModel):
    name: str


class TeamCreate(TeamBase):
    pass


class TeamRead(TeamBase):
    id: int

    class Config:
        orm_mode = True
