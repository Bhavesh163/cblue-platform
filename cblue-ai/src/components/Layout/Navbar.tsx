import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../hooks/useLanguage';
import { Menu, X, Globe } from 'lucide-react';

export default function Navbar({ setPage }: { setPage: (page: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const { language, setLanguage, t } = useLanguage();

    const navItems = [
        { id: 'home', label: 'Home' },
        { id: 'solutions', label: 'Solutions' },
        { id: 'reference', label: 'Reference' },
        { id: 'support', label: 'Support' },
        { id: 'about', label: 'About Us' },
    ];

    return (

        <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md shadow-sm border-b border-sky-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => setPage('home')}>
                        <img
                            src="./images/logo.jpg"
                            alt="Cblue Logo"
                            className="h-12 w-auto object-contain"
                        />
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex space-x-8 items-center">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setPage(item.id)}
                                className="text-gray-600 hover:text-sky-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                            >
                                {t(`nav.${item.id}`)}
                            </button>
                        ))}

                        {/* Language Switcher */}
                        <div className="relative ml-4">
                            <button
                                onClick={() => setLangOpen(!langOpen)}
                                className="flex items-center space-x-1 text-gray-600 hover:text-sky-600 focus:outline-none"
                            >
                                <Globe className="w-5 h-5" />
                                <span className="uppercase text-sm font-bold">{language}</span>
                            </button>

                            <AnimatePresence>
                                {langOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute right-0 mt-2 w-24 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden"
                                    >
                                        {[language, ...(['en', 'th', 'zh'] as const).filter(l => l !== language)].map((lang) => (
                                            <button
                                                key={lang}
                                                onClick={() => {
                                                    setLanguage(lang);
                                                    setLangOpen(false);
                                                }}
                                                className={`block w-full text-left px-4 py-2 text-sm hover:bg-sky-50 transition-colors
                          ${language === lang ? 'bg-sky-50 text-sky-600 font-bold' : 'text-gray-700'}
                        `}
                                            >
                                                {lang === 'en' ? 'EN' : lang === 'th' ? 'TH' : '中文'}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-gray-600 hover:text-sky-600 focus:outline-none"
                        >
                            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="md:hidden bg-white border-t border-sky-100 overflow-hidden"
                    >
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setPage(item.id);
                                        setIsOpen(false);
                                    }}
                                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                                >
                                    {t(`nav.${item.id}`)}
                                </button>
                            ))}

                            {/* Mobile Language Switcher */}
                            <div className="flex space-x-4 px-3 py-2 border-t border-gray-100 mt-2">
                                {(['en', 'th', 'zh'] as const).map((lang) => (
                                    <button
                                        key={lang}
                                        onClick={() => setLanguage(lang)}
                                        className={`text-sm font-bold px-3 py-1 rounded-full border ${language === lang
                                            ? 'bg-sky-100 border-sky-200 text-sky-700'
                                            : 'border-gray-200 text-gray-500'
                                            }`}
                                    >
                                        {lang.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
