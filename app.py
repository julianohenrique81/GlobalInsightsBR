import os
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

app = Flask(__name__, 
            static_folder='app/static',
            template_folder='app/templates')
CORS(app)

# Importação das rotas da API
from app.api.routes import api_bp

# Registra os blueprints
app.register_blueprint(api_bp, url_prefix='/api')

@app.route('/')
def index():
    """Rota principal que renderiza a página inicial"""
    return render_template('index.html')

if __name__ == '__main__':
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=debug)