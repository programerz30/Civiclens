// ============================================
// CONFIGURATION
// ============================================
const N8N_WEBHOOK_URL = 'https://mohitpillai12346.app.n8n.cloud/webhook-test/9f091cf5-2629-4342-8b07-41c42601028b';
let uploadedFiles = {
    applicationPdf: null,
    supportingPdf: null
};

// ============================================
// FILE UPLOAD HANDLERS
// ============================================

document.getElementById('applicationPdf').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('File too large. Maximum 5MB.');
            return;
        }
        uploadedFiles.applicationPdf = file;
        displayFile('applicationFileList', file, 'application');
    }
});

document.getElementById('supportingPdf').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('File too large. Maximum 5MB.');
            return;
        }
        uploadedFiles.supportingPdf = file;
        displayFile('supportingFileList', file, 'supporting');
    }
});

function displayFile(containerId, file, type) {
    const container = document.getElementById(containerId);
    const fileSize = (file.size / (1024 * 1024)).toFixed(2);
    container.innerHTML = `
        <div class="file-item">
            <div>
                <i class="fas fa-file-pdf text-danger me-2"></i>
                <strong>${file.name}</strong>
                <span class="text-muted ms-2">(${fileSize} MB)</span>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeFile('${type}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
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

// ============================================
// MAIN FUNCTION: SEND DATA TO N8N
// ============================================
async function submitToN8n() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const issueType = document.getElementById('issueType').value;
    
    if (!name || !email || !issueType) {
        alert('Please fill all required fields (Name, Email, Issue Type)');
        return;
    }
    if (!uploadedFiles.applicationPdf) {
        alert('Please upload the Application Form PDF');
        return;
    }
    
    document.getElementById('loading').style.display = 'block';
    document.getElementById('resultBox').style.display = 'none';
    document.getElementById('errorBox').style.display = 'none';
    
    try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        formData.append('issueType', issueType);
        formData.append('applicationPdf', uploadedFiles.applicationPdf);
        if (uploadedFiles.supportingPdf) {
            formData.append('supportingPdf', uploadedFiles.supportingPdf);
        }
        
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const responseText = await response.text();
        processAndDisplayResult(responseText, name, email, issueType);
        
    } catch (error) {
        showError(`Failed to process application: ${error.message}`);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// ============================================
// PROCESS AND DISPLAY RESULT
// ============================================
function processAndDisplayResult(resultText, name, email, issueType) {
    const resultBox = document.getElementById('resultBox');
    const applicantInfo = document.getElementById('applicantInfo');
    const documentsInfo = document.getElementById('documentsInfo');
    const applicationId = document.getElementById('applicationId');
    
    const appId = 'APP-' + Date.now().toString().slice(-8);
    applicationId.textContent = `Application ID: ${appId}`;
    
    applicantInfo.innerHTML = `<strong>Name:</strong> ${name}<br><strong>Email:</strong> ${email}<br><strong>Issue Type:</strong> ${issueType}`;
    documentsInfo.innerHTML = `<i class="fas fa-check-circle text-success me-2"></i>Application Form: ${uploadedFiles.applicationPdf.name}<br>${uploadedFiles.supportingPdf ? `<i class="fas fa-check-circle text-success me-2"></i>Supporting Document: ${uploadedFiles.supportingPdf.name}` : '<i class="fas fa-info-circle text-warning me-2"></i>No supporting document'}`;
    
    try {
        const data = JSON.parse(resultText);
        displayJsonResult(data);
    } catch (e) {
        displayTextResult(resultText);
    }
    resultBox.style.display = 'block';
    resultBox.scrollIntoView({ behavior: 'smooth' });
}

function displayJsonResult(data) {
    const resultHeader = document.getElementById('resultHeader');
    const resultTitle = document.getElementById('resultTitle');
    const resultDescription = document.getElementById('resultDescription');
    const factorsList = document.getElementById('factorsList');
    const nextSteps = document.getElementById('nextSteps');
    
    const status = data.status || data.decision || data.result;
    if (status && status.toLowerCase().includes('approve')) {
        resultHeader.className = 'card-header bg-success';
        resultTitle.innerHTML = '✅ APPLICATION APPROVED';
        resultTitle.className = 'display-4 text-success';
    } else if (status && (status.toLowerCase().includes('deny') || status.toLowerCase().includes('reject'))) {
        resultHeader.className = 'card-header bg-danger';
        resultTitle.innerHTML = '❌ APPLICATION DENIED';
        resultTitle.className = 'display-4 text-danger';
    } else {
        resultHeader.className = 'card-header bg-warning';
        resultTitle.innerHTML = '⚠️ APPLICATION IN REVIEW';
        resultTitle.className = 'display-4 text-warning';
    }
    
    resultDescription.innerHTML = data.message || data.description || 'Your application has been processed.';
    factorsList.innerHTML = `<div class="list-group-item">Based on automated analysis of documents.</div>`;
    nextSteps.innerHTML = `<li class="list-group-item">Check email for official confirmation.</li>`;
}

function displayTextResult(text) {
    document.getElementById('resultHeader').className = 'card-header bg-info text-white';
    document.getElementById('resultTitle').innerHTML = '📋 APPLICATION PROCESSED';
    document.getElementById('resultDescription').textContent = text;
}

function showError(message) {
    const errorBox = document.getElementById('errorBox');
    errorBox.innerHTML = `<h5>Error</h5><p>${message}</p>`;
    errorBox.style.display = 'block';
}

function resetForm() {
    document.getElementById('benefitForm').reset();
    uploadedFiles = { applicationPdf: null, supportingPdf: null };
    document.getElementById('applicationFileList').innerHTML = '';
    document.getElementById('supportingFileList').innerHTML = '';
    document.getElementById('resultBox').style.display = 'none';
    document.getElementById('errorBox').style.display = 'none';
}

function downloadResult() {
    const blob = new Blob([document.getElementById('resultDescription').textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decision.txt`;
    a.click();
}

document.getElementById('benefitForm').addEventListener('submit', (e) => { e.preventDefault(); submitToN8n(); });
