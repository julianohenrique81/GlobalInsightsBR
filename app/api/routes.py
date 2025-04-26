from flask import Blueprint, jsonify, request
from app.crawler.scrapy_manager import ScrapyManager

api_bp = Blueprint('api', __name__)
scrapy_manager = ScrapyManager()

@api_bp.route('/scrape', methods=['POST'])
def scrape_data():
    """
    Rota para iniciar o scraping de dados
    Parâmetros:
    - url: URL do site para fazer scraping
    - config: configurações específicas para o scraper (opcional)
    """
    data = request.get_json()
    
    if not data or 'url' not in data:
        return jsonify({'error': 'URL não fornecida'}), 400
    
    url = data.get('url')
    config = data.get('config', {})
    
    try:
        result = scrapy_manager.run_spider(url, config)
        return jsonify({'status': 'success', 'data': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/finance', methods=['POST'])
def get_financial_data():
    """
    Rota para obter dados financeiros de empresas
    Parâmetros:
    - ticker: Código de negociação da empresa (ex: PETR4, VALE3)
    - config: configurações específicas para o scraper (opcional)
    """
    data = request.get_json()
    
    if not data or 'ticker' not in data:
        return jsonify({'error': 'Ticker não fornecido'}), 400
    
    ticker = data.get('ticker')
    config = data.get('config', {})
    
    try:
        result = scrapy_manager.run_financial_spider(ticker, config)
        return jsonify({'status': 'success', 'data': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/jobs', methods=['GET'])
def get_jobs():
    """Rota para obter status dos jobs de scraping"""
    jobs = scrapy_manager.get_jobs()
    return jsonify({'jobs': jobs})

@api_bp.route('/results/<job_id>', methods=['GET'])
def get_results(job_id):
    """Rota para obter os resultados de um job específico"""
    try:
        results = scrapy_manager.get_results(job_id)
        return jsonify({'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 404