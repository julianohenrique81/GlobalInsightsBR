// Funcionalidades JavaScript para a API de Web Scraping GlobalInsightsBR

document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface
    const scrapeForm = document.getElementById('scrapeForm');
    const resultsCard = document.getElementById('resultsCard');
    const jobStatus = document.getElementById('jobStatus');
    const progressBar = document.getElementById('progressBar');
    const resultsContainer = document.getElementById('resultsContainer');
    const downloadButton = document.getElementById('downloadButton');
    const newSearchButton = document.getElementById('newSearchButton');
    const jobsTableBody = document.getElementById('jobsTableBody');
    const addSelectorButton = document.getElementById('addSelector');
    const selectorsContainer = document.getElementById('selectorsContainer');
    
    // Variáveis globais
    let currentJobId = null;
    let resultsData = null;
    
    // Inicialização
    loadJobs();
    
    // Event Listeners
    scrapeForm.addEventListener('submit', handleFormSubmit);
    newSearchButton.addEventListener('click', resetForm);
    downloadButton.addEventListener('click', downloadResults);
    addSelectorButton.addEventListener('click', addSelector);
    
    // Função para adicionar um novo seletor personalizado
    function addSelector() {
        const index = document.querySelectorAll('.selector-group').length;
        const selectorHTML = `
            <div class="selector-group" data-index="${index}">
                <button type="button" class="btn-close remove-selector" aria-label="Remover"></button>
                <div class="row g-2">
                    <div class="col-md-6">
                        <label class="form-label">Nome do campo</label>
                        <input type="text" class="form-control field-name" placeholder="Ex: título, preço, autor...">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Tipo de seletor</label>
                        <select class="form-select selector-type">
                            <option value="css">CSS</option>
                            <option value="xpath">XPath</option>
                        </select>
                    </div>
                </div>
                <div class="mt-2">
                    <label class="form-label">Valor do seletor</label>
                    <input type="text" class="form-control selector-value" 
                           placeholder="Ex: h1::text ou //h1/text()">
                </div>
            </div>
        `;
        
        const selectorDiv = document.createElement('div');
        selectorDiv.innerHTML = selectorHTML;
        selectorsContainer.appendChild(selectorDiv.firstElementChild);
        
        // Adicionar listener para remover o seletor
        const removeButton = selectorsContainer.querySelector(`.selector-group[data-index="${index}"] .remove-selector`);
        removeButton.addEventListener('click', function() {
            this.closest('.selector-group').remove();
        });
    }
    
    // Função que manipula o envio do formulário
    async function handleFormSubmit(event) {
        event.preventDefault();
        
        // Obter dados do formulário
        const url = document.getElementById('url').value;
        const followLinks = document.getElementById('followLinks').checked;
        const maxPages = parseInt(document.getElementById('maxPages').value) || 1;
        
        // Obter seletores personalizados
        const selectors = {};
        document.querySelectorAll('.selector-group').forEach(group => {
            const fieldName = group.querySelector('.field-name').value;
            const selectorType = group.querySelector('.selector-type').value;
            const selectorValue = group.querySelector('.selector-value').value;
            
            if (fieldName && selectorValue) {
                selectors[fieldName] = {
                    [selectorType]: selectorValue
                };
            }
        });
        
        // Preparar configuração para envio
        const config = {
            follow_links: followLinks,
            max_pages: maxPages,
            selectors: selectors
        };
        
        // Mostrar card de resultados e atualizar status
        resultsCard.style.display = 'block';
        resultsContainer.innerHTML = '<p>Processando solicitação...</p>';
        jobStatus.textContent = 'Iniciando...';
        progressBar.style.width = '10%';
        downloadButton.disabled = true;
        
        // Enviar requisição para a API
        try {
            const response = await fetch('/api/scrape', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: url,
                    config: config
                })
            });
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Atualizar status e exibir resultados
                jobStatus.textContent = 'Concluído';
                progressBar.style.width = '100%';
                progressBar.classList.remove('progress-bar-animated');
                
                // Armazenar resultados e ID do job
                resultsData = data.data.results;
                currentJobId = data.data.job_id;
                
                // Exibir resultados formatados
                displayResults(resultsData);
                downloadButton.disabled = false;
                
                // Recarregar lista de jobs
                loadJobs();
            } else {
                throw new Error('Erro ao processar solicitação');
            }
        } catch (error) {
            console.error('Erro:', error);
            jobStatus.textContent = 'Erro';
            progressBar.style.width = '100%';
            progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated');
            progressBar.classList.add('bg-danger');
            resultsContainer.innerHTML = `<div class="alert alert-danger">Erro: ${error.message}</div>`;
        }
    }
    
    // Função para exibir os resultados na interface
    function displayResults(data) {
        // Limpar container de resultados
        resultsContainer.innerHTML = '';
        
        if (Array.isArray(data) && data.length > 0) {
            // Criar visualização para dados de array
            resultsContainer.innerHTML = `
                <div class="alert alert-success mb-3">
                    <strong>${data.length}</strong> item(s) encontrado(s)
                </div>
                <div class="json-result">${JSON.stringify(data, null, 2)}</div>
            `;
        } else if (typeof data === 'object' && data !== null) {
            // Criar visualização para objeto único
            resultsContainer.innerHTML = `
                <div class="json-result">${JSON.stringify(data, null, 2)}</div>
            `;
        } else {
            resultsContainer.innerHTML = '<div class="alert alert-warning">Nenhum resultado encontrado</div>';
        }
    }
    
    // Função para baixar os resultados como arquivo JSON
    function downloadResults() {
        if (!resultsData) return;
        
        const dataStr = JSON.stringify(resultsData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportName = `scraping_results_${new Date().toISOString().slice(0,10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportName);
        linkElement.click();
    }
    
    // Função para resetar o formulário
    function resetForm() {
        resultsCard.style.display = 'none';
        progressBar.style.width = '0%';
        progressBar.classList.add('progress-bar-striped', 'progress-bar-animated');
        progressBar.classList.remove('bg-danger');
        resultsContainer.innerHTML = '<p>Aguardando resultados...</p>';
        currentJobId = null;
        resultsData = null;
        downloadButton.disabled = true;
    }
    
    // Função para carregar jobs anteriores
    async function loadJobs() {
        try {
            const response = await fetch('/api/jobs');
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Limpar tabela de jobs
            jobsTableBody.innerHTML = '';
            
            // Preencher tabela com os jobs
            if (data.jobs && data.jobs.length > 0) {
                data.jobs.forEach(job => {
                    const row = document.createElement('tr');
                    
                    // Formatar data
                    const startDate = new Date(job.start_time);
                    const formattedDate = startDate.toLocaleDateString('pt-BR') + ' ' + 
                                          startDate.toLocaleTimeString('pt-BR');
                    
                    // Definir classe de status
                    let statusClass = 'secondary';
                    if (job.status === 'completed') statusClass = 'success';
                    if (job.status === 'failed') statusClass = 'danger';
                    if (job.status === 'running') statusClass = 'primary';
                    
                    // Criar células da linha
                    row.innerHTML = `
                        <td>${job.id.substring(0, 8)}...</td>
                        <td title="${job.url}">${job.url.substring(0, 30)}...</td>
                        <td><span class="badge bg-${statusClass}">${job.status}</span></td>
                        <td>${formattedDate}</td>
                        <td>
                            <button class="btn btn-sm btn-primary view-results" data-job-id="${job.id}">
                                Ver resultados
                            </button>
                        </td>
                    `;
                    
                    jobsTableBody.appendChild(row);
                });
                
                // Adicionar listeners para os botões de ver resultados
                document.querySelectorAll('.view-results').forEach(button => {
                    button.addEventListener('click', async function() {
                        const jobId = this.getAttribute('data-job-id');
                        await loadJobResults(jobId);
                    });
                });
            } else {
                jobsTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">Nenhum job encontrado</td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('Erro ao carregar jobs:', error);
            jobsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        Erro ao carregar jobs: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
    
    // Função para carregar resultados de um job específico
    async function loadJobResults(jobId) {
        try {
            const response = await fetch(`/api/results/${jobId}`);
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Mostrar card de resultados
            resultsCard.style.display = 'block';
            jobStatus.textContent = 'Carregado do histórico';
            progressBar.style.width = '100%';
            progressBar.classList.remove('progress-bar-animated');
            
            // Armazenar resultados e ID do job
            resultsData = data.results;
            currentJobId = jobId;
            
            // Exibir resultados formatados
            displayResults(resultsData);
            downloadButton.disabled = false;
            
            // Rolar para a área de resultados
            resultsCard.scrollIntoView({behavior: 'smooth'});
        } catch (error) {
            console.error('Erro ao carregar resultados:', error);
            resultsCard.style.display = 'block';
            jobStatus.textContent = 'Erro';
            progressBar.style.width = '100%';
            progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated');
            progressBar.classList.add('bg-danger');
            resultsContainer.innerHTML = `<div class="alert alert-danger">Erro ao carregar resultados: ${error.message}</div>`;
        }
    }
});