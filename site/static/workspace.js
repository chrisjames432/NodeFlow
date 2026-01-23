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
        return API.updateWorkspace(this.id, { name: this.name, zoom: this.zoom });
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
        this.nodes.forEach(node => node.element?.remove());
        this.nodes = [];
    }

    saveToDb() {
        return API.updateWorkspace(this.id, { 
            name: this.name, 
            zoom: this.zoom 
        });
    }

    async loadFromDb() {
        const data = await API.getWorkspace(this.id);
        this.name = data.name;
        this.zoom = data.zoom;
        return data;
    }

    static async create(name) {
        const data = await API.createWorkspace(name);
        return new Workspace(data.id, data.name);
    }

    static async loadAll() {
        const workspaces = await API.getAllWorkspaces();
        return workspaces.map(w => new Workspace(w.id, w.name));
    }

    static async loadById(id) {
        const data = await API.getWorkspace(id);
        return new Workspace(data.id, data.name);
    }

    static async delete(id) {
        return API.deleteWorkspace(id);
    }
}

