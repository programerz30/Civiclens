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

// Handle Application PDF upload
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

// Handle Supporting PDF upload
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

// Display uploaded file
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
            <button type="button" class="btn btn-sm btn-outline-danger" 
                    onclick="removeFile('${type}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
}

// Remove file
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
    // Validate
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
    
    // Show loading
    document.getElementById('loading').style.display = 'block';
    document.getElementById('resultBox').style.display = 'none';
    document.getElementById('errorBox').style.display = 'none';
    
    try {
        // Create FormData to send files
        const formData = new FormData();
        
        // Add form data
        formData.append('name', name);
        formData.append('email', email);
        formData.append('issueType', issueType);
        
        // Add Application PDF
        formData.append('applicationPdf', uploadedFiles.applicationPdf);
        
        // Add Supporting PDF if exists
        if (uploadedFiles.supportingPdf) {
            formData.append('supportingPdf', uploadedFiles.supportingPdf);
        }
        
        console.log('Sending to n8n:', {
            name: name,
            email: email,
            issueType: issueType,
            applicationPdf: uploadedFiles.applicationPdf.name,
            supportingPdf: uploadedFiles.supportingPdf ? uploadedFiles.supportingPdf.name : 'none'
        });
        
        // Send POST request to n8n
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            body: formData
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        // Get response text
        const responseText = await response.text();
        console.log('Response from n8n:', responseText);
        
        // Display the result
        processAndDisplayResult(responseText, name, email, issueType);
        
    } catch (error) {
        console.error('Error:', error);
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
    const resultHeader = document.getElementById('resultHeader');
    const resultTitle = document.getElementById('resultTitle');
    const resultDescription = document.getElementById('resultDescription');
    const applicantInfo = document.getElementById('applicantInfo');
    const documentsInfo = document.getElementById('documentsInfo');
    const applicationId = document.getElementById('applicationId');
    const factorsList = document.getElementById('factorsList');
    const nextSteps = document.getElementById('nextSteps');
    
    // Generate application ID
    const appId = 'APP-' + Date.now().toString().slice(-8);
    applicationId.textContent = `Application ID: ${appId}`;
    
    // Set applicant info
    applicantInfo.innerHTML = `
        <strong>Name:</strong> ${name}<br>
        <strong>Email:</strong> ${email}<br>
        <strong>Issue Type:</strong> ${issueType}
    `;
    
    // Set documents info
    documentsInfo.innerHTML = `
        <i class="fas fa-check-circle text-success me-2"></i>Application Form: ${uploadedFiles.applicationPdf.name}<br>
        ${uploadedFiles.supportingPdf ? 
            `<i class="fas fa-check-circle text-success me-2"></i>Supporting Document: ${uploadedFiles.supportingPdf.name}` : 
            '<i class="fas fa-info-circle text-warning me-2"></i>No supporting document uploaded'}
    `;
    
    // Try to parse JSON or use text as-is
    try {
        // Try to parse as JSON
        const data = JSON.parse(resultText);
        console.log('Parsed as JSON:', data);
        
        // Display based on JSON structure
        displayJsonResult(data);
    } catch (e) {
        // Not JSON - display as plain text
        console.log('Treating as plain text');
        displayTextResult(resultText);
    }
    
    // Show the result box
    resultBox.style.display = 'block';
    resultBox.scrollIntoView({ behavior: 'smooth' });
}

// Display JSON result
function displayJsonResult(data) {
    const resultHeader = document.getElementById('resultHeader');
    const resultTitle = document.getElementById('resultTitle');
    const resultDescription = document.getElementById('resultDescription');
    const factorsList = document.getElementById('factorsList');
    const nextSteps = document.getElementById('nextSteps');
    
    // Set status and title
    const status = data.status || data.decision || data.result;
    if (status) {
        if (status.toLowerCase().includes('approve')) {
            resultHeader.className = 'card-header bg-success text-white';
            resultTitle.innerHTML = '✅ APPLICATION APPROVED';
            resultTitle.className = 'display-4 text-success';
        } else if (status.toLowerCase().includes('deny') || status.toLowerCase().includes('reject')) {
            resultHeader.className = 'card-header bg-danger text-white';
            resultTitle.innerHTML = '❌ APPLICATION DENIED';
            resultTitle.className = 'display-4 text-danger';
        } else {
            resultHeader.className = 'card-header bg-warning';
            resultTitle.innerHTML = '⚠️ APPLICATION IN REVIEW';
            resultTitle.className = 'display-4 text-warning';
        }
    } else {
        resultHeader.className = 'card-header bg-info text-white';
        resultTitle.innerHTML = '📋 APPLICATION PROCESSED';
        resultTitle.className = 'display-4 text-info';
    }
    
    // Set description
    const benefitAmount = data.benefitAmount || data.amount || data.benefit;
    const message = data.message || data.description || data.text || 'Your application has been processed.';
    
    resultDescription.innerHTML = message;
    if (benefitAmount) {
        resultDescription.innerHTML += `<br><strong>Benefit Amount: $${benefitAmount}/month</strong>`;
    }
    
    // Display factors
    if (data.factors && Array.isArray(data.factors)) {
        factorsList.innerHTML = data.factors.map((factor, index) => `
            <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${factor.name || `Factor ${index + 1}`}</h6>
                    <span class="badge ${(factor.impact === 'positive' || factor.effect === 'positive') ? 'bg-success' : 'bg-danger'}">
                        ${(factor.impact === 'positive' || factor.effect === 'positive') ? 'Helped' : 'Limited'}
                    </span>
                </div>
                <p class="mb-1">${factor.description || factor.reason || ''}</p>
            </div>
        `).join('');
    } else if (data.reasons && Array.isArray(data.reasons)) {
        factorsList.innerHTML = data.reasons.map((reason, index) => `
            <div class="list-group-item">
                <h6 class="mb-1">Reason ${index + 1}</h6>
                <p class="mb-1">${reason}</p>
            </div>
        `).join('');
    } else {
        factorsList.innerHTML = `
            <div class="list-group-item">
                <p>Based on the analysis of your uploaded documents.</p>
            </div>
        `;
    }
    
    // Display next steps
    if (data.nextSteps && Array.isArray(data.nextSteps)) {
        nextSteps.innerHTML = data.nextSteps.map((step, index) => `
            <li class="list-group-item d-flex">
                <span class="badge bg-primary me-3">${index + 1}</span>
                <span>${step}</span>
            </li>
        `).join('');
    } else if (data.actions && Array.isArray(data.actions)) {
        nextSteps.innerHTML = data.actions.map((action, index) => `
            <li class="list-group-item d-flex">
                <span class="badge bg-primary me-3">${index + 1}</span>
                <span>${action}</span>
            </li>
        `).join('');
    } else {
        nextSteps.innerHTML = `
            <li class="list-group-item">
                <i class="fas fa-phone me-2"></i>Contact support for further information
            </li>
            <li class="list-group-item">
                <i class="fas fa-envelope me-2"></i>Check your email for updates
            </li>
            <li class="list-group-item">
                <i class="fas fa-clock me-2"></i>Decision typically takes 3-5 business days
            </li>
        `;
    }
}

// Display plain text result
function displayTextResult(text) {
    const resultHeader = document.getElementById('resultHeader');
    const resultTitle = document.getElementById('resultTitle');
    const resultDescription = document.getElementById('resultDescription');
    const factorsList = document.getElementById('factorsList');
    const nextSteps = document.getElementById('nextSteps');
    
    // Default styling
    resultHeader.className = 'card-header bg-info text-white';
    resultTitle.innerHTML = '📋 APPLICATION PROCESSED';
    resultTitle.className = 'display-4 text-info';
    
    // Display text as description
    resultDescription.textContent = text;
    
    // Create simple factors list from text
    factorsList.innerHTML = `
        <div class="list-group-item">
            <h6 class="mb-1">Decision Summary</h6>
            <p class="mb-1">${text.length > 200 ? text.substring(0, 200) + '...' : text}</p>
        </div>
    `;
    
    // Default next steps
    nextSteps.innerHTML = `
        <li class="list-group-item">
            <i class="fas fa-phone me-2"></i>Contact support for questions
        </li>
        <li class="list-group-item">
            <i class="fas fa-envelope me-2"></i>Check your email for confirmation
        </li>
    `;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function showError(message) {
    const errorBox = document.getElementById('errorBox');
    errorBox.innerHTML = `
        <h5><i class="fas fa-exclamation-triangle me-2"></i>Error</h5>
        <p>${message}</p>
        <button onclick="resetForm()" class="btn btn-sm btn-outline-danger mt-2">Try Again</button>
    `;
    errorBox.style.display = 'block';
}

function resetForm() {
    // Reset form
    document.getElementById('benefitForm').reset();
    
    // Reset file uploads
    uploadedFiles = { applicationPdf: null, supportingPdf: null };
    document.getElementById('applicationFileList').innerHTML = '';
    document.getElementById('supportingFileList').innerHTML = '';
    
    // Hide result and error boxes
    document.getElementById('resultBox').style.display = 'none';
    document.getElementById('errorBox').style.display = 'none';
}

function downloadResult() {
    // Create a simple decision letter
    const applicantName = document.getElementById('name').value;
    const status = document.getElementById('resultTitle').textContent;
    const description = document.getElementById('resultDescription').textContent;
    
    const decisionLetter = `
        Benefit Eligibility Decision Letter
        
        Applicant: ${applicantName}
        Date: ${new Date().toLocaleDateString()}
        Status: ${status}
        
        Decision Summary:
        ${description}
        
        This is an automated decision letter.
        Please contact support for official documentation.
    `;
    
    // Create a blob and download link
    const blob = new Blob([decisionLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decision-letter-${applicantName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================
// FORM SUBMISSION HANDLER
// ============================================
document.getElementById('benefitForm').addEventListener('submit', function(event) {
    event.preventDefault();
    submitToN8n();
});

// ============================================
// INITIALIZATION
// ============================================
console.log('Benefit Portal initialized');
console.log('N8N Webhook URL:', N8N_WEBHOOK_URL);

// Add Font Awesome icons if not already added
if (!document.querySelector('link[href*="font-awesome"]')) {
    const faLink = document.createElement('link');
    faLink.rel = 'stylesheet';
    faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(faLink);
}