import { motion } from 'framer-motion';
import { useLanguage } from '../../hooks/useLanguage';
import { translations } from '../../data/content';

export default function Products() {
    const { t, language } = useLanguage();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    // Helper to get products list safely
    const products = translations.products;

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
        >
            <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">{t('nav.solutions')}</h2>
                <div className="w-24 h-1 bg-sky-500 mx-auto rounded-full"></div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map((product: any, index: number) => (
                    <motion.div
                        key={index}
                        variants={itemVariants}
                        className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300 transform hover:-translate-y-1"
                    >
                        <div className="h-48 overflow-hidden">
                            <img
                                src={product.image}
                                alt={product.title[language] || product.title['en']}
                                className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500"
                            />
                        </div>
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                {product.title[language] || product.title['en']}
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                {product.description[language] || product.description['en']}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
