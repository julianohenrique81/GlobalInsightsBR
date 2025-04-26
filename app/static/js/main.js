/**
 * GlobalInsightsBR - Script principal para análise financeira
 */

// Objetos para armazenar os gráficos
let financialCharts = {};
let metricsChart = null;

// Dados da empresa atual
let currentFinancialData = null;
let availableMetrics = [];

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
                searchFinancials(ticker);
            }
        });
    }
    
    // Inicializar período
    const periodSelect = document.getElementById('period');
    if (periodSelect) {
        periodSelect.addEventListener('change', function() {
            currentPeriod = parseInt(this.value);
            if (currentFinancialData) {
                updateFinancialDisplays(currentFinancialData);
            }
        });
    }
    
    // Inicializar os gráficos vazios
    initCharts();
});

/**
 * Inicializa os gráficos vazios
 */
function initCharts() {
    // Inicializa o gráfico principal para métricas financeiras
    const metricsCtx = document.getElementById('priceChart').getContext('2d');
    
    metricsChart = new Chart(metricsCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
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
                            return formatMetricValue(value);
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
                            return context.dataset.label + ': ' + formatMetricValue(context.parsed.y);
                        }
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
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
    
    // Ocultar elementos relacionados a histórico de preços
    hideStockPriceElements();
}

/**
 * Oculta elementos relacionados a histórico de preços das ações
 */
function hideStockPriceElements() {
    // Ocultar o elemento de informações da empresa
    const companyInfoEl = document.getElementById('companyInfo');
    if (companyInfoEl) {
        companyInfoEl.classList.add('d-none');
    }
    
    // Mudar título do gráfico principal
    const chartHeader = document.querySelector('.chart-container .card-header h5');
    if (chartHeader) {
        chartHeader.textContent = 'Dados Contábeis Históricos';
    }
    
    // Ocultar botões de período do gráfico preço
    const periodButtons = document.querySelector('.chart-container .card-header .btn-group');
    if (periodButtons) {
        periodButtons.classList.add('d-none');
    }
    
    // Mudar títulos dos outros gráficos
    const subchartTitles = document.querySelectorAll('.row .card-header h5');
    if (subchartTitles.length >= 2) {
        subchartTitles[0].textContent = 'Crescimento Anual';
        subchartTitles[1].textContent = 'Composição Patrimonial';
    }
}

/**
 * Busca os dados financeiros contábeis pelo ticker
 * @param {string} ticker - Código da ação
 */
function searchFinancials(ticker) {
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
        yfinance_data: false, // Não queremos dados do yfinance
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
            throw new Error('Erro ao buscar dados financeiros');
        }
        return response.json();
    })
    .then(data => {
        // Esconde o loader
        document.getElementById('chartLoader').classList.add('d-none');
        
        // Verifica se retornou dados válidos
        if (data.status === 'success' && data.data) {
            // Armazena os dados
            currentFinancialData = data.data;
            
            // Atualiza o título com o nome da empresa
            updateCompanyName(currentFinancialData);
            
            // Atualiza os gráficos com dados financeiros
            updateFinancialDisplays(currentFinancialData);
            
            // Mostra demonstrações financeiras se solicitado
            if (includeFinancials) {
                document.getElementById('financialReports').classList.remove('d-none');
                updateFinancialTables(currentFinancialData);
            } else {
                document.getElementById('financialReports').classList.add('d-none');
            }
        } else {
            // Em caso de erro ou dados inválidos
            showError('Nenhum dado financeiro encontrado para este ticker');
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        document.getElementById('chartLoader').classList.add('d-none');
        showError('Erro ao buscar dados: ' + error.message);
    });
}

/**
 * Atualiza o nome da empresa na interface
 * @param {Object} data - Dados financeiros
 */
function updateCompanyName(data) {
    if (data.empresa) {
        // Atualiza o título do gráfico principal
        const chartHeader = document.querySelector('.chart-container .card-header h5');
        if (chartHeader) {
            chartHeader.textContent = `Dados Contábeis - ${data.empresa}`;
        }
        
        // Adiciona o nome da empresa em um lugar visível na sidebar
        const sidebarTitle = document.querySelector('.sidebar .card-header h5');
        if (sidebarTitle) {
            sidebarTitle.textContent = `${data.empresa} (${data.ticker || ''})`;
        }
    }
}

/**
 * Atualiza os gráficos e displays com dados financeiros
 * @param {Object} data - Dados financeiros
 */
function updateFinancialDisplays(data) {
    // Verificar se temos dados históricos
    if (!data.dados_historicos || !data.periodos || data.periodos.length === 0) {
        showError('Sem dados contábeis históricos para exibir');
        return;
    }
    
    // Limpa os dados anteriores
    availableMetrics = [];
    
    // Processa dados históricos para gráficos
    const historicalData = data.dados_historicos;
    const periods = data.periodos; // Anos ou períodos
    
    // Identifica métricas disponíveis e relevantes
    for (const metricName in historicalData) {
        // Filtra apenas métricas com valores numéricos
        const hasNumericValues = Object.values(historicalData[metricName]).some(value => !isNaN(parseFloat(value)));
        if (hasNumericValues) {
            availableMetrics.push(metricName);
        }
    }
    
    // Seleciona métricas importantes para mostrar inicialmente (você pode personalizar)
    const keysToDisplay = selectRelevantMetrics(availableMetrics);
    
    // Atualiza o gráfico principal com as métricas selecionadas
    updateMainMetricsChart(keysToDisplay, historicalData, periods);
    
    // Atualiza os gráficos secundários
    updateSecondaryCharts(historicalData, periods);
    
    // Cria seletor de métricas para o usuário poder escolher o que visualizar
    createMetricSelector(availableMetrics, historicalData, periods);
}

/**
 * Seleciona métricas relevantes para exibição inicial
 * @param {Array} allMetrics - Todas as métricas disponíveis
 * @returns {Array} - Métricas selecionadas
 */
function selectRelevantMetrics(allMetrics) {
    // Lista de métricas prioritárias para mostrar (se existirem nos dados)
    const priorityMetrics = [
        'Receita Líquida',
        'Lucro Líquido', 
        'EBITDA', 
        'Patrimônio Líquido',
        'Lucro Bruto',
        'Dívida Líquida',
    ];
    
    // Filtra métricas prioritárias que existem nos dados
    const selectedMetrics = priorityMetrics.filter(metric => 
        allMetrics.some(m => m.includes(metric))
    );
    
    // Se encontrou métricas prioritárias, retorna até 5 delas
    if (selectedMetrics.length > 0) {
        return selectedMetrics.slice(0, 5);
    }
    
    // Caso contrário, retorna as 5 primeiras métricas disponíveis
    return allMetrics.slice(0, 5);
}

/**
 * Atualiza o gráfico principal com métricas contábeis selecionadas
 * @param {Array} metrics - Métricas a serem exibidas
 * @param {Object} historicalData - Dados históricos
 * @param {Array} periods - Períodos disponíveis
 */
function updateMainMetricsChart(metrics, historicalData, periods) {
    // Preparar o gráfico principal
    const datasets = [];
    const colors = [
        'rgba(13, 110, 253, 1)',  // azul
        'rgba(220, 53, 69, 1)',   // vermelho
        'rgba(25, 135, 84, 1)',   // verde
        'rgba(255, 193, 7, 1)',   // amarelo
        'rgba(111, 66, 193, 1)'   // roxo
    ];
    
    // Cria um dataset para cada métrica
    metrics.forEach((metric, index) => {
        // Obtém os valores para essa métrica em cada período
        const values = [];
        periods.forEach(period => {
            const value = historicalData[metric] && historicalData[metric][period];
            // Se for um número, adicione-o; se não, adicione null para manter o alinhamento com períodos
            values.push(value && !isNaN(parseFloat(value)) ? parseFloat(value) : null);
        });
        
        // Cria o dataset
        datasets.push({
            label: metric,
            data: values,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length].replace('1)', '0.1)'),
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5
        });
    });
    
    // Atualiza o gráfico
    metricsChart.data.labels = periods;
    metricsChart.data.datasets = datasets;
    metricsChart.update();
}

/**
 * Atualiza os gráficos secundários com outros dados relevantes
 * @param {Object} historicalData - Dados históricos
 * @param {Array} periods - Períodos disponíveis
 */
function updateSecondaryCharts(historicalData, periods) {
    // Atualiza o gráfico de crescimento (lado esquerdo)
    updateGrowthChart(historicalData, periods);
    
    // Atualiza o gráfico de composição patrimonial (lado direito)
    updateBalanceCompositionChart(historicalData, periods);
}

/**
 * Atualiza o gráfico de crescimento anual
 * @param {Object} historicalData - Dados históricos
 * @param {Array} periods - Períodos disponíveis
 */
function updateGrowthChart(historicalData, periods) {
    // Obtém o contexto do canvas
    const growthCtx = document.getElementById('volumeChart').getContext('2d');
    
    // Calcula o crescimento anual da receita e lucro, se disponíveis
    const growthLabels = [];
    const revenueGrowth = [];
    const profitGrowth = [];
    
    // Identifica as métricas de receita e lucro
    const revenueName = findMetricByKeywords(availableMetrics, ['Receita', 'Faturamento']);
    const profitName = findMetricByKeywords(availableMetrics, ['Lucro Líquido', 'Resultado']);
    
    // Se encontrou menos de 2 períodos, não é possível calcular crescimento
    if (periods.length < 2) return;
    
    // Calcula o crescimento ano a ano
    for (let i = 1; i < periods.length; i++) {
        const currentPeriod = periods[i];
        const previousPeriod = periods[i-1];
        growthLabels.push(currentPeriod);
        
        // Calcula crescimento da receita
        if (revenueName) {
            const currentRevenue = parseFloat(historicalData[revenueName][currentPeriod]);
            const previousRevenue = parseFloat(historicalData[revenueName][previousPeriod]);
            
            if (!isNaN(currentRevenue) && !isNaN(previousRevenue) && previousRevenue !== 0) {
                const growth = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
                revenueGrowth.push(growth.toFixed(2));
            } else {
                revenueGrowth.push(null);
            }
        }
        
        // Calcula crescimento do lucro
        if (profitName) {
            const currentProfit = parseFloat(historicalData[profitName][currentPeriod]);
            const previousProfit = parseFloat(historicalData[profitName][previousPeriod]);
            
            if (!isNaN(currentProfit) && !isNaN(previousProfit) && previousProfit !== 0) {
                const growth = ((currentProfit - previousProfit) / previousProfit) * 100;
                profitGrowth.push(growth.toFixed(2));
            } else {
                profitGrowth.push(null);
            }
        }
    }
    
    // Se já existe um gráfico, destrua-o
    if (financialCharts.growthChart) {
        financialCharts.growthChart.destroy();
    }
    
    // Cria o novo gráfico
    financialCharts.growthChart = new Chart(growthCtx, {
        type: 'bar',
        data: {
            labels: growthLabels,
            datasets: [
                {
                    label: revenueName ? 'Crescimento ' + revenueName : 'Crescimento da Receita',
                    data: revenueGrowth,
                    backgroundColor: 'rgba(25, 135, 84, 0.6)',
                    borderColor: 'rgba(25, 135, 84, 1)',
                    borderWidth: 1
                },
                {
                    label: profitName ? 'Crescimento ' + profitName : 'Crescimento do Lucro',
                    data: profitGrowth,
                    backgroundColor: 'rgba(13, 110, 253, 0.6)',
                    borderColor: 'rgba(13, 110, 253, 1)',
                    borderWidth: 1
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
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y + '%';
                        }
                    }
                }
            }
        }
    });
}

/**
 * Atualiza o gráfico de composição patrimonial
 * @param {Object} historicalData - Dados históricos
 * @param {Array} periods - Períodos disponíveis
 */
function updateBalanceCompositionChart(historicalData, periods) {
    // Obtém o contexto do canvas
    const balanceCtx = document.getElementById('performanceChart').getContext('2d');
    
    // Busca por métricas de ativo, passivo e patrimônio líquido
    const assetName = findMetricByKeywords(availableMetrics, ['Ativo Total', 'Total do Ativo']);
    const liabilityName = findMetricByKeywords(availableMetrics, ['Passivo Total', 'Total do Passivo']);
    const equityName = findMetricByKeywords(availableMetrics, ['Patrimônio Líquido']);
    
    // Obtém o período mais recente
    const latestPeriod = periods[0]; // Assumindo que os períodos estão em ordem decrescente
    
    // Busca os valores correspondentes
    let assets = 0, liabilities = 0, equity = 0;
    
    if (assetName && historicalData[assetName] && historicalData[assetName][latestPeriod]) {
        assets = parseFloat(historicalData[assetName][latestPeriod]);
    }
    
    if (liabilityName && historicalData[liabilityName] && historicalData[liabilityName][latestPeriod]) {
        liabilities = parseFloat(historicalData[liabilityName][latestPeriod]);
    }
    
    if (equityName && historicalData[equityName] && historicalData[equityName][latestPeriod]) {
        equity = parseFloat(historicalData[equityName][latestPeriod]);
    }
    
    // Se não encontrou dados de ativo mas encontrou passivo e patrimônio
    if (isNaN(assets) && !isNaN(liabilities) && !isNaN(equity)) {
        assets = liabilities + equity;
    }
    
    // Se só temos ativo e patrimônio, calcula passivo
    if (!isNaN(assets) && isNaN(liabilities) && !isNaN(equity)) {
        liabilities = assets - equity;
    }
    
    // Se só temos ativo e passivo, calcula patrimônio
    if (!isNaN(assets) && !isNaN(liabilities) && isNaN(equity)) {
        equity = assets - liabilities;
    }
    
    // Se já existe um gráfico, destrua-o
    if (financialCharts.balanceChart) {
        financialCharts.balanceChart.destroy();
    }
    
    // Se temos dados suficientes, cria um gráfico de pizza
    if (!isNaN(assets) && !isNaN(liabilities) && !isNaN(equity)) {
        financialCharts.balanceChart = new Chart(balanceCtx, {
            type: 'pie',
            data: {
                labels: ['Passivo', 'Patrimônio Líquido'],
                datasets: [{
                    data: [liabilities, equity],
                    backgroundColor: [
                        'rgba(220, 53, 69, 0.7)',
                        'rgba(25, 135, 84, 0.7)'
                    ],
                    borderColor: [
                        'rgba(220, 53, 69, 1)',
                        'rgba(25, 135, 84, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Composição do Ativo - ' + latestPeriod
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const percentage = ((value / assets) * 100).toFixed(1);
                                return context.label + ': ' + formatCurrency(value) + ' (' + percentage + '%)';
                            }
                        }
                    }
                }
            }
        });
    } else {
        // Se não temos dados suficientes, cria um gráfico vazio
        financialCharts.balanceChart = new Chart(balanceCtx, {
            type: 'pie',
            data: {
                labels: ['Dados insuficientes'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['rgba(200, 200, 200, 0.5)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Composição Patrimonial - Dados Indisponíveis'
                    }
                }
            }
        });
    }
}

/**
 * Cria seletor de métricas para que o usuário possa escolher o que visualizar
 * @param {Array} metrics - Métricas disponíveis
 * @param {Object} historicalData - Dados históricos
 * @param {Array} periods - Períodos disponíveis
 */
function createMetricSelector(metrics, historicalData, periods) {
    // Encontrar um lugar adequado para colocar o seletor
    const container = document.querySelector('.chart-container .card-header');
    
    // Remover seletor anterior se existir
    const oldSelector = document.getElementById('metricSelector');
    if (oldSelector) {
        oldSelector.remove();
    }
    
    // Criar novo seletor
    const selector = document.createElement('div');
    selector.id = 'metricSelector';
    selector.className = 'metric-selector mt-2';
    
    // Adiciona um título
    const title = document.createElement('small');
    title.className = 'text-muted d-block mb-1';
    title.textContent = 'Selecione as métricas para visualizar:';
    selector.appendChild(title);
    
    // Adiciona as métricas como botões
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'btn-group flex-wrap';
    buttonGroup.setAttribute('role', 'group');
    
    // Inicialmente seleciona as primeiras 5 métricas
    const initialSelected = metrics.slice(0, 5);
    
    metrics.forEach(metric => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-sm ' + 
            (initialSelected.includes(metric) ? 'btn-primary' : 'btn-outline-secondary');
        button.textContent = shortenMetricName(metric);
        button.dataset.metric = metric;
        button.title = metric;
        
        button.addEventListener('click', function() {
            // Toggle a classe ativa
            this.classList.toggle('btn-primary');
            this.classList.toggle('btn-outline-secondary');
            
            // Atualiza o gráfico com as métricas selecionadas
            const selectedMetrics = Array.from(
                buttonGroup.querySelectorAll('.btn-primary')
            ).map(btn => btn.dataset.metric);
            
            updateMainMetricsChart(selectedMetrics, historicalData, periods);
        });
        
        buttonGroup.appendChild(button);
    });
    
    selector.appendChild(buttonGroup);
    container.appendChild(selector);
}

/**
 * Atualiza as tabelas de dados financeiros
 * @param {Object} data - Dados financeiros
 */
function updateFinancialTables(data) {
    // Verifica se temos seções de demonstrações financeiras
    if (!data || !data.empresa) {
        return;
    }
    
    // Mapeia as seções esperadas para as tabs
    const tabMapping = {
        'DRE': '#income',
        'Demonstração do Resultado': '#income',
        'Balanço Patrimonial': '#balance',
        'Fluxo de Caixa': '#cashflow',
        'Indicadores': '#indicators'
    };
    
    // Para cada seção nos dados
    Object.keys(data).forEach(section => {
        // Verifica se é uma seção de demonstrações financeiras
        if (Array.isArray(data[section]) && data[section].length > 0) {
            // Encontra a tab correspondente
            const tabId = tabMapping[section];
            if (tabId) {
                const tableContainer = document.querySelector(`${tabId} .table-responsive`);
                if (tableContainer) {
                    // Cria uma nova tabela
                    let tableHtml = '<table class="table table-sm table-hover">';
                    
                    // Cabeçalho da tabela
                    tableHtml += '<thead><tr>';
                    
                    // Pega as chaves do primeiro item para o cabeçalho
                    const headers = Object.keys(data[section][0]);
                    headers.forEach(header => {
                        // A primeira coluna é alinhada à esquerda, as demais à direita (valores)
                        const align = header === headers[0] ? '' : 'text-end';
                        tableHtml += `<th class="${align}">${header}</th>`;
                    });
                    
                    tableHtml += '</tr></thead>';
                    
                    // Corpo da tabela
                    tableHtml += '<tbody>';
                    data[section].forEach(row => {
                        tableHtml += '<tr>';
                        headers.forEach(header => {
                            // A primeira coluna é alinhada à esquerda, as demais à direita (valores)
                            const align = header === headers[0] ? '' : 'text-end';
                            tableHtml += `<td class="${align}">${row[header]}</td>`;
                        });
                        tableHtml += '</tr>';
                    });
                    
                    tableHtml += '</tbody></table>';
                    
                    // Atualiza o conteúdo da tabela
                    tableContainer.innerHTML = tableHtml;
                }
            }
        }
    });
}

/**
 * Encontra uma métrica pelo nome contendo palavras-chave
 * @param {Array} metrics - Lista de métricas disponíveis
 * @param {Array} keywords - Palavras-chave para buscar
 * @returns {string|null} - Nome da métrica encontrada ou null
 */
function findMetricByKeywords(metrics, keywords) {
    for (const keyword of keywords) {
        const found = metrics.find(metric => 
            metric.toLowerCase().includes(keyword.toLowerCase())
        );
        if (found) return found;
    }
    return null;
}

/**
 * Abrevia nomes longos de métricas para melhor visualização
 * @param {string} name - Nome completo da métrica
 * @returns {string} - Nome abreviado
 */
function shortenMetricName(name) {
    // Mapeia nomes longos para versões mais curtas
    const shortNames = {
        'Receita Líquida': 'Receita',
        'Lucro Líquido': 'Lucro',
        'Patrimônio Líquido': 'PL',
        'Dívida Líquida': 'Dívida',
        'Resultado Financeiro': 'Res. Fin.'
    };
    
    // Verifica se o nome está no mapa de nomes curtos
    for (const longName in shortNames) {
        if (name.includes(longName)) {
            return shortNames[longName];
        }
    }
    
    // Se o nome for muito longo, trunca
    if (name.length > 15) {
        return name.substring(0, 15) + '...';
    }
    
    return name;
}

/**
 * Formata valores métricos para exibição
 * @param {number} value - Valor a ser formatado
 * @returns {string} - Valor formatado
 */
function formatMetricValue(value) {
    if (value === undefined || value === null) return '-';
    
    if (Math.abs(value) >= 1000000000) {
        return (value / 1000000000).toFixed(2) + ' bi';
    }
    if (Math.abs(value) >= 1000000) {
        return (value / 1000000).toFixed(2) + ' mi';
    }
    if (Math.abs(value) >= 1000) {
        return (value / 1000).toFixed(2) + ' mil';
    }
    
    return value.toFixed(2);
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
    
    if (Math.abs(value) >= 1000000000) {
        return 'R$ ' + (value / 1000000000).toFixed(2) + ' bi';
    }
    if (Math.abs(value) >= 1000000) {
        return 'R$ ' + (value / 1000000).toFixed(2) + ' mi';
    }
    if (Math.abs(value) >= 1000) {
        return 'R$ ' + (value / 1000).toFixed(2) + ' mil';
    }
    
    return 'R$ ' + parseFloat(value).toFixed(2);
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