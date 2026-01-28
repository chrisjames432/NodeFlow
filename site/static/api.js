// API Service Layer - Centralized fetch calls
const API = {
    // Workspace endpoints
    createWorkspace: async (name) => {
        const res = await fetch('/api/workspaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        return res.json();
    },

    getWorkspace: async (id) => {
        const res = await fetch(`/api/workspaces/${id}`);
        return res.json();
    },

    getAllWorkspaces: async () => {
        const res = await fetch('/api/workspaces');
        return res.json();
    },

    updateWorkspace: async (id, data) => {
        const res = await fetch(`/api/workspaces/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    deleteWorkspace: async (id) => {
        const res = await fetch(`/api/workspaces/${id}`, {
            method: 'DELETE'
        });
        return res.status === 204;
    },

    // Node endpoints
    createNode: async (workspaceId, x, y, type = 'text', data = {}) => {
        const res = await fetch('/api/nodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workspace_id: workspaceId,
                type: type,
                x,
                y,
                data
            })
        });
        return res.json();
    },

    updateNode: async (id, x, y, options = {}) => {
        const body = { x, y };
        if (options.data) {
            body.data = options.data;
        }
        const res = await fetch(`/api/nodes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return res.json();
    },

    deleteNode: async (id) => {
        const res = await fetch(`/api/nodes/${id}`, {
            method: 'DELETE'
        });
        return res.status === 204;
    },

    // File upload
    uploadImage: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        return res.json();
    },

    // Connection endpoints
    createConnection: async (workspaceId, fromNodeId, toNodeId) => {
        const res = await fetch('/api/connections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workspace_id: workspaceId,
                from_node_id: fromNodeId,
                to_node_id: toNodeId
            })
        });
        return res.json();
    },

    deleteConnection: async (id) => {
        const res = await fetch(`/api/connections/${id}`, {
            method: 'DELETE'
        });
        return res.status === 204;
    },

    // AI Image generation
    generateImage: async (prompt, options = {}) => {
        const res = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt,
                aspectRatio: options.aspectRatio || '1:1',
                model: options.model || 'gemini-2.5-flash-image'
            })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Image generation failed');
        }
        return res.json();
    },

    generateText: async (prompt, options = {}) => {
        const res = await fetch('/api/generate-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                system: options.system || '',
                provider: options.provider || 'openai',
                model: options.model || null
            })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Text generation failed');
        }
        return res.json();
    },
};
