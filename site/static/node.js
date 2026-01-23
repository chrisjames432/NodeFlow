class Node {
    constructor(id, x, y, name = 'Node', onDelete) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.name = name;
        this.dbId = null;
        this.onDelete = onDelete;
        this.element = this.createDOM();
    }

    createDOM() {
        const nodeEl = document.createElement('div');
        nodeEl.className = 'node';
        nodeEl.id = `node-${this.id}`;
        nodeEl.style.left = this.x + 'px';
        nodeEl.style.top = this.y + 'px';

        const header = document.createElement('div');
        header.className = 'node-header';

        const title = document.createElement('div');
        title.className = 'node-title';
        title.textContent = this.name;
        title.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.startRename(title);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'node-delete';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.delete();
        });

        header.appendChild(title);
        header.appendChild(deleteBtn);

        const content = document.createElement('div');
        content.className = 'node-content';
        content.textContent = 'Drag to move\nDouble-click title to rename';

        nodeEl.appendChild(header);
        nodeEl.appendChild(content);

        this.header = header;
        this.titleEl = title;

        return nodeEl;
    }

    // Save node to database
    async save() {
        if (!this.dbId) return;
        
        await API.updateNode(this.dbId, this.x, this.y, { 
            data: { name: this.name } 
        });
    }

    // Create node in database (returns dbId)
    async create(workspaceId) {
        const dbNode = await API.createNode(workspaceId, this.x, this.y, { 
            name: this.name 
        });
        this.dbId = dbNode.id;
        return this.dbId;
    }

    startRename(titleEl) {
        const currentName = titleEl.textContent;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'node-rename-input';
        
        titleEl.replaceWith(input);
        input.focus();
        input.select();
        
        const finishRename = async () => {
            const newName = input.value.trim() || currentName;
            this.name = newName;
            this.titleEl.textContent = newName;
            input.replaceWith(this.titleEl);
            
            // Save to DB
            await this.save();
        };
        
        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishRename();
            }
            if (e.key === 'Escape') {
                this.titleEl.textContent = currentName;
                input.replaceWith(this.titleEl);
            }
        });
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
    }

    getPosition() {
        return { x: this.x, y: this.y };
    }

    getHeader() {
        return this.header;
    }

    async delete() {
        // Delete from database first
        if (this.dbId) {
            await API.deleteNode(this.dbId);
        }
        
        // Remove from DOM
        this.element.remove();
        
        // Notify parent (workspace)
        if (this.onDelete) {
            this.onDelete(this.id);
        }
    }

    render(parent) {
        parent.appendChild(this.element);
    }

    // Create from database data
    static fromData(data, onDelete) {
        const name = (data.data && data.data.name) || `Node ${data.id}`;
        const node = new Node(data.id, data.x, data.y, name, onDelete);
        node.dbId = data.id;
        return node;
    }
}


