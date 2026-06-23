from flask import Blueprint,jsonify,request,redirect
from ..config import db

main_routes=Blueprint('main_routes',__name__)


@main_routes.route('/')
def index():
    
    return jsonify({
        'success':True,
        'message':'API INICIADA EXITOSAMENTE'
    })