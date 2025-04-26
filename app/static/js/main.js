/**
 * GlobalInsightsBR - Script principal para análise financeira
 */

// Objetos para armazenar os gráficos
let priceChart = null;
let volumeChart = null;
let performanceChart = null;

// Dados da empresa atual
let currentStockData = null;
let yearlyData = {};

// Configurações padrão
const DEFAULT_PERIOD = 5; // 5 anos
let currentPeriod = DEFAULT_PERIOD;

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar formulário de busca
    const searchForm = document.getElementById('tickerSearchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const ticker = document.getElementById('ticker').value.trim().toUpperCase();
            if (ticker) {
                searchStock(ticker);
            }
        });
    }
    
    // Inicializar período
    const periodSelect = document.getElementById('period');
    if (periodSelect) {
        periodSelect.addEventListener('change', function() {
            currentPeriod = parseInt(this.value);
            if (currentStockData) {
                updateCharts(currentStockData, currentPeriod);
            }
        });
    }
    
    // Inicializar botões de período para o gráfico principal
    document.querySelectorAll('[data-chart-period]').forEach(button => {
        button.addEventListener('click', function() {
            // Remove classe ativa de todos os botões
            document.querySelectorAll('[data-chart-period]').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Adiciona classe ativa ao botão clicado
            this.classList.add('active');
            
            // Atualiza o gráfico para o período selecionado
            if (priceChart && currentStockData) {
                updatePriceChartPeriod(this.dataset.chartPeriod);
            }
        });
    });
    
    // Inicializar os gráficos vazios
    initCharts();
});

/**
 * Inicializa os gráficos vazios
 */
function initCharts() {
    // Contextos dos gráficos
    const priceCtx = document.getElementById('priceChart').getContext('2d');
    const volumeCtx = document.getElementById('volumeChart').getContext('2d');
    const performanceCtx = document.getElementById('performanceChart').getContext('2d');
    
    // Configuração do gráfico de preços
    priceChart = new Chart(priceCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Preço de Fechamento',
                data: [],
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHitRadius: 5,
                pointHoverBackgroundColor: '#0d6efd',
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toFixed(2);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return 'R$ ' + context.parsed.y.toFixed(2);
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        }
    });
    
    // Configuração do gráfico de volume
    volumeChart = new Chart(volumeCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Volume',
                data: [],
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            if (value >= 1000000) {
                                return (value / 1000000).toFixed(1) + 'M';
                            }
                            if (value >= 1000) {
                                return (value / 1000).toFixed(1) + 'K';
                            }
                            return value;
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
    
    // Configuração do gráfico de comparação de performance
    performanceChart = new Chart(performanceCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Ativo',
                    data: [],
                    borderColor: '#0d6efd',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5
                },
                {
                    label: 'Ibovespa',
                    data: [],
                    borderColor: '#6c757d',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + '%';
                        }
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        }
    });
    
    // Mostrar mensagem de "sem dados"
    document.getElementById('noDataMessage').classList.remove('d-none');
}

/**
 * Busca os dados da ação pelo ticker
 * @param {string} ticker - Código da ação
 */
function searchStock(ticker) {
    // Esconde a mensagem de "sem dados"
    document.getElementById('noDataMessage').classList.add('d-none');
    
    // Mostra o loader
    document.getElementById('chartLoader').classList.remove('d-none');
    
    // Configuração
    const period = document.getElementById('period').value;
    const includeFinancials = document.getElementById('includeFinancials').checked;
    
    // Parâmetros para a requisição
    const config = {
        follow_links: false,
        yfinance_data: true,
        period_years: parseInt(period)
    };
    
    // Chamada à API
    fetch('/api/finance', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ticker: ticker,
            config: config
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao buscar dados da ação');
        }
        return response.json();
    })
    .then(data => {
        // Esconde o loader
        document.getElementById('chartLoader').classList.add('d-none');
        
        // Verifica se retornou dados válidos
        if (data.status === 'success' && data.data) {
            // Armazena os dados
            currentStockData = data.data;
            
            // Atualiza a interface
            updateStockInfo(currentStockData);
            
            // Atualiza os gráficos
            updateCharts(currentStockData, parseInt(period));
            
            // Mostra demonstrações financeiras se solicitado
            if (includeFinancials) {
                document.getElementById('financialReports').classList.remove('d-none');
                updateFinancialTables(currentStockData);
            } else {
                document.getElementById('financialReports').classList.add('d-none');
            }
        } else {
            // Em caso de erro ou dados inválidos
            showError('Nenhum dado encontrado para este ticker');
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        document.getElementById('chartLoader').classList.add('d-none');
        showError('Erro ao buscar dados: ' + error.message);
    });
}

/**
 * Atualiza as informações da empresa
 * @param {Object} data - Dados da empresa
 */
function updateStockInfo(data) {
    // Verifica se temos dados do yfinance
    if (!data.yfinance) {
        document.getElementById('companyInfo').classList.add('d-none');
        return;
    }
    
    const yf = data.yfinance;
    
    // Atualiza informações básicas
    document.querySelector('.company-name').textContent = yf.nome || data.empresa || '';
    document.querySelector('.company-sector').textContent = yf.setor ? `${yf.setor} | ${yf.industria || ''}` : '';
    document.querySelector('.current-price').textContent = formatCurrency(yf.preco_atual);
    
    // Atualiza a variação diária (simulação - normalmente viria da API)
    const dailyChangeEl = document.querySelector('.daily-change');
    // Variação aleatória simulada para fins de demonstração
    const randomChange = ((Math.random() * 5) - 2.5).toFixed(2);
    dailyChangeEl.textContent = randomChange + '%';
    dailyChangeEl.classList.remove('positive', 'negative');
    dailyChangeEl.classList.add(parseFloat(randomChange) >= 0 ? 'positive' : 'negative');
    dailyChangeEl.classList.add(parseFloat(randomChange) >= 0 ? 'text-success' : 'text-danger');
    
    // Atualiza os indicadores
    document.querySelector('.pe-ratio').textContent = formatNumber(yf.relacoes?.p_l || '-');
    document.querySelector('.pb-ratio').textContent = formatNumber(yf.relacoes?.p_vp || '-');
    document.querySelector('.dividend-yield').textContent = '-'; // Simula div yield
    document.querySelector('.market-cap').textContent = formatLargeNumber(yf.valor_mercado);
    
    // Atualiza range de 52 semanas
    const low52w = yf.variacao_52_semanas?.min || 0;
    const high52w = yf.variacao_52_semanas?.max || 0;
    const currentPrice = yf.preco_atual || 0;
    
    document.querySelector('.low-52w').textContent = formatCurrency(low52w);
    document.querySelector('.high-52w').textContent = formatCurrency(high52w);
    
    if (low52w > 0 && high52w > 0 && currentPrice > 0) {
        // Calcula posição percentual no range
        const range = high52w - low52w;
        const position = (currentPrice - low52w) / range * 100;
        
        // Atualiza a barra de progresso
        const progressBar = document.querySelector('.price-range .progress-bar');
        progressBar.style.width = `${position}%`;
        
        // Atualiza os textos do range
        document.querySelector('.range-min').textContent = formatCurrency(low52w);
        document.querySelector('.range-max').textContent = formatCurrency(high52w);
        
        // Posiciona o indicador de preço atual
        const rangeCurrentEl = document.querySelector('.range-current');
        rangeCurrentEl.style.left = `${position}%`;
        rangeCurrentEl.style.transform = 'translateX(-50%)';
    }
    
    // Mostra as informações
    document.getElementById('companyInfo').classList.remove('d-none');
}

/**
 * Atualiza os gráficos com os dados da empresa
 * @param {Object} data - Dados da empresa
 * @param {number} years - Número de anos para exibir
 */
function updateCharts(data, years) {
    // Verifica se temos dados do yfinance
    if (!data.yfinance || !data.yfinance.historico_precos) {
        showError('Sem dados históricos para exibir');
        return;
    }
    
    const historico = data.yfinance.historico_precos;
    
    // Converte dados para o formato dos gráficos
    const dates = [];
    const prices = [];
    const volumes = [];
    
    // Filtra pelo período desejado
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - years);
    
    // Processa os dados históricos
    historico.forEach(item => {
        const date = new Date(item.data);
        if (date >= cutoffDate) {
            dates.push(formatDate(date));
            prices.push(item.fechamento);
            volumes.push(item.volume);
        }
    });
    
    // Inverte os arrays para exibir em ordem cronológica
    dates.reverse();
    prices.reverse();
    volumes.reverse();
    
    // Atualiza o gráfico de preços
    priceChart.data.labels = dates;
    priceChart.data.datasets[0].data = prices;
    priceChart.update();
    
    // Atualiza o gráfico de volume
    volumeChart.data.labels = dates;
    volumeChart.data.datasets[0].data = volumes;
    volumeChart.update();
    
    // Calcula a performance relativa para o gráfico de comparação
    if (prices.length > 0) {
        const initialPrice = prices[0];
        const relativePerformance = prices.map(price => ((price / initialPrice * 100) - 100).toFixed(2));
        
        // Simula dados do Ibovespa
        const ibovPerformance = generateSimulatedIbovespaData(relativePerformance.length);
        
        // Atualiza o gráfico de performance
        performanceChart.data.labels = dates;
        performanceChart.data.datasets[0].data = relativePerformance;
        performanceChart.data.datasets[1].data = ibovPerformance;
        performanceChart.update();
    }
}

/**
 * Atualiza o período exibido no gráfico de preços
 * @param {string} periodKey - Chave do período (1M, 6M, 1Y, 5Y, MAX)
 */
function updatePriceChartPeriod(periodKey) {
    if (!currentStockData || !currentStockData.yfinance || !currentStockData.yfinance.historico_precos) {
        return;
    }
    
    // Obtém os dados históricos
    const historico = currentStockData.yfinance.historico_precos;
    
    // Define a data de corte baseada no período selecionado
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (periodKey) {
        case '1M':
            cutoffDate.setMonth(now.getMonth() - 1);
            break;
        case '6M':
            cutoffDate.setMonth(now.getMonth() - 6);
            break;
        case '1Y':
            cutoffDate.setFullYear(now.getFullYear() - 1);
            break;
        case '5Y':
            cutoffDate.setFullYear(now.getFullYear() - 5);
            break;
        case 'MAX':
            cutoffDate = new Date(0); // Começo dos tempos
            break;
    }
    
    // Filtrar e preparar dados
    const dates = [];
    const prices = [];
    
    historico.forEach(item => {
        const date = new Date(item.data);
        if (date >= cutoffDate) {
            dates.push(formatDate(date));
            prices.push(item.fechamento);
        }
    });
    
    // Inverte os arrays para ordem cronológica
    dates.reverse();
    prices.reverse();
    
    // Atualiza o gráfico
    priceChart.data.labels = dates;
    priceChart.data.datasets[0].data = prices;
    priceChart.update();
}

/**
 * Atualiza as tabelas de dados financeiros
 * @param {Object} data - Dados financeiros da empresa
 */
function updateFinancialTables(data) {
    // Esta função seria implementada para preencher as tabelas de demonstrações financeiras
    // com base nos dados retornados pela API
    
    // Como exemplo, vamos apenas limpar as tabelas
    document.querySelectorAll('#financialTabsContent tbody').forEach(tbody => {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Dados financeiros não disponíveis</td></tr>';
    });
    
    // A implementação completa dependeria dos dados retornados pelo scraping e sua estrutura
}

/**
 * Gera dados simulados de performance do Ibovespa para comparação
 * @param {number} length - Tamanho do array de dados
 * @returns {Array} - Array com dados simulados
 */
function generateSimulatedIbovespaData(length) {
    const ibovespaData = [];
    let value = 0;
    
    for (let i = 0; i < length; i++) {
        // Adiciona uma variação aleatória para simular o mercado
        const change = (Math.random() * 2 - 0.8); // Variação entre -0.8% e +1.2%
        value += change;
        ibovespaData.push(value.toFixed(2));
    }
    
    return ibovespaData;
}

/**
 * Exibe uma mensagem de erro nos gráficos
 * @param {string} message - Mensagem de erro
 */
function showError(message) {
    const noDataMessage = document.getElementById('noDataMessage');
    noDataMessage.querySelector('h5').textContent = 'Erro';
    noDataMessage.querySelector('p').textContent = message;
    noDataMessage.classList.remove('d-none');
}

/**
 * Formata um valor como moeda (R$)
 * @param {number} value - Valor a ser formatado
 * @returns {string} - Valor formatado
 */
function formatCurrency(value) {
    if (value === undefined || value === null) return '-';
    return 'R$ ' + parseFloat(value).toFixed(2);
}

/**
 * Formata números grandes com K, M, B
 * @param {number} value - Valor a ser formatado
 * @returns {string} - Valor formatado
 */
function formatLargeNumber(value) {
    if (value === undefined || value === null) return '-';
    
    if (value >= 1000000000) {
        return 'R$ ' + (value / 1000000000).toFixed(2) + ' B';
    }
    if (value >= 1000000) {
        return 'R$ ' + (value / 1000000).toFixed(2) + ' M';
    }
    if (value >= 1000) {
        return 'R$ ' + (value / 1000).toFixed(2) + ' K';
    }
    
    return 'R$ ' + value.toFixed(2);
}

/**
 * Formata um número com 2 casas decimais
 * @param {number} value - Valor a ser formatado
 * @returns {string} - Valor formatado
 */
function formatNumber(value) {
    if (value === undefined || value === null || value === '-') return '-';
    return parseFloat(value).toFixed(2);
}

/**
 * Formata uma data para exibição
 * @param {Date} date - Data a ser formatada
 * @returns {string} - Data formatada
 */
function formatDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}