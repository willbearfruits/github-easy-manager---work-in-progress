from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
import os
import requests
import json
import shutil
import base64
import uuid
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta

app = Flask(__name__)
# Use an environment variable for the secret key when available so that
# sessions remain valid across restarts.  A random key is generated as a
# fallback for development convenience.
app.secret_key = os.environ.get("FLASK_SECRET_KEY", os.urandom(24))
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Local repositories folder
REPOS_FOLDER = 'repositories'
os.makedirs(REPOS_FOLDER, exist_ok=True)

@app.route('/')
def index():
    if 'access_token' not in session:
        return render_template('login.html')
    return render_template('index.html', username=session.get('username', ''))

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/auth')
def auth():
    # This would typically redirect to GitHub OAuth
    # For simplicity, we'll use a Personal Access Token approach
    return render_template('auth.html')

@app.route('/auth/token', methods=['POST'])
def auth_token():
    token = request.form.get('token')
    if not token:
        flash('Please provide a valid token')
        return redirect(url_for('login'))
    
    # Verify token by fetching user info
    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json'
    }
    response = requests.get('https://api.github.com/user', headers=headers)
    
    if response.status_code != 200:
        flash('Invalid token or API error')
        return redirect(url_for('login'))
    
    user_data = response.json()
    session['access_token'] = token
    session['username'] = user_data['login']
    session['avatar_url'] = user_data['avatar_url']
    session.permanent = True
    
    return redirect(url_for('index'))

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/repos')
def get_repos():
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    headers = {
        'Authorization': f'token {session["access_token"]}',
        'Accept': 'application/vnd.github.v3+json'
    }
    response = requests.get('https://api.github.com/user/repos', headers=headers)
    
    if response.status_code != 200:
        return jsonify({'error': 'Failed to fetch repositories'}), response.status_code
    
    return jsonify(response.json())

@app.route('/create_repo', methods=['POST'])
def create_repo():
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    name = data.get('name')
    description = data.get('description', '')
    is_private = data.get('private', False)
    
    if not name:
        return jsonify({'error': 'Repository name is required'}), 400
    
    headers = {
        'Authorization': f'token {session["access_token"]}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    payload = {
        'name': name,
        'description': description,
        'private': is_private,
        'auto_init': True  # Initialize with a README
    }
    
    response = requests.post('https://api.github.com/user/repos', 
                            headers=headers, 
                            json=payload)
    
    if response.status_code not in [200, 201]:
        error_data = response.json()
        error_message = 'Failed to create repository'
        
        # Extract detailed error message from GitHub API response
        if 'message' in error_data:
            error_message += f": {error_data['message']}"
            
            # Check for specific common errors
            if error_data.get('message') == 'Repository creation failed.' and 'errors' in error_data:
                for err in error_data['errors']:
                    error_message += f" - {err.get('message', '')}"
            elif '403 Forbidden' in error_data.get('message', ''):
                error_message += " - Your token may not have the 'repo' or 'public_repo' scope required for repository creation"
        
        print(f"GitHub API Error: {error_data}")
        return jsonify({'error': error_message, 'details': error_data}), response.status_code
    
    return jsonify(response.json())

@app.route('/clone_repo', methods=['POST'])
def clone_repo():
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    repo_name = data.get('repo_name')
    repo_owner = data.get('repo_owner', session['username'])
    
    if not repo_name:
        return jsonify({'error': 'Repository name is required'}), 400
    
    headers = {
        'Authorization': f'token {session["access_token"]}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    # Create folder for the repository
    repo_path = os.path.join(REPOS_FOLDER, f"{repo_owner}_{repo_name}_{uuid.uuid4().hex[:8]}")
    os.makedirs(repo_path, exist_ok=True)
    
    # Get repository contents (root level)
    url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/contents'
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        return jsonify({'error': 'Failed to fetch repository contents', 'details': response.json()}), response.status_code
    
    # Download files recursively (simplified for demo)
    download_files(response.json(), repo_path, headers, repo_owner, repo_name)
    
    return jsonify({'success': True, 'repo_path': repo_path})

def download_files(contents, path, headers, owner, repo, branch='main'):
    for item in contents:
        item_path = os.path.join(path, item['name'])
        
        if item['type'] == 'dir':
            os.makedirs(item_path, exist_ok=True)
            url = f'https://api.github.com/repos/{owner}/{repo}/contents/{item["path"]}?ref={branch}'
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                download_files(response.json(), item_path, headers, owner, repo, branch)
        else:
            if item.get('download_url'):
                response = requests.get(item['download_url'])
                if response.status_code == 200:
                    with open(item_path, 'wb') as f:
                        f.write(response.content)

@app.route('/repo_contents', methods=['GET'])
def repo_contents():
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    repo_owner = request.args.get('owner')
    repo_name = request.args.get('repo')
    path = request.args.get('path', '')
    
    if not repo_name or not repo_owner:
        return jsonify({'error': 'Repository information is required'}), 400
    
    headers = {
        'Authorization': f'token {session["access_token"]}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{path}'
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        return jsonify({'error': 'Failed to fetch contents', 'details': response.json()}), response.status_code
    
    return jsonify(response.json())

@app.route('/file_content', methods=['GET'])
def file_content():
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    repo_owner = request.args.get('owner')
    repo_name = request.args.get('repo')
    path = request.args.get('path', '')
    
    if not repo_name or not repo_owner or not path:
        return jsonify({'error': 'Complete file information is required'}), 400
    
    headers = {
        'Authorization': f'token {session["access_token"]}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{path}'
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        return jsonify({'error': 'Failed to fetch file', 'details': response.json()}), response.status_code
    
    content_data = response.json()
    if content_data.get('encoding') == 'base64' and content_data.get('content'):
        content = base64.b64decode(content_data['content']).decode('utf-8')
        return jsonify({
            'content': content,
            'name': content_data['name'],
            'path': content_data['path'],
            'sha': content_data['sha']
        })
    
    return jsonify({'error': 'File format not supported'}), 400

@app.route('/upload_file', methods=['POST'])
def upload_file():
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    repo_owner = request.form.get('owner')
    repo_name = request.form.get('repo')
    repo_path = request.form.get('path', '')
    commit_message = request.form.get('message', 'Upload file via GitHub GUI Manager')
    
    if not file.filename or not repo_name or not repo_owner:
        return jsonify({'error': 'File and repository information are required'}), 400
    
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)
    
    # Read file content
    with open(file_path, 'rb') as f:
        file_content = f.read()
    
    # Encode content in base64
    content_encoded = base64.b64encode(file_content).decode('utf-8')
    
    # Prepare API request
    headers = {
        'Authorization': f'token {session["access_token"]}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    upload_path = os.path.join(repo_path, filename).replace('\\', '/')
    
    # Check if file already exists to get its SHA
    url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{upload_path}'
    response = requests.get(url, headers=headers)
    sha = None
    
    if response.status_code == 200:
        sha = response.json().get('sha')
    
    # Prepare upload data
    upload_data = {
        'message': commit_message,
        'content': content_encoded,
    }
    
    if sha:
        upload_data['sha'] = sha
    
    # Upload file
    response = requests.put(url, headers=headers, data=json.dumps(upload_data))
    
    # Clean up temporary file
    os.remove(file_path)
    
    if response.status_code not in [200, 201]:
        return jsonify({'error': 'Failed to upload file', 'details': response.json()}), response.status_code
    
    return jsonify(response.json())

@app.route('/upload_folder', methods=['POST'])
def upload_folder():
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    if 'files[]' not in request.files:
        return jsonify({'error': 'No files found'}), 400
    
    files = request.files.getlist('files[]')
    repo_owner = request.form.get('owner')
    repo_name = request.form.get('repo')
    base_path = request.form.get('path', '')
    commit_message = request.form.get('message', 'Upload folder via GitHub GUI Manager')
    
    if not repo_name or not repo_owner:
        return jsonify({'error': 'Repository information is required'}), 400
    
    if not files or len(files) == 0:
        return jsonify({'error': 'No files uploaded'}), 400
    
    # Process each file
    uploaded_files = []
    failed_files = []
    
    # Folder structure data
    folder_structure = {}
    
    # Group files by relative path
    for file in files:
        if not file.filename:
            continue
            
        # Get relative path from the uploaded folder structure
        relative_path = file.filename
        
        try:
            # Save file temporarily
            temp_filename = secure_filename(os.path.basename(relative_path))
            temp_path = os.path.join(app.config['UPLOAD_FOLDER'], temp_filename)
            file.save(temp_path)
            
            # Create necessary directories in the structure
            folders = os.path.dirname(relative_path).split('/')
            current_folder = folder_structure
            current_path = ''
            
            for folder in folders:
                if not folder:
                    continue
                    
                current_path = os.path.join(current_path, folder)
                if folder not in current_folder:
                    current_folder[folder] = {}
                current_folder = current_folder[folder]
            
            # Read file content
            with open(temp_path, 'rb') as f:
                file_content = f.read()
            
            # Encode content
            content_encoded = base64.b64encode(file_content).decode('utf-8')
            
            # Prepare API request
            headers = {
                'Authorization': f'token {session["access_token"]}',
                'Accept': 'application/vnd.github.v3+json'
            }
            
            # Upload path with correct directory structure
            upload_path = os.path.join(base_path, relative_path).replace('\\', '/')
            
            # Check if file already exists
            url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{upload_path}'
            check_response = requests.get(url, headers=headers)
            sha = None
            
            if check_response.status_code == 200:
                sha = check_response.json().get('sha')
            
            # Prepare upload data
            upload_data = {
                'message': f'{commit_message} - {relative_path}',
                'content': content_encoded,
            }
            
            if sha:
                upload_data['sha'] = sha
            
            # Upload file
            response = requests.put(url, headers=headers, data=json.dumps(upload_data))
            
            # Clean up temporary file
            os.remove(temp_path)
            
            if response.status_code in [200, 201]:
                uploaded_files.append(relative_path)
            else:
                failed_files.append({
                    'path': relative_path,
                    'error': response.json()
                })
        except Exception as e:
            failed_files.append({
                'path': relative_path,
                'error': str(e)
            })
    
    return jsonify({
        'success': True,
        'uploaded_files': uploaded_files,
        'failed_files': failed_files,
        'message': f'Uploaded {len(uploaded_files)} files, {len(failed_files)} failed'
    })

@app.route('/branches', methods=['GET'])
def list_branches():
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    repo_owner = request.args.get('owner')
    repo_name = request.args.get('repo')
    
    if not repo_name or not repo_owner:
        return jsonify({'error': 'Repository information is required'}), 400
    
    headers = {
        'Authorization': f'token {session["access_token"]}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/branches'
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        return jsonify({'error': 'Failed to fetch branches', 'details': response.json()}), response.status_code
    
    return jsonify(response.json())

@app.route('/create_branch', methods=['POST'])
def create_branch():
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    repo_owner = data.get('owner')
    repo_name = data.get('repo')
    base_branch = data.get('base_branch', 'main')
    new_branch = data.get('new_branch')
    
    if not repo_name or not repo_owner or not new_branch:
        return jsonify({'error': 'Complete branch information is required'}), 400
    
    headers = {
        'Authorization': f'token {session["access_token"]}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    # Get the SHA of the latest commit on the base branch
    url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/git/refs/heads/{base_branch}'
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        return jsonify({'error': 'Failed to fetch base branch', 'details': response.json()}), response.status_code
    
    sha = response.json()['object']['sha']
    
    # Create new branch
    url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/git/refs'
    payload = {
        'ref': f'refs/heads/{new_branch}',
        'sha': sha
    }
    
    response = requests.post(url, headers=headers, data=json.dumps(payload))
    
    if response.status_code not in [200, 201]:
        return jsonify({'error': 'Failed to create branch', 'details': response.json()}), response.status_code
    
    return jsonify(response.json())

@app.route('/commits', methods=['GET'])
def list_commits():
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    repo_owner = request.args.get('owner')
    repo_name = request.args.get('repo')
    branch = request.args.get('branch', 'main')
    
    if not repo_name or not repo_owner:
        return jsonify({'error': 'Repository information is required'}), 400
    
    headers = {
        'Authorization': f'token {session["access_token"]}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/commits?sha={branch}'
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        return jsonify({'error': 'Failed to fetch commits', 'details': response.json()}), response.status_code
    
    return jsonify(response.json())

@app.route('/delete_file', methods=['POST'])
def delete_file():
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    repo_owner = data.get('owner')
    repo_name = data.get('repo')
    file_path = data.get('path')
    sha = data.get('sha')
    commit_message = data.get('message', 'Delete file via GitHub GUI Manager')
    
    if not repo_name or not repo_owner or not file_path or not sha:
        return jsonify({'error': 'Complete file information is required'}), 400
    
    headers = {
        'Authorization': f'token {session["access_token"]}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{file_path}'
    payload = {
        'message': commit_message,
        'sha': sha
    }
    
    response = requests.delete(url, headers=headers, data=json.dumps(payload))
    
    if response.status_code != 200:
        return jsonify({'error': 'Failed to delete file', 'details': response.json()}), response.status_code
    
    return jsonify(response.json())

@app.route('/update_file', methods=['POST'])
def update_file():
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    repo_owner = data.get('owner')
    repo_name = data.get('repo')
    file_path = data.get('path')
    content = data.get('content')
    sha = data.get('sha')
    commit_message = data.get('message', 'Update file via GitHub GUI Manager')
    
    if not repo_name or not repo_owner or not file_path or not sha or content is None:
        return jsonify({'error': 'Complete file information is required'}), 400
    
    # Encode content in base64
    content_encoded = base64.b64encode(content.encode('utf-8')).decode('utf-8')
    
    headers = {
        'Authorization': f'token {session["access_token"]}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    url = f'https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{file_path}'
    payload = {
        'message': commit_message,
        'content': content_encoded,
        'sha': sha
    }
    
    response = requests.put(url, headers=headers, data=json.dumps(payload))
    
    if response.status_code != 200:
        return jsonify({'error': 'Failed to update file', 'details': response.json()}), response.status_code
    
    return jsonify(response.json())

@app.route('/preview/html', methods=['POST'])
def preview_html():
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    # Clear detailed debug logging
    print("HTML Preview Request Received")
    
    try:
        # Get the data from the request
        data = request.json
        if not data:
            print("No JSON data in request")
            return jsonify({'error': 'No data received'}), 400
        
        html_content = data.get('content')
        if not html_content:
            print("No HTML content in request")
            return jsonify({'error': 'HTML content is required'}), 400
        
        # Generate a unique ID for this preview
        preview_id = str(uuid.uuid4())
        print(f"Generated preview ID: {preview_id}")
        
        # Create a temporary file with the content
        preview_dir = os.path.join(app.root_path, 'static', 'previews')
        os.makedirs(preview_dir, exist_ok=True)
        
        preview_path = os.path.join(preview_dir, f"{preview_id}.html")
        with open(preview_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        # Generate URL exactly as expected by frontend
        preview_url = url_for('static', filename=f'previews/{preview_id}.html')
        print(f"Preview URL created: {preview_url}")
        
        # Return response that matches exactly what the frontend expects
        response = {
            'previewUrl': preview_url,
            'preview_id': preview_id
        }
        print(f"Sending response: {response}")
        return jsonify(response)
        
    except Exception as e:
        print(f"Error in preview_html: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/execute/python', methods=['POST'])
def execute_python():
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    print("Python Execution Request Received")
    
    # Dictionary to store execution results
    results = {
        'stdout': '',
        'stderr': '',
        'error': None,
        'exit_code': 0
    }
    
    code_path = None
    
    try:
        # Parse the request data
        data = request.get_json()
        if not data:
            print("No JSON data received")
            return jsonify({'error': 'No JSON data received'}), 400
            
        # Extract the code to execute
        code = data.get('code')
        if not code:
            print("No Python code provided")
            return jsonify({'error': 'Python code is required'}), 400
            
        print(f"Received Python code of length: {len(code)}")
        
        # Create a temporary directory for the code file
        code_dir = os.path.join(app.root_path, 'tmp')
        os.makedirs(code_dir, exist_ok=True)
    
        # Create a unique ID for this execution
        code_id = str(uuid.uuid4())
        code_path = os.path.join(code_dir, f"{code_id}.py")
        print(f"Created temp file: {code_path}")
        
        # Properly indent the user's code for our try/except wrapper
        indented_code = "    " + code.replace("\n", "\n    ")
        
        # Create safety wrapper to prevent crashes from sys.exit
        safe_code = """import sys

# Override system exit functions to prevent crashes
original_exit = sys.exit

def safe_exit(code=0):
    print(f"[Program exited with code {code}]")
    return
    
sys.exit = safe_exit

try:
    # User code starts here
{0}
    # User code ends here
except Exception as e:
    print(f"Error: {{type(e).__name__}}: {{e}}")
""".format(indented_code)
        
        # Write the code to the temporary file
        with open(code_path, 'w', encoding='utf-8') as f:
            f.write(safe_code)
    
        # Execute the code in a subprocess with timeout
        print("Executing Python code in subprocess")
        process = subprocess.Popen(
            [sys.executable, code_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            # Use CREATE_NEW_PROCESS_GROUP on Windows for better isolation
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        )
        
        try:
            # Wait for process to complete with timeout
            stdout, stderr = process.communicate(timeout=10)
            results['stdout'] = stdout
            results['stderr'] = stderr
            results['exit_code'] = process.returncode
            print(f"Python code executed with exit code: {process.returncode}")
        except subprocess.TimeoutExpired:
            # Terminate more gracefully
            print("Python execution timed out - attempting graceful termination")
            if os.name == 'nt':
                # Send Ctrl+Break to process group on Windows
                try:
                    os.kill(process.pid, signal.CTRL_BREAK_EVENT)
                    # Give it a moment to exit gracefully
                    process.wait(timeout=1)
                except Exception as e:
                    print(f"Error during graceful termination: {e}")
                    results['error'] = f"Error terminating process: {str(e)}"
                    process.kill()
            
            # Force kill if still running
            if process.poll() is None:
                print("Process still running after graceful termination attempt - force killing")
                process.kill()
            
            results['stdout'] = "Script execution timed out after 10 seconds."
            results['error'] = "Execution timed out after 10 seconds"
            results['stderr'] = "[Process terminated due to timeout]"
        
        # Clean up the temporary file
        try:
            if os.path.exists(code_path):
                os.remove(code_path)
                print(f"Removed temporary file: {code_path}")
        except Exception as e:
            print(f"Error removing temporary file: {e}")
            
    except Exception as e:
        print(f"Error in execute_python route: {e}")
        results['error'] = f"Server error: {str(e)}"
        
        # Try to clean up if code_path was created
        if code_path and os.path.exists(code_path):
            try:
                os.remove(code_path)
            except:
                pass
    
    # Ensure we always return a valid response
    if not isinstance(results.get('stdout'), str):
        results['stdout'] = ''
    if not isinstance(results.get('stderr'), str):
        results['stderr'] = ''
    
    return jsonify(results)
    
    # Ensure we always return a valid response even if something went wrong
    if not isinstance(results.get('stdout'), str):
        results['stdout'] = ''
    if not isinstance(results.get('stderr'), str):
        results['stderr'] = ''
    
    return jsonify(results)

@app.route('/run/flask', methods=['POST'])
def run_flask_app():
    if 'access_token' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    code = data.get('code')
    port = data.get('port', 5050)  # Use a different port from the main app
    
    if not code:
        return jsonify({'error': 'Flask app code is required'}), 400
    
    # Ensure the port is available
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind(('localhost', port))
        s.close()
    except socket.error:
        return jsonify({'error': f'Port {port} is already in use'}), 400
    
    # Create a temporary Flask app file
    app_id = str(uuid.uuid4())
    app_dir = os.path.join(app.root_path, 'flask_apps')
    os.makedirs(app_dir, exist_ok=True)
    app_path = os.path.join(app_dir, f"{app_id}.py")
    
    with open(app_path, 'w', encoding='utf-8') as f:
        f.write(code)
    
    # Run the Flask app in a separate process
    try:
        process = subprocess.Popen(
            [sys.executable, app_path],
            env={
                **os.environ,
                'FLASK_APP': app_path,
                'FLASK_PORT': str(port)
            },
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait a bit for the app to start
        time.sleep(2)
        
        # Check if the process is still running
        if process.poll() is not None:
            stdout, stderr = process.communicate()
            return jsonify({
                'error': 'Flask app failed to start',
                'stdout': stdout,
                'stderr': stderr,
                'exit_code': process.returncode
            }), 500
        
        # Register the app for cleanup later
        if 'flask_processes' not in session:
            session['flask_processes'] = []
        
        session['flask_processes'].append({
            'app_id': app_id,
            'port': port,
            'pid': process.pid,
            'app_path': app_path
        })
        
        # Return success with the app URL
        return jsonify({
            'success': True,
            'app_url': f'http://localhost:{port}',
            'app_id': app_id,
            'port': port
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/stop/flask/<app_id>', methods=['POST'])
def stop_flask_app(app_id):
    if 'access_token' not in session or 'flask_processes' not in session:
        return jsonify({'error': 'Not authenticated or no Flask apps running'}), 401
    
    # Find the app process
    app_info = None
    for app in session['flask_processes']:
        if app['app_id'] == app_id:
            app_info = app
            break
    
    if not app_info:
        return jsonify({'error': 'Flask app not found'}), 404
    
    # Try to kill the process
    try:
        pid = app_info['pid']
        os.kill(pid, signal.SIGTERM)
        
        # Remove the app from the session
        session['flask_processes'].remove(app_info)
        
        # Clean up the app file
        try:
            os.remove(app_info['app_path'])
        except:
            pass
        
        return jsonify({'success': True, 'message': f"Flask app on port {app_info['port']} stopped"})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Import additional modules needed for the new features
import socket
import re
import sys
import subprocess
import signal
import time

# Dictionary to store Flask app processes
flask_apps = {}

# Register a function to clean up child processes on exit
import atexit

def cleanup_processes():
    """Terminate all child processes when the main application exits"""
    print("Cleaning up Flask app processes...")
    for process_id, app_info in list(flask_apps.items()):
        try:
            print(f"Terminating process {process_id}")
            if app_info['process'].poll() is None:  # Process is still running
                app_info['process'].terminate()
                try:
                    app_info['process'].wait(timeout=3)
                except subprocess.TimeoutExpired:
                    app_info['process'].kill()
            
            # Close log file
            if 'log_file' in app_info and app_info['log_file']:
                app_info['log_file'].close()
                
            # Clean up temporary files
            try:
                if 'app_path' in app_info and os.path.exists(app_info['app_path']):
                    os.remove(app_info['app_path'])
                if 'log_path' in app_info and os.path.exists(app_info['log_path']):
                    os.remove(app_info['log_path'])
            except Exception as e:
                print(f"Error cleaning up files for {process_id}: {e}")
        except Exception as e:
            print(f"Error terminating process {process_id}: {e}")

# Register the cleanup function
atexit.register(cleanup_processes)

# Create necessary directories
preview_dir = os.path.join(app.static_folder, 'previews')
os.makedirs(preview_dir, exist_ok=True)

tmp_dir = os.path.join(app.root_path, 'tmp')
os.makedirs(tmp_dir, exist_ok=True)

flask_apps_dir = os.path.join(app.root_path, 'flask_apps')
os.makedirs(flask_apps_dir, exist_ok=True)

# Setup safer cleanup mechanisms
print("Initializing application...")

# Register the app teardown but don't use the teardown_appcontext decorator
# as it might interact poorly with the debug mode
def on_app_shutdown(exception=None):
    print("Application shutdown, cleaning up resources...")
    cleanup_processes()



# Default error handler for API errors
@app.errorhandler(Exception)
def handle_exception(e):
    print(f"Error occurred: {e}")
    return jsonify({'error': str(e)}), 500

# This is the recommended WSGI entry point - more stable than app.run()
def run_app():
    print("Starting GitHub GUI Manager...")
    from werkzeug.serving import run_simple
    run_simple('127.0.0.1', 5000, app, use_debugger=True, use_reloader=False)

if __name__ == '__main__':
    # Import additional modules needed for the new features
    import subprocess
    import sys
    import socket
    import time
    
    try:
        # Use a more robust way to run Flask
        run_app()
    except KeyboardInterrupt:
        print("\nGraceful shutdown initiated...")
    except Exception as e:
        print(f"Error during startup: {e}")
    finally:
        cleanup_processes()
        print("Application shutdown complete.")
