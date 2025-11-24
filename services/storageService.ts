import { AppSettings, Lead, User, FormConfig } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

const KEYS = {
  USERS: 'saas_users',
  CURRENT_SESSION: 'saas_session_uid'
};

// Internal interface to handle passwords in storage only
interface StoredUser extends User {
  password: string;
}

// Helper to generate keys specific to a user
const getUserKey = (uid: string, type: 'settings' | 'leads' | 'forms') => `saas_${uid}_${type}`;

// Helper to safely parse JSON without crashing
const safeParse = <T>(json: string | null, fallback: T): T => {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch (e) {
    console.error("Error parsing storage data:", e);
    return fallback;
  }
};

// --- AUTH & USERS ---

// Internal use only
const getStoredUsers = (): StoredUser[] => {
  return safeParse(localStorage.getItem(KEYS.USERS), []);
};

export const registerUser = (name: string, email: string, password: string): User | null => {
  const users = getStoredUsers();
  if (users.find(u => u.email === email)) {
    return null; // User already exists
  }

  const newUser: StoredUser = {
    id: crypto.randomUUID(),
    name,
    email,
    password, // Saved internally
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  
  // Initialize default form for this user
  createForm(newUser.id, "Meu Primeiro Formulário");

  // Return sanitized user (without password)
  const { password: _, ...sanitizedUser } = newUser;
  return sanitizedUser;
};

export const loginUser = (email: string, pass: string): User | null => {
  const users = getStoredUsers();
  const user = users.find(u => u.email === email && u.password === pass);
  if (user) {
    localStorage.setItem(KEYS.CURRENT_SESSION, user.id);
    // Migration check on login
    migrateLegacySettings(user.id);
    
    // Return sanitized user
    const { password: _, ...sanitizedUser } = user;
    return sanitizedUser;
  }
  return null;
};

export const logoutUser = (): void => {
  localStorage.removeItem(KEYS.CURRENT_SESSION);
};

export const getCurrentUser = (): User | null => {
  const uid = localStorage.getItem(KEYS.CURRENT_SESSION);
  if (!uid) return null;
  const users = getStoredUsers();
  const user = users.find(u => u.id === uid);
  
  if (user) {
    const { password: _, ...sanitizedUser } = user;
    return sanitizedUser;
  }
  return null;
};

// --- FORMS MANAGEMENT ---

// Migration: If user has old 'settings' key but no 'forms' key, create a form from it.
export const migrateLegacySettings = (userId: string) => {
  const formsKey = getUserKey(userId, 'forms');
  const oldSettingsKey = getUserKey(userId, 'settings');
  
  const existingForms = localStorage.getItem(formsKey);
  
  if (!existingForms) {
    const oldSettings = localStorage.getItem(oldSettingsKey);
    const settingsToUse = safeParse(oldSettings, DEFAULT_SETTINGS);
    
    const initialForm: FormConfig = {
      ...settingsToUse,
      id: crypto.randomUUID(),
      title: "Formulário Padrão (Migrado)",
      createdAt: new Date().toISOString()
    };
    
    localStorage.setItem(formsKey, JSON.stringify([initialForm]));
  }
};

export const getForms = (userId: string): FormConfig[] => {
  return safeParse(localStorage.getItem(getUserKey(userId, 'forms')), []);
};

export const getFormById = (userId: string, formId: string): FormConfig | undefined => {
  const forms = getForms(userId);
  return forms.find(f => f.id === formId);
};

export const createForm = (userId: string, title: string): FormConfig => {
  const forms = getForms(userId);
  const newForm: FormConfig = {
    ...DEFAULT_SETTINGS,
    id: crypto.randomUUID(),
    title: title,
    createdAt: new Date().toISOString()
  };
  
  forms.push(newForm);
  localStorage.setItem(getUserKey(userId, 'forms'), JSON.stringify(forms));
  return newForm;
};

export const updateForm = (userId: string, updatedForm: FormConfig): void => {
  const forms = getForms(userId);
  const index = forms.findIndex(f => f.id === updatedForm.id);
  if (index !== -1) {
    forms[index] = updatedForm;
    localStorage.setItem(getUserKey(userId, 'forms'), JSON.stringify(forms));
  }
};

export const deleteForm = (userId: string, formId: string): void => {
  // 1. Remove the form from the list
  const forms = getForms(userId);
  const updatedForms = forms.filter(f => f.id !== formId);
  localStorage.setItem(getUserKey(userId, 'forms'), JSON.stringify(updatedForms));
  
  // 2. MIGRATE LEADS: Do not delete them. Move them to "consolidated" folder.
  const allLeads = getAllLeads(userId);
  const updatedLeads = allLeads.map(lead => {
    if (lead.formId === formId) {
      return { ...lead, formId: 'consolidated' };
    }
    return lead;
  });
  
  localStorage.setItem(getUserKey(userId, 'leads'), JSON.stringify(updatedLeads));
};

// --- LEADS ---

// Get ALL leads for a user (across all forms)
export const getAllLeads = (userId: string): Lead[] => {
  const stored = localStorage.getItem(getUserKey(userId, 'leads'));
  let leads: Lead[] = safeParse(stored, []);
  
  // Legacy migration for leads without formId
  const forms = getForms(userId);
  if (forms.length > 0 && leads.some(l => !l.formId)) {
    const defaultFormId = forms[0].id;
    leads = leads.map(l => l.formId ? l : { ...l, formId: defaultFormId });
    localStorage.setItem(getUserKey(userId, 'leads'), JSON.stringify(leads));
  }
  
  return leads;
};

export const saveLead = (userId: string, formId: string, leadData: Omit<Lead, 'id' | 'capturedAt' | 'formId'>): void => {
  const currentLeads = getAllLeads(userId);
  const newLead: Lead = {
    ...leadData,
    id: crypto.randomUUID(),
    formId: formId,
    capturedAt: new Date().toISOString()
  };
  const updatedLeads = [newLead, ...currentLeads];
  localStorage.setItem(getUserKey(userId, 'leads'), JSON.stringify(updatedLeads));
};

export const updateLead = (userId: string, updatedLead: Lead): void => {
  const currentLeads = getAllLeads(userId);
  const index = currentLeads.findIndex(l => l.id === updatedLead.id);
  if (index !== -1) {
    currentLeads[index] = updatedLead;
    localStorage.setItem(getUserKey(userId, 'leads'), JSON.stringify(currentLeads));
  }
};

export const deleteLead = (userId: string, leadId: string): void => {
  const currentLeads = getAllLeads(userId);
  const filteredLeads = currentLeads.filter(l => l.id !== leadId);
  localStorage.setItem(getUserKey(userId, 'leads'), JSON.stringify(filteredLeads));
};

export const deleteMultipleLeads = (userId: string, leadIds: string[]): void => {
  const currentLeads = getAllLeads(userId);
  const filteredLeads = currentLeads.filter(l => !leadIds.includes(l.id));
  localStorage.setItem(getUserKey(userId, 'leads'), JSON.stringify(filteredLeads));
};

// --- INITIALIZATION ---

export const initializeStorage = () => {
  const users = getStoredUsers();
  const adminEmail = "doutortao@gmail.com.br";
  
  // Seed admin if not exists
  if (!users.find(u => u.email === adminEmail)) {
    registerUser("Administrador", adminEmail, "admin123");
    console.log("Admin user seeded.");
  }
};