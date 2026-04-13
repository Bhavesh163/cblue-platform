import { motion } from 'framer-motion';
import { useLanguage } from '../../hooks/useLanguage';
import { translations } from '../../data/content';

export default function Home() {
    const { t } = useLanguage();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.3 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            className="pt-20 pb-12"
        >
            {/* Hero Section */}
            <div className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/images/swimming pool.jpg"
                        alt="Hero Background"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-blue-900/40"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 max-w-5xl mx-auto px-4 text-center text-white">
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-5xl md:text-7xl font-bold mb-8 tracking-tight font-sans"
                    >
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-white">
                            Cblue
                        </span> Thailand
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-xl md:text-2xl text-gray-200 leading-relaxed max-w-4xl mx-auto"
                    >
                        {t('home.hero.text')}
                    </motion.p>
                </div>

                {/* Scroll Indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                    className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-white"
                >
                    <div className="flex flex-col items-center animate-bounce">
                        <span className="text-sm mb-2 opacity-70">Scroll</span>
                        <div className="w-1 h-12 bg-gradient-to-b from-sky-400 to-transparent rounded-full"></div>
                    </div>
                </motion.div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24 space-y-32">
                {translations.home.sections.map((section, index) => (
                    <motion.div
                        key={index}
                        variants={itemVariants}
                        className={`grid md:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'md:flex-row-reverse' : ''
                            }`}
                    >
                        {/* Image Side */}
                        <div className={`relative group ${index % 2 === 1 ? 'order-1 md:order-2' : ''}`}>
                            <div className="absolute -inset-4 bg-blue-100 rounded-xl opacity-50 group-hover:opacity-100 transition duration-500 blur-lg"></div>
                            <img
                                src={section.image.replace(/^\./, '')} // Ensure path is absolute-like relative to root
                                alt={t(`home.sections.${index}.title`)}
                                className="relative rounded-lg shadow-2xl transform transition hover:-translate-y-2 duration-500 w-full object-cover aspect-video"
                            />
                        </div>

                        {/* Content Side */}
                        <div className={`space-y-6 ${index % 2 === 1 ? 'order-2 md:order-1' : ''}`}>
                            <h2 className="text-3xl font-bold text-gray-900 border-l-4 border-emerald-500 pl-4">
                                {t(`home.sections.${index}.title`)}
                            </h2>
                            <div className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">
                                {t(`home.sections.${index}.content`)}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
