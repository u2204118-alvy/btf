// Main application initialization
class App {
    constructor() {
        this.currentUser = null;
        this.init().catch(console.error);
    }

    async init() {
        // Initialize theme
        this.initializeTheme();
        
        // Check for existing user session
        this.checkUserSession();
        
        // Initialize login form
        this.initializeLoginForm();
        
        // Initialize theme toggle
        this.initializeThemeToggle();
        
        // Initialize logout
        this.initializeLogout();
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('btf_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.textContent = savedTheme === 'light' ? '🌓' : '☀️';
        }
    }

    initializeThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('btf_theme', newTheme);
                themeToggle.textContent = newTheme === 'light' ? '🌓' : '☀️';
            });
        }
    }

    initializeLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }

    checkUserSession() {
        const currentUser = window.authManager?.getCurrentUser();
        console.log('Checking user session:', currentUser);
        if (currentUser) {
            this.currentUser = currentUser;
            this.showMainApp();
        } else {
            this.showLoginModal();
        }
    }

    initializeLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
    }

    handleLogin() {
        const username = document.getElementById('username')?.value.trim();
        const password = document.getElementById('password')?.value.trim();

        if (!username || !password) {
            Utils.showToast('Please enter both username and password', 'error');
            return;
        }

        const result = window.authManager.login(username, password);
        
        if (result.success) {
            this.currentUser = result.user;
            console.log('Login successful:', result.user);
            Utils.showToast(`Welcome back, ${result.user.username}!`, 'success');
            this.showMainApp();
            
            // Clear form
            document.getElementById('loginForm').reset();
        } else {
            Utils.showToast(result.message || 'Invalid username or password', 'error');
        }
    }

    showLoginModal() {
        const loginModal = document.getElementById('loginModal');
        const mainApp = document.getElementById('app');
        
        if (loginModal) {
            loginModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Show first-time password if it exists
            const firstTimePassword = localStorage.getItem('btf_first_time_password');
            if (firstTimePassword) {
                const demoCredentials = loginModal.querySelector('.demo-credentials');
                if (demoCredentials) {
                    demoCredentials.innerHTML = `
                        <h4>🔐 First Time Setup:</h4>
                        <p><strong>Username:</strong> admin</p>
                        <p><strong>Password:</strong> ${firstTimePassword}</p>
                        <p style="color: var(--danger-color); font-weight: bold;">⚠️ Please change this password immediately after login!</p>
                    `;
                }
            }
        }
        if (mainApp) {
            mainApp.style.display = 'none';
        }
    }

    showMainApp() {
        const loginModal = document.getElementById('loginModal');
        const mainApp = document.getElementById('app');
        
        if (loginModal) {
            loginModal.classList.remove('active');
            document.body.style.overflow = '';
        }
        if (mainApp) {
            mainApp.style.display = 'flex';
        }
        
        // Clear first-time password after successful login
        localStorage.removeItem('btf_first_time_password');

        // Initialize navigation manager
        if (!window.navigationManager.isInitialized) {
            window.navigationManager.hideLoginModal();
        }

        // Refresh dashboard
        if (window.dashboardManager) {
            window.dashboardManager.refresh();
        }
    }

    logout() {
        Utils.confirm('Are you sure you want to logout?', () => {
            window.authManager.logout();
            this.currentUser = null;
            this.showLoginModal();
            
            // Reset navigation to dashboard
            window.navigationManager.navigateTo('dashboard');
            
            Utils.showToast('Logged out successfully', 'success');
        });
    }
}

// Global logout function
window.logout = function() {
    if (window.app) {
        window.app.logout();
    }
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});