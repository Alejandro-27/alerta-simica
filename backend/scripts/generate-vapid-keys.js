/**
 * Genera un par de llaves VAPID para Web Push.
 * Uso: npm run vapid:generate
 * Copia la salida en VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY de tu .env
 */
const webpush = require('web-push');

const keys = webpush.generateVAPIDKeys();
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('VAPID_SUBJECT=mailto:admin@tudominio.com');
console.log('');
console.log('Copia estas llaves en el archivo .env del backend.');
console.log('La llave privada NUNCA debe exponerse al frontend ni subirse a Git.');
