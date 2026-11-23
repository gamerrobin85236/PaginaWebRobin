// Datos generales de la tienda. Edita aquí nombre, contacto y redes.
export const STORE_CONFIG = {
  developer: 'CorApps', // empresa que desarrolló la página
  name: 'Gamer Robin',
  tagline: 'Tienda oficial · Santa Rosa de Cabal',
  whatsappNumber: '573103750355', // sin "+" ni espacios
  // Líneas de atención que se muestran al tocar el botón flotante de WhatsApp (número sin "+" ni espacios).
  supportLines: [
    { label: 'Línea de atención principal', number: '573103750355', display: '310 375 0355' },
    { label: 'Línea de atención secundaria', number: '573235762647', display: '323 576 2647' },
  ],
  whatsappDefaultMessage: 'Hola, quiero más información sobre los productos de la tienda.',
  address: 'Calle 13 # 11-31, Santa Rosa de Cabal, Risaralda',
  phoneDisplay: '+57 310 3750355',
  socials: {
    instagram: 'https://www.instagram.com/robiin.valeencia',
    facebook: 'https://www.facebook.com/Robintiendavirtual',
  },
} as const
