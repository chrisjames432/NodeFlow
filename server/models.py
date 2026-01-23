from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class Workspace(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), default='Untitled Workspace')
    zoom = db.Column(db.Float, default=1.0)
    pan_x = db.Column(db.Float, default=0)
    pan_y = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    nodes = db.relationship('Node', backref='workspace', lazy=True, cascade='all, delete-orphan')
    connections = db.relationship('Connection', backref='workspace', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'zoom': self.zoom,
            'pan_x': self.pan_x,
            'pan_y': self.pan_y,
            'nodes': [node.to_dict() for node in self.nodes],
            'connections': [conn.to_dict() for conn in self.connections],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Node(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspace.id'), nullable=False)
    node_type = db.Column(db.String(50), default='default')
    position_x = db.Column(db.Float, default=0)
    position_y = db.Column(db.Float, default=0)
    data = db.Column(db.Text, default='{}')  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_data(self):
        return json.loads(self.data)
    
    def set_data(self, data):
        self.data = json.dumps(data)
    
    def to_dict(self):
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'type': self.node_type,
            'x': self.position_x,
            'y': self.position_y,
            'data': self.get_data(),
            'created_at': self.created_at.isoformat()
        }

class Connection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspace.id'), nullable=False)
    from_node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    to_node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    from_node = db.relationship('Node', foreign_keys=[from_node_id])
    to_node = db.relationship('Node', foreign_keys=[to_node_id])
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'from_node_id': self.from_node_id,
            'to_node_id': self.to_node_id
        }
