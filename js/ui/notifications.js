/**
 * ==========================================================================
 * MÉTÉO CI - Notification Service
 * ==========================================================================
 * Toast notification system for user feedback
 */

const NotificationService = {
    container: null,
    toasts: [],

    /**
     * Initialize the notification container
     */
    init() {
        // Create container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement("div");
            this.container.id = "toast-container";
            this.container.className = "toast-container";
            document.body.appendChild(this.container);
        }
    },

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Type of notification: success, error, warning, info
     * @param {number} duration - Duration in milliseconds (default: 4000)
     */
    show(message, type = "info", duration = 4000) {
        this.init();

        const toast = document.createElement("div");
        toast.className = `toast toast--${type} animate-fade-in-up`;

        const icons = {
            success: "fa-check-circle",
            error: "fa-times-circle",
            warning: "fa-exclamation-triangle",
            info: "fa-info-circle"
        };

        toast.innerHTML = `
      <i class="toast__icon fa-solid ${icons[type] || icons.info}"></i>
      <span class="toast__message">${message}</span>
      <button class="toast__close" aria-label="Fermer">
        <i class="fa-solid fa-times"></i>
      </button>
    `;

        // Close button handler
        const closeBtn = toast.querySelector(".toast__close");
        closeBtn.addEventListener("click", () => this.dismiss(toast));

        // Add to container
        this.container.appendChild(toast);
        this.toasts.push(toast);

        // Auto dismiss
        setTimeout(() => this.dismiss(toast), duration);

        return toast;
    },

    /**
     * Dismiss a toast notification
     */
    dismiss(toast) {
        if (!toast || !toast.parentNode) return;

        toast.classList.add("animate-fade-out");
        toast.style.animation = "fadeIn 0.2s ease-in reverse forwards";

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.toasts = this.toasts.filter(t => t !== toast);
        }, 200);
    },

    /**
     * Clear all toasts
     */
    clearAll() {
        this.toasts.forEach(toast => this.dismiss(toast));
    },

    /**
     * Shorthand methods
     */
    success(message, duration) {
        return this.show(message, "success", duration);
    },

    error(message, duration) {
        return this.show(message, "error", duration);
    },

    warning(message, duration) {
        return this.show(message, "warning", duration);
    },

    info(message, duration) {
        return this.show(message, "info", duration);
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationService;
}
