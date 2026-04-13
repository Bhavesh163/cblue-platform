import { motion } from 'framer-motion';
import { useLanguage } from '../../hooks/useLanguage';
import { translations } from '../../data/content';

export default function Reference() {
    const { t, language } = useLanguage();
    const references = translations.reference;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
        >
            <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">{t('nav.reference')}</h2>
                <div className="w-24 h-1 bg-sky-500 mx-auto rounded-full"></div>
            </div>

            <div className="space-y-20">
                {references.map((project, index) => (
                    <motion.div
                        key={index}
                        variants={itemVariants}
                        className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300`}
                    >
                        <div className="lg:w-1/2 h-80 lg:h-auto overflow-hidden">
                            <img
                                src={project.image}
                                alt={project.title[language] || project.title['en']}
                                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                            />
                        </div>

                        <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
                            <h3 className="text-3xl font-bold text-gray-900 mb-6">
                                {project.title[language] || project.title['en']}
                            </h3>

                            <div className="space-y-4 mb-6">
                                {project.details.map((detail, idx) => (
                                    <div key={idx} className="flex border-b border-gray-100 pb-2">
                                        <span className="font-semibold text-sky-600 w-32 shrink-0">
                                            {detail.label[language] || detail.label['en']}
                                        </span>
                                        <span className="text-gray-700">
                                            {detail.value[language] || detail.value['en']}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {project.description && (
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <p className="text-gray-600 leading-relaxed italic">
                                        "{project.description[language] || project.description['en']}"
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
