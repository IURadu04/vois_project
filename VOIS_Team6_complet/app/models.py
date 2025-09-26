from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime


class Team(Base):
    __tablename__ = "team"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    users = relationship("User", back_populates="team")
    tasks = relationship("Task", back_populates="team")


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    aprobat = Column(Boolean, default=False)


    team_id = Column(Integer, ForeignKey("team.id"), nullable=True)

    tasks = relationship("Task", back_populates="user")
    team = relationship("Team", back_populates="users")


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
