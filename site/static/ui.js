// UI Service - Handle all DOM updates and rendering
const UI = {
    // Screens
    showEditorScreen: () => {
        const editor = document.getElementById('editorScreen');
        const home = document.getElementById('homeScreen');
        if (editor) editor.style.display = 'flex';
        if (home) home.style.display = 'none';
    },

    showHomeScreen: async () => {
        const editor = document.getElementById('editorScreen');
        const home = document.getElementById('homeScreen');
        if (editor) editor.style.display = 'none';
        if (home) home.style.display = 'grid';
        await UI.populateWorkspacesList();
    },

    // Home screen operations
    populateWorkspacesList: async () => {
        const workspaces = await Workspace.loadAll();
        const list = document.getElementById('workspacesList');
        if (!list) return;
        
        list.innerHTML = '';
        
        workspaces.forEach(ws => {
            const card = document.createElement('div');
            card.className = 'workspace-card';
            card.innerHTML = `
                <div class="workspace-info">
                    <h3>${ws.name}</h3>
                    <p>${ws.nodes?.length || 0} nodes</p>
                </div>
                <div class="workspace-actions">
                    <button class="btn-sm btn-edit" data-id="${ws.id}">Edit</button>
                    <button class="btn-sm btn-rename" data-id="${ws.id}">Rename</button>
                    <button class="btn-sm btn-delete" data-id="${ws.id}">Delete</button>
                </div>
            `;
            
            card.querySelector('.btn-edit').addEventListener('click', () => app.openWorkspace(ws.id));
            card.querySelector('.btn-rename').addEventListener('click', () => UI.renameWorkspaceFromHome(ws.id, ws.name));
            card.querySelector('.btn-delete').addEventListener('click', () => UI.deleteWorkspaceConfirm(ws.id));
            
            list.appendChild(card);
        });
    },

    renameWorkspaceFromHome: async (id, currentName) => {
        const newName = prompt('New workspace name:', currentName);
        if (!newName || newName === currentName) return;
        
        const workspace = new Workspace(id, currentName);
        await workspace.setName(newName);
        UI.populateWorkspacesList();
    },

    deleteWorkspaceConfirm: async (id) => {
        if (!confirm('Delete this workspace? This cannot be undone.')) return;
        
        await Workspace.delete(id);
        UI.populateWorkspacesList();
    },

    // Editor screen - workspace display
    setWorkspaceName: (name) => {
        const display = document.getElementById('nameDisplay');
        if (display) display.textContent = name;
    },

    updateZoomDisplay: (zoom) => {
        const display = document.getElementById('zoomLevel');
        if (display) display.textContent = `Zoom: ${Math.round(zoom * 100)}%`;
    },

    setWorkspaceZoom: (zoom) => {
        const workspace = document.getElementById('workspace');
        if (workspace) {
            workspace.style.transform = `scale(${zoom})`;
            workspace.style.transformOrigin = '0 0';
        }
    },

    // Rename UI in editor
    startRenameMode: (currentName, onSave) => {
        const container = document.getElementById('workspaceName');
        if (!container) return;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        
        const saveBtn = document.createElement('button');
        saveBtn.className = 'rename-btn rename-save';
        saveBtn.textContent = '✓';
        saveBtn.addEventListener('click', () => {
            if (input.value.trim()) {
                onSave(input.value.trim());
                UI.endRenameMode(input.value.trim());
            }
        });
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'rename-btn rename-cancel';
        cancelBtn.textContent = '✕';
        cancelBtn.addEventListener('click', () => UI.endRenameMode(currentName));
        
        container.innerHTML = '';
        container.appendChild(input);
        container.appendChild(saveBtn);
        container.appendChild(cancelBtn);
        
        input.focus();
        input.select();
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                onSave(input.value.trim());
                UI.endRenameMode(input.value.trim());
            }
            if (e.key === 'Escape') UI.endRenameMode(currentName);
        });
    },

    endRenameMode: (name) => {
        const container = document.getElementById('workspaceName');
        if (!container) return;
        
        const display = document.createElement('span');
        display.id = 'nameDisplay';
        display.textContent = name;
        display.addEventListener('dblclick', () => app.startRename());
        
        container.innerHTML = '';
        container.appendChild(display);
    },

    // Node loading helper
    loadNodesIntoWorkspace: (workspaceEl, workspace, nodeDataArray) => {
        const connectionLayer = workspaceEl.querySelector('.connections-svg');
        workspaceEl.innerHTML = '';
        if (connectionLayer) {
            workspaceEl.appendChild(connectionLayer);
        }
        workspace.clearNodes();
        workspace.nodeCounter = 0;
        
        nodeDataArray.forEach(nodeData => {
            // Use Node factory method to create from database data
            const node = Node.fromData(nodeData, (deletedId) => {
                workspace.removeNode(deletedId);
            });
            
            node.render(workspaceEl);
            node.getHeader().addEventListener('mousedown', (e) => app.dragNode(e, node));
            workspace.addNode(node);
            workspace.nodeCounter = Math.max(workspace.nodeCounter, node.dbId + 1);
            
            // Attach port events
            setTimeout(() => {
                const ports = node.element.querySelectorAll('.connection-port');
                ports.forEach(port => {
                    port.addEventListener('mousedown', (e) => {
                        const nodeId = port.getAttribute('data-node-id');
                        const portType = port.getAttribute('data-port-type');
                        app.state.connectionManager.startConnection(e, nodeId, portType);
                    });
                });
            }, 50);
        });
    },

    clearWorkspace: () => {
        const workspace = document.getElementById('workspace');
        if (workspace) {
            const connectionLayer = workspace.querySelector('.connections-svg');
            workspace.innerHTML = '';
            if (connectionLayer) {
                workspace.appendChild(connectionLayer);
            }
        }
    }
};
