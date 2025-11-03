// Simple toast notification utility
// If you want to use react-toastify, install it: npm install react-toastify
// Then replace this with: import { toast } from 'react-toastify';

class ToastManager {
  constructor() {
    this.container = null;
  }

  init() {
    if (typeof document !== 'undefined' && !this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
      document.body.appendChild(this.container);
    }
  }

  show(message, type = 'info') {
    // Initialize container if not already done
    if (!this.container) {
      this.init();
    }
    
    if (!this.container) {
      console.error('Toast container not initialized');
      return;
    }
    
    const toast = document.createElement('div');
    toast.textContent = message;
    
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };

    toast.style.cssText = `
      background: ${colors[type] || colors.info};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      font-size: 14px;
      font-weight: 500;
      animation: slideIn 0.3s ease-out;
      max-width: 350px;
      word-wrap: break-word;
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        this.container.removeChild(toast);
      }, 300);
    }, 3000);
  }

  success(message) {
    this.show(message, 'success');
  }

  error(message) {
    this.show(message, 'error');
  }

  warning(message) {
    this.show(message, 'warning');
  }

  info(message) {
    this.show(message, 'info');
  }
}

// Add CSS animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

export const toast = new ToastManager();
