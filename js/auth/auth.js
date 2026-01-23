/**
 * ==========================================================================
 * MÉTÉO CI - Authentication Service
 * ==========================================================================
 * Handles user authentication, registration, and session management
 */

const AuthService = {
    /**
     * Get the current logged-in user
     */
    getCurrentUser() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.USER) || null;
    },

    /**
     * Get the full name of a user
     */
    getUserFullname(username) {
        if (!username) return null;
        return localStorage.getItem(`${CONFIG.STORAGE_KEYS.FULLNAME_PREFIX}${username}`) || username;
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const user = this.getCurrentUser();
        return user !== null && user !== "utilisateur";
    },

    /**
     * Register a new user
     */
    register(fullname, username, password, confirmPassword) {
        // Validation
        if (!fullname || !username || !password || !confirmPassword) {
            return { success: false, message: "Tous les champs sont requis !" };
        }

        if (password !== confirmPassword) {
            return { success: false, message: "Les mots de passe ne correspondent pas !" };
        }

        if (password.length < 4) {
            return { success: false, message: "Le mot de passe doit contenir au moins 4 caractères !" };
        }

        if (username.length < 3) {
            return { success: false, message: "Le nom d'utilisateur doit contenir au moins 3 caractères !" };
        }

        // Check if username exists
        if (localStorage.getItem(`${CONFIG.STORAGE_KEYS.USER_PREFIX}${username}`)) {
            return { success: false, message: "Ce nom d'utilisateur est déjà utilisé !" };
        }

        // Save user
        localStorage.setItem(`${CONFIG.STORAGE_KEYS.USER_PREFIX}${username}`, password);
        localStorage.setItem(`${CONFIG.STORAGE_KEYS.FULLNAME_PREFIX}${username}`, fullname);

        return { success: true, message: "Compte créé avec succès !" };
    },

    /**
     * Login a user
     */
    login(username, password) {
        if (!username || !password) {
            return { success: false, message: "Tous les champs sont requis !" };
        }

        const storedPassword = localStorage.getItem(`${CONFIG.STORAGE_KEYS.USER_PREFIX}${username}`);

        if (storedPassword === password) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER, username);
            return { success: true, message: "Connexion réussie !" };
        } else {
            return { success: false, message: "Identifiants incorrects !" };
        }
    },

    /**
     * Logout the current user
     */
    logout() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
        return { success: true, message: "Déconnexion réussie !" };
    },

    /**
     * Get welcome messages for the current user
     */
    getWelcomeMessages() {
        const username = this.getCurrentUser();
        const fullname = username ? this.getUserFullname(username) : null;

        if (fullname) {
            return WELCOME_MESSAGES.getMessages(fullname);
        }
        return WELCOME_MESSAGES.defaultMessages;
    }
};

/**
 * Authentication Modal Controller
 */
const AuthModal = {
    modal: null,
    loginForm: null,
    registerForm: null,

    /**
     * Initialize the modal
     */
    init() {
        this.modal = document.getElementById("auth-modal");
        this.loginForm = document.getElementById("login-form");
        this.registerForm = document.getElementById("register-form");

        this.bindEvents();
        this.checkInitialState();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Close button
        const closeBtn = document.getElementById("close-auth-modal");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => this.close());
        }

        // Background click to close
        if (this.modal) {
            this.modal.addEventListener("click", (e) => {
                if (e.target === this.modal && AuthService.isAuthenticated()) {
                    this.close();
                }
            });
        }

        // Escape key to close
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && AuthService.isAuthenticated()) {
                this.close();
            }
        });

        // User icon click
        const userIcon = document.getElementById("user");
        if (userIcon) {
            userIcon.addEventListener("click", () => this.open());
        }

        // Toggle between login and register forms
        const showRegister = document.getElementById("show-register");
        const showLogin = document.getElementById("show-login");

        if (showRegister) {
            showRegister.addEventListener("click", (e) => {
                e.preventDefault();
                this.showRegisterForm();
            });
        }

        if (showLogin) {
            showLogin.addEventListener("click", (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }

        // Form submissions
        if (this.loginForm) {
            this.loginForm.addEventListener("submit", (e) => this.handleLogin(e));
        }

        if (this.registerForm) {
            this.registerForm.addEventListener("submit", (e) => this.handleRegister(e));
        }
    },

    /**
     * Check if user should see modal on load
     */
    checkInitialState() {
        if (AuthService.isAuthenticated()) {
            this.close();
            this.addLogoutButton();
        } else {
            this.open();
        }
    },

    /**
     * Add logout button to header
     */
    addLogoutButton() {
        const userIcon = document.getElementById("user");
        if (!userIcon) return;

        // Check if logout button already exists
        if (document.getElementById("logout-btn")) return;

        const logoutBtn = document.createElement("button");
        logoutBtn.id = "logout-btn";
        logoutBtn.className = "text-sm text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg transition-all duration-200 ml-2";
        logoutBtn.innerHTML = '<i class="fa-solid fa-sign-out-alt mr-1"></i> Déconnexion';
        logoutBtn.addEventListener("click", () => {
            AuthService.logout();
            NotificationService.show("Déconnexion réussie !", "success");
            setTimeout(() => location.reload(), 500);
        });

        userIcon.parentNode.insertBefore(logoutBtn, userIcon.nextSibling);
    },

    /**
     * Open the modal
     */
    open() {
        if (this.modal) {
            this.modal.classList.add("active");
            this.modal.classList.remove("hidden");
            this.modal.style.display = "flex";
            document.body.style.overflow = "hidden";
        }
    },

    /**
     * Close the modal
     */
    close() {
        if (this.modal && AuthService.isAuthenticated()) {
            this.modal.classList.remove("active");
            this.modal.classList.add("hidden");
            this.modal.style.display = "none";
            document.body.style.overflow = "";
            this.showLoginForm();
        }
    },

    /**
     * Show login form
     */
    showLoginForm() {
        if (this.loginForm) this.loginForm.classList.remove("hidden");
        if (this.registerForm) this.registerForm.classList.add("hidden");
    },

    /**
     * Show register form
     */
    showRegisterForm() {
        if (this.loginForm) this.loginForm.classList.add("hidden");
        if (this.registerForm) this.registerForm.classList.remove("hidden");
    },

    /**
     * Handle login form submission
     */
    handleLogin(e) {
        e.preventDefault();

        const username = document.getElementById("login-username")?.value.trim();
        const password = document.getElementById("login-password")?.value.trim();

        const result = AuthService.login(username, password);

        if (result.success) {
            NotificationService.show(result.message, "success");
            AnimationService.updateDynamicTitle();
            setTimeout(() => location.reload(), 500);
        } else {
            NotificationService.show(result.message, "error");
            // Shake animation on form
            this.loginForm?.classList.add("animate-shake");
            setTimeout(() => this.loginForm?.classList.remove("animate-shake"), 500);
        }
    },

    /**
     * Handle register form submission
     */
    handleRegister(e) {
        e.preventDefault();

        const fullname = document.getElementById("register-fullname")?.value.trim();
        const username = document.getElementById("register-username")?.value.trim();
        const password = document.getElementById("register-password")?.value.trim();
        const confirmPassword = document.getElementById("register-confirm-password")?.value.trim();

        const result = AuthService.register(fullname, username, password, confirmPassword);

        if (result.success) {
            NotificationService.show(result.message, "success");
            this.registerForm?.reset();
            this.showLoginForm();
        } else {
            NotificationService.show(result.message, "error");
            // Shake animation on form
            this.registerForm?.classList.add("animate-shake");
            setTimeout(() => this.registerForm?.classList.remove("animate-shake"), 500);
        }
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthService, AuthModal };
}
