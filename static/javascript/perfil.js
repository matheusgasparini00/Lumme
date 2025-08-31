document.addEventListener('DOMContentLoaded', function () {
  const fileInput  = document.getElementById('avatar');
  const previewImg = document.getElementById('avatarPreview');

  if (!fileInput || !previewImg) return;

  fileInput.addEventListener('change', function (e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Escolha um arquivo de imagem (PNG, JPG, JPEG, etc.).');
      fileInput.value = '';
      return;
    }

    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`Imagem muito grande. Máximo ${MAX_MB}MB.`);
      fileInput.value = '';
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    previewImg.src = blobUrl;
    previewImg.onload = () => URL.revokeObjectURL(blobUrl);

  });
});