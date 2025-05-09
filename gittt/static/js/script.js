// GitHub GUI Manager - Main JavaScript

// Global state
const state = {
    currentRepo: null,
    currentRepoOwner: null,
    currentPath: '',
    currentBranch: 'main',
    currentFile: null,
    branches: [],
    fileContent: null,
    fileSha: null
};

// DOM Elements
const elements = {
    // Theme toggle
    themeToggle: document.getElementById('theme-toggle'),
    
    // Repository list
    repoList: document.getElementById('repo-list'),
    repoSearch: document.getElementById('repo-search'),
    
    // Main content screens
    welcomeScreen: document.getElementById('welcome-screen'),
    repoExplorer: document.getElementById('repo-explorer'),
    
    // Repository explorer elements
    repoName: document.getElementById('repo-name'),
    repoVisibility: document.getElementById('repo-visibility'),
    currentBranch: document.getElementById('current-branch'),
    branchSelector: document.getElementById('branch-selector'),
    refreshBtn: document.getElementById('refresh-btn'),
    uploadBtn: document.getElementById('upload-btn'),
    newFileBtn: document.getElementById('new-file-btn'),
    newBranchBtn: document.getElementById('new-branch-btn'),
    breadcrumbs: document.getElementById('breadcrumbs'),
    fileExplorer: document.getElementById('file-explorer'),
    
    // File viewer elements
    fileViewer: document.getElementById('file-viewer'),
    fileName: document.getElementById('file-name'),
    fileContent: document.getElementById('file-content'),
    downloadFileBtn: document.getElementById('download-file-btn'),
    editFileBtn: document.getElementById('edit-file-btn'),
    deleteFileBtn: document.getElementById('delete-file-btn'),
    closeFileBtn: document.getElementById('close-file-btn'),
    
    // File editor elements
    fileEditor: document.getElementById('file-editor'),
    editorTextarea: document.getElementById('editor-textarea'),
    cancelEditBtn: document.getElementById('cancel-edit-btn'),
    saveFileBtn: document.getElementById('save-file-btn'),
    
    // Branch dropdown
    branchDropdown: document.getElementById('branch-dropdown'),
    branchSearch: document.getElementById('branch-search'),
    branchList: document.getElementById('branch-list'),
    closeBranchDropdown: document.getElementById('close-branch-dropdown'),
    
    // Action buttons
    createRepoBtn: document.getElementById('create-repo-btn'),
    cloneRepoBtn: document.getElementById('clone-repo-btn'),
    newRepoBtn: document.getElementById('new-repo-btn'),
    
    // Modal elements
    newRepoModal: document.getElementById('new-repo-modal'),
    cloneRepoModal: document.getElementById('clone-repo-modal'),
    uploadModal: document.getElementById('upload-modal'),
    newBranchModal: document.getElementById('new-branch-modal'),
    confirmModal: document.getElementById('confirm-modal'),
    
    // Form elements
    newRepoForm: document.getElementById('new-repo-form'),
    repoNameInput: document.getElementById('repo-name-input'),
    repoDescription: document.getElementById('repo-description'),
    repoPrivate: document.getElementById('repo-private'),
    createRepoSubmit: document.getElementById('create-repo-submit'),
    
    cloneRepoForm: document.getElementById('clone-repo-form'),
    repoOwner: document.getElementById('repo-owner'),
    repoNameClone: document.getElementById('repo-name-clone'),
    cloneRepoSubmit: document.getElementById('clone-repo-submit'),
    
    uploadForm: document.getElementById('upload-form'),
    fileUpload: document.getElementById('file-upload'),
    commitMessage: document.getElementById('commit-message'),
    uploadSubmit: document.getElementById('upload-submit'),
    
    newBranchForm: document.getElementById('new-branch-form'),
    baseBranch: document.getElementById('base-branch'),
    newBranchName: document.getElementById('new-branch-name'),
    createBranchSubmit: document.getElementById('create-branch-submit'),
    
    confirmMessage: document.getElementById('confirm-message'),
    confirmAction: document.getElementById('confirm-action'),
    
    // Toast container
    toastContainer: document.getElementById('toast-container'),
    
    // Loading overlay
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingMessage: document.getElementById('loading-message')
};

// Initialize the application
function init() {
    console.log('Initializing GitHub GUI Manager...');
    
    initTheme();
    setupEventListeners();
    
    // Load repositories if user is authenticated
    if (elements.repoList) {
        loadRepositories();
    }
    
    // Initialize the new close button
    if (document.getElementById('close-file-x-btn')) {
        document.getElementById('close-file-x-btn').addEventListener('click', closeFileViewer);
    }
}

// Theme functionality
function initTheme() {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    // Apply system preference if no saved preference
    if (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }
}

// Toggle between light and dark themes
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }
    
    // Update Monaco editor theme if it exists
    if (window.monaco && window.editor) {
        window.editor.updateOptions({ 
            theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'vs-dark' : 'vs'
        });
    }
}

// Set up event listeners
function setupEventListeners() {
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Repository search
    elements.repoSearch.addEventListener('input', filterRepositories);
    
    // Action buttons
    elements.createRepoBtn.addEventListener('click', () => showModal(elements.newRepoModal));
    elements.cloneRepoBtn.addEventListener('click', () => showModal(elements.cloneRepoModal));
    elements.newRepoBtn.addEventListener('click', () => showModal(elements.newRepoModal));
    elements.refreshBtn.addEventListener('click', refreshCurrentRepo);
    elements.uploadBtn.addEventListener('click', () => showModal(elements.uploadModal));
    elements.newFileBtn.addEventListener('click', createNewFile);
    elements.newBranchBtn.addEventListener('click', openNewBranchModal);
    
    // File viewer actions
    elements.downloadFileBtn.addEventListener('click', downloadCurrentFile);
    elements.editFileBtn.addEventListener('click', editCurrentFile);
    elements.deleteFileBtn.addEventListener('click', confirmDeleteFile);
    elements.closeFileBtn.addEventListener('click', closeFileViewer);
    
    // File editor actions
    elements.cancelEditBtn.addEventListener('click', cancelEdit);
    elements.saveFileBtn.addEventListener('click', saveFileChanges);
    
    // Initialize Monaco Editor when editing a file
    elements.editFileBtn.addEventListener('click', () => {
        if (window.monaco && !window.editor) {
            setTimeout(() => initMonacoEditor(), 100);
        }
    });
    
    // Branch dropdown
    elements.branchSelector.addEventListener('click', toggleBranchDropdown);
    elements.closeBranchDropdown.addEventListener('click', closeBranchDropdown);
    elements.branchSearch.addEventListener('input', filterBranches);
    
    // Form submissions
    elements.createRepoSubmit.addEventListener('click', createRepository);
    elements.cloneRepoSubmit.addEventListener('click', cloneRepository);
    elements.uploadSubmit.addEventListener('click', uploadFile);
    elements.createBranchSubmit.addEventListener('click', createBranch);
    
    // Close modals
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', event => {
            const modal = event.target.closest('.modal');
            hideModal(modal);
        });
    });
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', event => {
            if (event.target === modal) {
                hideModal(modal);
            }
        });
    });
    
    // Close branch dropdown when clicking outside
    document.addEventListener('click', event => {
        if (elements.branchDropdown.style.display === 'flex' && 
            !elements.branchDropdown.contains(event.target) && 
            !elements.branchSelector.contains(event.target)) {
            closeBranchDropdown();
        }
    });
}

// API Functions
async function fetchAPI(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'API request failed');
        }
        return await response.json();
    } catch (error) {
        showToast('error', 'Error', error.message);
        throw error;
    }
}

// Load repositories
async function loadRepositories() {
    console.log('Loading repositories...');
    showLoading('Loading repositories...');
    try {
        const repos = await fetchAPI('/repos');
        console.log('Repositories loaded:', repos);
        renderRepositories(repos);
    } catch (error) {
        console.error('Failed to load repositories:', error);
        elements.repoList.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i> Failed to load repositories
            </div>
        `;
    } finally {
        hideLoading();
    }
}

// Create a new repository
async function createRepository() {
    const name = elements.repoNameInput.value.trim();
    const description = elements.repoDescription.value.trim();
    const isPrivate = elements.repoPrivate.checked;
    
    if (!name) {
        showToast('error', 'Error', 'Repository name is required');
        return;
    }
    
    showLoading('Creating repository...');
    try {
        const data = await fetchAPI('/create_repo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                description,
                private: isPrivate
            })
        });
        
        showToast('success', 'Success', `Repository "${name}" created successfully`);
        hideModal(elements.newRepoModal);
        
        // Reset form
        elements.newRepoForm.reset();
        
        // Reload repositories
        loadRepositories();
        
        // Open the new repository
        setTimeout(() => {
            openRepository(data.owner.login, data.name);
        }, 1000);
    } catch (error) {
        console.error('Failed to create repository:', error);
        showToast('error', 'Error', `Failed to create repository: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Clone an existing repository
async function cloneRepository() {
    const repoOwner = elements.repoOwner.value.trim();
    const repoName = elements.repoNameClone.value.trim();
    
    if (!repoOwner || !repoName) {
        showToast('error', 'Error', 'Repository owner and name are required');
        return;
    }
    
    showLoading('Cloning repository...');
    try {
        await fetchAPI('/clone_repo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                repo_owner: repoOwner,
                repo_name: repoName
            })
        });
        
        showToast('success', 'Success', `Repository "${repoOwner}/${repoName}" cloned successfully`);
        hideModal(elements.cloneRepoModal);
        
        // Reset form
        elements.cloneRepoForm.reset();
        
        // Open the cloned repository
        openRepository(repoOwner, repoName);
    } catch (error) {
        console.error('Failed to clone repository:', error);
        showToast('error', 'Error', `Failed to clone repository: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Get repository contents
async function getRepositoryContents(owner, repo, path = '', branch = 'main') {
    showLoading('Loading repository contents...');
    try {
        const contents = await fetchAPI(`/repo_contents?owner=${owner}&repo=${repo}&path=${path}`);
        return contents;
    } catch (error) {
        console.error('Failed to fetch repository contents:', error);
        showToast('error', 'Error', `Failed to load contents: ${error.message}`);
        throw error;
    } finally {
        hideLoading();
    }
}

// Get file content
async function getFileContent(owner, repo, path) {
    showLoading('Loading file...');
    try {
        const content = await fetchAPI(`/file_content?owner=${owner}&repo=${repo}&path=${path}`);
        return content;
    } catch (error) {
        console.error('Failed to fetch file content:', error);
        showToast('error', 'Error', `Failed to load file: ${error.message}`);
        throw error;
    } finally {
        hideLoading();
    }
}

// Track upload type selection
document.addEventListener('DOMContentLoaded', function() {
    const fileRadio = document.getElementById('upload-file');
    const folderRadio = document.getElementById('upload-folder');
    const fileUploadGroup = document.querySelector('.file-upload-group');
    const folderUploadGroup = document.querySelector('.folder-upload-group');
    
    if (fileRadio && folderRadio) {
        fileRadio.addEventListener('change', function() {
            if (this.checked) {
                fileUploadGroup.classList.remove('hidden');
                folderUploadGroup.classList.add('hidden');
            }
        });
        
        folderRadio.addEventListener('change', function() {
            if (this.checked) {
                fileUploadGroup.classList.add('hidden');
                folderUploadGroup.classList.remove('hidden');
            }
        });
    }
});

// Upload a file or folder to repository
async function uploadFile() {
    const uploadType = document.querySelector('input[name="upload-type"]:checked').value;
    const commitMessage = elements.commitMessage.value.trim();
    
    if (uploadType === 'file') {
        // Single file upload
        const fileInput = elements.fileUpload;
        
        if (!fileInput.files || fileInput.files.length === 0) {
            showToast('error', 'Error', 'Please select a file to upload');
            return;
        }
        
        const file = fileInput.files[0];
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('owner', state.currentRepoOwner);
        formData.append('repo', state.currentRepo);
        formData.append('path', state.currentPath);
        formData.append('message', commitMessage);
        
        showLoading('Uploading file...');
        try {
            const response = await fetch('/upload_file', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }
            
            showToast('success', 'Success', `File "${file.name}" uploaded successfully`);
            hideModal(elements.uploadModal);
            
            // Reset form
            elements.uploadForm.reset();
            
            // Refresh current directory
            refreshCurrentRepo();
        } catch (error) {
            console.error('Failed to upload file:', error);
            showToast('error', 'Error', `Failed to upload file: ${error.message}`);
        } finally {
            hideLoading();
        }
    } else {
        // Folder upload
        const folderInput = document.getElementById('folder-upload');
        
        if (!folderInput.files || folderInput.files.length === 0) {
            showToast('error', 'Error', 'Please select a folder to upload');
            return;
        }
        
        const files = folderInput.files;
        const formData = new FormData();
        
        // Add all files to the form data
        for (let i = 0; i < files.length; i++) {
            formData.append('files[]', files[i]);
        }
        
        formData.append('owner', state.currentRepoOwner);
        formData.append('repo', state.currentRepo);
        formData.append('path', state.currentPath);
        formData.append('message', commitMessage);
        
        showLoading(`Uploading folder with ${files.length} files...`);
        try {
            const response = await fetch('/upload_folder', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }
            
            const result = await response.json();
            showToast('success', 'Success', result.message);
            hideModal(elements.uploadModal);
            
            // Reset form
            elements.uploadForm.reset();
            
            // Refresh current directory
            refreshCurrentRepo();
        } catch (error) {
            console.error('Failed to upload folder:', error);
            showToast('error', 'Error', `Failed to upload folder: ${error.message}`);
        } finally {
            hideLoading();
        }
    }
}

// Update file content
async function updateFile(content, message) {
    showLoading('Saving changes...');
    try {
        await fetchAPI('/update_file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                owner: state.currentRepoOwner,
                repo: state.currentRepo,
                path: state.currentFile.path,
                content: content,
                sha: state.fileSha,
                message: message || 'Update file via GitHub GUI Manager'
            })
        });
        
        showToast('success', 'Success', 'File updated successfully');
        
        // Reload file content
        const fileData = await getFileContent(state.currentRepoOwner, state.currentRepo, state.currentFile.path);
        state.fileContent = fileData.content;
        state.fileSha = fileData.sha;
        
        // Update UI
        elements.fileContent.textContent = state.fileContent;
        elements.fileEditor.style.display = 'none';
        elements.fileContent.style.display = 'block';
    } catch (error) {
        console.error('Failed to update file:', error);
        showToast('error', 'Error', `Failed to update file: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Delete a file
async function deleteFile() {
    showLoading('Deleting file...');
    try {
        await fetchAPI('/delete_file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                owner: state.currentRepoOwner,
                repo: state.currentRepo,
                path: state.currentFile.path,
                sha: state.fileSha,
                message: 'Delete file via GitHub GUI Manager'
            })
        });
        
        showToast('success', 'Success', `File "${state.currentFile.name}" deleted successfully`);
        
        // Close file viewer
        closeFileViewer();
        
        // Refresh current directory
        refreshCurrentRepo();
    } catch (error) {
        console.error('Failed to delete file:', error);
        showToast('error', 'Error', `Failed to delete file: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Get branches
async function getBranches() {
    showLoading('Loading branches...');
    try {
        const branches = await fetchAPI(`/branches?owner=${state.currentRepoOwner}&repo=${state.currentRepo}`);
        return branches;
    } catch (error) {
        console.error('Failed to fetch branches:', error);
        showToast('error', 'Error', `Failed to load branches: ${error.message}`);
        throw error;
    } finally {
        hideLoading();
    }
}

// Create a new branch
async function createBranch() {
    const baseBranch = elements.baseBranch.value;
    const newBranch = elements.newBranchName.value.trim();
    
    if (!newBranch) {
        showToast('error', 'Error', 'Branch name is required');
        return;
    }
    
    showLoading('Creating branch...');
    try {
        await fetchAPI('/create_branch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                owner: state.currentRepoOwner,
                repo: state.currentRepo,
                base_branch: baseBranch,
                new_branch: newBranch
            })
        });
        
        showToast('success', 'Success', `Branch "${newBranch}" created successfully`);
        hideModal(elements.newBranchModal);
        
        // Reset form
        elements.newBranchForm.reset();
        
        // Refresh branches and switch to the new branch
        await loadBranches();
        switchBranch(newBranch);
    } catch (error) {
        console.error('Failed to create branch:', error);
        showToast('error', 'Error', `Failed to create branch: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// UI Functions
// Render repositories in the sidebar
function renderRepositories(repos) {
    console.log('Rendering repositories:', repos);
    if (!repos || repos.length === 0) {
        console.log('No repositories found');
        elements.repoList.innerHTML = `
            <div class="no-data">
                <i class="fas fa-folder-open"></i>
                <p>No repositories found</p>
            </div>
        `;
        return;
    }
    
    // Sort repos by updated_at (most recent first)
    repos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    
    const repoItems = repos.map(repo => {
        return `
            <div class="repo-item" data-repo="${repo.name}" data-owner="${repo.owner.login}">
                <div class="repo-item-name">
                    <i class="fas ${repo.private ? 'fa-lock' : 'fa-book'}"></i>
                    ${repo.name}
                </div>
                ${repo.description ? `<div class="repo-item-description">${repo.description}</div>` : ''}
                <div class="repo-item-meta">
                    <span><i class="fas fa-code-branch"></i> ${repo.default_branch}</span>
                    <span><i class="fas ${repo.private ? 'fa-lock' : 'fa-globe'}"></i> ${repo.private ? 'Private' : 'Public'}</span>
                </div>
            </div>
        `;
    }).join('');
    
    elements.repoList.innerHTML = repoItems;
    
    // Add click event to repository items
    document.querySelectorAll('.repo-item').forEach(item => {
        item.addEventListener('click', () => {
            const repoName = item.dataset.repo;
            const repoOwner = item.dataset.owner;
            if (repoName && repoOwner) {
                openRepository(repoOwner, repoName);
            }
        });
    });
}

// Filter repositories
function filterRepositories() {
    const searchTerm = elements.repoSearch.value.toLowerCase();
    const repoItems = document.querySelectorAll('.repo-item');
    
    repoItems.forEach(item => {
        const repoName = item.dataset.repo.toLowerCase();
        const repoDesc = item.querySelector('.repo-item-description')?.textContent.toLowerCase() || '';
        
        if (repoName.includes(searchTerm) || repoDesc.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Open a repository
async function openRepository(owner, repo) {
    showLoading('Opening repository...');
    
    try {
        // Close any open file first
        closeFileViewer();
        
        // Update state
        state.currentRepoOwner = owner;
        state.currentRepo = repo;
        state.currentPath = '';
        state.currentBranch = 'main';
        
        // Update UI
        elements.repoName.textContent = repo;
        elements.repoVisibility.textContent = 'Loading...'; // Will be updated later
        elements.welcomeScreen.classList.add('hidden');
        elements.repoExplorer.classList.remove('hidden');
        elements.currentBranch.textContent = state.currentBranch;
        
        // Load branches
        await loadBranches();
        
        // Load contents
        const contents = await getRepositoryContents(owner, repo);
        renderContents(contents);
        
        // Update breadcrumbs
        updateBreadcrumbs();
    } catch (error) {
        console.error('Failed to open repository:', error);
        showToast('error', 'Error', `Failed to open repository: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Render repository contents
function renderContents(contents) {
    if (!Array.isArray(contents)) {
        elements.fileExplorer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i> Failed to load contents
            </div>
        `;
        return;
    }
    
    if (contents.length === 0) {
        elements.fileExplorer.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-folder-open"></i> This directory is empty
            </div>
        `;
        return;
    }
    
    // Sort: directories first, then files alphabetically
    contents.sort((a, b) => {
        if (a.type === 'dir' && b.type !== 'dir') return -1;
        if (a.type !== 'dir' && b.type === 'dir') return 1;
        return a.name.localeCompare(b.name);
    });
    
    const contentItems = contents.map(item => {
        const isDirectory = item.type === 'dir';
        const fileExtension = !isDirectory ? item.name.split('.').pop().toLowerCase() : '';
        let icon = 'fa-file';
        
        // Choose icon based on file type
        if (isDirectory) {
            icon = 'fa-folder';
        } else if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(fileExtension)) {
            icon = 'fa-file-image';
        } else if (['html', 'htm', 'xml'].includes(fileExtension)) {
            icon = 'fa-file-code';
        } else if (['js', 'ts', 'jsx', 'tsx'].includes(fileExtension)) {
            icon = 'fa-file-code';
        } else if (['css', 'scss', 'sass', 'less'].includes(fileExtension)) {
            icon = 'fa-file-code';
        } else if (['md', 'txt', 'rtf'].includes(fileExtension)) {
            icon = 'fa-file-alt';
        } else if (['pdf'].includes(fileExtension)) {
            icon = 'fa-file-pdf';
        } else if (['zip', 'rar', 'gz', 'tar'].includes(fileExtension)) {
            icon = 'fa-file-archive';
        }
        
        // Format file size
        let fileSize = '';
        if (!isDirectory && item.size) {
            fileSize = formatFileSize(item.size);
        }
        
        return `
            <div class="file-item" data-path="${item.path}" data-type="${item.type}" data-name="${item.name}" data-sha="${item.sha || ''}">
                <div class="file-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${item.name}</div>
                    <div class="file-meta">
                        ${isDirectory ? 'Directory' : getFileType(fileExtension)}
                    </div>
                </div>
                ${fileSize ? `<div class="file-size">${fileSize}</div>` : ''}
            </div>
        `;
    }).join('');
    
    elements.fileExplorer.innerHTML = contentItems;
    
    // Add click event to file items
    document.querySelectorAll('.file-item').forEach(item => {
        item.addEventListener('click', async () => {
            const path = item.dataset.path;
            const type = item.dataset.type;
            const name = item.dataset.name;
            const sha = item.dataset.sha;
            
            if (type === 'dir') {
                // Navigate to directory
                state.currentPath = path;
                // Show loading indicator
                showLoading('Loading directory contents...');
                try {
                    // Fetch directory contents
                    const contents = await getRepositoryContents(state.currentRepoOwner, state.currentRepo, path, state.currentBranch);
                    // Render the new contents
                    renderContents(contents);
                    // Update breadcrumbs
                    updateBreadcrumbs();
                } catch (error) {
                    console.error('Failed to navigate to directory:', error);
                    showToast('error', 'Error', `Failed to load directory: ${error.message}`);
                } finally {
                    hideLoading();
                }
            } else {
                // Open file
                await openFile(path, name, sha);
            }
        });
    });
}

// Open a file
async function openFile(path, name, sha) {
    try {
        const fileData = await getFileContent(state.currentRepoOwner, state.currentRepo, path);
        
        // Update state
        state.currentFile = {
            path,
            name
        };
        state.fileContent = fileData.content;
        state.fileSha = fileData.sha || sha;
        
        // Update UI
        elements.fileName.textContent = name;
        elements.fileContent.textContent = state.fileContent;
        elements.fileViewer.classList.remove('hidden');
        elements.fileContent.style.display = 'block';
        elements.fileEditor.classList.add('hidden');
        
        // Integrate with advanced features (HTML preview, Python execution, Flask app)
        if (typeof notifyFileOpened === 'function') {
            try {
                notifyFileOpened(state.fileContent, name);
            } catch (advError) {
                console.error('Error initializing advanced features:', advError);
            }
        }
    } catch (error) {
        console.error('Failed to open file:', error);
        showToast('error', 'Error', `Failed to open file: ${error.message}`);
    }
}

// Edit current file
function editCurrentFile() {
    console.log('Editing file:', state.currentFile);
    elements.editorTextarea.value = state.fileContent;
    elements.fileEditor.classList.remove('hidden');
    elements.fileContent.style.display = 'none';
}

// Close file viewer
function closeFileViewer() {
    console.log('Closing file viewer');
    elements.fileViewer.classList.add('hidden');
    state.currentFile = null;
    state.fileContent = null;
    state.fileSha = null;
}

// Cancel edit
function cancelEdit() {
    console.log('Canceling edit');
    elements.fileEditor.classList.add('hidden');
    elements.fileContent.style.display = 'block';
    
    // Destroy Monaco editor instance if it exists
    if (window.editor) {
        window.editor.dispose();
        window.editor = null;
        
        // Show the textarea again
        elements.editorTextarea.style.display = 'block';
        
        // Remove the Monaco editor container
        const container = document.getElementById('monaco-editor-container');
        if (container) {
            container.remove();
        }
    }
}

// Save file changes
function saveFileChanges() {
    // Get content from Monaco editor if available, otherwise fallback to textarea
    const content = window.editor ? window.editor.getValue() : elements.editorTextarea.value;
    const message = prompt('Enter commit message:', 'Update file via GitHub GUI Manager');
    
    if (message !== null) {
        updateFile(content, message);
    }
}

// Monaco Editor initialization
function initMonacoEditor() {
    // Only initialize if the required elements exist
    if (!elements.editorTextarea || window.editor) return;
    
    // Hide the textarea
    elements.editorTextarea.style.display = 'none';
    
    // Create a div for Monaco editor
    const editorContainer = document.createElement('div');
    editorContainer.id = 'monaco-editor-container';
    editorContainer.style.width = '100%';
    editorContainer.style.height = '100%';
    editorContainer.style.position = 'absolute';
    editorContainer.style.top = '0';
    editorContainer.style.bottom = '0';
    editorContainer.style.left = '0';
    editorContainer.style.right = '0';
    elements.editorTextarea.parentNode.appendChild(editorContainer);
    
    // Determine language from file extension
    const fileName = state.currentFile?.name || '';
    const extension = fileName.split('.').pop().toLowerCase();
    const languageMap = {
        'js': 'javascript',
        'ts': 'typescript',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'md': 'markdown',
        'py': 'python',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'cs': 'csharp',
        'go': 'go',
        'rb': 'ruby',
        'php': 'php',
        'sh': 'shell',
        'yml': 'yaml',
        'yaml': 'yaml',
        'xml': 'xml',
        'sql': 'sql',
        'rs': 'rust',
        'kt': 'kotlin',
        'swift': 'swift',
    };
    const language = languageMap[extension] || 'plaintext';
    
    // Create the editor
    window.editor = monaco.editor.create(editorContainer, {
        value: elements.editorTextarea.value,
        language: language,
        theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'vs-dark' : 'vs',
        automaticLayout: true,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        roundedSelection: true,
        scrollbar: {
            useShadows: true,
            verticalHasArrows: true,
            horizontalHasArrows: true,
            vertical: 'visible',
            horizontal: 'visible',
            verticalScrollbarSize: 12,
            horizontalScrollbarSize: 12,
            arrowSize: 15
        }
    });
    
    // Add GitHub Copilot-like functionality with Monaco Editor's suggestion API
    monaco.languages.registerCompletionItemProvider(language, {
        provideCompletionItems: function(model, position) {
            const textUntilPosition = model.getValueInRange({
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            });
            
            // Simple AI completion simulation - in a real app, you'd call an AI API
            const suggestions = [];
            if (textUntilPosition.includes('func') || textUntilPosition.includes('function')) {
                suggestions.push({
                    label: 'function example() { /* implementation */ }',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'function ${1:name}(${2:params}) {\n\t${3:// implementation}\n}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Function template',
                    documentation: 'Creates a new function with the specified name and parameters'
                });
            }
            
            if (textUntilPosition.includes('if')) {
                suggestions.push({
                    label: 'if statement',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'if (${1:condition}) {\n\t${2:// code}\n}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'If statement',
                    documentation: 'Creates an if statement'
                });
            }
            
            // Add more intelligent suggestions based on context
            return { suggestions: suggestions };
        }
    });
}

// Download current file
function downloadCurrentFile() {
    if (!state.currentFile || !state.fileContent) return;
    
    const blob = new Blob([state.fileContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.style.display = 'none';
    a.href = url;
    a.download = state.currentFile.name;
    
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Confirm delete file
function confirmDeleteFile() {
    elements.confirmMessage.textContent = `Are you sure you want to delete "${state.currentFile.name}"?`;
    elements.confirmAction.onclick = deleteFile;
    showModal(elements.confirmModal);
}

// Create a new text file
function createNewFile() {
    // TODO: Implement new file creation
    showToast('info', 'Coming Soon', 'This feature is not yet implemented');
}

// Update breadcrumbs
function updateBreadcrumbs() {
    const path = state.currentPath || '';
    const parts = path ? path.split('/') : [];
    
    let breadcrumbsHTML = `<span class="breadcrumb-item" data-path="">root</span>`;
    let currentPath = '';
    
    for (let i = 0; i < parts.length; i++) {
        currentPath += (i === 0 ? '' : '/') + parts[i];
        breadcrumbsHTML += `<span class="breadcrumb-item" data-path="${currentPath}">${parts[i]}</span>`;
    }
    
    elements.breadcrumbs.innerHTML = breadcrumbsHTML;
    
    // Add click event to breadcrumb items
    document.querySelectorAll('.breadcrumb-item').forEach(item => {
        item.addEventListener('click', () => {
            const path = item.dataset.path;
            state.currentPath = path;
            navigateToDirectory(path);
        });
    });
}

// Load branches
async function loadBranches() {
    try {
        const branches = await getBranches();
        state.branches = branches;
        
        // Update current branch if not set
        if (!state.currentBranch && branches.length > 0) {
            state.currentBranch = branches[0].name;
        }
        
        // Update UI
        elements.currentBranch.textContent = state.currentBranch;
        
        // Populate branch dropdown
        const branchItems = branches.map(branch => {
            return `
                <li class="branch-item ${branch.name === state.currentBranch ? 'active' : ''}" 
                    data-branch="${branch.name}">
                    <i class="fas fa-code-branch"></i> ${branch.name}
                </li>
            `;
        }).join('');
        
        elements.branchList.innerHTML = branchItems;
        
        // Add click event to branch items
        document.querySelectorAll('.branch-item').forEach(item => {
            item.addEventListener('click', () => {
                const branch = item.dataset.branch;
                switchBranch(branch);
                closeBranchDropdown();
            });
        });
        
        // Populate base branch select
        const branchOptions = branches.map(branch => {
            return `<option value="${branch.name}" ${branch.name === state.currentBranch ? 'selected' : ''}>${branch.name}</option>`;
        }).join('');
        
        elements.baseBranch.innerHTML = branchOptions;
    } catch (error) {
        console.error('Failed to load branches:', error);
    }
}

// Switch branch
async function switchBranch(branch) {
    if (branch === state.currentBranch) return;
    
    showLoading(`Switching to branch "${branch}"...`);
    try {
        state.currentBranch = branch;
        elements.currentBranch.textContent = branch;
        
        // Reload current directory
        const contents = await getRepositoryContents(state.currentRepoOwner, state.currentRepo, state.currentPath, branch);
        renderContents(contents);
        
        // Close file viewer if open
        if (elements.fileViewer.style.display === 'flex') {
            closeFileViewer();
        }
        
        showToast('success', 'Branch Changed', `Switched to branch "${branch}"`);
    } catch (error) {
        console.error('Failed to switch branch:', error);
        showToast('error', 'Error', `Failed to switch branch: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Open new branch modal
async function openNewBranchModal() {
    await loadBranches();
    showModal(elements.newBranchModal);
}

// Toggle branch dropdown
function toggleBranchDropdown() {
    if (elements.branchDropdown.style.display === 'flex') {
        closeBranchDropdown();
    } else {
        openBranchDropdown();
    }
}

// Open branch dropdown
function openBranchDropdown() {
    // Position dropdown
    const button = elements.branchSelector;
    const buttonRect = button.getBoundingClientRect();
    
    elements.branchDropdown.style.display = 'flex';
    elements.branchDropdown.style.top = `${buttonRect.bottom + 5}px`;
    elements.branchDropdown.style.left = `${buttonRect.left}px`;
}

// Close branch dropdown
function closeBranchDropdown() {
    elements.branchDropdown.style.display = 'none';
    elements.branchSearch.value = '';
}

// Filter branches
function filterBranches() {
    const searchTerm = elements.branchSearch.value.toLowerCase();
    const branchItems = document.querySelectorAll('.branch-item');
    
    branchItems.forEach(item => {
        const branchName = item.dataset.branch.toLowerCase();
        
        if (branchName.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Refresh current repository
async function refreshCurrentRepo() {
    if (!state.currentRepo || !state.currentRepoOwner) return;
    
    showLoading('Refreshing...');
    try {
        const contents = await getRepositoryContents(state.currentRepoOwner, state.currentRepo, state.currentPath, state.currentBranch);
        renderContents(contents);
        showToast('success', 'Refreshed', 'Repository contents refreshed');
    } catch (error) {
        console.error('Failed to refresh repository:', error);
        showToast('error', 'Error', `Failed to refresh: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Modal functions
function showModal(modal) {
    modal.style.display = 'flex';
    
    // Reset forms
    const form = modal.querySelector('form');
    if (form) form.reset();
}

function hideModal(modal) {
    modal.style.display = 'none';
}

// Toast notification
function showToast(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icon}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <div class="toast-close">
            <i class="fas fa-times"></i>
        </div>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Close toast on click
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.add('hiding');
        setTimeout(() => {
            toast.remove();
        }, 300);
    });
    
    // Auto close after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('hiding');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Loading indicator
function showLoading(message = 'Loading...') {
    elements.loadingMessage.textContent = message;
    elements.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
}

// Helper functions
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
}

function getFileType(extension) {
    const fileTypes = {
        'js': 'JavaScript',
        'py': 'Python',
        'html': 'HTML',
        'css': 'CSS',
        'json': 'JSON',
        'md': 'Markdown',
        'txt': 'Text',
        'jpg': 'JPEG Image',
        'jpeg': 'JPEG Image',
        'png': 'PNG Image',
        'gif': 'GIF Image',
        'svg': 'SVG Image',
        'pdf': 'PDF Document',
        'doc': 'Word Document',
        'docx': 'Word Document',
        'xls': 'Excel Spreadsheet',
        'xlsx': 'Excel Spreadsheet',
        'ppt': 'PowerPoint',
        'pptx': 'PowerPoint',
        'zip': 'ZIP Archive',
        'rar': 'RAR Archive',
        'gz': 'GZ Archive',
        'tar': 'TAR Archive'
    };
    
    return fileTypes[extension] || `${extension.toUpperCase()} File`;
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
