document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const modelSelectorBtn = document.getElementById('model-selector-btn');
    const modelDropdown = document.getElementById('model-dropdown');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatContainer = document.getElementById('chat-container');
    const newChatBtn = document.getElementById('new-chat-btn');
    const appContainer = document.querySelector('.app-container');

    // Toggle Sidebar on Mobile
    menuToggle?.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Toggle Model Dropdown
    modelSelectorBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        modelDropdown.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!modelDropdown.contains(e.target) && e.target !== modelSelectorBtn) {
            modelDropdown.classList.remove('active');
        }
    });

    // New Chat / Clear Functionality
    newChatBtn?.addEventListener('click', () => {
        // Clear messages (except welcome screen)
        const messages = chatContainer.querySelectorAll('.message');
        messages.forEach(msg => msg.remove());
        
        // Reset UI to centered state
        appContainer.classList.remove('chat-started');
        
        // Clear input
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // On mobile, close sidebar
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }
    });


    // Dynamic Model Rendering
    const dynamicModelList = document.getElementById('dynamic-model-list');
    const currentModelName = document.querySelector('.current-model');
    
    function renderModels() {
        if (!dynamicModelList || typeof MODEL_CATEGORIES === 'undefined') return;
        
        dynamicModelList.innerHTML = '';
        let isFirstModel = true;

        MODEL_CATEGORIES.forEach(category => {
            // Add Category Header
            const header = document.createElement('div');
            header.className = 'model-category-header';
            header.textContent = category.name;
            dynamicModelList.appendChild(header);

            if (category.models.length === 0) {
                // Add empty state
                const emptyState = document.createElement('div');
                emptyState.className = 'empty-category';
                emptyState.textContent = 'Coming soon...';
                dynamicModelList.appendChild(emptyState);
            } else {
                // Add models
                category.models.forEach(model => {
                    const item = document.createElement('div');
                    item.className = `model-item ${isFirstModel ? 'active' : ''}`;
                    item.dataset.model = model.id;
                    item.dataset.type = model.type;
                    
                    const pricingText = model.pricing === 'paid' ? 'Paid' : 'Free';
                    const pricingClass = model.pricing === 'paid' ? 'paid' : 'free';
                    
                    item.innerHTML = `
                        <div class="model-meta">
                            <span class="model-name">${model.name}</span>
                            <span class="model-provider">${model.provider}</span>
                        </div>
                        <span class="badge ${pricingClass}">${pricingText}</span>
                    `;

                    if (isFirstModel) {
                        currentModelName.textContent = `${model.name} (${pricingText})`;
                        isFirstModel = false;
                    }

                    item.addEventListener('click', () => {
                        document.querySelectorAll('.model-item').forEach(i => i.classList.remove('active'));
                        item.classList.add('active');
                        currentModelName.textContent = `${model.name} (${pricingText})`;
                        modelDropdown.classList.remove('active');
                    });

                    dynamicModelList.appendChild(item);
                });
            }
        });
    }

    renderModels();

    // Auto-resize Textarea
    userInput?.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    });

    // Handle Sending Messages
    const handleSend = async () => {
        const text = userInput.value.trim();
        if (text) {
            // Hide welcome screen and move input to bottom
            document.querySelector('.app-container').classList.add('chat-started');

            addMessage('user', text);
            userInput.value = '';
            userInput.style.height = 'auto';
            
            // Get selected model
            const activeModelItem = document.querySelector('.model-item.active');
            const modelName = activeModelItem ? activeModelItem.dataset.model : "inclusionai/ring-2.6-1t:free";
            const modelType = activeModelItem ? activeModelItem.dataset.type : "chat";

            const aiMessageElement = createMessageElement('ai', '');
            const aiTextElement = aiMessageElement.querySelector('p');
            
            // Show typing indicator
            aiTextElement.innerHTML = `
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            `;

            const originalSendBtnContent = sendBtn.innerHTML;
            sendBtn.innerHTML = '<div class="spinner"></div>';
            sendBtn.disabled = true;

            try {
                if (modelType === 'embed') {
                    // Handle Embedding Model
                    const response = await fetch('http://localhost:8000/embed', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: modelName,
                            text: text,
                            image_url: "https://live.staticflickr.com/3851/14825276609_098cac593d_b.jpg"
                        })
                    });

                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                    const data = await response.json();
                    if (data.error) {
                        aiTextElement.textContent = `Error: ${data.error}`;
                    } else if (data.data && data.data[0] && data.data[0].embedding) {
                        const embedVector = data.data[0].embedding.slice(0, 5);
                        aiTextElement.innerHTML = `<strong>Embedding Vector (first 5 floats):</strong><br>[${embedVector.join(', ')}...]`;
                    }

                } else if (modelType === 'image') {
                    // Handle Image Generation Model
                    const response = await fetch('http://localhost:8000/chat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: modelName,
                            messages: [{ role: 'user', content: text }],
                            stream: false,
                            modalities: ["image"]
                        })
                    });

                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                    const data = await response.json();
                    if (data.error) {
                        aiTextElement.textContent = `Error: ${data.error}`;
                    } else {
                        const message = data.choices?.[0]?.message;
                        if (message && message.images) {
                            aiTextElement.innerHTML = ''; // Clear generating text
                            message.images.forEach(img => {
                                const imgTag = document.createElement('img');
                                imgTag.src = img.image_url.url;
                                imgTag.style.maxWidth = '100%';
                                imgTag.style.borderRadius = '12px';
                                imgTag.style.marginTop = '10px';
                                imgTag.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
                                aiTextElement.appendChild(imgTag);
                            });
                        } else {
                            aiTextElement.textContent = "No image was generated. Check API response.";
                            console.log("Image response data:", data);
                        }
                    }

                } else if (modelType === 'video') {

                    // Handle Video Generation Model
                    aiTextElement.innerHTML = 'Submitting video request... <div class="spinner" style="display:inline-block; width:12px; height:12px; margin-left:8px;"></div>';
                    
                    const response = await fetch('http://localhost:8000/video', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: modelName,
                            prompt: text
                        })
                    });

                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                    const data = await response.json();
                    if (data.error) {
                        aiTextElement.textContent = `Error: ${data.error}`;
                    } else if (data.id && data.polling_url) {
                        const pollingUrl = data.polling_url;
                        aiTextElement.innerHTML = `Video generation started. Polling status... <div class="spinner" style="display:inline-block; width:12px; height:12px; margin-left:8px;"></div>`;
                        
                        // Start polling
                        const pollInterval = setInterval(async () => {
                            try {
                                const pollResponse = await fetch(`http://localhost:8000/video/status?polling_url=${encodeURIComponent(pollingUrl)}`);
                                if (!pollResponse.ok) throw new Error(`Polling HTTP error!`);
                                
                                const statusData = await pollResponse.json();
                                
                                if (statusData.error) {
                                    clearInterval(pollInterval);
                                    aiTextElement.textContent = `Error: ${statusData.error}`;
                                    sendBtn.disabled = false;
                                    sendBtn.innerHTML = originalSendBtnContent;
                                } else if (statusData.status === 'completed') {
                                    clearInterval(pollInterval);
                                    aiTextElement.innerHTML = ''; // Clear text
                                    
                                    const urls = statusData.unsigned_urls || [];
                                    if (urls.length > 0) {
                                        urls.forEach(url => {
                                            const videoTag = document.createElement('video');
                                            videoTag.src = url;
                                            videoTag.controls = true;
                                            videoTag.autoplay = true;
                                            videoTag.loop = true;
                                            videoTag.style.maxWidth = '100%';
                                            videoTag.style.borderRadius = '12px';
                                            videoTag.style.marginTop = '10px';
                                            videoTag.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
                                            aiTextElement.appendChild(videoTag);
                                        });
                                    } else {
                                        aiTextElement.textContent = "Video completed but no URL returned.";
                                    }
                                    sendBtn.disabled = false;
                                    sendBtn.innerHTML = originalSendBtnContent;
                                    
                                } else if (statusData.status === 'failed') {
                                    clearInterval(pollInterval);
                                    aiTextElement.textContent = `Video generation failed: ${statusData.error || 'Unknown error'}`;
                                    sendBtn.disabled = false;
                                    sendBtn.innerHTML = originalSendBtnContent;
                                }
                                // If status is pending/processing, do nothing and wait for next poll
                            } catch (e) {
                                console.error('Polling error:', e);
                                // Don't clear interval on network error, keep trying
                            }
                        }, 5000);
                        
                        // Return early so we don't re-enable the send button in the `finally` block
                        return;
                    }

                } else {
                    // Handle Chat Models (Streaming SSE)
                    const response = await fetch('http://localhost:8000/chat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: modelName,
                            messages: [{ role: 'user', content: text }]
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder('utf-8');
                    let isFirstChunk = true;
                    let aiResponseText = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');
                        
                        for (const line of lines) {
                            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                                try {
                                    const dataStr = line.substring(6);
                                    const data = JSON.parse(dataStr);
                                    
                                    if (data.error) {
                                        aiTextElement.textContent = `Error: ${data.error}`;
                                        continue;
                                    }

                                    if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                                        if (isFirstChunk) {
                                            aiTextElement.innerHTML = ''; // Clear typing indicator
                                            isFirstChunk = false;
                                        }
                                        const content = data.choices[0].delta.content;
                                        aiTextElement.textContent += content;
                                        chatContainer.scrollTop = chatContainer.scrollHeight;
                                    }
                                } catch (e) {
                                    console.error('Error parsing SSE chunk', e, line);
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Error connecting to backend:", error);
                aiTextElement.textContent = "Error connecting to backend. Is the FastAPI server running on port 8000?";
            } finally {
                sendBtn.disabled = false;
            }
        }
    };

    sendBtn?.addEventListener('click', handleSend);
    userInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled) handleSend();
        }
    });

    // Helper: Add Message to UI
    function addMessage(role, text) {
        const messageDiv = createMessageElement(role, text);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return messageDiv;
    }

    function createMessageElement(role, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const textP = document.createElement('p');
        textP.textContent = text;
        
        contentDiv.appendChild(textP);
        messageDiv.appendChild(contentDiv);
        chatContainer.appendChild(messageDiv);
        return messageDiv;
    }
});
