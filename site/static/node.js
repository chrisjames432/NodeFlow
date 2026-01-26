class Node {
    constructor(id, x, y, name = 'Node', onDelete) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.name = name;
        this.dbId = null;
        this.onDelete = onDelete;
        this.items = [];
        this.itemCounter = 0;
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

        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'node-items';
        this.itemsContainer = itemsContainer;

        const controls = document.createElement('div');
        controls.className = 'node-controls';

        const addImageBtn = document.createElement('button');
        addImageBtn.className = 'node-btn-small';
        addImageBtn.textContent = '🖼️ Image';
        addImageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.addImage();
        });

        const addTextBtn = document.createElement('button');
        addTextBtn.className = 'node-btn-small';
        addTextBtn.textContent = '📝 Text';
        addTextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.addText();
        });

        const addAIImageBtn = document.createElement('button');
        addAIImageBtn.className = 'node-btn-small';
        addAIImageBtn.textContent = '🤖 AI';
        addAIImageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.generateAIImage();
        });

        controls.appendChild(addImageBtn);
        controls.appendChild(addTextBtn);
        controls.appendChild(addAIImageBtn);

        content.appendChild(itemsContainer);
        content.appendChild(controls);

        nodeEl.appendChild(header);
        nodeEl.appendChild(content);

        this.header = header;
        this.titleEl = title;

        return nodeEl;
    }

    // Save node to database
    async save() {
        if (!this.dbId) return;
        
        const itemsData = this.items.map(item => {
            const json = item.toJSON();
            console.log('Item ID:', json.id, 'Type:', json.type, 'Data:', JSON.stringify(json.data));
            return json;
        });
        console.log('Saving node with items:', itemsData);
        
        await API.updateNode(this.dbId, this.x, this.y, { 
            data: {
                name: this.name,
                items: itemsData
            }
        });
    }

    addImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const itemId = this.itemCounter++;
                    const item = new Item(itemId, 'image', { src: event.target.result }, this.id);
                    item.onDelete = (id) => this.removeItem(id);
                    this.items.push(item);
                    this.itemsContainer.appendChild(item.createDOM());
                    await this.save();
                };
                reader.readAsDataURL(file);
            }
        });
        input.click();
    }

    addText() {
        const itemId = this.itemCounter++;
        const item = new Item(itemId, 'text', { content: 'Enter text...' }, this.id);
        item.onDelete = (id) => this.removeItem(id);
        
        const itemEl = item.createDOM();
        this.items.push(item);
        this.itemsContainer.appendChild(itemEl);

        const textDiv = itemEl.querySelector('.item-text');
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'item-text-input';
        input.value = item.data.content;
        input.addEventListener('blur', async () => {
            item.data.content = input.value;
            textDiv.textContent = input.value;
            input.replaceWith(textDiv);
            await this.save();
        });
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                item.data.content = input.value;
                textDiv.textContent = input.value;
                input.replaceWith(textDiv);
                await this.save();
            }
        });
        textDiv.replaceWith(input);
        input.focus();
    }

    removeItem(itemId) {
        this.items = this.items.filter(i => i.id !== itemId);
        this.save();
    }

    loadItems(itemsData) {
        if (!itemsData || !Array.isArray(itemsData)) {
            console.log('loadItems called but no items or not an array:', itemsData);
            return;
        }
        
        console.log('loadItems called with:', itemsData);
        
        this.items = itemsData.map(data => {
            console.log('Creating item from data:', data);
            const item = Item.fromJSON(data);
            item.nodeId = this.id; // Set the node ID
            item.onDelete = (id) => this.removeItem(id);
            return item;
        });

        this.items.forEach(item => {
            console.log('Appending item to DOM:', item.type, item.data);
            this.itemsContainer.appendChild(item.createDOM());
        });
    }

    generateAIImage() {
        const itemId = this.itemCounter++;
        const item = new Item(itemId, 'ai-prompt', { 
            prompt: '',
            aspectRatio: '1:1',
            model: 'gemini-2.5-flash-image'
        }, this.id);
        item.element = null;
        
        item.onSubmit = async (promptText, submittedItemId, options) => {
            console.log('onSubmit called with:', promptText, options);
            
            // Create a NEW image item instead of converting the prompt
            const imageItemId = this.itemCounter++;
            const imageItem = new Item(imageItemId, 'ai-image', { 
                generating: true,
                prompt: promptText,
                aspectRatio: options.aspectRatio,
                model: options.model
            }, this.id);
            
            imageItem.onDelete = (id) => this.removeItem(id);
            this.items.push(imageItem);
            
            const imageEl = imageItem.createDOM();
            this.itemsContainer.appendChild(imageEl);
            console.log('Created new image item:', imageItemId);

            try {
                // Call API to generate image with options
                console.log('Calling API.generateImage...');
                const result = await API.generateImage(promptText, {
                    aspectRatio: options.aspectRatio,
                    model: options.model
                });
                console.log('Image generated:', result);
                
                // Update the image item with result
                imageItem.data.generating = false;
                imageItem.data.path = result.path;
                console.log('Image item after generation:', { type: imageItem.type, data: imageItem.data });
                
                // Replace the loading element with final image
                const loadingEl = document.getElementById(imageItem.getUniqueId());
                if (loadingEl) {
                    const finalEl = imageItem.createDOM();
                    loadingEl.replaceWith(finalEl);
                    console.log('Element replaced with image');
                }
                
                console.log('About to save node...');
                await this.save();
                console.log('Node saved successfully');
            } catch (error) {
                console.error('Generation error:', error);
                imageItem.data.generating = false;
                imageItem.data.error = error.message;
                
                const errorEl = document.getElementById(imageItem.getUniqueId());
                if (errorEl) {
                    const failEl = imageItem.createDOM();
                    errorEl.replaceWith(failEl);
                }
            }
        };
        
        item.onDelete = (id) => this.removeItem(id);
        this.items.push(item);
        const itemEl = item.createDOM();
        this.itemsContainer.appendChild(itemEl);
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
        
        console.log('Node.fromData called with:', data);
        
        // Load items if they exist
        if (data.data && data.data.items) {
            console.log('Items found in node data, loading:', data.data.items);
            node.loadItems(data.data.items);
        } else {
            console.log('No items found in node data');
        }
        
        return node;
    }
}


