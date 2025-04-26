import scrapy
import logging

class GenericSpider(scrapy.Spider):
    name = 'generic_spider'
    
    def __init__(self, url=None, config=None, *args, **kwargs):
        super(GenericSpider, self).__init__(*args, **kwargs)
        self.start_urls = [url] if url else []
        self.config = config or {}
        self.logger = logging.getLogger(self.name)
        
        # Configurações do spider
        self.selectors = self.config.get('selectors', {})
        self.follow_links = self.config.get('follow_links', False)
        self.max_pages = self.config.get('max_pages', 1)
        self.page_count = 0
    
    def parse(self, response):
        """
        Método principal de parsing da página
        
        Args:
            response: Resposta HTTP da página
            
        Yields:
            dict: Dados extraídos da página
        """
        self.page_count += 1
        self.logger.info(f"Processando página: {response.url} [{self.page_count}/{self.max_pages}]")
        
        # Se não houver seletores definidos, extrai informações básicas
        if not self.selectors:
            # Comportamento padrão: extrai títulos e textos da página
            yield {
                'url': response.url,
                'title': response.css('title::text').get(),
                'headings': response.css('h1::text, h2::text').getall(),
                'paragraphs': response.css('p::text').getall()[:5],  # Primeiros 5 parágrafos
            }
        else:
            # Extrai dados usando os seletores fornecidos
            extracted_data = {
                'url': response.url
            }
            
            for field, selector in self.selectors.items():
                if 'css' in selector:
                    extracted_data[field] = response.css(selector['css']).getall()
                elif 'xpath' in selector:
                    extracted_data[field] = response.xpath(selector['xpath']).getall()
            
            yield extracted_data
        
        # Segue links se configurado e não atingiu o limite de páginas
        if self.follow_links and self.page_count < self.max_pages:
            # Obtém links na página
            next_links = response.css('a::attr(href)').getall()
            
            for link in next_links:
                if link.startswith('http'):
                    yield response.follow(link, callback=self.parse)
                    break  # Apenas segue um link por vez para evitar explosão de requisições