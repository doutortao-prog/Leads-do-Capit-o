import { AppSettings } from './types';

export const SYSTEM_CONFIG = {
  appName: "Leads do Capitão",
  // Use absolute path to ensure it loads from the public root regardless of current route
  logoUrl: "/logo.png" 
};

export const DEFAULT_SETTINGS: AppSettings = {
  headline: "Baixe nosso E-book Exclusivo Agora!",
  subheadline: "Descubra os segredos para alavancar seu negócio com nosso material gratuito. Preencha os dados para receber.",
  ctaText: "Receber Arquivo",
  logoUrl: "/logo.png", // Updated to absolute path
  heroImageUrl: "https://picsum.photos/800/600",
  primaryColor: "#2563eb", // blue-600
  backgroundColor: "#f3f4f6", // gray-100
  textColor: "#1f2937", // gray-800
  redirectUrl: "https://google.com",
  fileName: "ebook-estrategico.pdf"
};