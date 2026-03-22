/**
 * ==========================================================================
 * MÉTÉO CI - Newsletter Component (Secured)
 * ==========================================================================
 * Validation email, sanitization XSS, rate limiting
 */

const NewsletterComponent = {
    MAX_SUBMITS: 3,
    COOLDOWN: 5 * 60 * 1000, // 5 minutes
    STORAGE_KEY: 'newsletter_subs',
    RATE_KEY: 'newsletter_rate',

    init() {
        const form = document.getElementById('newsletter-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
    },

    /**
     * Sanitize string to prevent XSS
     */
    sanitize(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML.trim();
    },

    /**
     * Validate email with strict regex
     */
    isValidEmail(email) {
        // RFC 5322 simplified — blocks scripts, tags, special chars
        const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        return re.test(email) && email.length <= 254;
    },

    /**
     * Check rate limit
     */
    checkRateLimit() {
        const data = JSON.parse(localStorage.getItem(this.RATE_KEY) || '{"count":0,"timestamp":0}');
        const now = Date.now();

        if ((now - data.timestamp) >= this.COOLDOWN) {
            // Reset after cooldown
            return { allowed: true };
        }

        if (data.count >= this.MAX_SUBMITS) {
            const remaining = Math.ceil((this.COOLDOWN - (now - data.timestamp)) / 60000);
            return { allowed: false, remaining };
        }

        return { allowed: true };
    },

    /**
     * Record a submission
     */
    recordSubmit() {
        const data = JSON.parse(localStorage.getItem(this.RATE_KEY) || '{"count":0,"timestamp":0}');
        const now = Date.now();

        if ((now - data.timestamp) >= this.COOLDOWN) {
            localStorage.setItem(this.RATE_KEY, JSON.stringify({ count: 1, timestamp: now }));
        } else {
            data.count += 1;
            localStorage.setItem(this.RATE_KEY, JSON.stringify(data));
        }
    },

    /**
     * Check if email is already subscribed
     */
    isAlreadySubscribed(email) {
        const subs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        return subs.includes(email.toLowerCase());
    },

    /**
     * Save subscription
     */
    saveSubscription(email) {
        const subs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        subs.push(email.toLowerCase());
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(subs));
    },

    /**
     * Show message
     */
    showMessage(text, type) {
        const msg = document.getElementById('newsletter-msg');
        if (!msg) return;
        msg.textContent = text;
        msg.className = `footer__newsletter-msg footer__newsletter-msg--${type}`;

        // Auto-clear after 5s
        setTimeout(() => {
            msg.textContent = '';
            msg.className = 'footer__newsletter-msg';
        }, 5000);
    },

    /**
     * Handle form submission
     */
    handleSubmit() {
        const input = document.getElementById('newsletter-email');
        const btn = document.getElementById('newsletter-btn');
        if (!input || !btn) return;

        const rawValue = input.value;
        const email = this.sanitize(rawValue.trim());

        // Detect injection attempts (tags in raw input)
        if (rawValue !== rawValue.replace(/<[^>]*>/g, '')) {
            this.showMessage('Entrée invalide détectée.', 'error');
            input.value = '';
            return;
        }

        // Empty check
        if (!email) {
            this.showMessage('Veuillez entrer une adresse email.', 'error');
            return;
        }

        // Email format validation
        if (!this.isValidEmail(email)) {
            this.showMessage('Adresse email invalide.', 'error');
            return;
        }

        // Rate limit check
        const rateCheck = this.checkRateLimit();
        if (!rateCheck.allowed) {
            this.showMessage(`Trop de tentatives. Réessayez dans ${rateCheck.remaining} min.`, 'error');
            return;
        }

        // Duplicate check
        if (this.isAlreadySubscribed(email)) {
            this.showMessage('Cette adresse est déjà inscrite.', 'error');
            return;
        }

        // Save and confirm
        this.recordSubmit();
        this.saveSubscription(email);

        input.value = '';
        this.showMessage('Inscription réussie !', 'success');

        if (typeof NotificationService !== 'undefined') {
            NotificationService.success('Merci pour votre inscription à la newsletter !');
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NewsletterComponent;
}
