/**
 * ==========================================================================
 * MÉTÉO CI - Authentication Service (Secured)
 * ==========================================================================
 * Sécurité : SHA-256 + salt, rate limiting, session expirable, validation forte
 * Note : Sans backend/DB, localStorage reste le stockage. Le hachage empêche
 * la lecture directe des mots de passe mais un attaquant avec accès au
 * navigateur pourrait toujours manipuler localStorage.
 */

const AuthService = {
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 2 * 60 * 1000, // 2 minutes
    SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 heures

    /**
     * Generate a random salt (hex string)
     */
    generateSalt() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Hash a password with salt using SHA-256
     */
    async hashPassword(password, salt) {
        const data = new TextEncoder().encode(salt + password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Sanitize input to prevent XSS
     */
    sanitize(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML.trim();
    },

    /**
     * Validate password strength
     * Min 6 chars, at least 1 uppercase, 1 lowercase, 1 digit
     */
    validatePassword(password) {
        if (password.length < 6) {
            return { valid: false, message: "Le mot de passe doit contenir au moins 6 caractères." };
        }
        if (!/[A-Z]/.test(password)) {
            return { valid: false, message: "Le mot de passe doit contenir au moins une majuscule." };
        }
        if (!/[a-z]/.test(password)) {
            return { valid: false, message: "Le mot de passe doit contenir au moins une minuscule." };
        }
        if (!/[0-9]/.test(password)) {
            return { valid: false, message: "Le mot de passe doit contenir au moins un chiffre." };
        }
        return { valid: true };
    },

    /**
     * Validate username
     */
    validateUsername(username) {
        if (username.length < 3) {
            return { valid: false, message: "Le nom d'utilisateur doit contenir au moins 3 caractères." };
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return { valid: false, message: "Le nom d'utilisateur ne peut contenir que lettres, chiffres et _." };
        }
        return { valid: true };
    },

    /**
     * Check rate limiting for login attempts
     */
    checkRateLimit() {
        const data = JSON.parse(localStorage.getItem('auth_attempts') || '{"count":0,"timestamp":0}');
        const now = Date.now();

        if (data.count >= this.MAX_ATTEMPTS && (now - data.timestamp) < this.LOCKOUT_DURATION) {
            const remaining = Math.ceil((this.LOCKOUT_DURATION - (now - data.timestamp)) / 1000);
            return { locked: true, remaining };
        }

        // Reset if lockout expired
        if ((now - data.timestamp) >= this.LOCKOUT_DURATION) {
            localStorage.setItem('auth_attempts', JSON.stringify({ count: 0, timestamp: now }));
        }

        return { locked: false };
    },

    /**
     * Record a failed login attempt
     */
    recordFailedAttempt() {
        const data = JSON.parse(localStorage.getItem('auth_attempts') || '{"count":0,"timestamp":0}');
        data.count += 1;
        data.timestamp = Date.now();
        localStorage.setItem('auth_attempts', JSON.stringify(data));
    },

    /**
     * Reset login attempts on success
     */
    resetAttempts() {
        localStorage.removeItem('auth_attempts');
    },

    /**
     * Get stored user data object
     */
    getUserData(username) {
        const raw = localStorage.getItem(`${CONFIG.STORAGE_KEYS.USER_PREFIX}${username}`);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            // Legacy format (plain password string) — migrate on next login
            return null;
        }
    },

    /**
     * Get the current logged-in user from session
     */
    getCurrentUser() {
        const session = localStorage.getItem('auth_session');
        if (!session) return null;

        try {
            const data = JSON.parse(session);
            if (Date.now() > data.expires) {
                // Session expired
                localStorage.removeItem('auth_session');
                return null;
            }
            return data.username;
        } catch {
            return null;
        }
    },

    /**
     * Get the full name of a user
     */
    getUserFullname(username) {
        if (!username) return null;
        const userData = this.getUserData(username);
        if (userData && userData.fullname) return userData.fullname;
        return localStorage.getItem(`${CONFIG.STORAGE_KEYS.FULLNAME_PREFIX}${username}`) || username;
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.getCurrentUser() !== null;
    },

    /**
     * Register a new user
     */
    async register(fullname, username, password, confirmPassword) {
        // Sanitize
        fullname = this.sanitize(fullname);
        username = this.sanitize(username);

        // Basic checks
        if (!fullname || !username || !password || !confirmPassword) {
            return { success: false, message: "Tous les champs sont requis !" };
        }

        // Validate username
        const usernameCheck = this.validateUsername(username);
        if (!usernameCheck.valid) {
            return { success: false, message: usernameCheck.message };
        }

        // Validate password strength
        const passwordCheck = this.validatePassword(password);
        if (!passwordCheck.valid) {
            return { success: false, message: passwordCheck.message };
        }

        if (password !== confirmPassword) {
            return { success: false, message: "Les mots de passe ne correspondent pas !" };
        }

        // Check if username exists
        if (localStorage.getItem(`${CONFIG.STORAGE_KEYS.USER_PREFIX}${username}`)) {
            return { success: false, message: "Ce nom d'utilisateur est déjà utilisé !" };
        }

        // Hash password with salt
        const salt = this.generateSalt();
        const hash = await this.hashPassword(password, salt);

        // Store user data as structured object
        const userData = {
            fullname,
            salt,
            hash,
            createdAt: new Date().toISOString()
        };

        localStorage.setItem(`${CONFIG.STORAGE_KEYS.USER_PREFIX}${username}`, JSON.stringify(userData));

        return { success: true, message: "Compte créé avec succès !" };
    },

    /**
     * Login a user
     */
    async login(username, password) {
        username = this.sanitize(username);

        if (!username || !password) {
            return { success: false, message: "Tous les champs sont requis !" };
        }

        // Rate limit check
        const rateCheck = this.checkRateLimit();
        if (rateCheck.locked) {
            return {
                success: false,
                message: `Trop de tentatives. Réessayez dans ${rateCheck.remaining}s.`
            };
        }

        const userData = this.getUserData(username);

        if (!userData) {
            // Also handle legacy plain-text passwords for migration
            const legacyPw = localStorage.getItem(`${CONFIG.STORAGE_KEYS.USER_PREFIX}${username}`);
            if (legacyPw && legacyPw === password) {
                // Migrate to hashed format
                const salt = this.generateSalt();
                const hash = await this.hashPassword(password, salt);
                const fullname = localStorage.getItem(`${CONFIG.STORAGE_KEYS.FULLNAME_PREFIX}${username}`) || username;
                const migrated = { fullname, salt, hash, createdAt: new Date().toISOString() };
                localStorage.setItem(`${CONFIG.STORAGE_KEYS.USER_PREFIX}${username}`, JSON.stringify(migrated));
                localStorage.removeItem(`${CONFIG.STORAGE_KEYS.FULLNAME_PREFIX}${username}`);

                this.resetAttempts();
                this.createSession(username);
                return { success: true, message: "Connexion réussie !" };
            }

            this.recordFailedAttempt();
            return { success: false, message: "Identifiants incorrects !" };
        }

        // Verify hashed password
        const hash = await this.hashPassword(password, userData.salt);

        if (hash === userData.hash) {
            this.resetAttempts();
            this.createSession(username);
            return { success: true, message: "Connexion réussie !" };
        } else {
            this.recordFailedAttempt();
            const attempts = JSON.parse(localStorage.getItem('auth_attempts') || '{}');
            const remaining = this.MAX_ATTEMPTS - (attempts.count || 0);
            const msg = remaining > 0
                ? `Identifiants incorrects ! ${remaining} tentative(s) restante(s).`
                : "Compte temporairement verrouillé.";
            return { success: false, message: msg };
        }
    },

    /**
     * Create an authenticated session
     */
    createSession(username) {
        const session = {
            username,
            expires: Date.now() + this.SESSION_DURATION,
            token: this.generateSalt() // random token for this session
        };
        localStorage.setItem('auth_session', JSON.stringify(session));
    },

    /**
     * Logout the current user
     */
    logout() {
        localStorage.removeItem('auth_session');
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

    init() {
        this.modal = document.getElementById("auth-modal");
        this.loginForm = document.getElementById("login-form");
        this.registerForm = document.getElementById("register-form");

        this.bindEvents();
        this.checkInitialState();
    },

    bindEvents() {
        const closeBtn = document.getElementById("close-auth-modal");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => this.close());
        }

        if (this.modal) {
            this.modal.addEventListener("click", (e) => {
                if (e.target === this.modal && AuthService.isAuthenticated()) {
                    this.close();
                }
            });
        }

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && AuthService.isAuthenticated()) {
                this.close();
            }
        });

        const userIcon = document.getElementById("user");
        if (userIcon) {
            userIcon.addEventListener("click", () => this.open());
        }

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

        if (this.loginForm) {
            this.loginForm.addEventListener("submit", (e) => this.handleLogin(e));
        }

        if (this.registerForm) {
            this.registerForm.addEventListener("submit", (e) => this.handleRegister(e));
        }

        // Live password strength indicator
        const regPassword = document.getElementById("register-password");
        if (regPassword) {
            regPassword.addEventListener("input", (e) => this.updatePasswordStrength(e.target.value));
        }

        // Toggle password visibility
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.closest('.form-group').querySelector('input');
                const icon = btn.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.replace('fa-eye-slash', 'fa-eye');
                }
            });
        });
    },

    /**
     * Update password strength indicator
     */
    updatePasswordStrength(password) {
        const bar = document.getElementById("password-strength-bar");
        const text = document.getElementById("password-strength-text");
        if (!bar || !text) return;

        let score = 0;
        if (password.length >= 6) score++;
        if (password.length >= 10) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        const levels = [
            { width: "0%", color: "#e2e8f0", label: "" },
            { width: "20%", color: "#ef4444", label: "Très faible" },
            { width: "40%", color: "#f97316", label: "Faible" },
            { width: "60%", color: "#eab308", label: "Moyen" },
            { width: "80%", color: "#22c55e", label: "Fort" },
            { width: "90%", color: "#10b981", label: "Très fort" },
            { width: "100%", color: "#059669", label: "Excellent" }
        ];

        const level = levels[Math.min(score, levels.length - 1)];
        bar.style.width = level.width;
        bar.style.backgroundColor = level.color;
        text.textContent = level.label;
        text.style.color = level.color;
    },

    checkInitialState() {
        if (AuthService.isAuthenticated()) {
            this.close();
            this.addLogoutButton();
        } else {
            this.open();
        }
    },

    addLogoutButton() {
        const userIcon = document.getElementById("user");
        if (!userIcon) return;
        if (document.getElementById("logout-btn")) return;

        const logoutBtn = document.createElement("button");
        logoutBtn.id = "logout-btn";
        logoutBtn.className = "header__action-btn";
        logoutBtn.title = "Déconnexion";
        logoutBtn.innerHTML = '<i class="fa-solid fa-sign-out-alt"></i>';
        logoutBtn.addEventListener("click", () => {
            AuthService.logout();
            NotificationService.show("Déconnexion réussie !", "success");
            setTimeout(() => location.reload(), 500);
        });

        userIcon.parentNode.insertBefore(logoutBtn, userIcon.nextSibling);
    },

    open() {
        if (this.modal) {
            this.modal.classList.add("active");
            this.modal.classList.remove("hidden");
            this.modal.style.display = "flex";
            document.body.style.overflow = "hidden";
        }
    },

    close() {
        if (this.modal && AuthService.isAuthenticated()) {
            this.modal.classList.remove("active");
            this.modal.classList.add("hidden");
            this.modal.style.display = "none";
            document.body.style.overflow = "";
            this.showLoginForm();
        }
    },

    showLoginForm() {
        if (this.loginForm) this.loginForm.classList.remove("hidden");
        if (this.registerForm) this.registerForm.classList.add("hidden");
    },

    showRegisterForm() {
        if (this.loginForm) this.loginForm.classList.add("hidden");
        if (this.registerForm) this.registerForm.classList.remove("hidden");
    },

    async handleLogin(e) {
        e.preventDefault();

        const btn = this.loginForm?.querySelector('button[type="submit"]');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connexion...';
        }

        const username = document.getElementById("login-username")?.value.trim();
        const password = document.getElementById("login-password")?.value;

        const result = await AuthService.login(username, password);

        if (result.success) {
            NotificationService.show(result.message, "success");
            AnimationService.updateDynamicTitle();
            setTimeout(() => location.reload(), 500);
        } else {
            NotificationService.show(result.message, "error");
            this.loginForm?.classList.add("animate-shake");
            setTimeout(() => this.loginForm?.classList.remove("animate-shake"), 500);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-sign-in-alt"></i> Connexion';
            }
        }
    },

    async handleRegister(e) {
        e.preventDefault();

        const btn = this.registerForm?.querySelector('button[type="submit"]');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Inscription...';
        }

        const fullname = document.getElementById("register-fullname")?.value.trim();
        const username = document.getElementById("register-username")?.value.trim();
        const password = document.getElementById("register-password")?.value;
        const confirmPassword = document.getElementById("register-confirm-password")?.value;

        const result = await AuthService.register(fullname, username, password, confirmPassword);

        if (result.success) {
            NotificationService.show(result.message, "success");
            this.registerForm?.reset();
            // Reset strength bar
            const bar = document.getElementById("password-strength-bar");
            const text = document.getElementById("password-strength-text");
            if (bar) { bar.style.width = "0%"; }
            if (text) { text.textContent = ""; }
            this.showLoginForm();
        } else {
            NotificationService.show(result.message, "error");
            this.registerForm?.classList.add("animate-shake");
            setTimeout(() => this.registerForm?.classList.remove("animate-shake"), 500);
        }

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> S\'inscrire';
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthService, AuthModal };
}
