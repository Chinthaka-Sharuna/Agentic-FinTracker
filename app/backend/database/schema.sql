-- salary table
CREATE TABLE IF NOT EXISTS salary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
 
-- expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date TEXT  NOT NULL,  -- "YYYY-MM-DD"
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);