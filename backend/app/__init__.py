from flask import Flask
from flask_cors import CORS
from flask_mail import Mail
from werkzeug.middleware.proxy_fix import ProxyFix # Para detectar la IP real en despliegue
from .config import Config

# Instancia de Mail
mail = Mail()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # 1. SOLUCIÓN IP REAL: Configuramos Flask para confiar en los encabezados del Proxy (Nginx/Render/etc)
    # x_for=1 confía en el encabezado X-Forwarded-For
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)

    # Inicializar mail
    mail.init_app(app)
    
    from .routes import main_routes, auth_routes, citas_routes, usuario_routes, paciente_routes, inventario_routes, personal_routes, procedimientos_routes_routes, finanzas_routes, consultorios_routes, servicios_routes, reportes_routes, odontograma_routes, asistencia_routes
    # Registro de Blueprints
    app.register_blueprint(main_routes)
    app.register_blueprint(auth_routes)
    app.register_blueprint(citas_routes)
    app.register_blueprint(usuario_routes)
    app.register_blueprint(paciente_routes)
    app.register_blueprint(inventario_routes)
    app.register_blueprint(personal_routes)
    app.register_blueprint(procedimientos_routes_routes)
    app.register_blueprint(consultorios_routes)
    app.register_blueprint(servicios_routes)
    app.register_blueprint(odontograma_routes)
    app.register_blueprint(finanzas_routes)
    app.register_blueprint(reportes_routes)
    app.register_blueprint(asistencia_routes)
    
    # 2. CONFIGURACIÓN DINÁMICA DE CORS
    # Agrega aquí tu dominio de producción una vez lo tengas
    allowed_origins = [
        "http://localhost:5173",          # Vite local
        "http://127.0.0.1:5173",        # Vite local alternativo
        "https://clinica-ro.onrender.com",    # Tu futuro dominio real
        "https://clinica-alba-ciclo5.onrender.com",  # Nuevo dominio
        "https://clinica-alba-ciclo5-1.onrender.com", # Variante de dominio
        Config.FRONTEND_URL,              # URL de producción configurada dinámicamente
    ]

    CORS(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        supports_credentials=True, # Vital para que funcionen las cookies httpOnly
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"]
    )

    return app