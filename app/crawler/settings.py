# Configurações do Scrapy para uso com a API Flask

BOT_NAME = 'globalinsightsbr'

SPIDER_MODULES = ['app.crawler.spiders']
NEWSPIDER_MODULE = 'app.crawler.spiders'

# Respeitar robots.txt por padrão
ROBOTSTXT_OBEY = True

# Configurar User-Agent
USER_AGENT = 'GlobalInsightsBR/1.0 (Educational Purpose)'

# Tempos de delay entre requisições
DOWNLOAD_DELAY = 1
RANDOMIZE_DOWNLOAD_DELAY = True

# Configurações para cache
HTTPCACHE_ENABLED = True
HTTPCACHE_EXPIRATION_SECS = 0
HTTPCACHE_DIR = 'httpcache'
HTTPCACHE_IGNORE_HTTP_CODES = []
HTTPCACHE_STORAGE = 'scrapy.extensions.httpcache.FilesystemCacheStorage'

# Registro de logs
LOG_LEVEL = 'INFO'

# Configurações do sistema de arquivos
FEEDS = {}  # Será definido dinamicamente no código

# Middlewares do Scrapy
SPIDER_MIDDLEWARES = {
}

DOWNLOADER_MIDDLEWARES = {
    'scrapy.downloadermiddlewares.useragent.UserAgentMiddleware': None,
    'app.crawler.middlewares.RandomUserAgentMiddleware': 400,
}

# Configurações de retry
RETRY_ENABLED = True
RETRY_TIMES = 3
RETRY_HTTP_CODES = [500, 502, 503, 504, 400, 408]

# Timeouts
DOWNLOAD_TIMEOUT = 30

# Configurações de extensões
EXTENSIONS = {
    'scrapy.extensions.telnet.TelnetConsole': None,
}

# Configure item pipelines
ITEM_PIPELINES = {
}