import { motion } from 'framer-motion';
import { useLanguage } from '../../hooks/useLanguage';
import { translations } from '../../data/content';


export default function About() {
    const { t, language } = useLanguage();
    const about = translations.about;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen pt-24 pb-12"
        >
            {/* Introduction Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">{t('nav.about')}</h2>
                    <div className="w-24 h-1 bg-sky-500 mx-auto rounded-full"></div>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="prose prose-lg text-gray-600"
                    >
                        <h3 className="text-3xl font-bold text-gray-800 mb-6">
                            {about.intro.title[language] || about.intro.title['en']}
                        </h3>
                        <div className="space-y-4 leading-relaxed whitespace-pre-line text-justify">
                            {about.intro.text[language] || about.intro.text['en']}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="relative"
                    >
                        <div className="absolute inset-0 bg-sky-200 rounded-3xl transform rotate-3 scale-95 opacity-50 blur-lg"></div>
                        <img
                            src={about.intro.image}
                            alt="About C Blue"
                            className="relative rounded-3xl shadow-2xl w-full object-cover h-[500px]"
                        />
                    </motion.div>
                </div>
            </section>


            {/* Mission Section */}
            <section className="bg-sky-900 text-white py-24 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <img src={about.mission.image} className="w-full h-full object-cover" />
                </div>
                <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                    <motion.div
                        initial={{ y: 30, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        <h3 className="text-3xl font-bold mb-8 text-sky-300">
                            {about.mission.title[language] || about.mission.title['en']}
                        </h3>
                        <p className="text-xl leading-8 font-light text-sky-50">
                            {about.mission.text[language] || about.mission.text['en']}
                        </p>
                        <div className="mt-12 flex justify-center">
                            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
                                <p className="font-mono text-sky-200">"Head for green & of course blue"</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        </motion.div>
    );
}
