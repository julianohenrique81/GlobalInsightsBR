import uuid
import json
import os
from datetime import datetime
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from app.crawler.spiders.generic_spider import GenericSpider

class ScrapyManager:
    """
    Gerenciador de operações com o Scrapy para iniciar, monitorar e recuperar 
    resultados de scraping de dados
    """
    
    def __init__(self):
        self.jobs = {}
        self.results_dir = os.path.join(os.path.dirname(__file__), 'results')
        os.makedirs(self.results_dir, exist_ok=True)
    
    def run_spider(self, target_url, config=None):
        """
        Inicia um spider do Scrapy para fazer scraping em uma URL específica
        
        Args:
            target_url (str): URL alvo para scraping
            config (dict): Configurações adicionais para o spider
            
        Returns:
            str: ID do job criado
        """
        job_id = str(uuid.uuid4())
        
        # Criando o arquivo de saída para os resultados
        output_file = os.path.join(self.results_dir, f"{job_id}.json")
        
        # Configuração do processo Scrapy
        settings = get_project_settings()
        settings.set('FEEDS', {output_file: {'format': 'json', 'encoding': 'utf8', 'indent': 4}})
        
        # Informações do job
        self.jobs[job_id] = {
            'id': job_id,
            'url': target_url,
            'status': 'running',
            'start_time': datetime.now().isoformat(),
            'end_time': None,
            'output_file': output_file
        }
        
        try:
            process = CrawlerProcess(settings)
            process.crawl(GenericSpider, url=target_url, config=config or {})
            process.start()  # Este método é bloqueante
            
            # Após concluir o processo
            self.jobs[job_id]['status'] = 'completed'
            self.jobs[job_id]['end_time'] = datetime.now().isoformat()
            
            # Retorna o resultado ao terminar
            return {
                'job_id': job_id, 
                'status': 'completed',
                'results': self.get_results(job_id)
            }
        
        except Exception as e:
            # Em caso de erro
            self.jobs[job_id]['status'] = 'failed'
            self.jobs[job_id]['error'] = str(e)
            self.jobs[job_id]['end_time'] = datetime.now().isoformat()
            raise
    
    def get_jobs(self):
        """Retorna lista de todos os jobs e seus status"""
        return list(self.jobs.values())
    
    def get_results(self, job_id):
        """
        Recupera os resultados de um job específico
        
        Args:
            job_id (str): ID do job
            
        Returns:
            list: Dados obtidos pelo scraping
        """
        if job_id not in self.jobs:
            raise Exception(f"Job ID {job_id} não encontrado")
        
        job = self.jobs[job_id]
        
        if job['status'] != 'completed':
            return {'status': job['status']}
        
        # Lê o arquivo de resultados
        try:
            with open(job['output_file'], 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return []
        except json.JSONDecodeError:
            return []