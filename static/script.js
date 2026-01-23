// State
const state = {
    currentWorkspace: null,
    allWorkspaces: [],
    zoom: 1,
    draggedNode: null,
    dragOffset: { x: 0, y: 0 },
    panningViewport: false,
    panStartX: 0,
    panStartY: 0,
    panStartScrollX: 0,
    panStartScrollY: 0
};

// DOM Selectors
const getViewport = () => document.getElementById('viewport');
const getWorkspace = () => document.getElementById('workspace');
const getAddBtn = () => document.getElementById('addNodeBtn');
const getZoomDisplay = () => document.getElementById('zoomLevel');
const getNameDisplay = () => document.getElementById('nameDisplay');
const getWorkspaceSelect = () => document.getElementById('workspaceSelect');
const getNewWorkspaceBtn = () => document.getElementById('newWorkspaceBtn');
const getWorkspaceName = () => document.getElementById('workspaceName');

// Create and add node to workspace
const addNodeToWorkspace = (x, y) => {
    if (!state.currentWorkspace) return;
    
    const id = state.currentWorkspace.nodeCounter++;
    
    const node = new Node(id, x, y, (deletedId) => {
        state.currentWorkspace.removeNode(deletedId);
    });
    
    node.render(getWorkspace());
    node.getHeader().addEventListener('mousedown', (e) => startDrag(e, node));
    
    state.currentWorkspace.addNode(node);
    
    // Save to database
    saveNodeToDb(node);
    
    return node;
};

// Find node by id
const findNodeById = (id) => {
    if (!state.currentWorkspace) return null;
    return state.currentWorkspace.findNode(id);
};

// Drag handling
const startDrag = (e, node) => {
    const rect = node.element.getBoundingClientRect();
    
    state.draggedNode = node.id;
    state.dragOffset.x = e.clientX - rect.left;
    state.dragOffset.y = e.clientY - rect.top;
    
    document.addEventListener('mousemove', performDrag);
    document.addEventListener('mouseup', stopDrag);
};

const performDrag = (e) => {
    if (state.draggedNode === null) return;
    
    const node = findNodeById(state.draggedNode);
    if (!node) return;
    
    const viewport = getViewport();
    
    const x = (e.clientX - viewport.getBoundingClientRect().left + viewport.scrollLeft) / state.zoom - state.dragOffset.x;
    const y = (e.clientY - viewport.getBoundingClientRect().top + viewport.scrollTop) / state.zoom - state.dragOffset.y;
    
    node.setPosition(Math.max(0, x), Math.max(0, y));
};

const stopDrag = () => {
    state.draggedNode = null;
    const draggedNode = findNodeById(state.draggedNode);
    if (draggedNode && draggedNode.dbId) {
        updateNodeInDb(draggedNode);
    }
    document.removeEventListener('mousemove', performDrag);
    document.removeEventListener('mouseup', stopDrag);
};

// Zoom functionality
const updateZoom = (direction) => {
    const viewport = getViewport();
    const workspace = getWorkspace();
    
    const oldZoom = state.zoom;
    const step = 0.1;
    state.zoom = direction === 'in' 
        ? Math.min(state.zoom + step, 3)
        : Math.max(state.zoom - step, 0.5);
    
    if (state.currentWorkspace) {
        state.currentWorkspace.zoom = state.zoom;
    }
    
    workspace.style.transform = `scale(${state.zoom})`;
    workspace.style.transformOrigin = '0 0';
    
    // Adjust scroll to maintain zoom center
    const scrollX = viewport.scrollLeft;
    const scrollY = viewport.scrollTop;
    
    viewport.scrollLeft = scrollX * (state.zoom / oldZoom);
    viewport.scrollTop = scrollY * (state.zoom / oldZoom);
    
    getZoomDisplay().textContent = `Zoom: ${Math.round(state.zoom * 100)}%`;
};

// Mouse wheel zoom
const handleMouseWheel = (e) => {
    e.preventDefault();
    updateZoom(e.deltaY < 0 ? 'in' : 'out');
};

// Viewport panning (left click + drag on workspace)
const startPan = (e) => {
    if (e.button !== 0) return; // Left mouse button only
    
    // Don't pan if clicking on a node
    if (e.target.closest('.node')) return;
    
    e.preventDefault();
    
    const viewport = getViewport();
    state.panningViewport = true;
    state.panStartX = e.clientX;
    state.panStartY = e.clientY;
    state.panStartScrollX = viewport.scrollLeft;
    state.panStartScrollY = viewport.scrollTop;
    
    document.addEventListener('mousemove', performPan);
    document.addEventListener('mouseup', stopPan);
};

const performPan = (e) => {
    if (!state.panningViewport) return;
    
    const viewport = getViewport();
    const deltaX = e.clientX - state.panStartX;
    const deltaY = e.clientY - state.panStartY;
    
    viewport.scrollLeft = state.panStartScrollX - deltaX;
    viewport.scrollTop = state.panStartScrollY - deltaY;
};

const stopPan = () => {
    state.panningViewport = false;
    document.removeEventListener('mousemove', performPan);
    document.removeEventListener('mouseup', stopPan);
};

// Initialize
const init = () => {
    getAddBtn().addEventListener('click', () => {
        const viewport = getViewport();
        const centerX = viewport.scrollLeft / state.zoom + viewport.clientWidth / (2 * state.zoom);
        const centerY = viewport.scrollTop / state.zoom + viewport.clientHeight / (2 * state.zoom);
        
        addNodeToWorkspace(centerX - 150, centerY - 200);
    });
    
    const viewport = getViewport();
    viewport.addEventListener('wheel', handleMouseWheel, { passive: false });
    viewport.addEventListener('mousedown', startPan);
    
    getNewWorkspaceBtn().addEventListener('click', createNewWorkspace);
    getWorkspaceSelect().addEventListener('change', switchWorkspace);
    getNameDisplay().addEventListener('dblclick', startRename);
    
    // Load all workspaces and create default
    loadAllWorkspaces();
};

// API calls
const createNewWorkspace = async () => {
    const workspace = await Workspace.create('Untitled Workspace');
    state.currentWorkspace = workspace;
    
    // Update UI
    getNameDisplay().textContent = workspace.name;
    addWorkspaceToSelect(workspace);
    getWorkspaceSelect().value = workspace.id;
    
    // Clear canvas
    getWorkspace().innerHTML = '';
    
    // Add initial nodes
    addNodeToWorkspace(500, 500);
    addNodeToWorkspace(900, 600);
};

const switchWorkspace = async () => {
    const workspaceId = parseInt(getWorkspaceSelect().value);
    if (!workspaceId) return;
    
    // Save current workspace state
    if (state.currentWorkspace) {
        await state.currentWorkspace.saveToDb();
    }
    
    // Load new workspace
    const workspace = await Workspace.loadById(workspaceId);
    const fullData = await workspace.loadFromDb();
    
    state.currentWorkspace = workspace;
    state.zoom = workspace.zoom;
    
    // Update UI
    getNameDisplay().textContent = workspace.name;
    
    // Clear canvas
    const workspaceEl = getWorkspace();
    workspaceEl.innerHTML = '';
    workspace.clearNodes();
    
    // Load nodes from DB
    fullData.nodes.forEach(nodeData => {
        const node = addNodeToWorkspace(nodeData.x, nodeData.y);
        node.dbId = nodeData.id;
    });
    
    // Update zoom display
    getZoomDisplay().textContent = `Zoom: ${Math.round(state.zoom * 100)}%`;
    const workspaceEl2 = getWorkspace();
    workspaceEl2.style.transform = `scale(${state.zoom})`;
};

const startRename = () => {
    if (!state.currentWorkspace) return;
    
    const nameEl = getNameDisplay();
    const currentName = nameEl.textContent;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'rename-btn rename-save';
    saveBtn.textContent = '✓';
    saveBtn.addEventListener('click', () => finishRename(input.value));
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'rename-btn rename-cancel';
    cancelBtn.textContent = '✕';
    cancelBtn.addEventListener('click', cancelRename);
    
    const renameContainer = document.createElement('div');
    renameContainer.className = 'rename-input';
    renameContainer.appendChild(input);
    renameContainer.appendChild(saveBtn);
    renameContainer.appendChild(cancelBtn);
    
    const workspaceName = getWorkspaceName();
    workspaceName.innerHTML = '';
    workspaceName.appendChild(renameContainer);
    
    input.focus();
    input.select();
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finishRename(input.value);
        if (e.key === 'Escape') cancelRename();
    });
};

const finishRename = async (newName) => {
    if (!newName.trim()) return;
    
    await state.currentWorkspace.setName(newName.trim());
    
    getNameDisplay().textContent = newName.trim();
    const workspaceName = getWorkspaceName();
    workspaceName.innerHTML = '';
    workspaceName.appendChild(getNameDisplay());
    
    // Update select dropdown
    const option = getWorkspaceSelect().querySelector(`option[value="${state.currentWorkspace.id}"]`);
    if (option) option.textContent = newName.trim();
};

const cancelRename = () => {
    const workspaceName = getWorkspaceName();
    workspaceName.innerHTML = '';
    const newDisplay = document.createElement('span');
    newDisplay.id = 'nameDisplay';
    newDisplay.textContent = state.currentWorkspace.name;
    workspaceName.appendChild(newDisplay);
    getNameDisplay().addEventListener('dblclick', startRename);
};

const loadAllWorkspaces = async () => {
    const workspaces = await Workspace.loadAll();
    state.allWorkspaces = workspaces;
    
    // Populate select
    const select = getWorkspaceSelect();
    workspaces.forEach(ws => addWorkspaceToSelect(ws));
    
    // Load first workspace or create new
    if (workspaces.length > 0) {
        state.currentWorkspace = workspaces[0];
        const fullData = await state.currentWorkspace.loadFromDb();
        state.zoom = state.currentWorkspace.zoom;
        
        getNameDisplay().textContent = state.currentWorkspace.name;
        select.value = state.currentWorkspace.id;
        
        // Load nodes
        fullData.nodes.forEach(nodeData => {
            const node = addNodeToWorkspace(nodeData.x, nodeData.y);
            node.dbId = nodeData.id;
        });
    } else {
        createNewWorkspace();
    }
};

const addWorkspaceToSelect = (workspace) => {
    const select = getWorkspaceSelect();
    const option = document.createElement('option');
    option.value = workspace.id;
    option.textContent = workspace.name;
    select.appendChild(option);
};

const saveNodeToDb = async (node) => {
    if (!state.currentWorkspace) return;
    
    const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            workspace_id: state.currentWorkspace.id,
            type: 'default',
            x: node.x,
            y: node.y,
            data: {}
        })
    });
    const dbNode = await res.json();
    node.dbId = dbNode.id;
};

const updateNodeInDb = async (node) => {
    if (!state.currentWorkspace || !node.dbId) return;
    
    await fetch(`/api/nodes/${node.dbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            x: node.x,
            y: node.y
        })
    });
};

document.addEventListener('DOMContentLoaded', init);
