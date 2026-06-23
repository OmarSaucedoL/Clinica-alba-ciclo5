from dotenv import load_dotenv
from .classes import PostgreSQL
import os

load_dotenv(override=True) 

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', '')
    TOKEN_SECRET_KEY = os.getenv('TOKEN_SECRET_KEY', '')
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    # CONFIGURACION BASE DE DATOS
    DB_HOST = os.getenv('DB_HOST','')
    DB_NAME = os.getenv('DB_NAME','')
    DB_PORT = os.getenv('DB_PORT','')
    DB_USER = os.getenv('DB_USER','')
    DB_PASSWORD = os.getenv('DB_PASSWORD','')

    # ==========================================
    # CONFIGURACION DE GMAIL (NUEVO)
    # ==========================================
    MAIL_SERVER = os.getenv('MAIL_SERVER')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True') == 'True'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER')

    # ESQUEMA CONTENEDOR DE LA APLICACION
    SCHEMA = 'clinica'
    
    # TABLAS A DISPOSICION EN LA BASE DE DATOS
    T_USER = 'T_USUARIO'
    T_CITAS = 'T_CITAS'

    # CONFIGURACION DE PAYPAL
    PAYPAL_CLIENT_ID = os.getenv('PAYPAL_CLIENT_ID', '')
    PAYPAL_CLIENT_SECRET = os.getenv('PAYPAL_CLIENT_SECRET', '')
    PAYPAL_MODE = os.getenv('PAYPAL_MODE', 'sandbox')
    PAYPAL_BASE_URL = os.getenv('PAYPAL_BASE_URL', 'https://api-m.sandbox.paypal.com')
    PAYPAL_EXCHANGE_RATE = 9.85

db = PostgreSQL(
    Config.DB_HOST,
    Config.DB_PORT,
    Config.DB_NAME,
    Config.DB_USER,
    Config.DB_PASSWORD
)