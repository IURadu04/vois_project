from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from app.database import SessionLocal, engine, Base
from app import models, schemas, auth, users
from app.auth import router as auth_router
from app.users import router as users_router


# Creează tabelele în baza de date
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Task Manager API")

# CORS
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router (autentificare + JWT)
app.include_router(auth_router)
app.include_router(users_router)


# Dependency pentru a obține sesiunea DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -------------------- USERS --------------------
@app.post("/users/", response_model=schemas.UserRead)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = models.User(name=user.name)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/users/", response_model=List[schemas.UserRead])
def read_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()


# -------------------- TASKS --------------------
@app.post("/tasks/", response_model=schemas.TaskRead)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    # verificăm dacă assigned_to există
    user = db.query(models.User).filter(models.User.id == task.assigned_to).first()
    if not user:
        raise HTTPException(status_code=404, detail="Assigned user not found")

    db_task = models.Task(
        title=task.title,
        description=task.description,
        assigned_to=task.assigned_to,
        team_id=task.team_id,
        progress=task.progress,
        status=task.status,
        deadline=task.deadline
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@app.get("/tasks/", response_model=List[schemas.TaskRead])
def read_tasks(db: Session = Depends(get_db)):
    return db.query(models.Task).all()

# -------------------
# UPDATE TASK
# -------------------
@app.put("/tasks/{task_id}", response_model=schemas.TaskRead)
def update_task(task_id: int, task: schemas.TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    for field, value in task.dict(exclude_unset=True).items():
        setattr(db_task, field, value)
    
    db.commit()
    db.refresh(db_task)
    return db_task


# -------------------
# DELETE TASK
# -------------------
@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(db_task)
    db.commit()
    return {"message": f"Task {task_id} deleted successfully"}

# -------------------
# UPDATE USER
# -------------------
@app.put("/users/{user_id}", response_model=schemas.UserRead)
def update_user(user_id: int, user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.name = user.name

    db.commit()
    db.refresh(db_user)
    return db_user


# -------------------
# DELETE USER
# -------------------
@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(db_user)
    db.commit()
    return {"message": f"User {user_id} deleted successfully"}

# -------------------
# GET all Tasks from a User
# -------------------
@app.get("/users/{user_id}/tasks", response_model=List[schemas.TaskRead])
def get_user_tasks(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.tasks

# -------------------
# Teams
# -------------------
@app.post("/teams/", response_model=schemas.TeamRead)
def create_team(team: schemas.TeamCreate, db: Session = Depends(get_db)):
    db_team = models.Team(name=team.name)
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    return db_team

@app.get("/teams/", response_model=list[schemas.TeamRead])
def read_teams(db: Session = Depends(get_db)):
    return db.query(models.Team).all()

@app.delete("/teams/{team_id}")
def delete_team(team_id: int, db: Session = Depends(get_db)):
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    db.delete(team)
    db.commit()
    return {"detail": "Team deleted"}

@app.get("/teams/{team_id}/members", response_model=list[schemas.UserRead])
def get_team_members(team_id: int, db: Session = Depends(get_db)):
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team.users

@app.post("/teams/{team_id}/members/{user_id}")
def add_member_to_team(team_id: int, user_id: int, db: Session = Depends(get_db)):
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not team or not user:
        raise HTTPException(status_code=404, detail="Team or user not found")
    
    team.users.append(user)
    db.commit()
    db.refresh(user)
    return {"message": f"User {user.name} added to team {team.name}"}


@app.delete("/teams/{team_id}/members/{user_id}")
def remove_member_from_team(team_id: int, user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id, models.User.team_id == team_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in this team")
    
    user.team_id = None
    db.commit()
    return {"message": f"User {user.name} removed from team"}


@app.get("/teams/{team_id}/tasks", response_model=list[schemas.TaskRead])
def get_team_tasks(team_id: int, db: Session = Depends(get_db)):
    tasks = db.query(models.Task).filter(models.Task.team_id == team_id).all()
    return tasks



