const N8N_WEBHOOK_URL = 'https://mohitpillai12346.app.n8n.cloud/webhook-test/9f091cf5-2629-4342-8b07-41c42601028b';
let uploadedFiles = { applicationPdf: null, supportingPdf: null };

// Upload logic
document.getElementById('applicationPdf').addEventListener('change', (e) => handleFile(e, 'application'));
document.getElementById('supportingPdf').addEventListener('change', (e) => handleFile(e, 'supporting'));

function handleFile(e, type) {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        uploadedFiles[type + 'Pdf'] = file;
        displayFile(type + 'FileList', file, type);
    }
}

function displayFile(containerId, file, type) {
    document.getElementById(containerId).innerHTML = `
        <div class="file-item">
            <span>${file.name}</span>
            <button type="button" class="btn btn-sm btn-danger" onclick="removeFile('${type}')">X</button>
        </div>`;
}

function removeFile(type) {
    uploadedFiles[type + 'Pdf'] = null;
    document.getElementById(type + 'Pdf').value = '';
    document.getElementById(type + 'FileList').innerHTML = '';
}

async function submitToN8n() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const issueType = document.getElementById('issueType').value;

    if (!name || !email || !uploadedFiles.applicationPdf) return alert('Fill all fields and upload PDF');

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
        const resultText = await response.text();
        processAndDisplayResult(resultText, name, email, issueType);
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function processAndDisplayResult(resultText, name, email, issueType) {
    document.getElementById('applicantInfo').innerHTML = `Name: ${name}<br>Email: ${email}`;
    document.getElementById('resultDescription').textContent = resultText;
    document.getElementById('resultBox').style.display = 'block';
}

document.getElementById('benefitForm').addEventListener('submit', (e) => { e.preventDefault(); submitToN8n(); });

function resetForm() { location.reload(); }
