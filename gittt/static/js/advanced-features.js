// GitHub GUI Manager - Advanced Features
// Handles HTML preview, Python code execution, and Flask app functionality

// Wait for document ready and ensure jQuery is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Make sure jQuery is available
    if (typeof jQuery === 'undefined') {
        console.error('jQuery is not loaded. Advanced features require jQuery.');
        return;
    }
    
    // Initialize when document is fully loaded
    jQuery(function($) {
        initAdvancedFeatures();
    });
});

// Track the current Flask app process
let currentFlaskProcessId = null;
let currentFileContent = null;
let currentFileName = null;

// Initialize the advanced features
function initAdvancedFeatures() {
    console.log('Initializing advanced features...');
    
    // Add event listeners for the feature buttons
    $('#preview-html-btn').on('click', previewHtml);
    $('#run-python-btn').on('click', runPythonCode);
    $('#run-flask-btn').on('click', runFlaskApp);
    
    // Event listeners for the modal buttons
    $('#python-rerun-btn').on('click', rerunPythonCode);
    $('#flask-app-restart-btn').on('click', restartFlaskApp);
    $('#flask-app-stop-btn').on('click', stopFlaskApp);
    $('#toggle-console-btn').on('click', toggleFlaskConsole);
    
    // When closing modals with Flask app, make sure to stop the app
    $(document).on('click', '.close-modal', function() {
        if ($(this).closest('#flask-app-modal').length > 0) {
            stopFlaskApp();
        }
    });
    
    // Clean up on page unload
    window.addEventListener('beforeunload', function() {
        if (currentFlaskProcessId) {
            stopFlaskApp(true); // Silent mode
        }
    });
    
    console.log('Advanced features initialized');
}

// Function to update current file information
function setCurrentFile(content, fileName) {
    currentFileContent = content;
    currentFileName = fileName;
    
    // Show/hide specialized action buttons based on file type
    $('#preview-html-btn').addClass('hidden');
    $('#run-python-btn').addClass('hidden');
    $('#run-flask-btn').addClass('hidden');
    
    if (fileName.toLowerCase().endsWith('.html') || fileName.toLowerCase().endsWith('.htm')) {
        $('#preview-html-btn').removeClass('hidden');
    } else if (fileName.toLowerCase().endsWith('.py')) {
        $('#run-python-btn').removeClass('hidden');
        
        // Check if the file appears to be a Flask app (contains app.route or @app)
        if (content.includes('app.route') || content.includes('@app')) {
            $('#run-flask-btn').removeClass('hidden');
        }
    }
}

// Function to get the current file content (handles both edited and non-edited states)
function getCurrentFileContent() {
    // If Monaco editor is active and initialized
    if (typeof monacoEditor !== 'undefined' && $('#monaco-editor-container').is(':visible')) {
        return monacoEditor.getValue();
    }
    
    // If basic editor is active
    if ($('#editor-container').is(':visible') && $('#editor-textarea').length) {
        return $('#editor-textarea').val();
    }
    
    // Otherwise get from the file content display
    return $('#file-content').text();
}

// HTML Preview functionality
function previewHtml() {
    const content = getCurrentFileContent();
    const fileName = $('#file-name').text();
    
    if (!content) {
        showToast('error', 'Error', 'No HTML content to preview');
        return;
    }
    
    showLoading('Generating HTML preview...');
    
    $.ajax({
        url: '/preview/html',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            content: content,
            fileName: fileName
        }),
        success: function(response) {
            hideLoading();
            
            // Set the preview URL
            const previewUrl = response.previewUrl;
            $('#html-preview-frame').attr('src', previewUrl);
            $('#html-preview-open').attr('href', previewUrl);
            
            // Show the preview modal
            $('#html-preview-modal').show();
        },
        error: function(xhr) {
            hideLoading();
            showToast('error', 'Error', 'Failed to create HTML preview: ' + getErrorMessage(xhr));
        }
    });
}

// Python Code Execution
function runPythonCode() {
    const content = getCurrentFileContent();
    
    if (!content) {
        showToast('error', 'Error', 'No Python code to execute');
        return;
    }
    
    executePythonCode(content);
}

function rerunPythonCode() {
    const content = getCurrentFileContent();
    executePythonCode(content);
}

function executePythonCode(code) {
    showLoading('Executing Python code...');
    
    // Clear previous results
    $('#python-stdout').text('');
    $('#python-stderr').text('');
    $('#python-error').text('');
    $('#python-error-container').addClass('hidden');
    
    $.ajax({
        url: '/execute/python',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            code: code
        }),
        success: function(response) {
            hideLoading();
            
            // Display the results
            $('#python-stdout').text(response.stdout || 'No output');
            $('#python-stderr').text(response.stderr || 'No errors');
            
            if (response.error) {
                $('#python-error').text(response.error);
                $('#python-error-container').removeClass('hidden');
            }
            
            // Show the execution results modal
            $('#python-execution-modal').show();
        },
        error: function(xhr) {
            hideLoading();
            showToast('error', 'Error', 'Failed to execute Python code: ' + getErrorMessage(xhr));
        }
    });
}

// Flask App functionality
function runFlaskApp() {
    const content = getCurrentFileContent();
    const port = $('#flask-app-port').val() || 5050;
    
    if (!content) {
        showToast('error', 'Error', 'No Flask app code to run');
        return;
    }
    
    // Clear previous Flask state
    if (currentFlaskProcessId) {
        stopFlaskApp(true); // Silent mode
    }
    
    launchFlaskApp(content, port);
}

function restartFlaskApp() {
    const content = getCurrentFileContent();
    const port = $('#flask-app-port').val() || 5050;
    
    stopFlaskApp(true); // Silent mode
    
    // Wait a bit for the port to be released
    setTimeout(function() {
        launchFlaskApp(content, port);
    }, 1000);
}

function launchFlaskApp(code, port) {
    showLoading('Starting Flask application...');
    
    // Reset UI state
    $('#flask-app-log').text('Starting Flask application...');
    $('#flask-app-status').text('Starting...').removeClass('badge-success badge-danger').addClass('badge-info');
    $('#flask-app-frame').attr('src', 'about:blank');
    
    $.ajax({
        url: '/run_flask_app',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            code: code,
            port: port
        }),
        success: function(response) {
            hideLoading();
            
            if (response.error) {
                $('#flask-app-status').text('Error').removeClass('badge-info badge-success').addClass('badge-danger');
                $('#flask-app-log').text(response.error);
                $('#flask-app-console').removeClass('hidden');
                showToast('error', 'Error', 'Failed to start Flask app: ' + response.error);
                return;
            }
            
            // Store process ID
            currentFlaskProcessId = response.process_id;
            
            // Set up the URL and iframe
            const appUrl = `http://localhost:${port}`;
            $('#flask-app-frame').attr('src', appUrl);
            $('#flask-app-open').attr('href', appUrl);
            
            // Update status
            $('#flask-app-status').text('Running').removeClass('badge-info badge-danger').addClass('badge-success');
            
            // Show the Flask app modal
            $('#flask-app-modal').show();
            
            // Start polling for logs
            pollFlaskAppLogs();
        },
        error: function(xhr) {
            hideLoading();
            $('#flask-app-status').text('Error').removeClass('badge-info badge-success').addClass('badge-danger');
            showToast('error', 'Error', 'Failed to start Flask app: ' + getErrorMessage(xhr));
        }
    });
}

function stopFlaskApp(silent = false) {
    if (!currentFlaskProcessId) return;
    
    if (!silent) {
        showLoading('Stopping Flask application...');
    }
    
    $.ajax({
        url: '/stop_flask_app',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            process_id: currentFlaskProcessId
        }),
        success: function(response) {
            if (!silent) {
                hideLoading();
                $('#flask-app-status').text('Stopped').removeClass('badge-success badge-info').addClass('badge-danger');
                $('#flask-app-log').append('\nFlask app stopped.');
                showToast('success', 'Success', 'Flask app stopped successfully');
            }
            currentFlaskProcessId = null;
        },
        error: function(xhr) {
            if (!silent) {
                hideLoading();
                showToast('error', 'Error', 'Failed to stop Flask app: ' + getErrorMessage(xhr));
            }
            console.error('Error stopping Flask app:', xhr.responseText);
            currentFlaskProcessId = null;
        }
    });
}

function pollFlaskAppLogs() {
    if (!currentFlaskProcessId) return;
    
    $.ajax({
        url: '/flask_app_logs',
        method: 'GET',
        data: {
            process_id: currentFlaskProcessId
        },
        success: function(response) {
            if (response.log) {
                $('#flask-app-log').text(response.log);
                
                // Auto-scroll to bottom of log
                const logElement = document.getElementById('flask-app-log');
                if (logElement) {
                    logElement.scrollTop = logElement.scrollHeight;
                }
            }
            
            if (currentFlaskProcessId) {
                // Continue polling every 2 seconds
                setTimeout(pollFlaskAppLogs, 2000);
            }
        },
        error: function(xhr) {
            console.error('Error polling Flask app logs:', getErrorMessage(xhr));
            if (currentFlaskProcessId) {
                // Retry after longer delay on error
                setTimeout(pollFlaskAppLogs, 5000);
            }
        }
    });
}

function toggleFlaskConsole() {
    const consoleElement = $('#flask-app-console');
    const toggleIcon = $('#toggle-console-btn i');
    
    if (consoleElement.hasClass('hidden')) {
        consoleElement.removeClass('hidden');
        toggleIcon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    } else {
        consoleElement.addClass('hidden');
        toggleIcon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
    }
}

// Helper function to extract error message from XHR response
function getErrorMessage(xhr) {
    if (!xhr) return 'Unknown error';
    
    try {
        const response = JSON.parse(xhr.responseText);
        return response.error || xhr.statusText || 'Unknown error';
    } catch (e) {
        return xhr.statusText || 'Unknown error';
    }
}

// Function to be called by main script.js when a file is opened
function notifyFileOpened(content, fileName) {
    setCurrentFile(content, fileName);
}
