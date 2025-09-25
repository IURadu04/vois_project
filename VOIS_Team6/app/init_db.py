from database import Base, engine
from models import Task, User

# creează toate tabelele definite în models
Base.metadata.create_all(bind=engine)

print("Tabelele au fost create cu succes!")
