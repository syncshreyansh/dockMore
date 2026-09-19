import React, { useState } from 'react';
import { X, HelpCircle, ChevronDown, Send, MessageSquare, ShieldCheck, Mail } from 'lucide-react';
import SlideUpModal from './SlideUpModal';
import PillButton from './PillButton';
import { useToast } from '../../context/ToastContext';

export default function HelpSupportModal({ isOpen, onClose }) {
  const { showToast } = useToast();
  const [openFaq, setOpenFaq] = useState(null);
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  const faqs = [
    {
      q: 'How does dockMore connect to my clouds?',
      a: 'dockMore uses official OAuth 2.0 protocols directly with providers (Google Drive, Microsoft OneDrive, Dropbox, MEGA). Your tokens are encrypted and your credentials never touch our servers.',
    },
    {
      q: 'How do cloud-to-cloud transfers work?',
      a: 'dockMore orchestrates direct proxy streams between cloud providers. Files migrate from source to destination without downloading to your local device bandwidth.',
    },
    {
      q: 'Can I connect multiple accounts from the same provider?',
      a: 'Yes! dockMore supports connecting multiple Google Drive, OneDrive, or Dropbox accounts simultaneously (e.g. personal + work drives).',
    },
    {
      q: 'Is my data encrypted during transfers?',
      a: 'All data in transit is encrypted using TLS 1.3 with optional end-to-end client-side vault encryption before streaming.',
    },
  ];

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!contactSubject.trim() || !contactMessage.trim()) {
      showToast('Please fill out all fields.', 'error');
      return;
    }

    showToast('Support request sent! Our team will respond shortly.', 'success');
    setContactSubject('');
    setContactMessage('');
    onClose();
  };

  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="bg-surface rounded-3xl p-6 sm:p-8 max-w-lg w-full flex flex-col gap-6 relative shadow-2xl max-h-[85vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-track/40 flex items-center justify-center text-ink shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink">Help & Support</h3>
            <p className="text-xs text-muted mt-0.5">Frequently asked questions and support desk</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="group p-1.5 rounded-full hover:bg-black/5 text-muted hover:text-ink transition-colors duration-150 shrink-0"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
        </button>
      </div>

      
      <div className="flex flex-col gap-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted font-sans">
          Frequently Asked Questions
        </h4>
        <div className="flex flex-col gap-2">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-150"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-3.5 flex items-center justify-between text-left gap-2 text-xs font-bold text-ink hover:bg-black/5"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted transition-transform duration-150 shrink-0 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-3.5 pb-3.5 pt-0 text-xs text-muted leading-relaxed mt-1">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      
      <form onSubmit={handleSendMessage} className="flex flex-col gap-3.5 pt-2" noValidate>
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-ink" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted font-sans">
            Contact Support
          </h4>
        </div>

        <div>
          <input
            type="text"
            placeholder="Subject (e.g. Issue with Mega sync)"
            value={contactSubject}
            onChange={(e) => setContactSubject(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-white shadow-sm text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink/20"
          />
        </div>

        <div>
          <textarea
            rows={3}
            placeholder="Describe your issue or feedback in detail..."
            value={contactMessage}
            onChange={(e) => setContactMessage(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-white shadow-sm text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink/20 resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <Mail className="w-3.5 h-3.5" />
            <span>Response within 24 hours</span>
          </div>

          <PillButton variant="solid" size="sm" type="submit" icon={Send}>
            Send Message
          </PillButton>
        </div>
      </form>
    </SlideUpModal>
  );
}
