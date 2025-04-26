import scrapy
import logging
import pandas as pd
from datetime import datetime, timedelta

class FinancialSpider(scrapy.Spider):
    name = 'financial_spider'
    
    def __init__(self, ticker=None, config=None, *args, **kwargs):
        super(FinancialSpider, self).__init__(*args, **kwargs)
        self.ticker = ticker
        self.config = config or {}
        self.logger = logging.getLogger(self.name)
        
        # Se tiver ticker, define a URL para a página do InvestSite com o ticker
        if ticker:
            self.start_urls = [f"https://www.investsite.com.br/atualizacoes_demonstracoes_financeiras.php?cod_negociacao={ticker.upper()}"]
        else:
            self.start_urls = ["https://www.investsite.com.br/atualizacoes_demonstracoes_financeiras.php"]
        
        # Configurações adicionais
        self.follow_links = self.config.get('follow_links', False)
        self.period_years = self.config.get('period_years', 5)  # Período padrão: 5 anos
        
        # Validação do período
        if self.period_years < 1:
            self.period_years = 1
        elif self.period_years > 15:
            self.period_years = 15
    
    def parse(self, response):
        """
        Método principal de parsing da página de demonstrações financeiras do InvestSite
        
        Args:
            response: Resposta HTTP da página
            
        Yields:
            dict: Dados financeiros extraídos
        """
        self.logger.info(f"Processando página: {response.url}")
        
        # Extrair informações da tabela de demonstrações financeiras
        tables = response.css('table.table')
        financials = {}
        historical_data = {}
        periods = []
        
        if tables:
            # Extrai o título da empresa (se disponível)
            company_name = response.css('h2::text').get()
            if company_name:
                financials['empresa'] = company_name.strip()
                
            # Processa tabela de demonstrações financeiras
            for table in tables:
                # Tenta identificar o tipo de demonstração financeira pelo cabeçalho
                table_title = table.xpath('./preceding-sibling::h4[1]/text()').get()
                if table_title:
                    section_name = table_title.strip()
                    financials[section_name] = []
                    
                    # Extrai os cabeçalhos da tabela (períodos)
                    headers = [h.strip() for h in table.css('th::text').getall() if h.strip()]
                    
                    # Se encontrar períodos (anos), salvar para usar nos gráficos
                    if len(headers) > 1:
                        # O primeiro header geralmente é o nome da conta, os demais são períodos
                        periods = headers[1:]
                    
                    # Extrai as linhas da tabela
                    rows = table.css('tr')
                    for row in rows[1:]:  # Pula o cabeçalho
                        cells = row.css('td::text').getall()
                        if cells:
                            row_data = {headers[i]: cell.strip() for i, cell in enumerate(cells) if i < len(headers)}
                            
                            # Adiciona aos dados financeiros
                            financials[section_name].append(row_data)
                            
                            # Armazena os dados históricos para o gráfico
                            metric_name = cells[0].strip() if cells else "Desconhecido"
                            
                            # Tentativa de converter valores para números
                            values_by_period = {}
                            for i, period in enumerate(periods):
                                if i + 1 < len(cells):  # Verifica se tem o valor para aquele período
                                    value_str = cells[i + 1].strip().replace(".", "").replace(",", ".")
                                    try:
                                        # Tenta converter para número
                                        value = float(value_str)
                                        values_by_period[period] = value
                                    except (ValueError, TypeError):
                                        # Se não conseguir converter, mantém como string
                                        values_by_period[period] = cells[i + 1].strip()
                            
                            if metric_name not in historical_data:
                                historical_data[metric_name] = values_by_period
        
        # Se não encontrou tabelas ou não é uma página válida
        if not financials:
            financials = {
                'url': response.url,
                'info': 'Nenhuma demonstração financeira encontrada para este ticker'
            }
        else:
            financials['url'] = response.url
        
        # Adiciona dados históricos para geração de gráficos
        if historical_data:
            financials['dados_historicos'] = historical_data
            financials['periodos'] = periods
        
        yield financials