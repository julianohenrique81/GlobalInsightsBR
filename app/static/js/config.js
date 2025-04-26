/**
 * GlobalInsightsBR - Script para a página de configurações
 */

document.addEventListener('DOMContentLoaded', function() {
    // Carregar configurações salvas
    loadSavedConfig();
    
    // Inicializar formulário de configuração
    const configForm = document.getElementById('configForm');
    if (configForm) {
        configForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveConfig();
        });
    }
});

/**
 * Carrega as configurações salvas do localStorage
 */
function loadSavedConfig() {
    try {
        const savedConfig = localStorage.getItem('scrapingConfig');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            
            // Preenche os campos do formulário com as configurações salvas
            if (config.baseUrl) document.getElementById('baseUrl').value = config.baseUrl;
            if (config.alternativeUrl) document.getElementById('alternativeUrl').value = config.alternativeUrl;
            if (config.enableYFinance !== undefined) document.getElementById('enableYFinance').checked = config.enableYFinance;
            if (config.followLinks !== undefined) document.getElementById('followLinks').checked = config.followLinks;
            if (config.cacheTime) document.getElementById('cacheTime').value = config.cacheTime;
            
            showToast('Configurações carregadas com sucesso', 'success');
        }
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        showToast('Erro ao carregar configurações', 'danger');
    }
}

/**
 * Salva as configurações no localStorage
 */
function saveConfig() {
    try {
        // Obtém os valores dos campos do formulário
        const config = {
            baseUrl: document.getElementById('baseUrl').value,
            alternativeUrl: document.getElementById('alternativeUrl').value,
            enableYFinance: document.getElementById('enableYFinance').checked,
            followLinks: document.getElementById('followLinks').checked,
            cacheTime: parseInt(document.getElementById('cacheTime').value)
        };
        
        // Valida o campo obrigatório
        if (!config.baseUrl) {
            showToast('URL base é obrigatória', 'warning');
            return;
        }
        
        // Salva no localStorage
        localStorage.setItem('scrapingConfig', JSON.stringify(config));
        
        // Envia para o backend (opcional)
        saveConfigToServer(config);
        
        showToast('Configurações salvas com sucesso', 'success');
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        showToast('Erro ao salvar configurações', 'danger');
    }
}

/**
 * Envia as configurações para o servidor (opcional)
 * @param {Object} config - Configurações a serem salvas
 */
function saveConfigToServer(config) {
    // Esta função pode ser implementada para enviar as configurações para o servidor
    // via API, se necessário. Por enquanto, apenas simulamos o envio.
    
    // Exemplo de chamada à API (comentada):
    /*
    fetch('/api/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Configurações salvas no servidor:', data);
    })
    .catch(error => {
        console.error('Erro ao salvar configurações no servidor:', error);
    });
    */
}

/**
 * Exibe uma mensagem toast
 * @param {string} message - Mensagem a ser exibida
 * @param {string} type - Tipo de toast (success, danger, warning, info)
 */
function showToast(message, type = 'info') {
    // Verifica se já existe um toast container
    let toastContainer = document.querySelector('.toast-container');
    
    // Se não existir, cria um novo
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Cria o toast
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    
    // Define o conteúdo do toast
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
        </div>
    `;
    
    // Adiciona o toast ao container
    toastContainer.appendChild(toastEl);
    
    // Inicializa o toast com Bootstrap
    const toast = new bootstrap.Toast(toastEl, {
        autohide: true,
        delay: 3000
    });
    
    // Mostra o toast
    toast.show();
    
    // Remove o toast do DOM após ser escondido
    toastEl.addEventListener('hidden.bs.toast', function() {
        toastEl.remove();
    });
}