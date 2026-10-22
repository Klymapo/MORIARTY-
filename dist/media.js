// MORIARTY — imágenes. Comprime en el navegador a un data URL pequeño (decisión: base64 dentro del JSON).
import {IMAGE_LIMIT} from './model.js';

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}

// max: lado mayor en px. Devuelve WebP si el navegador lo soporta; si no, JPEG.
export async function compressImage(file, {max = 512, quality = 0.82} = {}) {
  if (!file || !file.type.startsWith('image/')) throw Error('Elige un archivo de imagen.');
  if (file.type === 'image/svg+xml' && file.size < 200 * 1024) {
    const text = await file.text();
    if (/<script|on\w+=/i.test(text)) throw Error('El SVG contiene código y no se acepta.');
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(text)));
  }
  const img = await loadImage(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  let out = canvas.toDataURL('image/webp', quality);
  if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/jpeg', quality);
  // Si sigue grande, baja calidad en dos pasos.
  for (const q of [0.65, 0.5]) {
    if (out.length <= IMAGE_LIMIT) break;
    out = canvas.toDataURL(out.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg', q);
  }
  if (out.length > IMAGE_LIMIT) throw Error('La imagen sigue siendo demasiado grande. Prueba con una más pequeña.');
  return out;
}

export function pickImage(input, options) {
  return new Promise((resolve) => {
    input.value = '';
    input.onchange = async () => {
      const f = input.files[0];
      if (!f) return resolve(null);
      try {
        resolve(await compressImage(f, options));
      } catch (e) {
        resolve({error: e.message});
      }
    };
    input.click();
  });
}
