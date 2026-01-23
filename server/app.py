from flask import Flask, render_template
from models import db
import os

# Paths
basedir = os.path.abspath(os.path.dirname(__file__))
rootdir = os.path.dirname(basedir)
sitedir = os.path.join(rootdir, 'site')

app = Flask(__name__, 
            static_folder=os.path.join(sitedir, 'static'),
            template_folder=os.path.join(sitedir, 'templates'))

# Database in root folder
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(rootdir, 'app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(sitedir, 'static', 'uploads')

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize database
db.init_app(app)

# Import models and routes
from models import Workspace, Node, Connection
from routes import api_bp

app.register_blueprint(api_bp, url_prefix='/api')

# Create tables
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
