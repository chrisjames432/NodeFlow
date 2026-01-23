from flask import Blueprint, request, jsonify, current_app
from models import db, Workspace, Node, Connection
from werkzeug.utils import secure_filename
import os

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
    node.set_data(data.get('data', {}))
    db.session.add(node)
    db.session.commit()
    return jsonify(node.to_dict()), 201

@api_bp.route('/nodes/<int:node_id>', methods=['PUT'])
def update_node(node_id):
    node = Node.query.get_or_404(node_id)
    data = request.json
    
    if 'x' in data:
        node.position_x = data['x']
    if 'y' in data:
        node.position_y = data['y']
    if 'data' in data:
        node.set_data(data['data'])
    
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
