class StreamProcessor {
    static extractChunk(chunkText) {
        const jsonText = StreamProcessor.cleanLine(chunkText);
        const chunkJson = StreamProcessor.stringToJson(jsonText);

        const fns = [
            (json) => json['choices'][0]['delta']['content'],
            (json) => json['message']['content'],
            (json) => json['response'],
        ];

        for (let fn of fns) {
            try {
                const content = fn(chunkJson);
                if (!!content) return content;
            } catch (ignore) {
            }
        }
        return '';
    }

    static cleanLine(text) {
        if (!text) return null;
        const t1 = text.startsWith("data: ") ? text.substring(6) : text;
        return t1.replace(/data: \[DONE\]$/, '');
    }

    static stringToJson(jsonString) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            return {};
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const urlInput = document.getElementById('url');
    const tokenInput = document.getElementById('token');
    const promptInput = document.getElementById('prompt');
    const sendBtn = document.getElementById('sendBtn');
    const clearBtn = document.getElementById('clearBtn');
    const requestModeSelect = document.getElementById('requestMode');
    const conversationDiv = document.getElementById('conversation');

    // State variables
    let isProcessing = false;
    let currentResponseDiv = null;

    // Send the API request
    function sendApiRequest(prompt) {
        if (isProcessing || !prompt.trim()) return;
        
        isProcessing = true;
        promptInput.disabled = true;
        sendBtn.disabled = true;
        clearBtn.disabled = true;
        
        // Display user message
        addUserMessage(prompt);
        
        // Clear prompt input
        promptInput.value = '';
        
        // Prepare request
        const url = urlInput.value;
        const token = tokenInput.value;
        const headers = {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        
        // Use the postJson method which automatically sets Content-Type to application/json
        const input = ApiClientInput.postJson(url, { prompt: prompt }, headers);
        
        // Create a new response container
        currentResponseDiv = createResponseContainer();
        
        // Check request mode
        const requestMode = requestModeSelect.value;
        
        if (requestMode === 'stream') {
            // Use streaming API
            ApiClient.stream(
                input,
                onStart,
                onChunk,
                onFinish,
                onFailure
            );
        } else {
            // Use non-streaming API
            ApiClient.send(input)
                .then(output => {
                    onStart();
                    try {
                        if (output.isSuccessful()) {
                            let content = '';
                            const rawBody = output.body || '';
                            
                            // Check if the response looks like streaming format with "data:" prefix
                            if (rawBody.includes('data:')) {
                                // Handle streaming-style response in non-streaming mode
                                const chunks = rawBody.split('data:').filter(chunk => chunk.trim());
                                
                                // Process each chunk using StreamProcessor
                                chunks.forEach(chunk => {
                                    const extractedContent = StreamProcessor.extractChunk(chunk);
                                    if (extractedContent) {
                                        content += extractedContent;
                                    }
                                });
                                
                                // If we couldn't extract any content, show a formatted version of the raw body
                                if (!content.trim()) {
                                    content = "Server returned streaming data. Here's the formatted content:\n\n";
                                    chunks.forEach((chunk, index) => {
                                        try {
                                            const jsonChunk = JSON.parse(chunk.trim());
                                            content += `Chunk ${index+1}:\n${JSON.stringify(jsonChunk, null, 2)}\n\n`;
                                        } catch (e) {
                                            content += `Chunk ${index+1} (Invalid JSON):\n${chunk.trim()}\n\n`;
                                        }
                                    });
                                }
                            } else {
                                // Try to parse as standard JSON
                                const jsonBody = output.parseJsonBody();
                                
                                // Try to extract content using different formats
                                if (jsonBody) {
                                    try {
                                        if (jsonBody.choices && jsonBody.choices[0] && jsonBody.choices[0].message) {
                                            content = jsonBody.choices[0].message.content;
                                        } else if (jsonBody.message && jsonBody.message.content) {
                                            content = jsonBody.message.content;
                                        } else if (jsonBody.response) {
                                            content = jsonBody.response;
                                        } else {
                                            // Fallback to the structured response
                                            content = JSON.stringify(jsonBody, null, 2);
                                        }
                                    } catch (e) {
                                        content = JSON.stringify(jsonBody, null, 2);
                                    }
                                } else {
                                    // Use raw body if JSON parsing failed
                                    content = rawBody;
                                }
                            }
                            
                            updateResponseContainer(currentResponseDiv, content);
                        } else {
                            // Handle error response
                            updateResponseContainer(currentResponseDiv, `Error: ${output.getFailureReason() || 'Unknown error'}\n${output.body || ''}`);
                        }
                    } catch (error) {
                        updateResponseContainer(currentResponseDiv, `Error processing response: ${error.message}`);
                    }
                    onFinish(output);
                })
                .catch(error => {
                    onFailure(ApiClientOutput.createForError(error));
                });
        }
    }

    // Add a user message to the display
    function addUserMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.textContent = message;
        conversationDiv.appendChild(messageDiv);
        conversationDiv.scrollTop = conversationDiv.scrollHeight;
    }

    // Create a new API response container
    function createResponseContainer() {
        const responseDiv = document.createElement('div');
        responseDiv.className = 'message api-message';
        conversationDiv.appendChild(responseDiv);
        conversationDiv.scrollTop = conversationDiv.scrollHeight;
        return responseDiv;
    }

    // Update response container with new content
    function updateResponseContainer(container, content) {
        if (container) {
            container.textContent += content;
            conversationDiv.scrollTop = conversationDiv.scrollHeight;
        }
    }

    // API callbacks
    function onStart() {
        console.log('Request started');
    }

    function onChunk(chunk) {
        try {
            // Process chunk lines
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            lines.forEach(line => {
                // Extract content from the chunk
                const content = StreamProcessor.extractChunk(line);
                if (content) {
                    updateResponseContainer(currentResponseDiv, content);
                }
            });
        } catch (error) {
            console.error('Error processing chunk:', error);
            updateResponseContainer(currentResponseDiv, `\nError processing response: ${error.message}`);
        }
    }

    function onFinish(output) {
        console.log('Request finished');
        isProcessing = false;
        promptInput.disabled = false;
        sendBtn.disabled = false;
        clearBtn.disabled = false;
        
        // Focus back on the input field for the next message
        promptInput.focus();
    }

    function onFailure(error) {
        console.error('Request error:', error);
        updateResponseContainer(currentResponseDiv, `\nError: ${error.getFailureReason ? error.getFailureReason() : error.message || 'Unknown error'}`);
        isProcessing = false;
        promptInput.disabled = false;
        sendBtn.disabled = false;
        clearBtn.disabled = false;
    }

    // Clear messages button
    clearBtn.addEventListener('click', function() {
        if (!isProcessing) {
            conversationDiv.innerHTML = '';
            currentResponseDiv = null;
        } else {
            alert('Please wait until the current request is completed.');
        }
    });

    // Event listeners
    promptInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && promptInput.value.trim() && !isProcessing) {
            sendApiRequest(promptInput.value.trim());
        }
    });
    
    // Send button click handler
    sendBtn.addEventListener('click', function() {
        if (promptInput.value.trim() && !isProcessing) {
            sendApiRequest(promptInput.value.trim());
        }
    });
});