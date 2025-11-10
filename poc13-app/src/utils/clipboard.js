export async function copyText(value) {
  if (!value) throw new Error('Nothing to copy');

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  return new Promise((resolve, reject) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const succeeded = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (succeeded) {
        resolve(true);
      } else {
        reject(new Error('execCommand failed'));
      }
    } catch (error) {
      reject(error);
    }
  });
}
