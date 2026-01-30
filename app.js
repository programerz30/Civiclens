// ============================================
// EMAILJS CONFIGURATION
// ============================================

// Initialize EmailJS with your Service ID
(function() {
    emailjs.init("Cr8SkyIldo6vUX6ae"); // Replace with your actual EmailJS Public Key
})();

// EmailJS Configuration
const EMAILJS_CONFIG = {
    SERVICE_ID: "service_r60hbpq",      // Your Service ID
    TEMPLATE_ID: "template_8hjqxzg",    // Your OTP Template ID
    PUBLIC_KEY: "Cr8SkyIldo6vUX6ae"     // Your EmailJS Public Key (get from dashboard)
};

// ============================================
// AUTHENTICATION SYSTEM WITH OTP
// ============================================

// Simple in-memory user storage
const users = JSON.parse(localStorage.getItem('benefit_users') || '{}');
let currentUser = JSON.parse(localStorage.getItem('current_user') || 'null');

// OTP related variables
let otpCode = null;
let otpExpiry = null;
let pendingUser = null;
let otpTimer = null;

// Initialize auth UI
function initAuth() {
    updateAuthUI();
    
    // Auto-fill form if user is logged in
    if (currentUser) {
        autoFillUserData(currentUser);
    }
}

// Show login modal
function showLogin() {
    const modal = new bootstrap.Modal(document.getElementById('loginModal'));
    modal.show();
}

// Show signup modal
function showSignup() {
    const modal = new bootstrap.Modal(document.getElementById('signupModal'));
    modal.show();
}

// Signup function with OTP
async function signup() {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
        alert('Please fill all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    if (users[email]) {
        alert('Email already registered. Please sign in instead.');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    // Store pending user data
    pendingUser = { name, email, password };
    
    // Generate OTP
    otpCode = generateOTP();
    otpExpiry = Date.now() + 2 * 60 * 1000; // 2 minutes from now
    
    // Store OTP in localStorage for verification
    localStorage.setItem('pending_otp', JSON.stringify({
        code: otpCode,
        expiry: otpExpiry,
        email: email
    }));
    
    try {
        // Send OTP via EmailJS
        await sendOTPEmail(email, name, otpCode);
        
        // Close signup modal
        const signupModal = bootstrap.Modal.getInstance(document.getElementById('signupModal'));
        if (signupModal) signupModal.hide();
        
        // Show OTP modal
        showOTPModal(email);
        
    } catch (error) {
        console.error('Failed to send OTP:', error);
        alert('Failed to send OTP. Please try again.');
        pendingUser = null;
        otpCode = null;
        otpExpiry = null;
    }
}

// Generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via EmailJS
async function sendOTPEmail(email, name, otp) {
    const templateParams = {
        to_email: email,
        to_name: name,
        otp_code: otp,
        from_name: "Benefit Portal",
        reply_to: "noreply@benefitportal.com"
    };
    
    try {
        const response = await emailjs.send(
            EMAILJS_CONFIG.SERVICE_ID,
            EMAILJS_CONFIG.TEMPLATE_ID,
            templateParams
        );
        
        console.log('OTP sent successfully:', response);
        return true;
    } catch (error) {
        console.error('EmailJS error:', error);
        throw new Error('Failed to send OTP email');
    }
}

// Show OTP verification modal
function showOTPModal(email) {
    // Display email in modal
    document.getElementById('otpEmailDisplay').textContent = email;
    
    // Reset OTP inputs
    document.querySelectorAll('.otp-input').forEach(input => {
        input.value = '';
    });
    
    // Focus on first OTP input
    document.querySelector('.otp-input[data-index="1"]').focus();
    
    // Start timer
    startOTPTimer();
    
    // Show modal
    const otpModal = new bootstrap.Modal(document.getElementById('otpModal'));
    otpModal.show();
    
    // Setup OTP input auto-focus
    setupOTPInputs();
}

// Setup OTP input auto-focus
function setupOTPInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            const value = e.target.value;
            const index = parseInt(e.target.dataset.index);
            
            // If a digit is entered, move to next input
            if (value.length === 1 && index < 6) {
                otpInputs[index].focus();
            }
            
            // Enable verify button when all inputs are filled
            const allFilled = Array.from(otpInputs).every(input => input.value.length === 1);
            document.getElementById('verifyOtpBtn').disabled = !allFilled;
        });
        
        input.addEventListener('keydown', function(e) {
            const index = parseInt(e.target.dataset.index);
            
            // Handle backspace
            if (e.key === 'Backspace' && e.target.value === '' && index > 1) {
                otpInputs[index - 2].focus();
            }
        });
    });
}

// Start OTP timer
function startOTPTimer() {
    clearInterval(otpTimer);
    
    const timerElement = document.getElementById('otpTimer');
    const resendElement = document.getElementById('resendOtpText');
    
    let timeLeft = 120; // 2 minutes in seconds
    
    otpTimer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        timeLeft--;
        
        if (timeLeft < 0) {
            clearInterval(otpTimer);
            timerElement.style.display = 'none';
            resendElement.style.display = 'block';
        }
    }, 1000);
}

// Verify OTP
async function verifyOTP() {
    // Get OTP from inputs
    const otpInputs = document.querySelectorAll('.otp-input');
    const enteredOTP = Array.from(otpInputs).map(input => input.value).join('');
    
    // Retrieve stored OTP data
    const storedOTPData = JSON.parse(localStorage.getItem('pending_otp') || 'null');
    
    if (!storedOTPData) {
        alert('OTP session expired. Please sign up again.');
        cancelOTP();
        return;
    }
    
    // Check if OTP is expired
    if (Date.now() > storedOTPData.expiry) {
        alert('OTP has expired. Please request a new one.');
        return;
    }
    
    // Verify OTP
    if (enteredOTP === storedOTPData.code) {
        // OTP verified successfully
        clearInterval(otpTimer);
        
        // Create user account
        createUserAccount();
        
    } else {
        alert('Invalid OTP. Please try again.');
        // Clear OTP inputs
        otpInputs.forEach(input => input.value = '');
        document.querySelector('.otp-input[data-index="1"]').focus();
    }
}

// Create user account after OTP verification
function createUserAccount() {
    if (!pendingUser) {
        alert('Session expired. Please sign up again.');
        cancelOTP();
        return;
    }
    
    const { name, email, password } = pendingUser;
    
    // Save user
    users[email] = { name, password };
    localStorage.setItem('benefit_users', JSON.stringify(users));
    
    // Set as current user
    currentUser = {
        name: name,
        email: email,
        avatar: name.charAt(0).toUpperCase()
    };
    localStorage.setItem('current_user', JSON.stringify(currentUser));
    
    // Clear OTP data
    localStorage.removeItem('pending_otp');
    pendingUser = null;
    otpCode = null;
    otpExpiry = null;
    
    // Update UI
    updateAuthUI();
    autoFillUserData(currentUser);
    
    // Close OTP modal
    const otpModal = bootstrap.Modal.getInstance(document.getElementById('otpModal'));
    if (otpModal) otpModal.hide();
    
    // Show success message
    alert(`✅ Account verified successfully! Welcome, ${name}!`);
}

// Resend OTP
async function resendOTP() {
    if (!pendingUser) {
        alert('Session expired. Please sign up again.');
        cancelOTP();
        return;
    }
    
    try {
        // Generate new OTP
        otpCode = generateOTP();
        otpExpiry = Date.now() + 2 * 60 * 1000;
        
        // Update stored OTP
        localStorage.setItem('pending_otp', JSON.stringify({
            code: otpCode,
            expiry: otpExpiry,
            email: pendingUser.email
        }));
        
        // Send new OTP
        await sendOTPEmail(pendingUser.email, pendingUser.name, otpCode);
        
        // Restart timer
        startOTPTimer();
        
        // Show resend message
        document.getElementById('resendOtpText').style.display = 'none';
        document.getElementById('otpTimer').style.display = 'block';
        
        alert('New OTP sent to your email!');
        
    } catch (error) {
        console.error('Failed to resend OTP:', error);
        alert('Failed to resend OTP. Please try again.');
    }
}

// Cancel OTP verification
function cancelOTP() {
    // Clear OTP data
    localStorage.removeItem('pending_otp');
    pendingUser = null;
    otpCode = null;
    otpExpiry = null;
    clearInterval(otpTimer);
    
    // Close OTP modal
    const otpModal = bootstrap.Modal.getInstance(document.getElementById('otpModal'));
    if (otpModal) otpModal.hide();
    
    // Show signup modal again
    showSignup();
}

// Login function
function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Demo account
    if (email === 'demo@example.com' && password === 'demo123') {
        currentUser = {
            name: 'Demo User',
            email: 'demo@example.com',
            avatar: 'D'
        };
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        updateAuthUI();
        autoFillUserData(currentUser);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (modal) modal.hide();
        
        alert('Welcome back, Demo User!');
        return;
    }
    
    // Check regular users
    if (users[email] && users[email].password === password) {
        currentUser = {
            name: users[email].name,
            email: email,
            avatar: users[email].name.charAt(0).toUpperCase()
        };
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        updateAuthUI();
        autoFillUserData(currentUser);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (modal) modal.hide();
        
        alert(`Welcome back, ${users[email].name}!`);
    } else {
        alert('Invalid email or password. Try demo account:\nEmail: demo@example.com\nPassword: demo123');
    }
}

// Logout function
function logout() {
    currentUser = null;
    localStorage.removeItem('current_user');
    updateAuthUI();
    alert('You have been logged out.');
}

// Update auth UI
function updateAuthUI() {
    const loginSection = document.getElementById('loginSection');
    const userSection = document.getElementById('userSection');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    
    if (currentUser) {
        loginSection.style.display = 'none';
        userSection.style.display = 'flex';
        userName.textContent = currentUser.name;
        userAvatar.textContent = currentUser.avatar;
    } else {
        loginSection.style.display = 'block';
        userSection.style.display = 'none';
    }
}

// Auto-fill form with user data
function autoFillUserData(user) {
    const nameField = document.getElementById('name');
    const emailField = document.getElementById('email');
    
    if (nameField && !nameField.value) {
        nameField.value = user.name || '';
    }
    if (emailField && !emailField.value) {
        emailField.value = user.email || '';
    }
}

// ============================================
// ORIGINAL APPLICATION CODE (UNCHANGED)
// ============================================

const N8N_WEBHOOK_URL = 'https://mohitpillai12346.app.n8n.cloud/webhook-test/9f091cf5-2629-4342-8b07-41c42601028b';
let uploadedFiles = {
    applicationPdf: null,
    supportingPdf: null
};

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
    
    // Clear any pending OTP sessions
    localStorage.removeItem('pending_otp');
    
    // Set up file upload click handlers
    document.querySelectorAll('.file-upload-area').forEach(area => {
        area.addEventListener('click', function() {
            const inputId = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            document.getElementById(inputId).click();
        });
    });
});

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

// MAIN FUNCTION: SEND DATA TO N8N
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

// PROCESS AND DISPLAY RESULT
function processAndDisplayResult(resultText, name, email, issueType) {
    const resultBox = document.getElementById('resultBox');
    const applicationId = document.getElementById('applicationId');
    const applicantInfo = document.getElementById('applicantInfo');
    const documentsInfo = document.getElementById('documentsInfo');
    
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
        const data = JSON.parse(resultText);
        console.log('Parsed as JSON:', data);
        displayJsonResult(data);
    } catch (e) {
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

// UTILITY FUNCTIONS
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

// FORM SUBMISSION HANDLER
document.getElementById('benefitForm').addEventListener('submit', function(event) {
    event.preventDefault();
    submitToN8n();
});

// ============================================
// INITIALIZATION
// ============================================
console.log('Benefit Portal initialized');
console.log('N8N Webhook URL:', N8N_WEBHOOK_URL);
console.log('EmailJS Service ID:', EMAILJS_CONFIG.SERVICE_ID);
console.log('EmailJS Template ID:', EMAILJS_CONFIG.TEMPLATE_ID);

