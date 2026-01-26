class ConnectionManager {
    constructor(viewport, workspace) {
        this.viewport = viewport;
        this.workspace = workspace;
        this.connections = []; // Array of {fromItemId, toItemId, fromPortType, toPortType}
        this.connecting = false;
        this.connectStart = null; // {itemId, type, portEl, x, y}
        
        // Create SVG layer for drawing connections
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('class', 'connections-svg');
        this.svg.style.position = 'absolute';
        this.svg.style.top = '0';
        this.svg.style.left = '0';
        this.svg.style.width = '100%';
        this.svg.style.height = '100%';
        this.svg.style.pointerEvents = 'none';
        this.svg.style.zIndex = '1';
        
        this.viewport.insertBefore(this.svg, this.workspace);
        
        this.attachViewportEvents();
    }
    
    attachViewportEvents() {
        this.viewport.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.viewport.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.viewport.addEventListener('scroll', () => this.redraw());
    }
    
    startConnection(e, itemId, portType) {
        e.stopPropagation();
        
        const port = e.target;
        const rect = port.getBoundingClientRect();
        const viewportRect = this.viewport.getBoundingClientRect();
        
        this.connecting = true;
        this.connectStart = {
            itemId,
            portType, // 'output' or 'input'
            portEl: port,
            x: rect.left - viewportRect.left + this.viewport.scrollLeft,
            y: rect.top - viewportRect.top + this.viewport.scrollTop
        };
        
        console.log('Starting connection from item', itemId, 'port', portType);
    }
    
    handleMouseMove(e) {
        if (!this.connecting || !this.connectStart) return;
        
        const viewportRect = this.viewport.getBoundingClientRect();
        const currentX = e.clientX - viewportRect.left + this.viewport.scrollLeft;
        const currentY = e.clientY - viewportRect.top + this.viewport.scrollTop;
        
        this.drawTemporaryLine(this.connectStart.x, this.connectStart.y, currentX, currentY);
    }
    
    handleMouseUp(e) {
        if (!this.connecting || !this.connectStart) return;
        
        const port = document.elementFromPoint(e.clientX, e.clientY);
        
        if (port && port.classList.contains('item-port')) {
            const toItemId = port.getAttribute('data-item-id');
            const toPortType = port.getAttribute('data-port-type');
            
            // Rules: output from one item connects to input of another
            if (this.connectStart.portType === 'output' && toPortType === 'input') {
                this.createConnection(this.connectStart.itemId, toItemId, this.connectStart.portType, toPortType);
            } else if (this.connectStart.portType === 'input' && toPortType === 'output') {
                // Also allow reverse direction for flexibility
                this.createConnection(toItemId, this.connectStart.itemId, toPortType, this.connectStart.portType);
            }
        }
        
        this.connecting = false;
        this.connectStart = null;
        this.redraw();
    }
    
    createConnection(fromItemId, toItemId, fromPortType, toPortType) {
        if (fromItemId === toItemId) return; // No self-connections
        
        // Check if connection already exists
        const exists = this.connections.some(
            c => c.fromItemId === fromItemId && c.toItemId === toItemId
        );
        
        if (exists) {
            console.log('Connection already exists');
            return;
        }
        
        const connection = { fromItemId, toItemId, fromPortType, toPortType };
        this.connections.push(connection);
        
        console.log('Created connection:', connection);
        this.redraw();
        
        // Notify that connection was created (for saving to DB)
        if (this.onConnectionCreated) {
            this.onConnectionCreated(connection);
        }
    }
    
    drawTemporaryLine(x1, y1, x2, y2) {
        // Clear existing temp line
        const tempLine = this.svg.querySelector('.temp-line');
        if (tempLine) tempLine.remove();
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', '#667eea');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '5,5');
        line.setAttribute('class', 'temp-line');
        
        this.svg.appendChild(line);
    }
    
    redraw() {
        // Clear all lines
        this.svg.querySelectorAll('line:not(.temp-line)').forEach(line => line.remove());
        
        // Redraw all connections
        this.connections.forEach(conn => {
            const fromEl = document.getElementById(conn.fromItemId);
            const toEl = document.getElementById(conn.toItemId);
            
            if (!fromEl || !toEl) return;
            
            const fromPort = fromEl.querySelector('[data-port-type="output"]');
            const toPort = toEl.querySelector('[data-port-type="input"]');
            
            if (fromPort && toPort) {
                const fromRect = fromPort.getBoundingClientRect();
                const toRect = toPort.getBoundingClientRect();
                const viewportRect = this.viewport.getBoundingClientRect();
                
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', fromRect.left - viewportRect.left + this.viewport.scrollLeft);
                line.setAttribute('y1', fromRect.top - viewportRect.top + this.viewport.scrollTop);
                line.setAttribute('x2', toRect.left - viewportRect.left + this.viewport.scrollLeft);
                line.setAttribute('y2', toRect.top - viewportRect.top + this.viewport.scrollTop);
                line.setAttribute('stroke', '#667eea');
                line.setAttribute('stroke-width', '2');
                
                // Right-click to delete
                line.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.deleteConnection(conn.fromItemId, conn.toItemId);
                });
                
                this.svg.appendChild(line);
            }
        });
    }
    
    deleteConnection(fromItemId, toItemId) {
        this.connections = this.connections.filter(
            c => !(c.fromItemId === fromItemId && c.toItemId === toItemId)
        );
        this.redraw();
        
        if (this.onConnectionDeleted) {
            this.onConnectionDeleted(fromItemId, toItemId);
        }
    }
    
    getConnectionsFrom(itemId) {
        return this.connections.filter(c => c.fromItemId === itemId);
    }
    
    getConnectionsTo(itemId) {
        return this.connections.filter(c => c.toItemId === itemId);
    }
    
    loadConnections(connectionsData) {
        if (!connectionsData || !Array.isArray(connectionsData)) return;
        
        this.connections = connectionsData.map(data => ({
            fromItemId: data.from_item_id,
            toItemId: data.to_item_id,
            fromPortType: data.from_port_type || 'output',
            toPortType: data.to_port_type || 'input'
        }));
        
        this.redraw();
    }
}
