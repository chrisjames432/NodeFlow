// ConnectionManager - manages all connections in a workspace
class ConnectionManager {
    constructor(viewport, workspace) {
        this.viewport = viewport;
        this.workspace = workspace; // The container that scales/pans
        this.connections = new Map();
        this.tempConnection = null;
        this.connectStart = null;
        
        // 1. KISS: Create SVG layer INSIDE the workspace
        // This means it automatically zooms and pans with the nodes
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('class', 'connections-svg');
        // Make it huge to cover the scrollable area
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        this.svg.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none; /* Let clicks pass through to workspace */
            z-index: 0; /* Behind nodes (nodes are z-index 5) */
            overflow: visible;
        `;
        
        // Group for actual connection paths that captures clicks
        this.connectionsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.connectionsGroup.style.pointerEvents = 'auto'; // Re-enable clicks for lines
        this.svg.appendChild(this.connectionsGroup);
        
        // Insert SVG as the first child of workspace (behind nodes)
        this.workspace.insertBefore(this.svg, this.workspace.firstChild);
        
        this.attachEvents();
    }
    
    // We no longer need to handle zoom manually!
    setZoom(zoom) { 
        // No-op. The DOM transformation handles it.
    }
    
    attachEvents() {
        // Use document for mousemove to handle dragging outside viewport
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Delete key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (!e.target.matches('input, textarea')) {
                    this.deleteSelected();
                }
            }
        });
        
        // Click on background deselects
        this.workspace.addEventListener('click', (e) => {
             if (e.target === this.workspace || e.target === this.svg) {
                 this.deselectAll();
             }
        });
    }
    
    // Helper: Get coordinate relative to the WORKSPACE (not screen)
    getRelativePoint(clientX, clientY) {
        const rect = this.workspace.getBoundingClientRect();
        const zoom = app.state.zoom || 1; // We need to divide by zoom to get internal units
        
        return {
            x: (clientX - rect.left) / zoom,
            y: (clientY - rect.top) / zoom
        };
    }

    startConnection(e, nodeId, portType) {
        // Prevent drag starting
        e.stopPropagation();
        e.preventDefault();
        
        const port = e.target;
        const portRect = port.getBoundingClientRect();
        const wsRect = this.workspace.getBoundingClientRect();
        const zoom = app.state.zoom || 1;

        // Calculate center of port relative to workspace
        const startX = (portRect.left - wsRect.left + portRect.width / 2) / zoom;
        const startY = (portRect.top - wsRect.top + portRect.height / 2) / zoom;
        
        this.connectStart = {
            nodeId,
            portType,
            x: startX,
            y: startY
        };
        
        this.tempConnection = new TempConnection(this.connectionsGroup);
        this.tempConnection.start(startX, startY, portType === 'output');
    }
    
    handleMouseMove(e) {
        if (!this.tempConnection || !this.connectStart) return;
        
        e.preventDefault();
        
        const point = this.getRelativePoint(e.clientX, e.clientY);
        this.tempConnection.update(point.x, point.y);
    }
    
    handleMouseUp(e) {
        if (!this.tempConnection || !this.connectStart) return;
        
        // Identify target
        const port = document.elementFromPoint(e.clientX, e.clientY);
        
        if (port && port.classList.contains('connection-port')) {
            const toNodeId = port.getAttribute('data-node-id');
            const toPortType = port.getAttribute('data-port-type');
            
            // Validate: output -> input or input -> output
            if (this.connectStart.portType !== toPortType && this.connectStart.nodeId !== toNodeId) {
                // Determine source and target based on types
                const sourceId = this.connectStart.portType === 'output' ? this.connectStart.nodeId : toNodeId;
                const targetId = this.connectStart.portType === 'input' ? this.connectStart.nodeId : toNodeId;
                
                this.createConnection(sourceId, targetId);
            }
        }
        
        this.tempConnection.end();
        this.tempConnection = null;
        this.connectStart = null;
    }
    
    createConnection(fromNodeId, toNodeId) {
        // Check duplicates
        for (const conn of this.connections.values()) {
            if (conn.fromNodeId === fromNodeId && conn.toNodeId === toNodeId) return null;
        }
        
        const connection = new Connection(fromNodeId, toNodeId, {
            onDelete: (conn) => this.handleConnectionDeleted(conn),
            onSelect: (conn, selected) => this.handleConnectionSelected(conn, selected)
        });
        
        connection.createSVG(this.connectionsGroup);
        this.connections.set(connection.id, connection);
        
        this.updateConnection(connection);
        
        if (this.onConnectionCreated) {
            this.onConnectionCreated(connection);
        }
        
        return connection;
    }
    
    updateConnection(connection) {
        const fromNode = document.getElementById(connection.fromNodeId);
        const toNode = document.getElementById(connection.toNodeId);
        
        if (!fromNode || !toNode) return;

        // Get ports
        const fromPort = fromNode.querySelector('.port-output');
        const toPort = toNode.querySelector('.port-input');
        
        if (!fromPort || !toPort) return;

        // Simple relative math: Node Position + Port Offset
        // We know ports are positioned with CSS relative to node
        // Output port is at right edge, Input port at left edge
        
        // Use offsetLeft/Top if available for performance, otherwise fallback to rects
        const fromX = fromNode.offsetLeft + fromNode.offsetWidth; // Right side
        const fromY = fromNode.offsetTop + (fromNode.offsetHeight / 2); // vertical center
        
        const toX = toNode.offsetLeft; // Left side
        const toY = toNode.offsetTop + (toNode.offsetHeight / 2); // vertical center
        
        // Adjust for port size (radius 6px)
        const portOffset = 0; // Ports are centered on the line
        
        connection.updateDirect(fromX + portOffset, fromY, toX - portOffset, toY);
    }
    
    redrawAll() {
        for (const connection of this.connections.values()) {
            this.updateConnection(connection);
        }
    }

    // Utility: get all connections that target a given node id
    getConnectionsTo(nodeId) {
        return Array.from(this.connections.values()).filter(conn => conn.toNodeId === nodeId);
    }

    // Utility: get all connections that originate from a given node id
    getConnectionsFrom(nodeId) {
        return Array.from(this.connections.values()).filter(conn => conn.fromNodeId === nodeId);
    }
    
    // ... [Rest of clean up methods remain same] ...

    handleConnectionDeleted(connection) {
        this.connections.delete(connection.id);
        if (this.onConnectionDeleted) this.onConnectionDeleted(connection);
    }
    
    handleConnectionSelected(connection, selected) {
        if (selected) {
            for (const conn of this.connections.values()) {
                if (conn.id !== connection.id && conn.selected) {
                    conn.selected = false;
                    conn.onHover(false);
                }
            }
        }
    }
    
    deselectAll() {
        for (const conn of this.connections.values()) {
            if (conn.selected) {
                conn.selected = false;
                conn.onHover(false);
            }
        }
    }
    
    deleteSelected() {
        // Collect first to avoid modification during iteration
        const toDelete = Array.from(this.connections.values()).filter(c => c.selected);
        toDelete.forEach(conn => conn.delete());
    }
    
    deleteConnectionsForNode(nodeId) {
        const toDelete = Array.from(this.connections.values()).filter(
            c => c.fromNodeId === nodeId || c.toNodeId === nodeId
        );
        toDelete.forEach(conn => conn.delete());
    }
    
    loadConnections(connectionsData) {
        if (!connectionsData) return;
        this.connections.clear();
        this.connectionsGroup.innerHTML = ''; // Fast clear SVG
        
        connectionsData.forEach(data => {
            const fromNodeId = `node-${data.from_node_id}`;
            const toNodeId = `node-${data.to_node_id}`;
            
            // Only create if nodes exist
            if (document.getElementById(fromNodeId) && document.getElementById(toNodeId)) {
                
                const connection = new Connection(fromNodeId, toNodeId, {
                    dbId: data.id,
                    onDelete: (conn) => this.handleConnectionDeleted(conn),
                    onSelect: (conn, selected) => this.handleConnectionSelected(conn, selected)
                });
                
                connection.createSVG(this.connectionsGroup);
                this.connections.set(connection.id, connection);
                this.updateConnection(connection);
            }
        });
    }
    
    toJSON() {
        return Array.from(this.connections.values()).map(conn => conn.toJSON());
    }
}
