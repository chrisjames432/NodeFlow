class Node {
    constructor(id, x, y, type = 'text', data = {}, onDelete) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.type = type; // 'text', 'image', 'generate'
        this.data = data; // Type-specific data
        this.dbId = null;
        this.onDelete = onDelete;
        this.saveTimer = null;
        this.element = this.createDOM();
    }

    scheduleSave(delay = 400) {
        if (!this.dbId) return; // only after creation
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }
        this.saveTimer = setTimeout(() => {
            this.saveTimer = null;
            this.save();
        }, delay);
    }

    createDOM() {
        const nodeEl = document.createElement('div');
        nodeEl.className = `node node-${this.type}`;
        nodeEl.id = `node-${this.id}`;
        nodeEl.style.left = this.x + 'px';
        nodeEl.style.top = this.y + 'px';

        // Provide comfortable defaults for image-based nodes so images do not overflow headers
        if ((this.type === 'image' || this.type === 'generated-image') && (!this.data.width || !this.data.height)) {
            this.data.width = this.data.width || 220;
            this.data.height = this.data.height || 240;
        }
        if (this.type === 'image-collector' && (!this.data.width || !this.data.height)) {
            this.data.width = this.data.width || 1000;
            this.data.height = this.data.height || 620;
        }
        
        // Apply saved size for any resizable node
        if (this.data.width) {
            nodeEl.style.width = this.data.width + 'px';
        }
        if (this.data.height) {
            nodeEl.style.height = this.data.height + 'px';
        }

        const header = document.createElement('div');
        header.className = 'node-header';

        const title = document.createElement('div');
        title.className = 'node-title';
        title.textContent = this.getTypeName();

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

        // Create type-specific content
        const typeContent = this.createTypeContent();
        content.appendChild(typeContent);

        nodeEl.appendChild(header);
        nodeEl.appendChild(content);
        
        // Add ports on the sides of the node (not inside content)
        if (this.hasInput()) {
            const inputPort = this.createPort('input');
            nodeEl.appendChild(inputPort);
        }
        
        if (this.hasOutput()) {
            const outputPort = this.createPort('output');
            nodeEl.appendChild(outputPort);
        }

        this.header = header;
        this.titleEl = title;

        return nodeEl;
    }

    getTypeName() {
        const names = {
            'text': 'Text',
            'image': 'Image',
            'generate': 'Generate',
            'generated-image': 'Generated Image',
            'image-collector': 'Image Grid'
        };
        return names[this.type] || 'Node';
    }

    hasInput() {
        return ['text', 'generate', 'image', 'generate-text', 'generated-image', 'image-collector'].includes(this.type);
    }

    hasOutput() {
        return ['text', 'image', 'generate', 'generate-text', 'generated-image'].includes(this.type);
    }

    createPort(type) {
        const port = document.createElement('div');
        port.className = `connection-port port-${type}`;
        port.setAttribute('data-node-id', `node-${this.id}`);
        port.setAttribute('data-port-type', type);
        port.title = type === 'input' ? 'Input' : 'Output';

        // Allow type-specific port placement tweaks
        if (type === 'output' && (this.type === 'image' || this.type === 'generated-image')) {
            port.classList.add('port-bottom');
        }
        return port;
    }

    createTypeContent() {
        const container = document.createElement('div');
        container.className = 'node-type-content';

        switch (this.type) {
            case 'text':
                return this.createTextContent(container);
            case 'image':
                return this.createImageContent(container);
            case 'generated-image':
                return this.createGeneratedImageContent(container);
            case 'image-collector':
                return this.createImageCollectorContent(container);
            case 'generate':
                return this.createGenerateContent(container);
            case 'generate-text':
                return this.createGenerateTextContent(container);
            default:
                container.textContent = 'Unknown node type';
                return container;
        }
    }

    createTextContent(container) {
        const textarea = document.createElement('textarea');
        textarea.className = 'node-textarea';
        textarea.placeholder = 'Enter text...';
        textarea.value = this.data.text || '';
        textarea.addEventListener('input', async (e) => {
            this.data.text = e.target.value;
            await this.save();
        });
        container.appendChild(textarea);
        
        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'node-resize-handle';
        resizeHandle.addEventListener('mousedown', (e) => this.startResize(e));
        container.appendChild(resizeHandle);
        
        return container;
    }
    
    startResize(e) {
        e.stopPropagation();
        e.preventDefault();
        
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = this.element.offsetWidth;
        const startHeight = this.element.offsetHeight;
        
        const doResize = (e) => {
            const zoom = app.state.zoom || 1;
            const newWidth = Math.max(120, startWidth + (e.clientX - startX) / zoom);
            const newHeight = Math.max(80, startHeight + (e.clientY - startY) / zoom);
            
            this.element.style.width = newWidth + 'px';
            this.element.style.height = newHeight + 'px';
            this.data.width = newWidth;
            this.data.height = newHeight;
        };
        
        const stopResize = async () => {
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResize);
            await this.save();
        };
        
        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);
    }

    createImageContent(container) {
        // If legacy images array exists, take the first image as src
        if (Array.isArray(this.data.images) && this.data.images.length > 0) {
            this.data.src = this.data.src || this.data.images[0];
            delete this.data.images;
        }

        if (this.data.src) {
            const img = document.createElement('img');
            img.className = 'node-img';
            img.src = this.data.src;
            container.appendChild(img);
        }

        const uploadBtn = document.createElement('button');
        uploadBtn.className = 'node-btn';
        uploadBtn.textContent = 'Upload Image';
        uploadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.uploadImage(container);
        });

        // Resize handle for image nodes
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'node-resize-handle';
        resizeHandle.addEventListener('mousedown', (e) => this.startResize(e));

        container.appendChild(uploadBtn);
        container.appendChild(resizeHandle);
        return container;
    }

    createGeneratedImageContent(container) {
        // If legacy images array exists, take the first image as src
        if (Array.isArray(this.data.images) && this.data.images.length > 0) {
            this.data.src = this.data.src || this.data.images[0];
            delete this.data.images;
        }

        if (this.data.src) {
            const img = document.createElement('img');
            img.className = 'node-img';
            img.src = this.data.src;
            container.appendChild(img);
        }

        // Resize handle for generated image nodes
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'node-resize-handle';
        resizeHandle.addEventListener('mousedown', (e) => this.startResize(e));

        container.appendChild(resizeHandle);
        return container;
    }

    createImageCollectorContent(container) {
        const info = document.createElement('div');
        info.className = 'image-grid-info';
        info.textContent = 'Connected generates will place images here (grid of 5).';
        container.appendChild(info);

        const grid = document.createElement('div');
        grid.className = 'image-grid';

        const imgs = Array.isArray(this.data.images) ? this.data.images : [];
        imgs.forEach(src => {
            const img = document.createElement('img');
            img.className = 'image-grid-img';
            img.src = src;
            grid.appendChild(img);
        });

        container.appendChild(grid);

        // Resize handle for collector
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'node-resize-handle';
        resizeHandle.addEventListener('mousedown', (e) => this.startResize(e));
        container.appendChild(resizeHandle);

        return container;
    }

    createGenerateContent(container) {
        const promptInput = document.createElement('textarea');
        promptInput.className = 'node-textarea node-prompt';
        promptInput.placeholder = 'Describe the image to generate...';
        promptInput.value = this.data.prompt || '';
        promptInput.addEventListener('input', (e) => {
            this.data.prompt = e.target.value;
        });
        container.appendChild(promptInput);

        const settings = document.createElement('div');
        settings.className = 'node-settings';

        const aspectSelect = document.createElement('select');
        aspectSelect.className = 'node-select';
        aspectSelect.innerHTML = `
            <option value="1:1" ${this.data.aspectRatio === '1:1' ? 'selected' : ''}>1:1 Square</option>
            <option value="3:4" ${this.data.aspectRatio === '3:4' ? 'selected' : ''}>3:4 Portrait</option>
            <option value="4:3" ${this.data.aspectRatio === '4:3' ? 'selected' : ''}>4:3 Landscape</option>
            <option value="9:16" ${this.data.aspectRatio === '9:16' ? 'selected' : ''}>9:16 Tall</option>
            <option value="16:9" ${this.data.aspectRatio === '16:9' ? 'selected' : ''}>16:9 Wide</option>
        `;
        aspectSelect.addEventListener('change', (e) => {
            this.data.aspectRatio = e.target.value;
        });

        const modelSelect = document.createElement('select');
        modelSelect.className = 'node-select';
        modelSelect.innerHTML = `
            <option value="gemini-2.5-flash-image" ${this.data.model === 'gemini-2.5-flash-image' ? 'selected' : ''}>Flash (Fast)</option>
            <option value="gemini-3-pro-image" ${this.data.model === 'gemini-3-pro-image' ? 'selected' : ''}>Pro (Quality)</option>
        `;
        modelSelect.addEventListener('change', (e) => {
            this.data.model = e.target.value;
        });

        settings.appendChild(aspectSelect);
        settings.appendChild(modelSelect);
        container.appendChild(settings);

        const generateBtn = document.createElement('button');
        generateBtn.className = 'node-btn node-btn-generate';
        generateBtn.textContent = this.data.generating ? 'Generating...' : 'Generate Image';
        generateBtn.disabled = this.data.generating || false;
        generateBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.generateImage(generateBtn, container);
        });
        container.appendChild(generateBtn);

        return container;
    }

    createGenerateTextContent(container) {
        const systemInput = document.createElement('textarea');
        systemInput.className = 'node-textarea node-system';
        systemInput.placeholder = 'System message (optional)';
        systemInput.value = this.data.system || '';
        systemInput.addEventListener('input', (e) => {
            this.data.system = e.target.value;
            this.scheduleSave();
        });

        const promptInput = document.createElement('textarea');
        promptInput.className = 'node-textarea node-prompt';
        promptInput.placeholder = 'User message...';
        promptInput.value = this.data.prompt || '';
        promptInput.addEventListener('input', (e) => {
            this.data.prompt = e.target.value;
            this.scheduleSave();
        });

        const providerSelect = document.createElement('select');
        providerSelect.className = 'node-select';
        providerSelect.innerHTML = `
            <option value="openai" ${this.data.provider === 'openai' ? 'selected' : ''}>OpenAI</option>
            <option value="claude" ${this.data.provider === 'claude' ? 'selected' : ''}>Claude</option>
            <option value="gemini" ${this.data.provider === 'gemini' ? 'selected' : ''}>Gemini</option>
            <option value="xai" ${this.data.provider === 'xai' ? 'selected' : ''}>Grok (xAI)</option>
        `;
        providerSelect.addEventListener('change', (e) => {
            this.data.provider = e.target.value;
            this.scheduleSave();
        });

        const modelInput = document.createElement('input');
        modelInput.className = 'node-input';
        modelInput.placeholder = 'Model (optional)';
        modelInput.value = this.data.model || '';
        modelInput.addEventListener('input', (e) => {
            this.data.model = e.target.value;
            this.scheduleSave();
        });

        const generateBtn = document.createElement('button');
        generateBtn.className = 'node-btn node-btn-generate';
        generateBtn.textContent = this.data.generating ? 'Generating...' : 'Generate Text';
        generateBtn.disabled = this.data.generating || false;
        generateBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.generateText(generateBtn);
        });

        const outputArea = document.createElement('textarea');
        outputArea.className = 'node-textarea node-output';
        outputArea.placeholder = 'Response...';
        outputArea.value = this.data.response || '';
        outputArea.readOnly = true;

        const settings = document.createElement('div');
        settings.className = 'node-settings';
        settings.appendChild(providerSelect);
        settings.appendChild(modelInput);

        container.appendChild(systemInput);
        container.appendChild(promptInput);
        container.appendChild(settings);
        container.appendChild(generateBtn);
        container.appendChild(outputArea);

        // Resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'node-resize-handle';
        resizeHandle.addEventListener('mousedown', (e) => this.startResize(e));
        container.appendChild(resizeHandle);

        return container;
    }

    uploadImage(container) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    this.data.src = event.target.result;

                    // Re-render the node
                    const newElement = this.createDOM();
                    this.element.replaceWith(newElement);
                    this.element = newElement;
                    await this.save();
                    
                    // Re-attach drag handler and ports
                    if (app && app.state && app.state.currentWorkspace) {
                        this.getHeader().addEventListener('mousedown', (e) => app.dragNode(e, this));
                        const ports = this.element.querySelectorAll('.connection-port');
                        ports.forEach(port => {
                            port.addEventListener('mousedown', (e) => {
                                const nodeId = port.getAttribute('data-node-id');
                                const portType = port.getAttribute('data-port-type');
                                app.state.connectionManager.startConnection(e, nodeId, portType);
                            });
                        });
                        app.state.connectionManager.redrawAll();
                    }
                };
                reader.readAsDataURL(file);
            }
        });
        input.click();
    }

    async generateImage(button, container) {
        // Build a combined prompt from upstream text nodes + this node's prompt
        const combinedPrompt = this.buildPromptFromIncoming();
        if (!combinedPrompt || !combinedPrompt.trim()) {
            alert('Please enter a prompt');
            return;
        }

        // Require a connected image collector node
        let collectors = [];
        if (app && app.state && app.state.connectionManager && app.state.currentWorkspace) {
            const outgoing = app.state.connectionManager.getConnectionsFrom(`node-${this.id}`) || [];
            collectors = outgoing.map(conn => {
                const toId = parseInt(conn.toNodeId.replace('node-', ''), 10);
                return app.state.currentWorkspace.findNode(toId);
            }).filter(n => n && n.type === 'image-collector');
        }

        if (!collectors.length) {
            alert('Connect this Generate node to an Image Grid node to receive images.');
            return;
        }

        button.textContent = 'Generating...';
        button.disabled = true;
        this.data.generating = true;

        try {
            const result = await API.generateImage(combinedPrompt, {
                aspectRatio: this.data.aspectRatio || '1:1',
                model: this.data.model || 'gemini-2.5-flash-image'
            });
            this.data.generatedImage = null;
            this.data.generating = false;

            // Push images into connected collectors (grid of 5 columns)
            for (const collector of collectors) {
                collector.data.images = collector.data.images || [];
                collector.data.images.push(result.path);

                // Re-render collector to show new image
                const newEl = collector.createDOM();
                collector.element.replaceWith(newEl);
                collector.element = newEl;
                if (app && app.state && app.state.currentWorkspace) {
                    collector.getHeader().addEventListener('mousedown', (e) => app.dragNode(e, collector));
                    const ports = collector.element.querySelectorAll('.connection-port');
                    ports.forEach(port => {
                        port.addEventListener('mousedown', (e) => {
                            const nodeId = port.getAttribute('data-node-id');
                            const portType = port.getAttribute('data-port-type');
                            app.state.connectionManager.startConnection(e, nodeId, portType);
                        });
                    });
                }
                await collector.save();
            }

            // Re-render this generate node to keep UI consistent and save state
            const newElement = this.createDOM();
            this.element.replaceWith(newElement);
            this.element = newElement;
            await this.save();
            if (app && app.state && app.state.currentWorkspace) {
                this.getHeader().addEventListener('mousedown', (e) => app.dragNode(e, this));
                const ports = this.element.querySelectorAll('.connection-port');
                ports.forEach(port => {
                    port.addEventListener('mousedown', (e) => {
                        const nodeId = port.getAttribute('data-node-id');
                        const portType = port.getAttribute('data-port-type');
                        app.state.connectionManager.startConnection(e, nodeId, portType);
                    });
                });
            }
            if (app && app.state && app.state.connectionManager) {
                app.state.connectionManager.redrawAll();
            }
        } catch (error) {
            console.error('Generation error:', error);
            alert('Image generation failed: ' + error.message);
            button.textContent = 'Generate Image';
            button.disabled = false;
            this.data.generating = false;
        }
    }

    async generateText(button) {
        // Build prompt from incoming + local
        const combinedPrompt = this.buildPromptFromIncoming();
        if (!combinedPrompt || !combinedPrompt.trim()) {
            alert('Please enter a prompt');
            return;
        }

        button.textContent = 'Generating...';
        button.disabled = true;
        this.data.generating = true;

        try {
            const result = await API.generateText(combinedPrompt, {
                system: this.data.system || '',
                provider: this.data.provider || 'openai',
                model: this.data.model || ''
            });

            this.data.response = result.response || '';
            this.data.generating = false;

            // Re-render to show new response
            const newElement = this.createDOM();
            this.element.replaceWith(newElement);
            this.element = newElement;
            await this.save();
            if (app && app.state && app.state.currentWorkspace) {
                this.getHeader().addEventListener('mousedown', (e) => app.dragNode(e, this));
                const ports = this.element.querySelectorAll('.connection-port');
                ports.forEach(port => {
                    port.addEventListener('mousedown', (e) => {
                        const nodeId = port.getAttribute('data-node-id');
                        const portType = port.getAttribute('data-port-type');
                        app.state.connectionManager.startConnection(e, nodeId, portType);
                    });
                });
                app.state.connectionManager.redrawAll();
            }
        } catch (error) {
            console.error('Text generation error:', error);
            alert('Text generation failed: ' + error.message);
            button.textContent = 'Generate Text';
            button.disabled = false;
            this.data.generating = false;
        }
    }

    // No longer routing into stacked image galleries; each generation spawns a new image node

    // Collect text from incoming connections and append this node's prompt
    buildPromptFromIncoming() {
        const parts = [];

        // Append upstream text from connected nodes
        if (app && app.state && app.state.connectionManager && app.state.currentWorkspace) {
            const incoming = app.state.connectionManager.getConnectionsTo(`node-${this.id}`) || [];
            incoming.forEach(conn => {
                const fromId = parseInt(conn.fromNodeId.replace('node-', ''), 10);
                const srcNode = app.state.currentWorkspace.findNode(fromId);
                if (!srcNode) return;
                if (srcNode.type === 'text' && srcNode.data && srcNode.data.text) {
                    parts.push(srcNode.data.text);
                }
                if (srcNode.type === 'generate-text' && srcNode.data && srcNode.data.response) {
                    parts.push(srcNode.data.response);
                }
            });
        }

        // Finally append this node's own prompt text
        if (this.data && this.data.prompt) {
            parts.push(this.data.prompt);
        }

        return parts.filter(Boolean).join(' ');
    }

    // Save node to database
    async save() {
        if (!this.dbId) return;
        
        await API.updateNode(this.dbId, this.x, this.y, { 
            data: this.data
        });
    }

    // Create node in database (returns dbId)
    async create(workspaceId) {
        const dbNode = await API.createNode(workspaceId, this.x, this.y, this.type, { 
            data: this.data
        });
        this.dbId = dbNode.id;
        return this.dbId;
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

        // Remove any connections that reference this node
        if (app && app.state && app.state.connectionManager) {
            app.state.connectionManager.deleteConnectionsForNode(`node-${this.id}`);
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
        const type = data.type || data.node_type || 'text';
        const nodeData = data.data || {};
        
        const node = new Node(data.id, data.x, data.y, type, nodeData, onDelete);
        node.dbId = data.id;
        
        return node;
    }
}


