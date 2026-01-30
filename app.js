// ============================================
// FIREBASE CONFIGURATION (From Screenshot)
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCj6Kmc vgfVxCFTpjsL1GhpEVTMQH6OLAK",
    authDomain: "web-6ef07.firebaseapp.com",
    projectId: "web-6ef07",
    storageBucket: "web-6ef07.firebasestorage.app",
    messagingSenderId: "1028816794584",
    appId: "1:1028816794584:web:792e488366197446d778ad",
    measurementId: "G-TB7WB1E17B"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ============================================
// ORIGINAL LOGIC CONFIG
// ============================================
const N8N_WEBHOOK_URL = 'https://mohitpillai12346.app.n8n.cloud/webhook-test/9f091cf5-2629-4342-8b07-41c42601028b';
let uploadedFiles = { applicationPdf: null, supportingPdf: null };

// --- ATTACH ORIGINAL FUNCTIONS TO WINDOW ---
// This allows the HTML onclick events to find the functions inside this module
window.removeFile = removeFile;
window.resetForm = resetForm;
window.downloadResult = downloadResult;

// ============================================
// AUTH HANDLERS
// ============================================
onAuthStateChanged(auth, (user) => {
    const loggedInUI = document.getElementById('loggedInUI');
    const loggedOutUI = document.getElementById('loggedOutUI');
    if (user) {
        loggedInUI.style.display = 'block';
        loggedOutUI.style.display = 'none';
        document.getElementById('userEmailDisplay').textContent = user.email;
        document.getElementById('email').value = user.email;
    } else {
        loggedInUI.style.display = 'none';
        loggedOutUI.style.display = 'block';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('signInBtn').onclick = async () => {
        const email = document.getElementById('authEmail').value;
        const pass = document.getElementById('authPassword').value;
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
        } catch (e) { alert(e.message); }
    };

    document.getElementById('signUpBtn').onclick = async () => {
        const email = document.getElementById('authEmail').value;
        const pass = document.getElementById('authPassword').value;
        try {
            await createUserWithEmailAndPassword(auth, email, pass);
            bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
        } catch (e) { alert(e.message); }
    };

    document.getElementById('logoutBtn').onclick = () => signOut(auth);
    
    // Original Form Submit listener
    document.getElementById('benefitForm').addEventListener('submit', (e) => {
        e.preventDefault();
        submitToN8n();
    });
});

// ============================================
// YOUR ORIGINAL FUNCTIONS (UNCHANGED)
// ============================================

document.getElementById('applicationPdf').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf' && file.size <= 5 * 1024 * 1024) {
        uploadedFiles.applicationPdf = file;
        displayFile('applicationFileList', file, 'application');
    } else { alert('Please upload a valid PDF under 5MB'); }
});

document.getElementById('supportingPdf').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf' && file.size <= 5 * 1024 * 1024) {
        uploadedFiles.supportingPdf = file;
        displayFile('supportingFileList', file, 'supporting');
    }
});

function displayFile(containerId, file, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="file-item">
            <div><strong>${file.name}</strong></div>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeFile('${type}')"><i class="fas fa-times"></i></button>
        </div>`;
}

function removeFile(type) {
    if (type === 'application') {
        uploadedFiles.applicationPdf = null;
        document.getElementById('applicationPdf').value = '';
        document.getElementById('applicationFileList').innerHTML = '';
    } else {
        uploadedFiles.supportingPdf = null;
        document.getElementById('supportingPdf').value = '';
        document.getElementById('supportingFileList').innerHTML = '';
    }
}

async function submitToN8n() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const issueType = document.getElementById('issueType').value;
    
    if (!name || !email || !issueType || !uploadedFiles.applicationPdf) {
        alert('Required fields missing'); return;
    }
    
    document.getElementById('loading').style.display = 'block';
    document.getElementById('resultBox').style.display = 'none';
    
    try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        formData.append('issueType', issueType);
        formData.append('applicationPdf', uploadedFiles.applicationPdf);
        if (uploadedFiles.supportingPdf) formData.append('supportingPdf', uploadedFiles.supportingPdf);
        
        const response = await fetch(N8N_WEBHOOK_URL, { method: 'POST', body: formData });
        const text = await response.text();
        processAndDisplayResult(text, name, email, issueType);
    } catch (error) {
        document.getElementById('errorBox').textContent = error.message;
        document.getElementById('errorBox').style.display = 'block';
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function processAndDisplayResult(resultText, name, email, issueType) {
    const resultBox = document.getElementById('resultBox');
    document.getElementById('applicationId').textContent = 'APP-' + Date.now().toString().slice(-8);
    document.getElementById('applicantInfo').innerHTML = `Name: ${name}<br>Email: ${email}`;
    document.getElementById('documentsInfo').innerHTML = `Received: ${uploadedFiles.applicationPdf.name}`;
    
    document.getElementById('resultTitle').textContent = "APPLICATION PROCESSED";
    document.getElementById('resultDescription').textContent = resultText;
    
    resultBox.style.display = 'block';
    resultBox.scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
    document.getElementById('benefitForm').reset();
    uploadedFiles = { applicationPdf: null, supportingPdf: null };
    document.getElementById('applicationFileList').innerHTML = '';
    document.getElementById('supportingFileList').innerHTML = '';
    document.getElementById('resultBox').style.display = 'none';
}

function downloadResult() {
    const content = `Decision for ${document.getElementById('name').value}: ${document.getElementById('resultDescription').textContent}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decision.txt';
    a.click();
}
