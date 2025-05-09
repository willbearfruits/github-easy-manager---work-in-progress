# GitHub GUI Manager

A complete web-based graphical user interface for GitHub that requires no Git command line knowledge. Manage your repositories, files, and branches with just a few clicks!

## Features

- **Authentication**: Login with GitHub Personal Access Token
- **Repository Management**: 
  - Create new repositories
  - Clone existing repositories
  - Browse repository contents
  - View file history
- **File Operations**:
  - View files
  - Edit files
  - Upload files
  - Download files
  - Delete files
- **Branch Management**:
  - View all branches
  - Switch between branches
  - Create new branches

## Setup Instructions

### Prerequisites

- Python 3.7 or higher
- GitHub account with a Personal Access Token

### Installation

1. Clone or download this repository to your computer:

```bash
git clone https://github.com/your-username/github-gui-manager.git
cd github-gui-manager
```

2. Create and activate a virtual environment (optional but recommended):

```bash
# On Windows
python -m venv venv
venv\Scripts\activate

# On macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

3. Install required dependencies:

```bash
pip install -r requirements.txt
```

4. Create the required directories if they don't exist:

```bash
mkdir -p uploads repositories static/css static/js templates
```

5. Run the application:

```bash
python app.py
```

6. Open your web browser and navigate to:

```
http://localhost:5000
```

### Creating a GitHub Personal Access Token

To use this application, you'll need a GitHub Personal Access Token:

1. Go to GitHub.com and sign in
2. Click on your profile icon in the top right corner
3. Select "Settings"
4. Scroll down and select "Developer settings" from the left sidebar
5. Click on "Personal access tokens" → "Tokens (classic)"
6. Click "Generate new token" → "Generate new token (classic)"
7. Give your token a name (e.g., "GitHub GUI Manager")
8. Select these scopes:
   - `repo` (all)
   - `workflow`
   - `read:user`
9. Click "Generate token"
10. Copy your token (important: you won't be able to see it again!)

## Usage Guide

### Login

1. Open the application in your web browser
2. Click "Continue with Personal Access Token"
3. Paste your GitHub Personal Access Token
4. Click "Login"

### Creating a New Repository

1. From the dashboard, click "Create New Repository"
2. Enter a repository name
3. Add an optional description
4. Choose whether the repository should be private
5. Click "Create Repository"

### Cloning an Existing Repository

1. From the dashboard, click "Clone Existing Repository"
2. Enter the repository owner username
3. Enter the repository name
4. Click "Clone Repository"

### Navigating a Repository

1. Select a repository from the sidebar
2. Use the breadcrumbs to navigate through directories
3. Click on files to view their contents

### Uploading Files

1. Open a repository
2. Navigate to the desired directory
3. Click "Upload"
4. Select a file from your computer
5. Add a commit message (optional)
6. Click "Upload File"

### Editing Files

1. Open a file
2. Click "Edit"
3. Make your changes
4. Click "Save Changes"

### Creating a New Branch

1. Open a repository
2. Click "New Branch"
3. Select a base branch
4. Enter a name for your new branch
5. Click "Create Branch"

### Switching Branches

1. Open a repository
2. Click on the current branch name
3. Select a branch from the dropdown

## Acknowledgements

- Built with Flask, JavaScript, HTML, and CSS
- Uses GitHub REST API v3
- Created by Yaniv Schonfeld
