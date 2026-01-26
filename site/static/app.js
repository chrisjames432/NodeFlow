// Main App Controller - Orchestrates the application
const app = {
    state: {
        currentWorkspace: null,
        zoom: 1,
        draggedNode: null,
        dragOffset: { x: 0, y: 0 },
        panningViewport: false,
        panStartX: 0,
        panStartY: 0,
        panStartScrollX: 0,
        panStartScrollY: 0,
        connectionManager: null
    },

    // DOM Cache
    dom: {
        viewport: null,
        workspace: null,
        addNodeBtn: null,
        backBtn: null,
        newWorkspaceBtn: null,
        nameDisplay: null,

        init() {
            this.viewport = document.getElementById('viewport');
            this.workspace = document.getElementById('workspace');
            this.addNodeBtn = document.getElementById('addNodeBtn');
            this.backBtn = document.getElementById('backBtn');
            this.newWorkspaceBtn = document.getElementById('newWorkspaceBtn');
            this.nameDisplay = document.getElementById('nameDisplay');
        }
    },

    // Initialize app
    async init() {
        this.dom.init();
        this.attachEditorEvents();
        this.attachHomeScreenEvents();
        
        // Show home screen on start
        await UI.showHomeScreen();
    },

    // Attach events for editor screen
    attachEditorEvents() {
        if (this.dom.addNodeBtn) {
            this.dom.addNodeBtn.addEventListener('click', () => this.createNode());
        }
        if (this.dom.backBtn) {
            this.dom.backBtn.addEventListener('click', () => this.goHome());
        }
        if (this.dom.viewport) {
            this.dom.viewport.addEventListener('wheel', (e) => this.handleZoom(e), { passive: false });
            this.dom.viewport.addEventListener('mousedown', (e) => this.startPan(e));
        }
        if (this.dom.nameDisplay) {
            this.dom.nameDisplay.addEventListener('dblclick', () => this.startRename());
        }
    },

    // Attach events for home screen
    attachHomeScreenEvents() {
        if (this.dom.newWorkspaceBtn) {
            this.dom.newWorkspaceBtn.addEventListener('click', () => this.createWorkspace());
        }
    },

    // Workspace operations
    async createWorkspace() {
        const workspace = await Workspace.create('Untitled Workspace');
        this.openWorkspace(workspace.id);
    },

    async openWorkspace(workspaceId) {
        const workspace = await Workspace.loadById(workspaceId);
        const fullData = await workspace.loadFromDb();
        
        this.state.currentWorkspace = workspace;
        this.state.zoom = workspace.zoom;
        
        // Initialize connection manager
        this.state.connectionManager = new ConnectionManager(this.dom.viewport, this.dom.workspace);
        
        // Update UI
        UI.setWorkspaceName(workspace.name);
        UI.updateZoomDisplay(this.state.zoom);
        UI.showEditorScreen();
        
        // Load nodes
        UI.loadNodesIntoWorkspace(this.dom.workspace, workspace, fullData.nodes);
        UI.setWorkspaceZoom(this.state.zoom);
        
        // Attach port events to items
        setTimeout(() => {
            document.querySelectorAll('.item-port').forEach(port => {
                port.addEventListener('mousedown', (e) => {
                    const itemId = port.getAttribute('data-item-id');
                    const portType = port.getAttribute('data-port-type');
                    this.state.connectionManager.startConnection(e, itemId, portType);
                });
            });
        }, 100);
        
        if (fullData.connections) {
            this.state.connectionManager.loadConnections(fullData.connections);
        }
    },

    async goHome() {
        if (this.state.currentWorkspace) {
            await this.state.currentWorkspace.saveToDb();
        }
        this.state.currentWorkspace = null;
        this.state.zoom = 1;
        this.state.connectionManager = null;
        await UI.showHomeScreen();
    },

    async startRename() {
        if (!this.state.currentWorkspace) return;
        UI.startRenameMode(this.state.currentWorkspace.name, (newName) => {
            this.state.currentWorkspace.setName(newName);
        });
    },

    // Node operations
    async createNode() {
        if (!this.state.currentWorkspace) return;
        
        const viewport = this.dom.viewport;
        const centerX = viewport.scrollLeft / this.state.zoom + viewport.clientWidth / (2 * this.state.zoom);
        const centerY = viewport.scrollTop / this.state.zoom + viewport.clientHeight / (2 * this.state.zoom);
        
        const x = centerX - 150;
        const y = centerY - 200;
        
        const id = this.state.currentWorkspace.nodeCounter++;
        const nodeName = `Node ${id}`;
        
        const node = new Node(id, x, y, nodeName, (deletedId) => {
            this.state.currentWorkspace.removeNode(deletedId);
        });
        
        node.render(this.dom.workspace);
        node.getHeader().addEventListener('mousedown', (e) => this.dragNode(e, node));
        this.state.currentWorkspace.addNode(node);
        
        // Node saves itself to DB
        await node.create(this.state.currentWorkspace.id);
    },

    // Drag handling
    dragNode(e, node) {
        const rect = node.element.getBoundingClientRect();
        
        this.state.draggedNode = node.id;
        this.state.dragOffset.x = e.clientX - rect.left;
        this.state.dragOffset.y = e.clientY - rect.top;
        
        // Store bound methods for proper removal
        this.state.dragMouseMove = (e) => this.performDrag(e);
        this.state.dragMouseUp = () => this.stopDrag();
        
        document.addEventListener('mousemove', this.state.dragMouseMove);
        document.addEventListener('mouseup', this.state.dragMouseUp);
    },

    performDrag(e) {
        if (this.state.draggedNode === null) return;
        
        const node = this.state.currentWorkspace.findNode(this.state.draggedNode);
        if (!node) return;
        
        const viewport = this.dom.viewport;
        const x = (e.clientX - viewport.getBoundingClientRect().left + viewport.scrollLeft) / this.state.zoom - this.state.dragOffset.x;
        const y = (e.clientY - viewport.getBoundingClientRect().top + viewport.scrollTop) / this.state.zoom - this.state.dragOffset.y;
        
        node.setPosition(Math.max(0, x), Math.max(0, y));
    },

    async stopDrag() {
        if (this.state.draggedNode === null) return;
        
        const node = this.state.currentWorkspace.findNode(this.state.draggedNode);
        if (node) {
            // Node saves itself
            await node.save();
        }
        
        this.state.draggedNode = null;
        
        // Remove with stored references
        if (this.state.dragMouseMove) {
            document.removeEventListener('mousemove', this.state.dragMouseMove);
        }
        if (this.state.dragMouseUp) {
            document.removeEventListener('mouseup', this.state.dragMouseUp);
        }
    },

    // Zoom handling
    handleZoom(e) {
        e.preventDefault();
        
        const oldZoom = this.state.zoom;
        const step = 0.1;
        this.state.zoom = e.deltaY < 0
            ? Math.min(this.state.zoom + step, 3)
            : Math.max(this.state.zoom - step, 0.5);
        
        if (this.state.currentWorkspace) {
            this.state.currentWorkspace.zoom = this.state.zoom;
        }
        
        // Adjust scroll position to maintain zoom center
        const viewport = this.dom.viewport;
        viewport.scrollLeft *= (this.state.zoom / oldZoom);
        viewport.scrollTop *= (this.state.zoom / oldZoom);
        
        UI.updateZoomDisplay(this.state.zoom);
        UI.setWorkspaceZoom(this.state.zoom);
    },

    // Pan handling
    startPan(e) {
        if (e.button !== 0) return; // Left click only
        if (e.target.closest('.node')) return; // Don't pan if clicking node
        
        e.preventDefault();
        
        const viewport = this.dom.viewport;
        this.state.panningViewport = true;
        this.state.panStartX = e.clientX;
        this.state.panStartY = e.clientY;
        this.state.panStartScrollX = viewport.scrollLeft;
        this.state.panStartScrollY = viewport.scrollTop;
        
        document.addEventListener('mousemove', (e) => this.performPan(e));
        document.addEventListener('mouseup', () => this.stopPan());
    },

    performPan(e) {
        if (!this.state.panningViewport) return;
        
        const viewport = this.dom.viewport;
        const deltaX = e.clientX - this.state.panStartX;
        const deltaY = e.clientY - this.state.panStartY;
        
        viewport.scrollLeft = this.state.panStartScrollX - deltaX;
        viewport.scrollTop = this.state.panStartScrollY - deltaY;
    },

    stopPan() {
        this.state.panningViewport = false;
        document.removeEventListener('mousemove', (e) => this.performPan(e));
        document.removeEventListener('mouseup', () => this.stopPan());
    }
};

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', () => app.init());
