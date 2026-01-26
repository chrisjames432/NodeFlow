class Item {
    constructor(id, type, data = {}, nodeId = null) {
        this.id = id;
        this.nodeId = nodeId;
        this.type = type; // 'image', 'text', 'ai-prompt', or 'ai-image'
        this.data = data;
        this.element = null;
        this.deleteClicks = 0;
    }

    getUniqueId() {
        return this.nodeId ? `item-${this.nodeId}-${this.id}` : `item-${this.id}`;
    }

    createDOM() {
        const itemEl = document.createElement('div');
        itemEl.className = 'node-item';
        itemEl.id = this.getUniqueId();

        if (this.type === 'image') {
            const img = document.createElement('img');
            img.src = this.data.src || '';
            img.className = 'item-image';
            itemEl.appendChild(img);
        } else if (this.type === 'text') {
            const textDiv = document.createElement('div');
            textDiv.className = 'item-text';
            textDiv.textContent = this.data.content || '';
            itemEl.appendChild(textDiv);
        } else if (this.type === 'ai-prompt') {
            const container = document.createElement('div');
            container.className = 'ai-prompt-container';

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'ai-prompt-input';
            input.placeholder = 'Describe the image...';
            input.value = this.data.prompt || '';

            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'ai-prompt-options';

            const aspectSelect = document.createElement('select');
            aspectSelect.className = 'ai-prompt-select';
            aspectSelect.innerHTML = `
                <option value="1:1" ${this.data.aspectRatio === '1:1' ? 'selected' : ''}>1:1 Square</option>
                <option value="3:4" ${this.data.aspectRatio === '3:4' ? 'selected' : ''}>3:4 Portrait</option>
                <option value="4:3" ${this.data.aspectRatio === '4:3' ? 'selected' : ''}>4:3 Landscape</option>
                <option value="9:16" ${this.data.aspectRatio === '9:16' ? 'selected' : ''}>9:16 Tall</option>
                <option value="16:9" ${this.data.aspectRatio === '16:9' ? 'selected' : ''}>16:9 Wide</option>
            `;

            const modelSelect = document.createElement('select');
            modelSelect.className = 'ai-prompt-select';
            modelSelect.innerHTML = `
                <option value="gemini-2.5-flash-image" ${this.data.model === 'gemini-2.5-flash-image' ? 'selected' : ''}>Flash (Fast)</option>
                <option value="gemini-3-pro-image" ${this.data.model === 'gemini-3-pro-image' ? 'selected' : ''}>Pro (Quality)</option>
            `;

            const submitBtn = document.createElement('button');
            submitBtn.className = 'ai-prompt-submit';
            submitBtn.textContent = '✨ Generate';

            submitBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const promptText = input.value.trim();
                if (!promptText) return;
                
                if (this.onSubmit) {
                    await this.onSubmit(promptText, this.id, {
                        aspectRatio: aspectSelect.value,
                        model: modelSelect.value
                    });
                }
            });

            optionsDiv.appendChild(aspectSelect);
            optionsDiv.appendChild(modelSelect);
            container.appendChild(input);
            container.appendChild(optionsDiv);
            container.appendChild(submitBtn);
            itemEl.appendChild(container);
        } else if (this.type === 'ai-image') {
            const container = document.createElement('div');
            container.className = 'ai-image-container';

            if (this.data.generating) {
                const spinner = document.createElement('div');
                spinner.className = 'spinner';
                spinner.innerHTML = '⏳ Generating...';
                container.appendChild(spinner);
            } else if (this.data.path) {
                const img = document.createElement('img');
                img.src = this.data.path;
                img.className = 'item-image ai-image';
                container.appendChild(img);

                const promptDiv = document.createElement('div');
                promptDiv.className = 'ai-image-prompt';
                promptDiv.textContent = `📝 ${this.data.prompt}`;
                container.appendChild(promptDiv);
            } else {
                const error = document.createElement('div');
                error.className = 'ai-image-error';
                error.textContent = '❌ Generation failed';
                container.appendChild(error);
            }

            itemEl.appendChild(container);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'item-delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleDelete(deleteBtn);
        });

        itemEl.appendChild(deleteBtn);
        
        // Add ports based on item type
        this.addPorts(itemEl);
        
        this.element = itemEl;
        return itemEl;
    }
    
    addPorts(itemEl) {
        const portsDiv = document.createElement('div');
        portsDiv.className = 'item-ports';
        
        // Determine which ports this item has
        const hasInput = ['text', 'ai-prompt'].includes(this.type);
        const hasOutput = ['text', 'image', 'ai-prompt', 'ai-image'].includes(this.type);
        
        if (hasInput) {
            const inputPort = document.createElement('div');
            inputPort.className = 'connection-port port-input item-port';
            inputPort.setAttribute('data-item-id', this.getUniqueId());
            inputPort.setAttribute('data-port-type', 'input');
            inputPort.title = 'Input';
            portsDiv.appendChild(inputPort);
        }
        
        if (hasOutput) {
            const outputPort = document.createElement('div');
            outputPort.className = 'connection-port port-output item-port';
            outputPort.setAttribute('data-item-id', this.getUniqueId());
            outputPort.setAttribute('data-port-type', 'output');
            outputPort.title = 'Output';
            portsDiv.appendChild(outputPort);
        }
        
        itemEl.appendChild(portsDiv);
    }

    handleDelete(btn) {
        this.deleteClicks++;
        
        if (this.deleteClicks === 1) {
            btn.textContent = '⚠️';
            btn.title = 'Click again to confirm';
        } else if (this.deleteClicks === 2) {
            btn.textContent = '✓ Sure?';
            btn.title = 'Click once more to delete';
        } else if (this.deleteClicks === 3) {
            this.delete();
        }

        setTimeout(() => {
            this.deleteClicks = 0;
            btn.innerHTML = '×';
            btn.title = 'Delete item';
        }, 3000);
    }

    delete() {
        if (this.element) {
            this.element.remove();
        }
        if (this.onDelete) {
            this.onDelete(this.id);
        }
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            data: this.data
        };
    }

    static fromJSON(json) {
        return new Item(json.id, json.type, json.data);
    }
}
