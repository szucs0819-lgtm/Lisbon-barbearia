/**
 * Ap Barbearia - Business Logic & State Management
 * Mirror of Ap Odontologia, specialized for the Grooming Industry.
 */

// --- Global State ---
let appointments = [];
let patients = [];

// --- Configs ---
const STORAGE_KEY_AGENDA = 'barberWeb_consultas';
const STORAGE_KEY_PATIENTS = 'barberWeb_pacientes';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initNav();
    updateUI();
    initCharts();
    
    // Form Handlers
    document.getElementById('appointment-form').addEventListener('submit', handleAddAppointment);
    document.getElementById('patient-form').addEventListener('submit', handleAddPatient);
});

// --- Persistence ---
function loadData() {
    appointments = JSON.parse(localStorage.getItem(STORAGE_KEY_AGENDA) || '[]');
    patients = JSON.parse(localStorage.getItem(STORAGE_KEY_PATIENTS) || '[]');
}

function saveData() {
    localStorage.setItem(STORAGE_KEY_AGENDA, JSON.stringify(appointments));
    localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));
    updateUI();
}

// --- Navigation ---
function initNav() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');

            // Toggle Classes
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            views.forEach(view => {
                view.style.display = view.id === targetId ? 'block' : 'none';
                if(view.id === targetId) view.classList.add('active');
            });

            if (targetId === 'view-relatorios') initCharts();
            if (targetId === 'view-marketing') renderMarketing();
        });
    });
}

// --- UI Updates ---
function updateUI() {
    renderAppointments();
    renderPatients();
    updateMetrics();
    if(document.getElementById('view-marketing').classList.contains('active')) renderMarketing();
}

function renderAppointments(filter = 'all') {
    const list = document.getElementById('appointments-list');
    if (!list) return;

    let filtered = appointments;
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (filter === 'today') filtered = appointments.filter(a => a.data === todayStr);
    if (filter === 'tomorrow') filtered = appointments.filter(a => a.data === tomorrowStr);

    // Sort by time
    filtered.sort((a, b) => a.horario.localeCompare(b.horario));

    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state">Nenhum agendamento encontrado para este filtro.</div>';
        return;
    }

    list.innerHTML = filtered.map(a => `
        <div class="appointment-item">
            <div class="item-info">
                <div class="time-badge">${a.horario}</div>
                <div class="patient-details">
                    <h4>${a.nome}</h4>
                    <p><i class="fa-solid fa-scissors"></i> ${a.procedimento} | <i class="fa-solid fa-calendar"></i> ${formatDateBR(a.data)} <span style="color:var(--primary); font-weight:600;">(Barbeiro: ${a.barbeiro || 'Will'})</span></p>
                </div>
            </div>
            <div style="display: flex; gap: 12px; align-items: center;">
                <span class="status-badge">Confirmado</span>
                <button class="wa-btn" onclick="sendWhatsApp('${a.nome}', '${a.telefone}', '${a.horario}', '${a.procedimento}', '${a.barbeiro || 'Will'}')">
                    <i class="fa-brands fa-whatsapp"></i> WhatsApp
                </button>
                <button onclick="deleteAppointment('${a.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:18px;">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderPatients() {
    const list = document.getElementById('patients-list');
    if (!list) return;

    if (patients.length === 0) {
        list.innerHTML = '<p class="empty-state">Nenhum cliente cadastrado.</p>';
        return;
    }

    list.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
                <tr style="border-bottom: 2px solid var(--border); color: var(--primary);">
                    <th style="padding: 12px;">Cliente</th>
                    <th style="padding: 12px;">Contato</th>
                    <th style="padding: 12px; text-align: right;">Ações</th>
                </tr>
            </thead>
            <tbody>
                ${patients.map(p => `
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 12px; font-weight: 600;">${p.nome}</td>
                        <td style="padding: 12px; color: var(--text-muted);">${p.telefone}</td>
                        <td style="padding: 12px; text-align: right;">
                            <button onclick="editPatient('${p.id}')" style="background:none; border:none; color:var(--primary); cursor:pointer; margin-right: 10px;"><i class="fa-solid fa-pen"></i></button>
                            <button onclick="deletePatient('${p.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function updateMetrics() {
    const mConsultas = document.getElementById('metric-consultas');
    const mFaturamento = document.getElementById('metric-faturamento');
    if (!mConsultas) return;

    mConsultas.innerText = appointments.length;

    // Prices (Mock)
    const tablePrices = {
        'Corte': 50,
        'Barba': 40,
        'Combo': 80,
        'Sobrancelha': 20,
        'Tintura': 100,
        'Outro': 60
    };

    const total = appointments.reduce((acc, curr) => {
        return acc + (tablePrices[curr.procedimento] || 50);
    }, 0);

    mFaturamento.innerText = `R$ ${total.toLocaleString('pt-BR')}`;
}

// --- Handlers ---
function handleAddAppointment(e) {
    e.preventDefault();
    const data = document.getElementById('data').value;
    const horario = document.getElementById('horario').value;

    // Check availability
    if (appointments.some(a => a.data === data && a.horario === horario)) {
        const err = document.getElementById('horario-error');
        err.innerText = "❌ Esse horário já está reservado para este dia.";
        err.style.display = 'block';
        return;
    }

    const newApp = {
        id: "APP_" + Date.now(),
        nome: document.getElementById('nome').value,
        telefone: document.getElementById('telefone').value,
        data,
        horario,
        procedimento: document.getElementById('procedimento').value,
        barbeiro: document.getElementById('barbeiro').value
    };

    appointments.push(newApp);
    
    // Add to patients automatically if new
    if (!patients.some(p => p.telefone === newApp.telefone)) {
        patients.push({ id: "PX_" + Date.now(), nome: newApp.nome, telefone: newApp.telefone });
    }

    saveData();
    closeModal();
    e.target.reset();
}

function handleAddPatient(e) {
    e.preventDefault();
    const id = document.getElementById('paciente-id').value || "PX_" + Date.now();
    const nome = document.getElementById('paciente-nome').value;
    const telefone = document.getElementById('paciente-telefone').value;

    const existingIndex = patients.findIndex(p => p.id === id);
    if (existingIndex > -1) {
        patients[existingIndex] = { id, nome, telefone };
    } else {
        patients.push({ id, nome, telefone });
    }

    saveData();
    closePatientModal();
    e.target.reset();
}

// --- Actions ---
window.deleteAppointment = (id) => {
    if (confirm('Deseja excluir este agendamento?')) {
        appointments = appointments.filter(a => a.id !== id);
        saveData();
    }
}

window.deletePatient = (id) => {
    if (confirm('Deseja excluir este cliente?')) {
        patients = patients.filter(p => p.id !== id);
        saveData();
    }
}

window.editPatient = (id) => {
    const p = patients.find(px => px.id === id);
    if (!p) return;

    document.getElementById('paciente-id').value = p.id;
    document.getElementById('paciente-nome').value = p.nome;
    document.getElementById('paciente-telefone').value = p.telefone;
    document.getElementById('patient-modal-title').innerText = "Editar Cliente";
    openPatientModal();
}

window.sendWhatsApp = (nome, telefone, horario, procedimento, barbeiro) => {
    const msg = encodeURIComponent(`Olá, ${nome}! 💈 Passando para lembrar do seu horário para *${procedimento}* hoje às *${horario}* com o barbeiro *${barbeiro || 'Will'}* na Lisbon Barbearia. Podemos confirmar?`);
    window.open(`https://api.whatsapp.com/send?phone=55${telefone.replace(/\D/g, '')}&text=${msg}`);
}

// --- Modals ---
window.openModal = () => {
    document.getElementById('modal').classList.add('active');
    document.getElementById('horario-error').style.display = 'none';
};
window.closeModal = () => document.getElementById('modal').classList.remove('active');

window.openPatientModal = () => document.getElementById('modal-paciente').classList.add('active');
window.closePatientModal = () => {
    document.getElementById('modal-paciente').classList.remove('active');
    document.getElementById('patient-form').reset();
    document.getElementById('paciente-id').value = "";
    document.getElementById('patient-modal-title').innerText = "Novo Cliente";
};

// --- Filters UI ---
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderAppointments(btn.getAttribute('data-filter'));
    });
});

// --- Utilities ---
function formatDateBR(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

// --- Charts ---
let chartServices = null;
let chartEvolution = null;

function initCharts() {
    const canvasServices = document.getElementById('chartProcedimentos');
    const canvasEvolution = document.getElementById('chartEvolucao');
    if (!canvasServices || !canvasEvolution) return;

    const dataServices = {};
    appointments.forEach(a => {
        dataServices[a.procedimento] = (dataServices[a.procedimento] || 0) + 1;
    });

    if (chartServices) chartServices.destroy();
    chartServices = new Chart(canvasServices, {
        type: 'doughnut',
        data: {
            labels: Object.keys(dataServices),
            datasets: [{
                data: Object.values(dataServices),
                backgroundColor: ['#c5a059', '#8b4513', '#64748b', '#1e293b', '#f8fafc', '#475569'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Outfit' } } } }
        }
    });

    const dataEvolution = {};
    appointments.forEach(a => {
        dataEvolution[a.data] = (dataEvolution[a.data] || 0) + 1;
    });
    
    // Sort dates
    const labels = Object.keys(dataEvolution).sort();
    const values = labels.map(l => dataEvolution[l]);

    if (chartEvolution) chartEvolution.destroy();
    chartEvolution = new Chart(canvasEvolution, {
        type: 'line',
        data: {
            labels: labels.map(formatDateBR),
            datasets: [{
                label: 'Atendimentos',
                data: values,
                borderColor: '#c5a059',
                backgroundColor: 'rgba(197, 160, 89, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: '#1f2937' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// --- Marketing & Comunicados Logic ---
const MKT_TEMPLATES = {
    agendamento: "Olá, {nome}! 💈 Faz tempo que não renovamos seu estilo na Lisbon Barbearia. Temos horários disponíveis para esta semana. Vamos agendar seu próximo corte?",
    feriado: "Olá, {nome}! 📢 Informamos que no dia {data}, feriado, a Lisbon Barbearia não funcionará. Antecipe seu agendamento para não ficar sem vaga!",
    recesso: "Olá, {nome}! ✈️ Estaremos em recesso do dia {data_inicio} ao dia {data_fim}. Voltamos com tudo no dia {data_retorno}. Agende seu horário antes da nossa pausa!",
    personalizado: "Olá, {nome}! (Sua mensagem aqui...)"
};

window.renderMarketing = () => {
    const list = document.getElementById('mkt-client-list');
    if (!list) return;

    if (patients.length === 0) {
        list.innerHTML = '<p class="empty-state" style="color:var(--text-muted); text-align:center; padding:20px;">Nenhum cliente na base para envio.</p>';
        return;
    }

    list.innerHTML = patients.map(p => `
        <div style="display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid var(--border);">
            <input type="checkbox" class="mkt-client-check" value="${p.id}" data-nome="${p.nome}" data-telefone="${p.telefone}">
            <div>
                <div style="font-weight:600; font-size:14px;">${p.nome}</div>
                <div style="font-size:12px; color:var(--text-muted);">${p.telefone}</div>
            </div>
        </div>
    `).join('');
    
    updateTemplatePreview();
};

window.toggleSelectAllClients = (source) => {
    const checkboxes = document.querySelectorAll('.mkt-client-check');
    checkboxes.forEach(cb => cb.checked = source.checked);
};

window.updateTemplatePreview = () => {
    const type = document.getElementById('mkt-template').value;
    const previewArea = document.getElementById('mkt-preview');
    const varsContainer = document.getElementById('mkt-vars');
    
    let text = MKT_TEMPLATES[type] || "";
    
    varsContainer.innerHTML = "";
    if(type === 'feriado') {
        varsContainer.innerHTML = `<input type="text" id="var-data" placeholder="Qual a data do feriado?" oninput="updateTemplatePreview()" style="width:100%; padding:10px; border-radius:6px; background:var(--bg-app); border:1px solid var(--border); color:#fff; margin-bottom:10px;">`;
        const val = document.getElementById('var-data')?.value || "[DATA]";
        text = text.replace("{data}", val);
    } else if(type === 'recesso') {
        varsContainer.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:10px;">
                <input type="text" id="var-ini" placeholder="Início" oninput="updateTemplatePreview()" style="padding:10px; border-radius:6px; background:var(--bg-app); border:1px solid var(--border); color:#fff;">
                <input type="text" id="var-fim" placeholder="Fim" oninput="updateTemplatePreview()" style="padding:10px; border-radius:6px; background:var(--bg-app); border:1px solid var(--border); color:#fff;">
                <input type="text" id="var-ret" placeholder="Retorno" oninput="updateTemplatePreview()" style="padding:10px; border-radius:6px; background:var(--bg-app); border:1px solid var(--border); color:#fff;">
            </div>
        `;
        text = text.replace("{data_inicio}", document.getElementById('var-ini')?.value || "[INÍCIO]");
        text = text.replace("{data_fim}", document.getElementById('var-fim')?.value || "[FIM]");
        text = text.replace("{data_retorno}", document.getElementById('var-ret')?.value || "[RETORNO]");
    } else if(type === 'personalizado') {
        varsContainer.innerHTML = `<textarea id="var-custom" placeholder="Escreva sua mensagem aqui..." oninput="updateTemplatePreview()" style="width:100%; height:80px; padding:10px; border-radius:6px; background:var(--bg-app); border:1px solid var(--border); color:#fff; margin-bottom:10px;"></textarea>`;
        text = document.getElementById('var-custom')?.value || "Olá, {nome}! (Sua mensagem aqui...)";
    }

    previewArea.value = text.replace("{nome}", "[NOME DO CLIENTE]");
};

window.sendBroadcast = async () => {
    const selected = document.querySelectorAll('.mkt-client-check:checked');
    if (selected.length === 0) {
        alert("Por favor, selecione pelo menos um cliente.");
        return;
    }

    if (!confirm(`Você está prestes a abrir ${selected.length} janelas de WhatsApp. Deseja continuar?`)) {
        return;
    }

    const type = document.getElementById('mkt-template').value;
    let baseMsg = MKT_TEMPLATES[type] || "";
    
    if(type === 'feriado') baseMsg = baseMsg.replace("{data}", document.getElementById('var-data').value);
    if(type === 'recesso') {
        baseMsg = baseMsg.replace("{data_inicio}", document.getElementById('var-ini').value);
        baseMsg = baseMsg.replace("{data_fim}", document.getElementById('var-fim').value);
        baseMsg = baseMsg.replace("{data_retorno}", document.getElementById('var-ret').value);
    }
    if(type === 'personalizado') baseMsg = document.getElementById('var-custom').value;

    for (let i = 0; i < selected.length; i++) {
        const nome = selected[i].getAttribute('data-nome');
        const telefone = selected[i].getAttribute('data-telefone');
        const finalMsg = encodeURIComponent(baseMsg.replace("{nome}", nome));
        window.open(`https://api.whatsapp.com/send?phone=55${telefone.replace(/\D/g, '')}&text=${finalMsg}`, '_blank');
        await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    alert("Envios iniciados em abas separadas!");
};
