/**
 * Global JavaScript for MDamascus Theme
 */

// Utility functions
const utils = {
  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Format money
  formatMoney(cents, format) {
    if (typeof cents === 'string') {
      cents = cents.replace('.', '');
    }
    let value = '';
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    const formatString = (format || this.money_format);

    function formatWithDelimiters(number, precision, thousands, decimal) {
      thousands = thousands || ',';
      decimal = decimal || '.';

      if (isNaN(number) || number == null) {
        return 0;
      }

      number = (number / 100.0).toFixed(precision);

      const parts = number.split('.');
      const dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      const centsAmount = parts[1] ? (decimal + parts[1]) : '';

      return dollarsAmount + centsAmount;
    }

    switch (formatString.match(placeholderRegex)[1]) {
      case 'amount':
        value = formatWithDelimiters(cents, 2);
        break;
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
      case 'amount_no_decimals_with_space_separator':
        value = formatWithDelimiters(cents, 0, ' ');
        break;
      case 'amount_with_apostrophe_separator':
        value = formatWithDelimiters(cents, 2, "'");
        break;
    }

    return formatString.replace(placeholderRegex, value);
  },

  // Get URL parameter
  getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
  },

  // Add URL parameter
  addUrlParameter(url, param, value) {
    const separator = url.indexOf('?') !== -1 ? '&' : '?';
    return url + separator + param + '=' + value;
  }
};

// Cart functionality
const cart = {
  // Add item to cart
  addItem(formData) {
    return fetch(window.routes.cart_add_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 422) {
        throw new Error(data.description);
      }
      return data;
    });
  },

  // Update cart item
  updateItem(line, quantity) {
    return fetch(window.routes.cart_change_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        line: line,
        quantity: quantity
      })
    })
    .then(response => response.json());
  },

  // Get cart data
  getCart() {
    return fetch(window.routes.cart_url + '.js')
      .then(response => response.json());
  },

  // Update cart count in header
  updateCartCount() {
    this.getCart().then(cart => {
      const cartCount = document.getElementById('cart-count');
      if (cartCount) {
        cartCount.textContent = cart.item_count;
      }
    });
  }
};

// Product form handling
const productForm = {
  init() {
    const forms = document.querySelectorAll('form[data-type="add-to-cart-form"]');
    forms.forEach(form => {
      form.addEventListener('submit', this.handleSubmit.bind(this));
    });
  },

  handleSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('[type="submit"]');
    const loadingSpinner = form.querySelector('.loading-overlay__spinner');
    
    // Show loading state
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.querySelector('span').style.opacity = '0';
    }
    
    if (loadingSpinner) {
      loadingSpinner.classList.remove('hidden');
    }

    // Prepare form data
    const formData = new FormData(form);
    const data = {
      items: [{
        id: formData.get('id'),
        quantity: parseInt(formData.get('quantity')) || 1
      }]
    };

    // Add to cart
    cart.addItem(data)
      .then(response => {
        // Update cart count
        cart.updateCartCount();
        
        // Show success message
        this.showMessage('Product added to cart!', 'success');
        
        // Reset form
        form.reset();
      })
      .catch(error => {
        console.error('Error adding to cart:', error);
        this.showMessage('Error adding product to cart. Please try again.', 'error');
      })
      .finally(() => {
        // Hide loading state
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.querySelector('span').style.opacity = '1';
        }
        
        if (loadingSpinner) {
          loadingSpinner.classList.add('hidden');
        }
      });
  },

  showMessage(message, type = 'info') {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message message--${type}`;
    messageEl.textContent = message;
    
    // Add styles
    messageEl.style.cssText = `
      position: fixed;
      top: 2rem;
      right: 2rem;
      padding: 1rem 2rem;
      border-radius: 0.5rem;
      color: white;
      font-weight: bold;
      z-index: 1000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    if (type === 'success') {
      messageEl.style.backgroundColor = '#28a745';
    } else if (type === 'error') {
      messageEl.style.backgroundColor = '#dc3545';
    } else {
      messageEl.style.backgroundColor = '#007bff';
    }
    
    // Add to page
    document.body.appendChild(messageEl);
    
    // Animate in
    setTimeout(() => {
      messageEl.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      messageEl.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (messageEl.parentNode) {
          messageEl.parentNode.removeChild(messageEl);
        }
      }, 300);
    }, 3000);
  }
};

// Search functionality
const search = {
  init() {
    const searchInputs = document.querySelectorAll('.header__search-input');
    searchInputs.forEach(input => {
      input.addEventListener('input', utils.debounce(this.handleSearch.bind(this), 300));
    });
  },

  handleSearch(event) {
    const query = event.target.value.trim();
    if (query.length < 2) return;

    // Implement search suggestions here
    // This would typically make an AJAX request to get search results
    console.log('Searching for:', query);
  }
};

// Mobile menu functionality
const mobileMenu = {
  init() {
    const menuToggle = document.querySelector('.header__menu-toggle');
    const mobileMenu = document.querySelector('.header__mobile-menu');
    const menuClose = document.querySelector('.header__mobile-menu-close');

    if (menuToggle && mobileMenu) {
      menuToggle.addEventListener('click', () => {
        mobileMenu.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    }

    if (menuClose && mobileMenu) {
      menuClose.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
      });
    }

    // Close menu when clicking outside
    if (mobileMenu) {
      mobileMenu.addEventListener('click', (e) => {
        if (e.target === mobileMenu) {
          mobileMenu.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    }
  }
};

// Newsletter form handling
const newsletter = {
  init() {
    const forms = document.querySelectorAll('.footer__newsletter-form');
    forms.forEach(form => {
      form.addEventListener('submit', this.handleSubmit.bind(this));
    });
  },

  handleSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    const button = form.querySelector('button[type="submit"]');
    
    if (!email) return;
    
    // Show loading state
    const originalText = button.textContent;
    button.textContent = 'Subscribing...';
    button.disabled = true;
    
    // Submit form
    fetch(form.action, {
      method: 'POST',
      body: new FormData(form)
    })
    .then(response => {
      if (response.ok) {
        productForm.showMessage('Successfully subscribed to newsletter!', 'success');
        form.reset();
      } else {
        throw new Error('Subscription failed');
      }
    })
    .catch(error => {
      console.error('Newsletter subscription error:', error);
      productForm.showMessage('Error subscribing to newsletter. Please try again.', 'error');
    })
    .finally(() => {
      button.textContent = originalText;
      button.disabled = false;
    });
  }
};

// Image lazy loading
const lazyImages = {
  init() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        });
      });

      const lazyImages = document.querySelectorAll('img[data-src]');
      lazyImages.forEach(img => imageObserver.observe(img));
    }
  }
};

// Smooth scrolling for anchor links
const smoothScroll = {
  init() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
      link.addEventListener('click', this.handleClick.bind(this));
    });
  },

  handleClick(event) {
    const href = event.target.getAttribute('href');
    if (href === '#') return;
    
    const target = document.querySelector(href);
    if (target) {
      event.preventDefault();
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }
};

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  productForm.init();
  search.init();
  mobileMenu.init();
  newsletter.init();
  lazyImages.init();
  smoothScroll.init();
  
  // Update cart count on page load
  cart.updateCartCount();
});

// Export for use in other scripts
window.MDamascusTheme = {
  utils,
  cart,
  productForm,
  search,
  mobileMenu,
  newsletter
};
