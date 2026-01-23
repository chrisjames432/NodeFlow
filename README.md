# NodeFlow

Visual node editor for image generation workflows. Flask backend, vanilla JS frontend, SQLite database. Drag nodes, zoom workspace, save everything.

---

## Important Files

```
image-gen-test/
├── app.db                    # SQLite database
├── server/
│   ├── app.py               # Flask initialization and config
│   ├── models.py            # SQLAlchemy models
│   └── routes.py            # REST API endpoints
└── site/
    ├── static/
    │   ├── node.js          # Node class - owns persistence
    │   ├── workspace.js     # Workspace class
    │   ├── api.js           # Centralized fetch calls
    │   ├── ui.js            # DOM manipulation service
    │   ├── app.js           # Main controller
    │   └── style.css        # All styling
    └── templates/
        └── index.html       # Two-screen UI (home + editor)
```

---

## Key Functions

**Node Class (node.js)**
- `Node.fromData(data, onDelete)` - Factory method to create node from DB data
- `node.save()` - Persists position and name to database
- `node.create(workspaceId)` - Creates node in database, sets dbId
- `node.delete()` - Removes from DB and DOM

**Workspace Class (workspace.js)**
- `Workspace.create(name)` - Creates new workspace in DB
- `Workspace.loadById(id)` - Fetches workspace from DB
- `workspace.saveToDb()` - Saves zoom level
- `workspace.loadFromDb()` - Gets full workspace with nodes

**App Controller (app.js)**
- `app.init()` - Entry point, caches DOM, attaches events
- `app.openWorkspace(id)` - Loads workspace into editor
- `app.createNode()` - Spawns node at viewport center
- `app.stopDrag()` - Saves node position on drop

---

## Run

```bash
cd server
python app.py
```

---

## WARNING

NO EMOJIS IN THIS CODEBASE.

Violators will be terminated. This is not a suggestion.

---

Thanks for stopping by. The universe appreciates your curiosity.
