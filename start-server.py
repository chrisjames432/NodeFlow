import subprocess
import os

# Get root directory
root_dir = os.path.dirname(__file__)


# Change to server directory
server_dir = os.path.join(root_dir, 'server')
os.chdir(server_dir)

# Run app.py
print("Starting server...")
subprocess.run(['python', 'app.py'])
