import scrapy
import logging
import yfinance as yf
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
        self.yfinance_data = self.config.get('yfinance_data', True)
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
                    
                    # Extrai os cabeçalhos da tabela
                    headers = [h.strip() for h in table.css('th::text').getall() if h.strip()]
                    
                    # Extrai as linhas da tabela
                    rows = table.css('tr')
                    for row in rows[1:]:  # Pula o cabeçalho
                        cells = row.css('td::text').getall()
                        if cells:
                            row_data = {headers[i]: cell.strip() for i, cell in enumerate(cells) if i < len(headers)}
                            financials[section_name].append(row_data)
        
        # Se não encontrou tabelas ou não é uma página válida
        if not financials:
            financials = {
                'url': response.url,
                'info': 'Nenhuma demonstração financeira encontrada para este ticker'
            }
        else:
            financials['url'] = response.url
        
        # Adiciona dados do yfinance se configurado e ticker fornecido
        if self.yfinance_data and self.ticker:
            try:
                # Adiciona .SA ao ticker para ações brasileiras no Yahoo Finance
                yf_ticker = f"{self.ticker}.SA" if '.' not in self.ticker else self.ticker
                stock_data = yf.Ticker(yf_ticker)
                
                # Obtém informações básicas
                info = stock_data.info
                financials['yfinance'] = {
                    'nome': info.get('shortName', ''),
                    'setor': info.get('sector', ''),
                    'industria': info.get('industry', ''),
                    'preco_atual': info.get('currentPrice', 0),
                    'variacao_52_semanas': {
                        'min': info.get('fiftyTwoWeekLow', 0),
                        'max': info.get('fiftyTwoWeekHigh', 0)
                    },
                    'valor_mercado': info.get('marketCap', 0),
                    'relacoes': {
                        'p_l': info.get('trailingPE', 0),
                        'p_vp': info.get('priceToBook', 0)
                    }
                }
                
                # Obtém histórico de preços pelo período solicitado
                period_str = f"{self.period_years}y"
                hist = stock_data.history(period=period_str)
                
                if not hist.empty:
                    # Converte para dicionário formatado
                    history_dict = []
                    for date, row in hist.iterrows():
                        history_dict.append({
                            'data': date.strftime('%Y-%m-%d'),
                            'abertura': round(row['Open'], 2),
                            'maxima': round(row['High'], 2),
                            'minima': round(row['Low'], 2),
                            'fechamento': round(row['Close'], 2),
                            'volume': int(row['Volume'])
                        })
                    financials['yfinance']['historico_precos'] = history_dict
                    
                    # Adiciona meta-informações sobre o período
                    if history_dict:
                        first_date = datetime.strptime(history_dict[0]['data'], '%Y-%m-%d')
                        last_date = datetime.strptime(history_dict[-1]['data'], '%Y-%m-%d')
                        days_diff = (last_date - first_date).days
                        
                        financials['yfinance']['periodo'] = {
                            'inicio': history_dict[0]['data'],
                            'fim': history_dict[-1]['data'],
                            'dias': days_diff,
                            'anos': round(days_diff / 365.25, 2)
                        }
                
            except Exception as e:
                self.logger.error(f"Erro ao obter dados do yfinance: {str(e)}")
                financials['yfinance_error'] = str(e)
                
        yield financials