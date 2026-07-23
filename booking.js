(() => {
  const form = document.querySelector('[data-booking-form]');
  if (!form) return;

  const status = form.querySelector('[data-booking-status]');
  const button = form.querySelector('button[type="submit"]');
  const initialButton = button.innerHTML;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    status.textContent = '';
    status.classList.remove('is-error');
    button.disabled = true;
    button.textContent = 'Sending…';

    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Your message could not be sent.');

      form.reset();
      status.textContent = 'Thank you. Your enquiry has been sent and we will reply as soon as possible.';
    } catch (error) {
      status.classList.add('is-error');
      status.textContent = `${error.message} You can also email plataniseasidevilla@gmail.com.`;
    } finally {
      button.disabled = false;
      button.innerHTML = initialButton;
    }
  });
})();
