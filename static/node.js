class Node {
    constructor(id, x, y, onDelete) {
        this.id = id;
        this.x = x;
        this.y = y;
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
        title.textContent = `Node ${this.id}`;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'node-delete';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', () => this.delete());

        header.appendChild(title);
        header.appendChild(deleteBtn);

        const content = document.createElement('div');
        content.className = 'node-content';
        content.textContent = 'Drag to move\nDouble-click to edit';

        nodeEl.appendChild(header);
        nodeEl.appendChild(content);

        // Store reference to header for drag events
        this.header = header;

        return nodeEl;
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

    delete() {
        this.element.remove();
        this.onDelete(this.id);
    }

    render(parent) {
        parent.appendChild(this.element);
    }
}
