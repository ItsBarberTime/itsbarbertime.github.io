// BarberTime Appointment Booking Script
// Handles form submission and navigation

document.addEventListener('DOMContentLoaded', function() {
    // Setup navigation active link highlighting
    setupNavigation();
    
    // Setup form submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleFormSubmit);
    }
});

// Navigation: Highlight active link based on scroll position
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a');
    
    window.addEventListener('scroll', function() {
        let current = '';
        
        // Determine which section is currently in view
        const sections = document.querySelectorAll('section');
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollY >= sectionTop - 100) {
                current = section.getAttribute('id');
            }
        });
        
        // Update active link styling
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').slice(1) === current) {
                link.classList.add('active');
            }
        });
    });
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form values
    const name = e.target.elements[0].value.trim();
    const email = e.target.elements[1].value.trim();
    const phone = e.target.elements[2].value.trim();
    const service = e.target.elements[3].value;
    const smsConsent = e.target.elements[4].checked;
    const emailConsent = e.target.elements[5].checked;
    
    // Validate inputs
    if (!name || !email || !phone || !service) {
        alert('❌ Please fill out all fields');
        return;
    }
    
    if (!smsConsent && !emailConsent) {
        alert('❌ Please select at least one notification method (SMS or Email)');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('❌ Please enter a valid email address');
        return;
    }
    
    // Validate phone format (basic)
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 10) {
        alert('❌ Please enter a valid phone number');
        return;
    }
    
    // Create appointment object
    const appointment = {
        id: Date.now(),
        name,
        email,
        phone,
        service,
        smsConsent,
        emailConsent,
        createdAt: new Date().toISOString(),
        consentAccepted: true
    };
    
    // Save to localStorage (demo - use backend in production)
    saveAppointmentLocal(appointment);
    
    // If backend is available, send to server
    sendToBackend(appointment);
    
    // Show success message
    showSuccessMessage(smsConsent, emailConsent);
    
    // Reset form
    e.target.reset();
}

// Save appointment to localStorage
function saveAppointmentLocal(appointment) {
    try {
        let appointments = JSON.parse(localStorage.getItem('barbertime_appointments')) || [];
        appointments.push(appointment);
        localStorage.setItem('barbertime_appointments', JSON.stringify(appointments));
        console.log('✅ Appointment saved locally:', appointment);
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

// Send appointment to backend API (if available)
function sendToBackend(appointment) {
    // Check if backend API is available
    const apiUrl = process.env.API_URL || 'http://localhost:3000/api/appointments';
    
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(appointment),
        mode: 'cors'
    })
    .then(response => {
        if (!response.ok) throw new Error('API request failed');
        return response.json();
    })
    .then(data => {
        console.log('✅ Appointment sent to backend:', data);
        
        // Log consent for compliance audit trail
        logComplianceEvent('appointment_booked', {
            appointmentId: appointment.id,
            smsConsent: appointment.smsConsent,
            emailConsent: appointment.emailConsent,
            timestamp: new Date().toISOString()
        });
    })
    .catch(error => {
        // Backend not available - appointment saved locally only
        console.warn('⚠️  Backend not available. Appointment saved locally only.', error);
        
        // Still log the consent
        logComplianceEvent('appointment_booked_local', {
            appointmentId: appointment.id,
            smsConsent: appointment.smsConsent,
            emailConsent: appointment.emailConsent,
            timestamp: new Date().toISOString()
        });
    });
}

// Show success message
function showSuccessMessage(smsConsent, emailConsent) {
    let message = '✅ Appointment Confirmed!\n\n';
    
    if (smsConsent) {
        message += '📱 SMS confirmation sent.\n';
        message += '(Reply STOP to opt out)\n\n';
    }
    
    if (emailConsent) {
        message += '📧 Email confirmation sent.\n';
        message += '(Click unsubscribe in email to opt out)\n\n';
    }
    
    message += 'We\'ll send you a reminder 24 hours before your appointment!';
    
    alert(message);
}

// Log compliance events for audit trail
function logComplianceEvent(event, data) {
    const complianceLog = {
        event,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ...data
    };
    
    try {
        let logs = JSON.parse(localStorage.getItem('barbertime_compliance_log')) || [];
        logs.push(complianceLog);
        // Keep only last 1000 events
        if (logs.length > 1000) logs.shift();
        localStorage.setItem('barbertime_compliance_log', JSON.stringify(logs));
        console.log('📋 Compliance event logged:', complianceLog);
    } catch (error) {
        console.error('Error logging compliance event:', error);
    }
}

// GDPR: Allow users to export their data
function exportUserData(email) {
    try {
        const appointments = JSON.parse(localStorage.getItem('barbertime_appointments')) || [];
        const userAppointments = appointments.filter(a => a.email === email);
        
        if (userAppointments.length === 0) {
            alert('No data found for this email address');
            return;
        }
        
        // Create downloadable JSON
        const dataStr = JSON.stringify(userAppointments, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `barbertime-data-${email}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        // Log for compliance
        logComplianceEvent('data_export_requested', {
            email,
            recordsExported: userAppointments.length,
            timestamp: new Date().toISOString()
        });
        
        alert('✅ Your data has been downloaded');
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('❌ Error exporting data');
    }
}

// GDPR/CCPA: Allow users to delete their data
function deleteUserData(email) {
    const confirmed = confirm(
        '⚠️  This will permanently delete all your appointment data. ' +
        'This action cannot be undone. Are you sure?'
    );
    
    if (!confirmed) return;
    
    try {
        let appointments = JSON.parse(localStorage.getItem('barbertime_appointments')) || [];
        const originalLength = appointments.length;
        appointments = appointments.filter(a => a.email !== email);
        const deletedCount = originalLength - appointments.length;
        
        if (deletedCount === 0) {
            alert('No data found for this email address');
            return;
        }
        
        localStorage.setItem('barbertime_appointments', JSON.stringify(appointments));
        
        // Log for compliance
        logComplianceEvent('data_deletion_requested', {
            email,
            recordsDeleted: deletedCount,
            timestamp: new Date().toISOString()
        });
        
        // Notify backend if available
        fetch('/api/user-data/' + email, { method: 'DELETE' })
            .catch(err => console.warn('Backend deletion not available:', err));
        
        alert('✅ Your data has been deleted');
    } catch (error) {
        console.error('Error deleting data:', error);
        alert('❌ Error deleting data');
    }
}

// Unsubscribe from SMS
function unsubscribeSMS(phone) {
    try {
        let appointments = JSON.parse(localStorage.getItem('barbertime_appointments')) || [];
        appointments = appointments.map(a => 
            a.phone === phone ? { ...a, smsConsent: false } : a
        );
        localStorage.setItem('barbertime_appointments', JSON.stringify(appointments));
        
        // Log for TCPA compliance
        logComplianceEvent('sms_unsubscribe', {
            phone,
            timestamp: new Date().toISOString()
        });
        
        // Notify backend if available
        fetch('/api/unsubscribe-sms/' + phone, { method: 'POST' })
            .catch(err => console.warn('Backend unsubscribe not available:', err));
        
        alert('✅ You have been unsubscribed from SMS notifications');
    } catch (error) {
        console.error('Error unsubscribing:', error);
    }
}

// Unsubscribe from Email
function unsubscribeEmail(email) {
    try {
        let appointments = JSON.parse(localStorage.getItem('barbertime_appointments')) || [];
        appointments = appointments.map(a => 
            a.email === email ? { ...a, emailConsent: false } : a
        );
        localStorage.setItem('barbertime_appointments', JSON.stringify(appointments));
        
        // Log for CAN-SPAM compliance
        logComplianceEvent('email_unsubscribe', {
            email,
            timestamp: new Date().toISOString()
        });
        
        // Notify backend if available
        fetch('/api/unsubscribe-email/' + email, { method: 'POST' })
            .catch(err => console.warn('Backend unsubscribe not available:', err));
        
        alert('✅ You have been unsubscribed from email notifications');
    } catch (error) {
        console.error('Error unsubscribing:', error);
    }
}

// Get compliance audit trail
function getComplianceLog() {
    try {
        const logs = JSON.parse(localStorage.getItem('barbertime_compliance_log')) || [];
        console.table(logs);
        return logs;
    } catch (error) {
        console.error('Error retrieving compliance log:', error);
        return [];
    }
}

// For admin: Get all appointments
function getAllAppointments() {
    try {
        const appointments = JSON.parse(localStorage.getItem('barbertime_appointments')) || [];
        console.table(appointments);
        return appointments;
    } catch (error) {
        console.error('Error retrieving appointments:', error);
        return [];
    }
}

// For admin: Export all appointments
function exportAllAppointments() {
    try {
        const appointments = JSON.parse(localStorage.getItem('barbertime_appointments')) || [];
        
        if (appointments.length === 0) {
            alert('No appointments to export');
            return;
        }
        
        const dataStr = JSON.stringify(appointments, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `barbertime-all-appointments-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        alert(`✅ Exported ${appointments.length} appointments`);
    } catch (error) {
        console.error('Error exporting appointments:', error);
    }
}

// Console commands for testing
console.log('BarberTime Appointment System Ready');
console.log('Available commands:');
console.log('  getAllAppointments() - View all appointments');
console.log('  exportAllAppointments() - Export all appointments to JSON');
console.log('  getComplianceLog() - View compliance audit trail');
console.log('  exportUserData(email) - Export specific user data');
console.log('  deleteUserData(email) - Delete user data (GDPR)');
console.log('  unsubscribeSMS(phone) - Unsubscribe from SMS');
console.log('  unsubscribeEmail(email) - Unsubscribe from email');
