const form = document.getElementById('submission-form');
const inputs = {
    first_name: document.getElementById('first_name'),
    last_name: document.getElementById('last_name'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    gender: document.getElementById('gender-value'),
    payment_screenshot: document.getElementById('payment-screenshot')
};
const separateFileInputs = document.querySelectorAll('.separate-file-input');
const combinedFileInput = document.getElementById('combined-file-upload');

document.querySelectorAll('input[name="upload_type"]').forEach(elem => elem.addEventListener("change", handleUploadTypeChange));
document.querySelectorAll('input[name="payment_mode"]').forEach(elem => elem.addEventListener("change", handlePaymentModeChange));
separateFileInputs.forEach(input => input.addEventListener('change', handleSeparateFileUpload));
combinedFileInput.addEventListener('change', handleCombinedFileUpload);
inputs.payment_screenshot.addEventListener('change', handlePaymentScreenshotUpload);
form.addEventListener('submit', handleFormSubmit);

let uploadedFiles = { aadhaar: null, photo: null, signature: null, marksheet: null, 'blood-group': null };

function handleUploadTypeChange(event) {
    const value = event.target.value;
    document.getElementById("separate-upload-section").classList.toggle('show', value === "separate");
    document.getElementById("combined-upload-section").classList.toggle('show', value === "combined");
}

function handlePaymentModeChange(event) {
    document.getElementById("online-payment-section").classList.toggle('show', event.target.value === "online");
}

function handleSeparateFileUpload(e) {
    const docType = e.target.getAttribute('data-doc');
    const file = e.target.files[0];
    const label = e.target.parentElement;
    if (file) {
        uploadedFiles[docType] = file;
        label.innerHTML = '<i class="fas fa-check mr-2"></i>Uploaded';
        label.classList.remove('bg-blue-50', 'hover:bg-blue-100', 'text-blue-600');
        label.classList.add('bg-green-50', 'text-green-600');
        updateSeparateFilesStatus();
    }
}

function updateSeparateFilesStatus() {
    const statusDiv = document.getElementById('file-status');
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    const uploadedCount = Object.values(uploadedFiles).filter(file => file !== null).length;
    
    statusDiv.style.display = 'block';
    statusDiv.className = 'file-status';
    
    if (uploadedCount < 5) {
        statusDiv.classList.add('warning');
        statusIcon.className = 'fas fa-exclamation-triangle mr-2';
        statusText.textContent = `${uploadedCount} of 5 documents uploaded.`;
    } else {
        statusDiv.classList.add('success');
        statusIcon.className = 'fas fa-check-circle mr-2';
        statusText.textContent = 'All 5 required documents uploaded successfully!';
    }
}

function handleCombinedFileUpload(e) {
    const file = e.target.files[0];
    const statusDiv = document.getElementById('file-status');
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    const uploadArea = document.getElementById('combined-upload-area');
    const label = document.querySelector('label[for="combined-file-upload"] span');
    
    statusDiv.style.display = 'block';
    uploadArea.className = 'file-upload-area rounded-lg p-6 text-center';
    if (file && file.type === 'application/pdf') {
        statusDiv.className = 'file-status success';
        uploadArea.classList.add('success');
        statusIcon.className = 'fas fa-check-circle mr-2';
        statusText.textContent = `PDF "${file.name}" uploaded successfully!`;
        label.textContent = 'PDF uploaded';
    } else {
        statusDiv.className = 'file-status error';
        uploadArea.classList.add('error');
        statusIcon.className = 'fas fa-times-circle mr-2';
        statusText.textContent = 'Invalid file. Please upload a PDF.';
        e.target.value = '';
    }
}

function handlePaymentScreenshotUpload(e) {
    const labelSpan = document.querySelector('label[for="payment-screenshot"] span');
    if (e.target.files.length > 0) {
        labelSpan.textContent = 'Screenshot uploaded successfully';
        labelSpan.classList.remove('text-blue-600');
        labelSpan.classList.add('text-green-600');
        clearError(e.target);
    }
}

function showError(input, message) {
    const errorElement = document.getElementById(`${input.id}-error`);
    const inputElement = input.id === 'gender-value' ? document.querySelector('#gender-dropdown .custom-dropdown-trigger') : input;
    
    inputElement.classList.add('input-error');
    if(errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
}

function clearError(input) {
    const errorElement = document.getElementById(`${input.id}-error`);
    const inputElement = input.id === 'gender-value' ? document.querySelector('#gender-dropdown .custom-dropdown-trigger') : input;
    
    inputElement.classList.remove('input-error');
    if(errorElement) {
        errorElement.classList.remove('show');
    }
}

function validateForm() {
    let isValid = true;
    
    document.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

    ['first_name', 'last_name'].forEach(id => {
        const input = inputs[id];
        if (input.value.trim() === '') { isValid = false; showError(input, 'This field is required.'); }
    });

    const emailInput = inputs.email;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailInput.value.trim() === '') { isValid = false; showError(emailInput, 'Email is required.'); }
    else if (!emailRegex.test(emailInput.value)) { isValid = false; showError(emailInput, 'Please enter a valid email address.'); }

    const phoneInput = inputs.phone;
    const phoneRegex = /^(?:\+91)?[6-9]\d{9}$/;
    if (phoneInput.value.trim() === '') { isValid = false; showError(phoneInput, 'Phone number is required.'); }
    else if (!phoneRegex.test(phoneInput.value.replace(/\s/g, ''))) { isValid = false; showError(phoneInput, 'Please enter a valid 10-digit Indian mobile number.'); }

    if (inputs.gender.value === '') { isValid = false; showError(inputs.gender, 'Please select your gender.'); }
    
    ['upload_type', 'payment_mode'].forEach(name => {
        const checked = document.querySelector(`input[name="${name}"]:checked`);
        const errorEl = document.getElementById(`${name}-error`);
        if (!checked) { isValid = false; errorEl.textContent = 'Please make a selection.'; errorEl.classList.add('show'); }
    });

    const uploadType = document.querySelector('input[name="upload_type"]:checked');
    if (uploadType) {
        if (uploadType.value === 'separate') {
            const uploadedCount = Object.values(uploadedFiles).filter(file => file !== null).length;
            if (uploadedCount < 5) {
                isValid = false;
                const errorDiv = document.getElementById('separate-docs-error');
                errorDiv.textContent = `Please upload all 5 required documents. You've uploaded ${uploadedCount}.`;
                errorDiv.classList.add('show');
            }
        } else {
            if (combinedFileInput.files.length === 0) {
                isValid = false;
                const errorDiv = document.getElementById('combined-doc-error');
                errorDiv.textContent = 'Please upload the combined PDF document.';
                errorDiv.classList.add('show');
            }
        }
    }

    const paymentMode = document.querySelector('input[name="payment_mode"]:checked');
    if (paymentMode && paymentMode.value === 'online') {
        if (inputs.payment_screenshot.files.length === 0) { isValid = false; showError(inputs.payment_screenshot, 'Payment screenshot is required for online payments.'); }
    }

    return isValid;
}

function handleFormSubmit(event) {
    event.preventDefault();
    if (validateForm()) {
        const successOverlay = document.getElementById('success-overlay');
        const successBox = document.getElementById('success-box');
        successOverlay.classList.remove('hidden');
        setTimeout(() => {
            successOverlay.style.opacity = '1';
            successBox.style.transform = 'scale(1)';
            successBox.style.opacity = '1';
        }, 10);
        setTimeout(() => {
            location.reload();
        }, 3000);
    }
}

const dropdown = document.getElementById('gender-dropdown');
const trigger = dropdown.querySelector('.custom-dropdown-trigger');
const selectedText = document.getElementById('gender-selected-text');
const options = dropdown.querySelector('.custom-dropdown-options');
const hiddenInput = document.getElementById('gender-value');
const icon = trigger.querySelector('i');
trigger.addEventListener('click', () => { options.classList.toggle('open'); trigger.classList.toggle('open'); icon.classList.toggle('rotate-180'); });
options.querySelectorAll('.custom-dropdown-option').forEach(option => {
    option.addEventListener('click', () => {
        options.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        selectedText.textContent = option.textContent;
        selectedText.classList.remove('text-gray-500');
        hiddenInput.value = option.dataset.value;
        clearError(hiddenInput);
        options.classList.remove('open');
        trigger.classList.remove('open');
        icon.classList.remove('rotate-180');
    });
});
document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) { options.classList.remove('open'); trigger.classList.remove('open'); icon.classList.remove('rotate-180'); }
});