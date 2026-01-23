/**
 * ==========================================================================
 * MÉTÉO CI - Animation Service
 * ==========================================================================
 * Handles text animations and other dynamic effects
 */

const AnimationService = {
    typingElement: null,
    currentWordIndex: 0,
    currentCharIndex: 0,
    isDeleting: false,
    typingTimeout: null,

    /**
     * Initialize animations
     */
    init() {
        this.updateDynamicTitle();
    },

    /**
     * Start typing animation with cursor effect
     */
    typeWordsWithCursor(words, elementId) {
        this.typingElement = document.getElementById(elementId);
        if (!this.typingElement || !words || words.length === 0) return;

        this.words = words;
        this.currentWordIndex = 0;
        this.currentCharIndex = 0;
        this.isDeleting = false;

        // Clear any existing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        this.type();
    },

    /**
     * Typing animation loop
     */
    type() {
        if (!this.typingElement || !this.words) return;

        const word = this.words[this.currentWordIndex];
        const displayText = word.substring(0, this.currentCharIndex);

        this.typingElement.innerHTML = `${displayText}<span class="blinking-cursor">|</span>`;

        if (!this.isDeleting && this.currentCharIndex < word.length) {
            // Typing
            this.currentCharIndex++;
            this.typingTimeout = setTimeout(() => this.type(), CONFIG.ANIMATION.TYPING_SPEED);
        } else if (this.isDeleting && this.currentCharIndex > 0) {
            // Deleting
            this.currentCharIndex--;
            this.typingTimeout = setTimeout(() => this.type(), CONFIG.ANIMATION.DELETE_SPEED);
        } else {
            if (!this.isDeleting) {
                // Finished typing, pause then start deleting
                this.isDeleting = true;
                this.typingTimeout = setTimeout(() => this.type(), CONFIG.ANIMATION.PAUSE_DURATION);
            } else {
                // Finished deleting, move to next word
                this.isDeleting = false;
                this.currentWordIndex = (this.currentWordIndex + 1) % this.words.length;
                this.typingTimeout = setTimeout(() => this.type(), CONFIG.ANIMATION.WORD_DELAY);
            }
        }
    },

    /**
     * Update the dynamic title based on current user
     */
    updateDynamicTitle() {
        const messages = AuthService.getWelcomeMessages();
        this.typeWordsWithCursor(messages, "dynamic-title");
    },

    /**
     * Add stagger animation to elements
     */
    staggerElements(selector, animationClass = "animate-fade-in-up") {
        const elements = document.querySelectorAll(selector);

        elements.forEach((el, index) => {
            el.style.opacity = "0";
            el.style.animationDelay = `${index * 0.1}s`;
            el.classList.add(animationClass);

            setTimeout(() => {
                el.style.opacity = "1";
            }, index * 100);
        });
    },

    /**
     * Animate element on scroll into view
     */
    animateOnScroll(selector, animationClass = "animate-fade-in-up") {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add(animationClass);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1
        });

        document.querySelectorAll(selector).forEach(el => {
            observer.observe(el);
        });
    },

    /**
     * Add loading skeleton to an element
     */
    addSkeleton(element) {
        if (!element) return;

        element.innerHTML = `
      <div class="skeleton skeleton-text" style="width: 60%;"></div>
      <div class="skeleton skeleton-text" style="width: 80%;"></div>
      <div class="skeleton skeleton-circle" style="width: 60px; height: 60px; margin: 1rem auto;"></div>
      <div class="skeleton skeleton-text" style="width: 40%;"></div>
    `;
    },

    /**
     * Remove loading skeleton
     */
    removeSkeleton(element) {
        if (!element) return;

        const skeletons = element.querySelectorAll(".skeleton");
        skeletons.forEach(s => s.remove());
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationService;
}
