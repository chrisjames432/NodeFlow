from flask import Blueprint, request, jsonify, current_app
from models import db, Workspace, Node, Connection
from werkzeug.utils import secure_filename
import os
import sys
from datetime import datetime
from pathlib import Path

api_bp = Blueprint('api', __name__)

# Workspace endpoints
@api_bp.route('/workspaces', methods=['POST'])
def create_workspace():
    data = request.json
    workspace = Workspace(name=data.get('name', 'Untitled Workspace'))
    db.session.add(workspace)
    db.session.commit()
    return jsonify(workspace.to_dict()), 201

@api_bp.route('/workspaces/<int:workspace_id>', methods=['GET'])
def get_workspace(workspace_id):
    workspace = Workspace.query.get_or_404(workspace_id)
    return jsonify(workspace.to_dict())

@api_bp.route('/workspaces/<int:workspace_id>', methods=['PUT'])
def update_workspace(workspace_id):
    workspace = Workspace.query.get_or_404(workspace_id)
    data = request.json
    
    if 'name' in data:
        workspace.name = data['name']
    if 'zoom' in data:
        workspace.zoom = data['zoom']
    if 'pan_x' in data:
        workspace.pan_x = data['pan_x']
    if 'pan_y' in data:
        workspace.pan_y = data['pan_y']
    
    db.session.commit()
    return jsonify(workspace.to_dict())

@api_bp.route('/workspaces', methods=['GET'])
def list_workspaces():
    workspaces = Workspace.query.all()
    return jsonify([w.to_dict() for w in workspaces])

@api_bp.route('/workspaces/<int:workspace_id>', methods=['DELETE'])
def delete_workspace(workspace_id):
    workspace = Workspace.query.get_or_404(workspace_id)
    db.session.delete(workspace)
    db.session.commit()
    return '', 204

# Node endpoints
@api_bp.route('/nodes', methods=['POST'])
def create_node():
    data = request.json
    node = Node(
        workspace_id=data['workspace_id'],
        node_type=data.get('type', 'default'),
        position_x=data.get('x', 0),
        position_y=data.get('y', 0)
    )
    # Store the data (includes name)
    if 'data' in data:
        node.set_data(data['data'])
    db.session.add(node)
    db.session.commit()
    return jsonify(node.to_dict()), 201

@api_bp.route('/nodes/<int:node_id>', methods=['PUT'])
def update_node(node_id):
    node = Node.query.get_or_404(node_id)
    req_data = request.json
    
    if 'x' in req_data:
        node.position_x = req_data['x']
    if 'y' in req_data:
        node.position_y = req_data['y']
    if 'data' in req_data:
        # Merge new data with existing data
        existing_data = node.get_data()
        existing_data.update(req_data['data'])
        node.set_data(existing_data)
    
    db.session.commit()
    return jsonify(node.to_dict())

@api_bp.route('/nodes/<int:node_id>', methods=['DELETE'])
def delete_node(node_id):
    node = Node.query.get_or_404(node_id)
    db.session.delete(node)
    db.session.commit()
    return '', 204

# Connection endpoints
@api_bp.route('/connections', methods=['POST'])
def create_connection():
    data = request.json
    connection = Connection(
        workspace_id=data['workspace_id'],
        from_node_id=data['from_node_id'],
        to_node_id=data['to_node_id']
    )
    db.session.add(connection)
    db.session.commit()
    return jsonify(connection.to_dict()), 201

@api_bp.route('/connections/<int:connection_id>', methods=['DELETE'])
def delete_connection(connection_id):
    connection = Connection.query.get_or_404(connection_id)
    db.session.delete(connection)
    db.session.commit()
    return '', 204

# Image upload endpoint
@api_bp.route('/upload', methods=['POST'])
def upload_image():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file:
        filename = secure_filename(file.filename)
        file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], filename))
        return jsonify({'filename': filename, 'url': f'/static/uploads/{filename}'})
    
    return jsonify({'error': 'Upload failed'}), 400

# AI Image generation endpoint
@api_bp.route('/generate-image', methods=['POST'])
def generate_image():
    try:
        data = request.json
        prompt = data.get('prompt', '')
        aspect_ratio = data.get('aspectRatio', '1:1')
        model = data.get('model', 'gemini-2.5-flash-image')
        
        if not prompt:
            return jsonify({'error': 'Prompt required'}), 400
        
        # Add ai-agent-toolkit to path
        toolkit_path = os.path.join(os.path.dirname(__file__), '..', 'ai-agent-toolkit')
        if toolkit_path not in sys.path:
            sys.path.insert(0, toolkit_path)
        
        from providers.gemini_image import generate_image as gen_image
        
        # Generate image with specified parameters
        result = gen_image(prompt, aspect_ratio=aspect_ratio, model=model)
        
        # Save to /images folder
        images_dir = os.path.join(os.path.dirname(__file__), '..', 'images')
        os.makedirs(images_dir, exist_ok=True)
        
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')[:-3]
        filename = f"generated_{timestamp}.png"
        filepath = os.path.join(images_dir, filename)
        
        # Save image bytes
        with open(filepath, 'wb') as f:
            f.write(result['image_bytes'])
        
        return jsonify({
            'filename': filename,
            'path': f'/images/{filename}',
            'prompt': prompt,
            'aspectRatio': aspect_ratio,
            'model': model
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

