export interface Lead {
  id: string;
  formId: string; // New: Links lead to specific form
  name: string;
  email: string;
  whatsapp: string;
  capturedAt: string;
}

export interface AppSettings {
  // Content
  headline: string;
  subheadline: string;
  ctaText: string;
  logoUrl: string;
  heroImageUrl: string;
  
  // Styles
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  
  // Logic
  redirectUrl: string;
  fileName: string; // Simulated file name
}

// New Interface for a Form Instance
export interface FormConfig extends AppSettings {
  id: string;
  title: string; // Internal name for the admin to identify the form
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  // Password removed for security in frontend state
  createdAt: string;
}
