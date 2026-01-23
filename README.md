# Image Gen Test - Node Workspace Builder

A simplified visual node editor (inspired by n8n/Make) built with Flask, SQLAlchemy, and vanilla JavaScript. Create, organize, and save workspaces with draggable nodes. Designed for personal use with image generation and prompt workflows in mind.

## Architecture Overview

### Frontend Stack
- **Vanilla JavaScript** - Functional programming for orchestration
- **Node Class** - Encapsulates individual node state and behavior
- **Workspace Class** - Manages workspace state, nodes, and DB sync
- **Pure CSS** - Minimal styling, no frameworks

### Backend Stack
- **Flask** - Python web framework
- **SQLAlchemy** - ORM for database models
- **SQLite** - Lightweight local database
- **File Storage** - Static folder for image uploads

## Project Structure

```
image-gen-test/
├── app.py                 # Flask app initialization, config, routes
├── models.py             # SQLAlchemy database models
├── routes.py             # REST API endpoints
├── instance/
│   └── app.db           # SQLite database (auto-created)
├── static/
│   ├── node.js          # Node class definition
│   ├── workspace.js     # Workspace class definition
│   ├── script.js        # Main app logic (functional)
│   ├── style.css        # UI styling
│   └── uploads/         # Image storage folder (auto-created)
└── templates/
    └── index.html       # Main HTML page
```

## Database Models

### Workspace
Represents a single workspace containing nodes and connections.

```python
Workspace(
    id: int (primary key),
    name: str,
    zoom: float (default 1.0),
    pan_x: float (default 0),
    pan_y: float (default 0),
    created_at: datetime,
    updated_at: datetime,
    nodes: [Node],           # One-to-many relationship
    connections: [Connection] # One-to-many relationship
)
```

### Node
A single node/card in the workspace. Stores position, type, and custom data.

```python
Node(
    id: int (primary key),
    workspace_id: int (foreign key),
    node_type: str (default 'default'),
    position_x: float,
    position_y: float,
    data: str (JSON),        # Stores custom node data
    created_at: datetime,
    updated_at: datetime,
    workspace: Workspace     # Many-to-one relationship
)
```

**Example Node Data:**
```json
{
    "prompt": "a cat wearing sunglasses",
    "imageUrl": "/static/uploads/image.png",
    "modelType": "image-gen"
}
```

### Connection
Represents a connection between two nodes (future feature).

```python
Connection(
    id: int (primary key),
    workspace_id: int (foreign key),
    from_node_id: int (foreign key),
    to_node_id: int (foreign key),
    created_at: datetime,
    from_node: Node,  # Reference to source node
    to_node: Node     # Reference to target node
)
```

## Frontend Classes

### Node Class
Encapsulates a single node with DOM management and position tracking.

**Constructor:**
```javascript
new Node(id, x, y, onDelete)
```

**Methods:**
- `createDOM()` - Generates HTML structure
- `setPosition(x, y)` - Updates position and DOM
- `getPosition()` - Returns {x, y}
- `getHeader()` - Returns header element for drag events
- `delete()` - Removes from DOM and triggers callback
- `render(parent)` - Appends to workspace

**Properties:**
- `id` - Unique identifier
- `x`, `y` - Position in workspace
- `element` - DOM node reference
- `dbId` - Database ID (assigned after save)

### Workspace Class
Manages workspace state, nodes, and database synchronization.

**Constructor:**
```javascript
new Workspace(id, name)
```

**Methods:**
- `setName(name)` - Rename and save to DB
- `addNode(node)` - Add node to collection
- `removeNode(nodeId)` - Remove from collection
- `findNode(nodeId)` - Find node by ID
- `clearNodes()` - Remove all nodes from DOM
- `saveToDb()` - Persist workspace metadata
- `loadFromDb()` - Fetch workspace and all nodes
- `static create(name)` - Create new workspace in DB
- `static loadAll()` - Get all workspaces
- `static loadById(id)` - Load specific workspace

**Properties:**
- `id` - Database ID
- `name` - Workspace name
- `nodes` - Array of Node objects
- `nodeCounter` - Auto-increment for node IDs
- `zoom` - Current zoom level

## REST API Endpoints

### Workspaces

**Create Workspace**
```
POST /api/workspaces
Body: { "name": "My Workspace" }
Returns: Workspace object with ID
```

**Get Workspace**
```
GET /api/workspaces/<id>
Returns: Workspace with all nodes and connections
```

**Update Workspace**
```
PUT /api/workspaces/<id>
Body: { "name": "...", "zoom": 1.5, "pan_x": 100, "pan_y": 50 }
Returns: Updated workspace
```

**List All Workspaces**
```
GET /api/workspaces
Returns: Array of all workspaces
```

**Delete Workspace**
```
DELETE /api/workspaces/<id>
Returns: 204 No Content
```

### Nodes

**Create Node**
```
POST /api/nodes
Body: {
    "workspace_id": 1,
    "type": "default",
    "x": 500,
    "y": 500,
    "data": { "prompt": "...", "imageUrl": "..." }
}
Returns: Node object with database ID
```

**Update Node**
```
PUT /api/nodes/<id>
Body: { "x": 600, "y": 600, "data": {...} }
Returns: Updated node
```

**Delete Node**
```
DELETE /api/nodes/<id>
Returns: 204 No Content
```

### Connections

**Create Connection**
```
POST /api/connections
Body: {
    "workspace_id": 1,
    "from_node_id": 2,
    "to_node_id": 3
}
Returns: Connection object
```

**Delete Connection**
```
DELETE /api/connections/<id>
Returns: 204 No Content
```

### Files

**Upload Image**
```
POST /api/upload
Body: FormData with file
Returns: { "filename": "image.png", "url": "/static/uploads/image.png" }
```

Images are saved to `static/uploads/` and can be referenced in node data.

## Key Features

### Workspace Management
- **Create** new workspaces (auto-named)
- **Switch** between workspaces via dropdown
- **Rename** by double-clicking workspace name
- **Edit mode** with ✓ (save) and ✕ (cancel) buttons
- All workspaces persist to SQLite

### Node Operations
- **Create** nodes (centered in viewport)
- **Drag** nodes with left-click on header
- **Delete** nodes with × button
- **Position persists** when dragged
- Node data stored as JSON for flexibility

### Workspace Navigation
- **Left-click drag** on empty area to pan workspace
- **Mouse wheel** to zoom in/out (0.5x to 3x)
- **Smooth zoom** with scroll adjustment
- **Grid background** for visual reference

### Data Persistence
- All workspaces saved to database
- Node positions persist on reload
- Workspace zoom level remembered
- Full workspace export via API (GET /api/workspaces/<id>)

## Code Flow

### Loading a Workspace
1. `loadAllWorkspaces()` - Fetch all workspaces from DB
2. Load first workspace: `Workspace.loadById(id)`
3. `workspace.loadFromDb()` - Get full workspace data
4. Loop through nodes: `addNodeToWorkspace(x, y)`
5. Each node created with `new Node()` and `node.render()`

### Creating a Node
1. Click "Create Node" button
2. Calculate center position in viewport
3. `addNodeToWorkspace(x, y)` creates Node instance
4. `saveNodeToDb(node)` sends to API
5. API returns with `dbId`, stored on node
6. Node appears on canvas

### Dragging a Node
1. `mousedown` on node header → `startDrag()`
2. `mousemove` → `performDrag()` updates position in real-time
3. `mouseup` → `stopDrag()` calls `updateNodeInDb()` to persist

### Renaming Workspace
1. Double-click workspace name → `startRename()`
2. Input field with ✓/✕ buttons appears
3. Click ✓ → `finishRename()` → `workspace.setName()` → DB update
4. Click ✕ → `cancelRename()` reverts to display mode

## Functional Programming Approach

**Main app logic in `script.js` uses pure functions:**
- `addNodeToWorkspace(x, y)` - Create and add node
- `startDrag(e, node)` - Begin dragging
- `performDrag(e)` - Update position during drag
- `stopDrag()` - Finish dragging, save to DB
- `updateZoom(direction)` - Adjust zoom level
- `startPan(e)` - Begin workspace pan
- `loadAllWorkspaces()` - Fetch and display workspaces
- `switchWorkspace()` - Load different workspace
- `startRename()` - Enter edit mode for name
- `finishRename(newName)` - Save new name
- `cancelRename()` - Exit edit mode

**State management via centralized object:**
```javascript
const state = {
    currentWorkspace: Workspace,  // Active workspace
    allWorkspaces: [Workspace],   // All available workspaces
    zoom: 1,
    draggedNode: null,
    panningViewport: false,
    // ... other tracking properties
}
```

## Running the Project

### Prerequisites
```bash
pip install flask flask-sqlalchemy werkzeug
```

### Start Server
```bash
python app.py
```

Server runs on `http://localhost:5000`

### First Load
- Database auto-creates on startup
- Create first workspace automatically
- Flask auto-reloads on file changes (debug mode)

## Data Flow Diagram

```
User Action (Click, Drag)
    ↓
Event Handler (startDrag, startRename, etc.)
    ↓
Update Node/Workspace Class
    ↓
Update DOM (node.setPosition, etc.)
    ↓
API Call (POST /api/nodes, PUT /api/workspaces, etc.)
    ↓
SQLAlchemy Model (Flask-SQLAlchemy)
    ↓
SQLite Database (instance/app.db)
```

## Future Extensibility

### Adding Node Types
1. Extend `Node` class with type-specific behavior
2. Add `node_type` logic in `createDOM()`
3. Store type-specific data in node `data` JSON

### Adding Connections
1. Visual connection rendering (SVG lines between nodes)
2. Use existing `Connection` model in DB
3. API endpoints already support connections

### Custom Node Data
1. `node.data` is stored as JSON - supports any structure
2. Example: `{"prompt": "...", "imageUrl": "...", "settings": {...}}`
3. Frontend can parse and display custom UI per node type

### Image Generation Integration
1. Add endpoint to send node data to external API
2. Store result URL in node `data`
3. Display image in node UI

## File Sizes & Structure Notes

- **SQLite Database**: Grows with workspace/node count (minimal)
- **Uploads Folder**: Grows with image storage
- **JavaScript Files**: All vanilla, no dependencies
- **CSS**: Pure CSS, no preprocessing needed

---

**Project Status**: Personal MVP - Foundation ready for feature expansion
