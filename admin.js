// 1. Inicializar o Supabase (Cole as suas chaves novamente)
const supabaseUrl = 'https://ykcfzpxvonnpgrveqqla.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrY2Z6cHh2b25ucGdydmVxcWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMDY1NjYsImV4cCI6MjEwNTY4MjU2Nn0.M3MFkx2FVZbjPBVOyu-i3wjO6fYEIyZERTlyGuJhuMk';
const cliente = supabase.createClient(supabaseUrl, supabaseKey);

// Elementos da Interface
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginMsg = document.getElementById('login-msg');
const formMsg = document.getElementById('form-msg');
const listaShows = document.getElementById('lista-shows');

// 2. Verificar se o utilizador já tem sessão iniciada
cliente.auth.onAuthStateChange((event, session) => {
    if (session) {
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        carregarShows();
    } else {
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
    }
});

// 3. Função de Login
async function fazerLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    loginMsg.textContent = "A iniciar sessão...";

    const { data, error } = await cliente.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        loginMsg.textContent = "Erro: E-mail ou palavra-passe incorretos.";
    } else {
        loginMsg.textContent = "";
    }
}

// 4. Função de Logout
async function fazerLogout() {
    await cliente.auth.signOut();
}

// 5. Adicionar Espetáculo
async function adicionarShow() {
    const data_evento = document.getElementById('data_evento').value;
    const local_evento = document.getElementById('local_evento').value;
    const cidade = document.getElementById('cidade').value;
    const descricao = document.getElementById('descricao').value;

    if (!data_evento || !local_evento || !cidade) {
        formMsg.style.color = 'red';
        formMsg.textContent = "Preencha a data, local e cidade!";
        return;
    }

    formMsg.style.color = 'blue';
    formMsg.textContent = "A guardar...";

    const { data, error } = await cliente
        .from('agenda_shows')
        .insert([{ data_evento, local_evento, cidade, descricao }]);

    if (error) {
        formMsg.style.color = 'red';
        formMsg.textContent = "Erro ao guardar: " + error.message;
    } else {
        formMsg.style.color = 'green';
        formMsg.textContent = "Espetáculo adicionado com sucesso!";
        document.getElementById('data_evento').value = '';
        document.getElementById('local_evento').value = '';
        document.getElementById('cidade').value = '';
        document.getElementById('descricao').value = '';
        carregarShows();
    }
}

// 6. Carregar Agenda do Banco de Dados
async function carregarShows() {
    listaShows.innerHTML = "A carregar agenda...";
    
    const { data, error } = await cliente
        .from('agenda_shows')
        .select('*')
        .order('data_evento', { ascending: true });

    if (error) {
        listaShows.innerHTML = "Erro ao carregar agenda.";
        return;
    }

    listaShows.innerHTML = "";
    
    if (data.length === 0) {
        listaShows.innerHTML = "Nenhum espetáculo agendado.";
        return;
    }

    data.forEach(show => {
        const div = document.createElement('div');
        div.className = 'show-item';
        div.innerHTML = `
            <div>
                <strong>${show.data_evento}</strong> - ${show.local_evento} (${show.cidade})
            </div>
            <button class="btn-delete" onclick="apagarShow('${show.id}')">Apagar</button>
        `;
        listaShows.appendChild(div);
    });
}

// 7. Apagar Espetáculo
async function apagarShow(id) {
    if(confirm("Tem a certeza que deseja apagar este espetáculo?")) {
        const { error } = await cliente
            .from('agenda_shows')
            .delete()
            .eq('id', id);
        
        if (!error) carregarShows();
    }
}