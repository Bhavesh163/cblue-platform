import { useState, useRef, useEffect, FormEvent } from 'react';
import { ChatService } from '../../services/ChatService';
import { MessageSquare, X, Send, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Message = {
    type: 'user' | 'bot';
    text: string;
};

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);



    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, isOpen]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { type: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            // Use local ChatService instead of external API
            const responseText = await ChatService.sendMessage(userMsg);
            setMessages(prev => [...prev, { type: 'bot', text: responseText }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { type: 'bot', text: 'เกิดข้อผิดพลาด กรุณาติดต่อ: cblue.thailand@gmail.com' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-5 right-5 z-50 font-sans">
            {/* Chat Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(true)}
                className={`w-[60px] h-[60px] rounded-full bg-gradient-to-r from-sky-600 to-blue-800 text-white shadow-lg flex items-center justify-center cursor-pointer relative z-50 ${isOpen ? 'hidden' : 'flex'
                    }`}
            >
                {/* Pulse Effect */}
                <span className="absolute w-full h-full rounded-full bg-sky-400 opacity-75 animate-ping"></span>
                <MessageSquare size={28} fill="white" className="relative z-10" />
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 50 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="fixed bottom-[90px] right-5 w-[320px] h-[500px] bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden sm:right-5 sm:bottom-20 max-w-[calc(100vw-20px)] sm:w-[380px] sm:h-[600px]"
                        style={{
                            boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
                        }}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-sky-600 to-blue-800 text-white p-4 flex justify-between items-center min-h-[60px] shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="w-[35px] h-[35px] bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-white/30">
                                    <img src="/customer-support-emoji.png" alt="AI" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="m-0 text-base font-bold tracking-wide">Cblue Assistant</h3>
                                    <div className="flex items-center gap-1.5 opacity-90">
                                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                        <small className="text-[11px] font-medium">Online</small>
                                    </div>
                                </div>
                            </div>
                            <motion.button
                                whileHover={{ rotate: 90 }}
                                onClick={() => setIsOpen(false)}
                                className="text-white bg-transparent border-none cursor-pointer p-1 rounded-full hover:bg-white/20 transition-colors"
                            >
                                <X size={20} />
                            </motion.button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 scroll-smooth">
                            {messages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className={`flex gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm ${msg.type === 'user' ? 'bg-sky-100' : 'bg-white border border-gray-100'
                                        }`}>
                                        {msg.type === 'user' ? <User size={16} className="text-sky-700" /> : <img src="/customer-support-emoji.png" alt="AI" className="w-full h-full object-cover" />}
                                    </div>
                                    <div className={`p-3.5 rounded-2xl max-w-[240px] text-sm leading-relaxed shadow-sm ${msg.type === 'user'
                                        ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-tr-none'
                                        : 'bg-white border border-gray-100 text-slate-700 rounded-tl-none'
                                        }`}>
                                        {msg.text.split('\n').map((line, i) => (
                                            <span key={i} className="block min-h-[1.2em]">
                                                {line}
                                            </span>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex gap-3"
                                >
                                    <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                                        <img src="/customer-support-emoji.png" alt="AI" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-4 rounded-2xl rounded-tl-none bg-white border border-gray-100 shadow-sm flex items-center gap-1.5 max-w-[100px]">
                                        {[0, 1, 2].map((i) => (
                                            <motion.div
                                                key={i}
                                                className="w-2 h-2 rounded-full bg-sky-400"
                                                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                                                transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100">
                            <form onSubmit={handleSubmit} className="flex gap-2 relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your message..."
                                    className="flex-1 pl-5 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-full outline-none text-sm text-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all placeholder:text-slate-400"
                                />
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    type="submit"
                                    disabled={!input.trim()}
                                    className={`w-11 h-11 rounded-full flex items-center justify-center border-none shadow-md transition-colors ${input.trim()
                                            ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white cursor-pointer'
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    <Send size={18} className={input.trim() ? "ml-0.5" : ""} />
                                </motion.button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
