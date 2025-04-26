# GlobalInsightsBR - API de Web Scraping

Uma aplicação web para coleta de dados públicos da web utilizando Python, Flask e Scrapy.

## Funcionalidades

- Extração de dados públicos de páginas web
- Interface de usuário intuitiva
- Possibilidade de configurar seletores CSS e XPath personalizados
- Visualização e download dos resultados em formato JSON
- Histórico de jobs com status e resultados

## Tecnologias Utilizadas

- **Backend**: Python, Flask, Scrapy
- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **Ferramentas**: REST API, AJAX

## Requisitos

- Python 3.8+
- Pip (gerenciador de pacotes Python)

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/GlobalInsightsBR.git
cd GlobalInsightsBR
```

2. Instale as dependências:
```bash
pip install -r requirements.txt
```

3. Configure o arquivo .env com as variáveis necessárias

## Executando a Aplicação

Execute o seguinte comando no terminal:

```bash
python app.py
```

A aplicação estará disponível em: `http://localhost:5000`

## Como Usar

1. Acesse a interface web
2. Insira a URL do site que deseja extrair dados
3. Configure opções adicionais (seletores, número de páginas, etc.)
4. Clique em "Iniciar Scraping"
5. Visualize e faça download dos resultados

## Configurações Avançadas

### Seletores Personalizados

Você pode adicionar seletores CSS ou XPath para extrair informações específicas de uma página:

- **Nome do campo**: Como o dado será identificado no resultado (ex: título, preço)
- **Tipo de seletor**: CSS ou XPath
- **Valor do seletor**: O seletor em si (ex: h1::text ou //h1/text())

### Configurações de Scraping

- **Seguir links**: Se marcado, o crawler pode navegar para outras páginas
- **Número máximo de páginas**: Limita o número de páginas a serem visitadas

## Ética e Uso Responsável

Esta ferramenta foi desenvolvida apenas para fins educacionais e de pesquisa. Ao utilizá-la, certifique-se de:

- Respeitar as políticas de robots.txt dos sites
- Não sobrecarregar os servidores com requisições excessivas
- Utilizar apenas para coleta de dados públicos
- Cumprir os termos de serviço dos sites alvo

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para mais detalhes.