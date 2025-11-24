import React, { useState, useEffect } from 'react';
import { AppSettings, Lead, FormConfig } from '../types';
import { Loader2, CheckCircle, Lock, X, Ship } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import * as storage from '../services/storageService';
import { DEFAULT_SETTINGS, SYSTEM_CONFIG } from '../constants';

interface PublicPageProps {
  settings?: AppSettings; // Optional now, as it might load from URL params
  onCapture?: (lead: Omit<Lead, 'id' | 'capturedAt'>) => void;
  isPreview?: boolean;
  onExitPreview?: () => void;
}

export const PublicPage: React.FC<PublicPageProps> = ({ 
  settings: propSettings, 
  onCapture: propOnCapture, 
  isPreview = false, 
  onExitPreview 
}) => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({ name: '', email: '', whatsapp: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  
  // State for dynamic settings (if loading from URL)
  const [activeSettings, setActiveSettings] = useState<AppSettings>(propSettings || DEFAULT_SETTINGS);
  const [pageOwnerId, setPageOwnerId] = useState<string | null>(null);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  
  // Image Error States
  const [logoError, setLogoError] = useState(false);

  // Load settings based on URL param 'u' (User ID) and 'f' (Form ID)
  useEffect(() => {
    if (isPreview && propSettings) {
      setActiveSettings(propSettings);
      return;
    }

    const uid = searchParams.get('u');
    const fid = searchParams.get('f');

    if (uid) {
      setPageOwnerId(uid);
      const userForms = storage.getForms(uid);
      
      let targetForm: FormConfig | undefined;

      if (fid) {
        // Try to find specific form
        targetForm = userForms.find(f => f.id === fid);
      } 
      
      // Fallback: If no form ID specified or not found, use the first one
      if (!targetForm && userForms.length > 0) {
        targetForm = userForms[0];
      }

      if (targetForm) {
        setActiveSettings(targetForm);
        setActiveFormId(targetForm.id);
      }
    }
  }, [searchParams, isPreview, propSettings]);

  // Update Meta Tags for Social Media (Open Graph)
  useEffect(() => {
    if (!activeSettings) return;

    // Update Title
    document.title = activeSettings.headline;

    // Helper to update or create meta tags
    const updateMeta = (property: string, content: string) => {
      let element = document.querySelector(`meta[property="${property}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('property', property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    updateMeta('og:title', activeSettings.headline);
    updateMeta('og:description', activeSettings.subheadline);
    updateMeta('og:image', activeSettings.heroImageUrl);
    updateMeta('og:type', 'website');
    updateMeta('og:url', window.location.href);

  }, [activeSettings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) {
      alert("Em modo de pré-visualização. O lead não será salvo e o redirecionamento não ocorrerá.");
      return;
    }

    setStatus('loading');

    // Simulate API delay
    setTimeout(() => {
      // Save lead to the specific user's storage AND specific form
      if (pageOwnerId && activeFormId) {
        storage.saveLead(pageOwnerId, activeFormId, formData);
      } else if (propOnCapture) {
        propOnCapture({ ...formData, formId: activeFormId || 'unknown' });
      }
      
      setStatus('success');
      
      // Simulate background email sending
      setTimeout(() => {
        alert(`O arquivo ${activeSettings.fileName} foi enviado para ${formData.email}.`);
        
        // CORREÇÃO: Abre em nova aba para não quebrar o iframe de preview
        if (activeSettings.redirectUrl) {
            window.open(activeSettings.redirectUrl, '_blank');
        }
        
        // Reseta o formulário
        setStatus('idle');
        setFormData({ name: '', email: '', whatsapp: '' });
      }, 1000);

    }, 1500);
  };

  const buttonStyle = {
    backgroundColor: activeSettings.primaryColor,
    color: '#ffffff',
  };

  const inputStyle = {
    '--tw-ring-color': activeSettings.primaryColor,
  } as React.CSSProperties;

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative transition-colors duration-500"
      style={{ backgroundColor: activeSettings.backgroundColor, color: activeSettings.textColor }}
    >
      {/* Discreet Admin Link - Only visible in live mode */}
      {!isPreview && (
        <Link 
          to="/admin" 
          className="absolute top-5 right-5 opacity-30 hover:opacity-100 transition-opacity duration-300 p-2 z-50 bg-white/10 rounded-full"
          style={{ color: activeSettings.textColor }}
          title="Área Administrativa"
        >
          <Lock className="w-4 h-4" />
        </Link>
      )}

      {/* Exit Preview Button - Only visible in preview mode */}
      {isPreview && onExitPreview && (
        <button
          onClick={onExitPreview}
          className="absolute top-5 right-5 z-50 bg-white/90 hover:bg-white text-gray-800 px-4 py-2 rounded-full shadow-lg backdrop-blur-sm transition-all flex items-center gap-2 border border-gray-200"
        >
          <X className="w-4 h-4" /> Fechar Visualização
        </button>
      )}

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-5xl w-full flex flex-col md:flex-row relative z-10">
        
        {/* Left Side - Content & Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-8">
            {logoError ? (
               <div className="h-12 w-12 mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                 <Ship className="text-blue-500 w-6 h-6" />
               </div>
            ) : (
              <img 
                src={activeSettings.logoUrl} 
                alt="Logo" 
                className="h-12 mb-6 object-contain"
                onError={() => setLogoError(true)} 
              />
            )}
            
            <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
              {activeSettings.headline}
            </h1>
            <p className="text-lg opacity-80 leading-relaxed">
              {activeSettings.subheadline}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 opacity-70">Nome Completo</label>
              <input 
                required
                type="text" 
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all"
                style={inputStyle}
                placeholder="Seu nome"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 opacity-70">E-mail</label>
              <input 
                required
                type="email" 
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all"
                style={inputStyle}
                placeholder="seu@email.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 opacity-70">WhatsApp</label>
              <input 
                required
                type="tel" 
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all"
                style={inputStyle}
                placeholder="(00) 00000-0000"
                value={formData.whatsapp}
                onChange={e => setFormData({...formData, whatsapp: e.target.value})}
              />
            </div>

            <button 
              type="submit" 
              disabled={status !== 'idle'}
              className="w-full py-4 rounded-lg font-bold text-lg shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-6"
              style={buttonStyle}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="animate-spin" /> Enviando...
                </>
              ) : status === 'success' ? (
                <>
                  <CheckCircle /> Sucesso!
                </>
              ) : (
                activeSettings.ctaText
              )}
            </button>

            {/* BRANDING SECTION - Rodapé Polido */}
            <div className="flex justify-center mt-8">
              <Link 
                to="/admin" 
                target="_blank"
                className="inline-flex items-center gap-3 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-full border border-gray-200 transition-all duration-300 group shadow-sm hover:shadow"
                title="Crie sua página também"
              >
                <span className="text-xs text-gray-500 font-medium">Feito com</span>
                <div className="flex items-center gap-1.5 border-l border-gray-300 pl-3">
                  <img 
                    src={SYSTEM_CONFIG.logoUrl} 
                    alt={SYSTEM_CONFIG.appName} 
                    className="h-5 w-auto object-contain" 
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                  <span className="text-xs font-bold text-gray-700">{SYSTEM_CONFIG.appName}</span>
                </div>
              </Link>
            </div>

          </form>
          
          <p className="text-xs text-center mt-4 opacity-50">
            Seus dados estão seguros conosco.
          </p>
        </div>

        {/* Right Side - Image */}
        <div className="hidden md:block w-1/2 relative min-h-[500px]">
          <img 
            src={activeSettings.heroImageUrl} 
            alt="Hero" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-10"></div>
        </div>

      </div>
    </div>
  );
};