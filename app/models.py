from sqlalchemy import Table, Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

# Tabel intermediar pentru many-to-many user-team
user_team = Table(
    "user_team",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("user.id")),
    Column("team_id", Integer, ForeignKey("team.id"))
)

team_members = Table(
    'team_members',
    Base.metadata,
    Column('team_id', ForeignKey('team.id'), primary_key=True),
    Column('user_id', ForeignKey('user.id'), primary_key=True)
)

class Team(Base):
    __tablename__ = "team"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    users = relationship("User", secondary=user_team, back_populates="teams")
    tasks = relationship("Task", back_populates="team")


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    name = Column(String, unique=True, index=True)
    team_id = Column(Integer, ForeignKey("team.id"), nullable=True)

    tasks = relationship("Task", back_populates="user")
    teams = relationship("Team", secondary=user_team, back_populates="users")


class Task(Base):
    __tablename__ = "task"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    assigned_to = Column(Integer, ForeignKey("user.id"), nullable=True)
    progress = Column(Integer, default=0)
    status = Column(String, default="pending")
    deadline = Column(DateTime, nullable=True)
    team_id = Column(Integer, ForeignKey("team.id"), nullable=True)

    user = relationship("User", back_populates="tasks")
    team = relationship("Team", back_populates="tasks")