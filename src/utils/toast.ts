import toast from 'react-hot-toast';

// Обертка для стандартных методов toast с русскими сообщениями
export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
    });
  },

  error: (message: string) => {
    toast.error(message, {
      duration: 4000,
      position: 'top-right',
    });
  },

  loading: (message: string) => {
    return toast.loading(message, {
      position: 'top-right',
    });
  },

  dismiss: (toastId: string) => {
    toast.dismiss(toastId);
  },

  // Для конфирм диалогов будем использовать window.confirm или отдельную модалку
  confirm: async (options: {
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      const confirmed = window.confirm(`${options.title}\n${options.message}`);
      resolve(confirmed);
    });
  }
};