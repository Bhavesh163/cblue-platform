import { LanguageProvider } from './hooks/useLanguage';
import Navbar from './components/Layout/Navbar';
import Home from './components/Sections/Home';
import Products from './components/Sections/Products';
import Reference from './components/Sections/Reference';
import Support from './components/Sections/Support';
import About from './components/Sections/About';
import Chatbot from './components/Features/Chatbot';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';

function AppContent() {
    const [page, setPage] = useState('home');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
            <Navbar setPage={setPage} />

            <main>
                <AnimatePresence mode="wait">
                    {page === 'home' && <Home key="home" />}
                    {page === 'solutions' && <Products key="products" />}
                    {page === 'reference' && <Reference key="reference" />}
                    {page === 'support' && <Support key="Get Project Team" />}
                    {page === 'about' && <About key="about" />}
                </AnimatePresence>
            </main>

            <Chatbot />

            <footer className="bg-gray-900 text-white py-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-gray-400">© 2025 Cblue. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

function App() {
    return (
        <LanguageProvider>
            <AppContent />
        </LanguageProvider>
    )
}

export default App
