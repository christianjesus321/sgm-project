// ================================================================
// SCRIPT DE CONFIGURAÇÃO LOCAL - S.G.M
// ================================================================
// 
// Este script ajuda a configurar o ambiente de desenvolvimento local
// Execute com: node setup-local.js
//

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🚀 Configurador do S.G.M - Sistema de Gestão de Máscaras');
console.log('==================================================\n');

const envFile = path.join(__dirname, '.env');
const envExampleFile = path.join(__dirname, 'env.example');

// Verifica se o arquivo .env já existe
if (fs.existsSync(envFile)) {
    console.log('⚠️  Arquivo .env já existe!');
    rl.question('Deseja sobrescrever? (s/N): ', (answer) => {
        if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'sim') {
            setupEnvironment();
        } else {
            console.log('✅ Configuração cancelada. Arquivo .env mantido.');
            rl.close();
        }
    });
} else {
    setupEnvironment();
}

function setupEnvironment() {
    console.log('\n📋 Vamos configurar suas credenciais do Firebase...');
    console.log('Obtenha essas informações em: https://console.firebase.google.com/\n');

    const questions = [
        { key: 'VITE_FIREBASE_API_KEY', prompt: '🔑 Firebase API Key: ' },
        { key: 'VITE_FIREBASE_AUTH_DOMAIN', prompt: '🌐 Auth Domain (ex: meu-projeto.firebaseapp.com): ' },
        { key: 'VITE_FIREBASE_PROJECT_ID', prompt: '📁 Project ID: ' },
        { key: 'VITE_FIREBASE_STORAGE_BUCKET', prompt: '💾 Storage Bucket (ex: meu-projeto.appspot.com): ' },
        { key: 'VITE_FIREBASE_MESSAGING_SENDER_ID', prompt: '📨 Messaging Sender ID: ' },
        { key: 'VITE_FIREBASE_APP_ID', prompt: '🆔 App ID: ' }
    ];

    let envContent = '# Configuração do Firebase - S.G.M\n';
    envContent += '# Gerado automaticamente em ' + new Date().toLocaleString('pt-BR') + '\n\n';

    let currentIndex = 0;

    function askQuestion() {
        if (currentIndex >= questions.length) {
            // Adiciona configurações padrão
            envContent += '\n# Configurações da aplicação\n';
            envContent += 'NODE_ENV=development\n';
            envContent += 'VITE_APP_URL=http://localhost:8888\n';

            // Salva o arquivo
            try {
                fs.writeFileSync(envFile, envContent);
                console.log('\n✅ Arquivo .env criado com sucesso!');
                console.log('📁 Local:', envFile);
                console.log('\n🚀 Próximos passos:');
                console.log('1. Abra o index.html em um servidor local');
                console.log('2. Ou use: npx serve . para servir os arquivos');
                console.log('3. Configure as regras de segurança no Firebase Console');
                console.log('\n🔗 Documentação completa no README.md');
            } catch (error) {
                console.error('❌ Erro ao criar arquivo .env:', error.message);
            }
            rl.close();
            return;
        }

        const question = questions[currentIndex];
        rl.question(question.prompt, (answer) => {
            if (answer.trim()) {
                envContent += `${question.key}=${answer.trim()}\n`;
            } else {
                console.log('⚠️  Campo obrigatório! Usando placeholder...');
                envContent += `${question.key}=CONFIGURAR_DEPOIS\n`;
            }
            currentIndex++;
            askQuestion();
        });
    }

    askQuestion();
}

// Função para validar se é um projeto Firebase válido
function validateFirebaseConfig(config) {
    const required = ['apiKey', 'authDomain', 'projectId'];
    for (const field of required) {
        if (!config[field] || config[field] === 'CONFIGURAR_DEPOIS') {
            return false;
        }
    }
    return true;
}