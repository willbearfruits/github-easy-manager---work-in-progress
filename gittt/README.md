# GitHub GUI Manager

A powerful web-based GUI application for managing GitHub repositories with advanced code execution features.

![GitHub GUI Manager](https://raw.githubusercontent.com/username/gittt/main/screenshots/app-preview.png)

## Features

### Core Functionality
- **Repository Management**: Create, clone, and browse your GitHub repositories in a user-friendly interface
- **File Operations**: Upload, download, create, edit, and delete files and folders
- **Branch Management**: Create branches, switch between branches, and view branch-specific content

### Advanced Features
- **HTML Preview**: Instantly preview HTML files directly in the application
- **Python Code Execution**: Run Python code snippets and view execution results
- **Flask App Runner**: Dynamically launch Flask applications from your repository files
- **Monaco Editor Integration**: Feature-rich code editing with syntax highlighting

## Technology Stack

- **Backend**: Python with Flask web framework
- **Frontend**: HTML, CSS, JavaScript with jQuery
- **Editor**: Monaco Editor for enhanced code editing
- **Authentication**: GitHub OAuth for secure access to repositories

## Getting Started

### Prerequisites
- Python 3.7+
- GitHub account
- GitHub Personal Access Token with repo scope

### Installation

1. Clone this repository
```bash
git clone https://github.com/yourusername/gittt.git
cd gittt
```

2. Install dependencies
```bash
pip install -r requirements.txt
```

3. Run the application
```bash
python app.py
```

4. Access the application at `http://localhost:5000`

## How to Use

1. **Authentication**: Sign in with your GitHub credentials and authorize the application
2. **Repository Management**: Create new repositories or browse your existing ones
3. **File Navigation**: Click on files to view their contents or navigate through directories
4. **Advanced Features**: 
   - For HTML files: Use the "Preview HTML" button
   - For Python files: Use the "Run Python" button
   - For Flask applications: Use the "Run as Flask App" button

## Security Features

- Authentication via GitHub OAuth
- Isolated Python code execution in subprocesses
- Protection against common web vulnerabilities

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- GitHub API for providing the backbone of repository management
- Flask framework for the lightweight and efficient web server
- Monaco Editor for the rich code editing experience

---

Created with ❤️ by [Your Name]
