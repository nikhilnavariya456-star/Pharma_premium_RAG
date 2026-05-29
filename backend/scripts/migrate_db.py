import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.db.session import engine
from sqlalchemy import text

def migrate():
    print("Starting database migration...")
    with engine.connect() as conn:
        try:
            # 1. Add session_id column if it doesn't exist
            print("Checking for session_id in chat_messages...")
            conn.execute(text("ALTER TABLE chat_messages ADD COLUMN session_id INT NULL"))
            print("Added session_id column.")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("session_id column already exists.")
            else:
                print(f"Error adding column: {e}")

        try:
            # 2. Add Foreign Key constraint
            print("Adding foreign key constraint...")
            conn.execute(text("ALTER TABLE chat_messages ADD CONSTRAINT fk_session_id FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE"))
            print("Added foreign key constraint.")
        except Exception as e:
            if "Duplicate key name" in str(e) or "already exists" in str(e) or "Duplicate entry" in str(e):
                print("Foreign key constraint already exists.")
            else:
                print(f"Error adding constraint: {e}")
        
        conn.commit()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
