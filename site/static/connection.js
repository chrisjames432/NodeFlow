// Connection class - represents a single connection between two nodes
class Connection {
    constructor(fromNodeId, toNodeId, options = {}) {
        this.id = options.id || `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.fromNodeId = fromNodeId;
        this.toNodeId = toNodeId;
        this.dbId = options.dbId || null;
        
        // Visual properties
        this.color = options.color || '#667eea';
        this.hoverColor = options.hoverColor || '#ff6b6b';
        this.width = options.width || 2;
        this.selected = false;
        
        // SVG elements
        this.path = null;
        this.hitArea = null; // Invisible wider path for easier clicking
        
        // Callbacks
        this.onDelete = options.onDelete || null;
        this.onSelect = options.onSelect || null;
    }
    
    // Create SVG elements for this connection
    createSVG(svg) {
        // Create hit area (wider invisible path for easier clicking)
        this.hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.hitArea.setAttribute('fill', 'none');
        this.hitArea.setAttribute('stroke', 'transparent');
        this.hitArea.setAttribute('stroke-width', '15');
        this.hitArea.setAttribute('class', 'connection-hit-area');
        this.hitArea.style.cursor = 'pointer';
        this.hitArea.style.pointerEvents = 'stroke';
        
        // Create visible path
        this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.path.setAttribute('fill', 'none');
        this.path.setAttribute('stroke', this.color);
        this.path.setAttribute('stroke-width', this.width);
        this.path.setAttribute('class', 'connection-path');
        this.path.style.pointerEvents = 'none';
        
        // Event listeners on hit area
        this.hitArea.addEventListener('mouseenter', () => this.onHover(true));
        this.hitArea.addEventListener('mouseleave', () => this.onHover(false));
        this.hitArea.addEventListener('click', (e) => this.onClick(e));
        this.hitArea.addEventListener('contextmenu', (e) => this.onRightClick(e));
        
        svg.appendChild(this.hitArea);
        svg.appendChild(this.path);
    }
    
    // Update the path based on world coordinates (direct method)
    updateDirect(x1, y1, x2, y2) {
        if (!this.path) return;
        
        const pathD = this.calculateBezier(x1, y1, x2, y2);
        
        this.path.setAttribute('d', pathD);
        this.hitArea.setAttribute('d', pathD);
    }
    
    // Legacy method kept for compatibility
    update(fromPort, toPort, viewportRect, scrollLeft, scrollTop, zoom = 1) {
        if (!fromPort || !toPort || !this.path) return;
        
        const fromRect = fromPort.getBoundingClientRect();
        const toRect = toPort.getBoundingClientRect();
        
        // Calculate positions relative to viewport with scroll
        const x1 = (fromRect.left + fromRect.width / 2 - viewportRect.left + scrollLeft) / zoom;
        const y1 = (fromRect.top + fromRect.height / 2 - viewportRect.top + scrollTop) / zoom;
        const x2 = (toRect.left + toRect.width / 2 - viewportRect.left + scrollLeft) / zoom;
        const y2 = (toRect.top + toRect.height / 2 - viewportRect.top + scrollTop) / zoom;
        
        const pathD = this.calculateBezier(x1, y1, x2, y2);
        
        this.path.setAttribute('d', pathD);
        this.hitArea.setAttribute('d', pathD);
    }
    
    // Calculate bezier curve path
    calculateBezier(x1, y1, x2, y2) {
        // Horizontal distance for control points
        const dx = Math.abs(x2 - x1);
        const offsetX = Math.max(50, dx * 0.5);
        
        // Control points extend horizontally from ports
        // Output port (right side) - control point goes right
        const cp1x = x1 + offsetX;
        const cp1y = y1;
        
        // Input port (left side) - control point goes left
        const cp2x = x2 - offsetX;
        const cp2y = y2;
        
        return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
    }
    
    onHover(isHovering) {
        if (!this.path) return;
        
        if (isHovering) {
            this.path.setAttribute('stroke', this.hoverColor);
            this.path.setAttribute('stroke-width', this.width + 1);
        } else if (!this.selected) {
            this.path.setAttribute('stroke', this.color);
            this.path.setAttribute('stroke-width', this.width);
        }
    }
    
    onClick(e) {
        e.stopPropagation();
        this.selected = !this.selected;
        
        if (this.selected) {
            this.path.setAttribute('stroke', this.hoverColor);
            this.path.setAttribute('stroke-width', this.width + 1);
        } else {
            this.path.setAttribute('stroke', this.color);
            this.path.setAttribute('stroke-width', this.width);
        }
        
        if (this.onSelect) {
            this.onSelect(this, this.selected);
        }
    }
    
    onRightClick(e) {
        e.preventDefault();
        e.stopPropagation();
        this.delete();
    }
    
    delete() {
        this.remove();
        if (this.onDelete) {
            this.onDelete(this);
        }
    }
    
    remove() {
        if (this.path) {
            this.path.remove();
            this.path = null;
        }
        if (this.hitArea) {
            this.hitArea.remove();
            this.hitArea = null;
        }
    }
    
    setColor(color) {
        this.color = color;
        if (this.path && !this.selected) {
            this.path.setAttribute('stroke', color);
        }
    }
    
    toJSON() {
        return {
            id: this.id,
            fromNodeId: this.fromNodeId,
            toNodeId: this.toNodeId,
            dbId: this.dbId
        };
    }
    
    static fromData(data, options = {}) {
        return new Connection(data.fromNodeId || data.from_node_id, data.toNodeId || data.to_node_id, {
            id: data.id,
            dbId: data.dbId || data.id,
            ...options
        });
    }
}

// Temporary connection while dragging
class TempConnection {
    constructor(svg) {
        this.svg = svg;
        this.path = null;
        this.startX = 0;
        this.startY = 0;
        this.isFromOutput = true;
    }
    
    start(x, y, isFromOutput = true) {
        this.startX = x;
        this.startY = y;
        this.isFromOutput = isFromOutput;
        
        this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.path.setAttribute('fill', 'none');
        this.path.setAttribute('stroke', '#667eea');
        this.path.setAttribute('stroke-width', '2');
        this.path.setAttribute('stroke-dasharray', '8,4');
        this.path.setAttribute('class', 'temp-connection');
        this.path.style.pointerEvents = 'none';
        
        this.svg.appendChild(this.path);
    }
    
    update(x, y) {
        if (!this.path) return;
        
        let pathD;
        if (this.isFromOutput) {
            pathD = this.calculateBezier(this.startX, this.startY, x, y);
        } else {
            pathD = this.calculateBezier(x, y, this.startX, this.startY);
        }
        
        this.path.setAttribute('d', pathD);
    }
    
    calculateBezier(x1, y1, x2, y2) {
        const dx = Math.abs(x2 - x1);
        const offsetX = Math.max(50, dx * 0.5);
        
        const cp1x = x1 + offsetX;
        const cp1y = y1;
        const cp2x = x2 - offsetX;
        const cp2y = y2;
        
        return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
    }
    
    end() {
        if (this.path) {
            this.path.remove();
            this.path = null;
        }
    }
}
