class Workspace {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.nodes = [];
        this.nodeCounter = 0;
        this.zoom = 1;
    }

    setName(name) {
        this.name = name;
        return this.saveToDb();
    }

    addNode(node) {
        this.nodes.push(node);
        return node;
    }

    removeNode(nodeId) {
        this.nodes = this.nodes.filter(n => n.id !== nodeId);
    }

    findNode(nodeId) {
        return this.nodes.find(n => n.id === nodeId);
    }

    clearNodes() {
        this.nodes.forEach(node => node.element.remove());
        this.nodes = [];
    }

    async saveToDb() {
        const res = await fetch(`/api/workspaces/${this.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: this.name, zoom: this.zoom })
        });
        return res.json();
    }

    async loadFromDb() {
        const res = await fetch(`/api/workspaces/${this.id}`);
        const data = await res.json();
        this.name = data.name;
        this.zoom = data.zoom;
        return data;
    }

    static async create(name) {
        const res = await fetch('/api/workspaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await res.json();
        return new Workspace(data.id, data.name);
    }

    static async loadAll() {
        const res = await fetch('/api/workspaces');
        const workspaces = await res.json();
        return workspaces.map(w => new Workspace(w.id, w.name));
    }

    static async loadById(id) {
        const res = await fetch(`/api/workspaces/${id}`);
        const data = await res.json();
        return new Workspace(data.id, data.name);
    }
}
