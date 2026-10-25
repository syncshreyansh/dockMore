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
      a: 'Choose Google Drive from Cloud Accounts and sign in with Google. Your connected account tokens are encrypted on the server. Other providers are not available yet.',
    },
    {
      q: 'How do cloud-to-cloud transfers work?',
      a: 'Choose a file and a second connected Google Drive account. The server copies the file between those accounts.',
    },
    {
      q: 'Can I connect multiple accounts from the same provider?',
      a: 'Yes. You can connect more than one Google Drive account, including personal and work accounts.',
    },
    {
      q: 'Is my data encrypted during transfers?',
      a: 'Google Drive connections use HTTPS. Connected account tokens are stored encrypted. Keep your deployed DockMore site and API on HTTPS too.',
    },
  ];

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!contactSubject.trim() || !contactMessage.trim()) {
      showToast('Enter a subject and a message', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(`${contactSubject.trim()}\n\n${contactMessage.trim()}`);
      showToast('Message copied. Share it with your support contact.', 'success');
    } catch {
      showToast('Could not copy the message. Select and copy the text instead.', 'error');
    }
  };

  return (
    <SlideUpModal
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="bg-surface rounded-figma p-6 sm:p-8 max-w-lg w-full flex flex-col gap-6 relative shadow-menu max-h-[85vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-track/40 flex items-center justify-center text-ink shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink">Help & Support</h3>
            <p className="text-xs text-muted mt-0.5">Answers to common questions.</p>
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
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted font-sans">
          Frequently Asked Questions
        </h4>
        <div className="flex flex-col gap-2">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="bg-white rounded-figma shadow-sm overflow-hidden transition-all duration-150"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-3.5 flex items-center justify-between text-left gap-2 text-xs font-semibold text-ink hover:bg-black/5"
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
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted font-sans">
            Prepare a Support Message
          </h4>
        </div>

        <div>
          <input
            type="text"
            aria-label="Message subject"
            placeholder="Subject"
            value={contactSubject}
            onChange={(e) => setContactSubject(e.target.value)}
            className="w-full px-3.5 py-2 rounded-figma bg-white shadow-sm text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink/20"
          />
        </div>

        <div>
          <textarea
            rows={3}
            aria-label="Support message"
            placeholder="What happened?"
            value={contactMessage}
            onChange={(e) => setContactMessage(e.target.value)}
            className="w-full px-3.5 py-2 rounded-figma bg-white shadow-sm text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink/20 resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <Mail className="w-3.5 h-3.5" />
            <span>Copy and share with support</span>
          </div>

          <PillButton variant="solid" size="sm" type="submit" icon={Send}>
            Copy Message
          </PillButton>
        </div>
      </form>
    </SlideUpModal>
  );
}
