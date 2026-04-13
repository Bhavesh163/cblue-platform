export type Language = 'en' | 'th' | 'zh';

export const translations = {
    nav: {
        home: { en: 'Home', th: 'หน้าแรก', zh: '首页' },
        solutions: { en: 'Solutions', th: 'บริการ', zh: '解决方案' },
        reference: { en: 'Real Estate Services', th: 'ซื้อ/เช่าบ้าน', zh: '参考' },
        support: { en: 'Get Project Team/Support', th: 'หาช่าง/ติดต่อเรา', zh: '项目团队/支持' },
        about: { en: 'About Us', th: 'เกี่ยวกับเรา', zh: '关于我们' },
    },
    home: {
        hero: {
            image: './images/swimming pool.jpg',
            text: {
                en: "As the world confronts the pressing challenges of climate change, technological innovation, and urbanization, the way we live, build, and interact with our environment will undergo significant transformations. Over the next few decades, we will witness innovative changes across multiple sectors as humanity strives to balance sustainability with the needs of a growing global population. Three critical pillars of this evolution include the environment, sustainable building design, and decarbonization efforts.",
                th: "เมื่อโลกต้องเผชิญกับความท้าทายที่ยิ่งใหญ่จากการเปลี่ยนแปลงสภาพภูมิอากาศ นวัตกรรมทางเทคโนโลยี และการขยายตัวของเมือง วิธีที่เราจะใช้ชีวิต ก่อสร้าง และเชื่อมต่อกับสิ่งแวดล้อมจะเปลี่ยนแปลงอย่างมหาศาล ในทศวรรษต่อไป เราจะได้เห็นการเปลี่ยนแปลงเชิงนวัตกรรมในหลายภาคส่วน ในขณะที่มนุษยชาติกำลังพยายามหาทางรักษาสมดุลระหว่างความยั่งยืนและความต้องการของประชากรโลกที่เพิ่มขึ้น โดยมีสามเสาหลักสำคัญ ได้แก่ สิ่งแวดล้อม การออกแบบอาคารที่ยั่งยืน และการลดการปล่อยคาร์บอน",
                zh: "当世界朝着由气候变化塑造的不确定未来飞驰时，技术创新、日益增长的城市化、我们的互动方式与我们的环境、住在我们的家中和设计我们的建筑一起设置急剧进化。未来几十年将见证破土动工随着人类努力平衡，多个领域的转型满足全球不断增长的人口需求的生态可持续性。这种演变的核心是三个关键因素：环境、栖息地、建筑和住房设计、楼宇自动化系统，以及追求脱碳。"
            }
        },
        sections: [
            {
                title: {
                    en: "The Future of the World Environment & Habitat",
                    th: "อนาคตของสิ่งแวดล้อมโลกและที่อยู่อาศัย",
                    zh: "世界环境与人居的未来"
                },
                image: "./images/pexels-asadphoto-457882.jpg",
                content: {
                    en: "The environment will remain at the center of global concerns as the impacts of climate change become more severe. Rising sea levels, more frequent natural disasters, and shifting weather patterns will force us to rethink how we use natural resources and design cities. Green infrastructure will become a vital strategy for urban planning, especially in coastal areas vulnerable to floods. Solutions like wetlands, mangroves, and drought-resistant landscaping will enhance climate resilience.\n\nIn urban areas, we will see a shift towards sustainable cities that blend natural and built environments. Urban forests, green roofs, and community gardens will become common features, bringing nature into city life. In this future, buildings will act as ecosystems, offering more than just shelter. Homes and workplaces will incorporate features like airpurifying plants, water filtration systems, and even urban farming spaces. These integrated systems will make sustainability an inherent part of daily life.",
                    th: "สิ่งแวดล้อมจะยังคงเป็นศูนย์กลางของความกังวลทั่วโลก เมื่อผลกระทบของการเปลี่ยนแปลงสภาพภูมิอากาศรุนแรงขึ้น ระดับน้ำทะเลที่เพิ่มสูงขึ้น ภัยพิบัติทางธรรมชาติที่บ่อยขึ้น และสภาพอากาศที่แปรปรวน จะทำให้เราต้องคิดทบทวนการใช้ทรัพยากรธรรมชาติและการออกแบบเมืองใหม่การใช้โครงสร้างพื้นฐานสีเขียวจะกลายเป็นกลยุทธ์สำคัญในการวางผังเมือง โดยเฉพาะในพื้นที่ชายฝั่งที่เสี่ยงต่ออุทกภัย โซลูชั่นต่างๆ เช่น พื้นที่ชุ่มน้ำ ป่าชายเลน และการจัดสวนที่ทนต่อภัยแล้ง จะช่วยเพิ่มความยืดหยุ่นต่อสภาพอากาศ\n\nในเขตเมืองเราจะเห็นการเปลี่ยนแปลงไปสู่เมืองที่ยั่งยืนที่ผสมผสานสิ่งแวดล้อมธรรมชาติและสิ่งปลูกสร้างเข้าด้วยกัน ป่าในเมือง หลังคาสีเขียว และสวนชุมชน จะเป็นฟีเจอร์ที่พบได้ทั่วไป นำธรรมชาติเข้ามาใกล้ชีวิตประจำวันของคนเมืองมากขึ้นในอนาคต อาคารต่างๆ จะเป็นเหมือนระบบนิเวศที่มากกว่าการเป็นที่พักอาศัย อาคารและสถานที่ทำงานจะรวมเอาพืชที่ช่วยฟอกอากาศ ระบบกรองน้ำ และพื้นที่เพาะปลูกในเมือง เข้ามาเป็นส่วนหนึ่ง สิ่งเหล่านี้จะทำให้การใช้ชีวิตอย่างยั่งยืนเป็นสิ่งที่สามารถทำได้จริงในทุกๆวัน",
                    zh: "由于人类活动，我们的环境已经承受了前所未有的压力，在未来几年仍将是全球关 注的核心问题。作为影响随着气候变化的加剧，我们将被迫重新思考我们如何利用 和保护自然资源。旨在保护生物多样性的举措，恢复退化的生态系统和重新野化城 市空间将塑造我们如何处理未来的土地利用和城市规划。\n\n面对海平面上升，环境适应将至关重要。更频繁的自然灾害和不断变化的天气模式。海岸的城市将采取策略来保护自己免受洪水的影响，包括整合湿地和红树林等绿色基础设施，同时内陆地区将实施抗旱园林绿化和城市农场提高食物的弹性。随着极端气候导致栖息地发生变化，保护工作将优先创建允许物种迁移并适应他们的新环境。"
                }
            },
            {
                title: {
                    en: "The Future of Building & Housing Design",
                    th: "อนาคตของการออกแบบอาคารและที่อยู่อาศัย",
                    zh: "的未来建筑和住房"
                },
                image: "./images/image11.jpg",
                content: {
                    en: "The next era of building design will be driven by green architecture, flexibility, and resilience. Future buildings will aim to minimize their environmental impact through the use of sustainable materials such as bamboo, recycled steel, and mycelium-based composites.\n\nKey features of tomorrow's sustainable homes will include:\n• Solar panels and rainwater harvesting systems.\n• Energy-efficient insulation and natural ventilation.\n• Passive solar heating to reduce energy consumption.\n\nAs urban populations continue to rise, modular and prefabricated housing will offer space-efficient solutions for compact living. These adaptive homes will be designed to expand or contract based on changing needs. In disaster-prone areas, buildings will incorporate resilient design elements, capable of withstanding floods, earthquakes, and extreme weather events.",
                    th: "ยุคถัดไปของการออกแบบอาคารจะขับเคลื่อนโดยสถาปัตยกรรมสีเขียว ความยืดหยุ่น และความแข็งแรงต่อการเปลี่ยนแปลงทางธรรมชาติ อาคารในอนาคตจะมุ่งลดผลกระทบต่อสิ่งแวดล้อมผ่านการใช้วัสดุที่ยั่งยืน เช่น ไม้ไผ่ เหล็กรีไซเคิล และคอมโพสิตจากเห็ดรา\n\nคุณสมบัติสำคัญของบ้านที่ยั่งยืนในอนาคตจะรวมถึง:\n• แผงโซลาร์เซลล์และระบบเก็บน้ำฝน\n• ฉนวนกันความร้อนที่มีประสิทธิภาพและการระบายอากาศตามธรรมชาติ\n• ระบบทำความร้อนจากพลังงานแสงอาทิตย์ที่ช่วยลดการใช้พลังงาน\n\nเนื่องจากประชากรในเมืองยังคงเพิ่มขึ้น การใช้บ้านสำเร็จรูปและแบบแยกส่วนจะช่วยแก้ปัญหาที่อยู่อาศัยในพื้นที่จำกัด บ้านที่ปรับขนาดได้ตามความต้องการจะกลายเป็นแนวทางหลักในการจัดการกับวิถีชีวิตในเมืองยุคใหม่",
                    zh: "建筑环境也正在发生深刻的变化。建筑未来将不再被视为静态结构，而是动态的、适应性强的深度集成到环境中的系统。未来建筑将由可持续性、灵活性和弹性来定义。绿色建筑将成为常态，建筑的设计将最大限度地减少他们的环境足迹并产生他们的能源。\n\n太阳能电池板，雨水收集系统和绿化墙将成为住房，同时使用竹子等可持续、可再生材料，回收钢和菌丝体基复合材料将取代传统的施工方法。智能设计将专注于减少资源消耗，采用节能隔热自然通风和被动式太阳能供暖成为标准。"
                }
            },
            {
                title: {
                    en: "Building Automation Systems & Smart Homes",
                    th: "ระบบอัตโนมัติสำหรับอาคารและบ้านอัจฉริยะ",
                    zh: "楼宇自动化系统的作用"
                },
                image: "./images/image12.jpg",
                content: {
                    en: "Building Automation Systems (BAS) will play a pivotal role in the smart home revolution. With the rise of IoT, homes and buildings will become increasingly autonomous, optimizing energy use, comfort, and security.\n\nSmart homes will leverage technologies like:\n• Intelligent lighting systems that adjust based on occupancy.\n• Smart thermostats that analyze weather patterns to minimize energy use.\n• Real-time monitoring systems for enhanced safety and security.\n\nAs automation technology evolves, homes will become more intuitive, incorporating voice control, gesture recognition, and biometric authentication for seamless interaction.",
                    th: "ระบบอัตโนมัติในอาคาร (BAS) มีบทบาทสำคัญในการปฏิวัติบ้านอัจฉริยะ เมื่อ IoT แพร่หลาย อาคารและบ้านจะกลายเป็นระบบที่สามารถทำงานอัตโนมัติได้มากขึ้น ควบคุมการใช้พลังงาน ความสะดวกสบาย และความปลอดภัย\n\nบ้านอัจฉริยะจะใช้เทคโนโลยีเช่น:\n• ระบบไฟฟ้าอัจฉริยะที่ปรับแสงตามการใช้งาน\n• เทอร์โมสตัทอัจฉริยะที่วิเคราะห์รูปแบบสภาพอากาศเพื่อประหยัดพลังงาน\n• ระบบตรวจสอบเรียลไทม์เพื่อความปลอดภัย ป้องกันปัญหาเช่น การรั่วไหลของแก๊ส หรือไฟฟ้าลัดวงจร",
                    zh: "楼宇自动化系统（BAS）将在智能家居革命中发挥关键作用。随着物联网的兴起，家庭和建筑物将变得越来越自主，从而优化能源使用、舒适度和安全性。\n\n智能家居将利用以下技术：\n• 根据占用情况进行调整的智能照明系统。\n• 分析天气模式以最大限度地减少能源使用的智能恒温器。\n• 用于增强安全性的实时监控系统。\n\n随着自动化技术的发展，家庭将变得更加直观，结合语音控制、手势识别和生物识别认证，以此实现无缝交互。"
                }
            },
            {
                title: {
                    en: "Decarbonization: The Path to Zero Emissions",
                    th: "การลดคาร์บอน: เส้นทางสู่การปล่อยก๊าซเป็นศูนย์",
                    zh: "脱碳：零排放之路"
                },
                image: "./images/image9jpg.jpg",
                content: {
                    en: "A crucial goal of future building and city planning is decarbonization—reducing carbon dioxide (CO2) emissions. Achieving net-zero emissions will become a global priority. The construction industry will adopt sustainable materials like carbon-sequestering concrete and sustainable timber.\n\nFuture buildings will integrate renewable energy sources like solar, wind, and geothermal power. Energy-efficient technologies, such as smart windows that adjust to sunlight, will further reduce energy consumption. The goal: buildings that not only minimize their environmental impact but actively contribute to a carbon-neutral future.",
                    th: "เป้าหมายสำคัญในอนาคตของการออกแบบอาคารและการวางผังเมือง คือ การลดการปล่อยก๊าซคาร์บอนไดออกไซด์ (CO2) การบรรลุเป้าหมายการปล่อยก๊าซสุทธิเป็นศูนย์จะเป็นเรื่องสำคัญทั่วโลก\n\nอาคารในอนาคตจะผสานพลังงานทดแทน เช่น โซลาร์เซลล์ พลังงานลม และพลังงานความร้อนใต้พิภพ เข้ากับการออกแบบอย่างสมบูรณ์ เทคโนโลยีที่มีประสิทธิภาพในการประหยัดพลังงาน เช่น หน้าต่างอัจฉริยะที่ปรับแสงตามความเข้มของแสงอาทิตย์ จะช่วยลดการใช้พลังงานอีกด้วย",
                    zh: "建筑设计和住房转型的核心是全球推动脱碳。脱碳是指减少二氧化碳排放。随着世界朝着巴黎协议设定的目标迈进，脱碳将成为不可商量的优先事项。\n\n建筑物本身将致力于实现净零排放，这意味着它们将产生与它们消耗的能量一样多的能量。可再生能源的整合太阳能、风能和地热能等能源进入建筑设计将有助于实现这一目标。"
                }
            }
        ]
    },
    products: [
        {
            title: { en: "AI chatbot development", th: "การพัฒนาแชทบอทปัญญาประดิษฐ์", zh: "人工智能聊天机器人开发" },
            image: "./images/AI chatbot.jpg",
            description: {
                en: "AI chatbot development is the process of designing, building, and training intelligent conversational systems that simulate human-like interactions through text or speech to automate communication and enhance user experience.",
                th: "การพัฒนาแชทบอท AI คือกระบวนการออกแบบ สร้าง และฝึกฝนระบบการสนทนาอันชาญฉลาดที่จำลองการโต้ตอบแบบมนุษย์ผ่านข้อความหรือเสียงเพื่อทำให้การสื่อสารเป็นอัตโนมัติและเพิ่มประสบการณ์ของผู้ใช้",
                zh: "AI聊天机器人开发是设计、构建和训练智能对话系统的过程，该系统通过文本或语音模拟类人交互，以实现通信自动化并增强用户体验。"
            }
        },
        {
            title: { en: "Software development", th: "การพัฒนาซอฟต์แวร์", zh: "软件开发" },
            image: "./images/software.jpg",
            description: {
                en: "Software development is the structured process of designing, building, testing, and maintaining computer programs or applications that solve real-world problems and meet specific user needs.",
                th: "การพัฒนาซอฟต์แวร์คือกระบวนการที่มีโครงสร้างในการออกแบบ สร้าง ทดสอบ และบำรุงรักษาโปรแกรมคอมพิวเตอร์หรือแอปพลิเคชันที่แก้ปัญหาในโลกแห่งความเป็นจริงและตอบสนองความต้องการเฉพาะของผู้ใช้",
                zh: "软件开发是设计、构建、测试和维护计算机程序或应用程序的结构化过程，旨在解决现实问题并满足特定用户需求。"
            }
        },
        {
            title: { en: "Machine Learning", th: "การเรียนรู้ของเครื่อง", zh: "机器学习" },
            image: "./images/ML.jpg",
            description: {
                en: "Machine learning is a branch of artificial intelligence that enables computers to learn from data and improve their performance automatically without being explicitly programmed.",
                th: "การเรียนรู้ของเครื่อง (Machine Learning) คือสาขาหนึ่งของปัญญาประดิษฐ์ที่ทำให้คอมพิวเตอร์สามารถเรียนรู้จากข้อมูลและปรับปรุงประสิทธิภาพของตนเองโดยอัตโนมัติโดยไม่ต้องถูกโปรแกรมอย่างชัดเจน",
                zh: "机器学习是人工智能的一个分支，它使计算机能够从数据中学习并自动提高性能，而无需明确编程。"
            }
        },
        {
            title: { en: "Smart home", th: "บ้านอัจฉริยะ", zh: "智能家居" },
            image: "./images/smart home.jpg",
            description: {
                en: "Controls functions such as lighting, temperature, and security remotely for convenience, energy efficiency, and enhanced security.",
                th: "ควบคุมฟังก์ชันต่าง ๆ เช่น แสงสว่าง อุณหภูมิ และระบบรักษาความปลอดภัยจากระยะไกล เพื่อความสะดวกสบายและประหยัดพลังงาน",
                zh: "远程控制照明、温度和安保系统等功能，以提高便利性、能源效率和增强安全性。"
            }
        },
        {
            title: { en: "Smart farming", th: "การทำฟาร์มอัจฉริยะ", zh: "智能农业" },
            image: "./images/smart farming.jpg",
            description: {
                en: "Uses IoT, sensors, and data analytics to optimize agricultural processes like crop monitoring and irrigation. Improves efficiency and sustainability.",
                th: "ใช้ IoT และเซนเซอร์เพื่อเพิ่มประสิทธิภาพกระบวนการเกษตร เช่น การติดตามพืชและการชลประทาน ช่วยลดต้นทุนและเสริมความยั่งยืน",
                zh: "使用物联网（IoT）、传感器和数据分析来优化农业过程，如作物监测和灌溉。提高效率并增强可持续性。"
            }
        },
        {
            title: { en: "Website development", th: "การพัฒนาเว็บไซต์", zh: "网站开发" },
            image: "./images/website development.jpg",
            description: {
                en: "Creating, designing, and maintaining user-friendly, responsive websites optimized for performance (SEO).",
                th: "การสร้าง ออกแบบ และดูแลเว็บไซต์ที่ใช้งานง่าย รองรับการใช้งานได้ดี และถูกปรับแต่งให้เหมาะสม (SEO)",
                zh: "创建、设计和维护用户友好、响应迅速并针对性能（SEO）优化的网站。"
            }
        },
        {
            title: { en: "HVAC, MEP and Retrofit", th: "ระบบปรับอากาศ และ ระบบเครื่องกลไฟฟ้าและประปา", zh: "HVAC、MEP 和改造" },
            image: "./images/HVAC.png",
            description: {
                en: "Enhances energy efficiency, reducing operational costs and environmental impact. Increases indoor comfort, system reliability, and overall building value.",
                th: "เพิ่มประสิทธิภาพการใช้พลังงาน ลดต้นทุนการดําเนินงาน และผลกระทบต่อสิ่งแวดล้อม เพิ่มความสะดวกสบายในร่มและความน่าเชื่อถือของระบบ",
                zh: "提高能源效率，降低运营成本和环境影响。它还提高了室内舒适度、系统可靠性和整体建筑价值。"
            }
        },
        {
            title: { en: "Controls, Automation, BAS", th: "ระบบควบคุม ระบบอัตโนมัติ", zh: "控制、自动化、BAS" },
            image: "./images/3.jpg",
            description: {
                en: "Improves building management by enabling real-time monitoring, predictive maintenance, and better occupant comfort and security.",
                th: "ปรับปรุงการจัดการอาคารโดยเปิดใช้งานการตรวจสอบแบบเรียลไทม์การบํารุงรักษาเชิงคาดการณ์และความสะดวกสบายและความปลอดภัย",
                zh: "通过实现实时监控、预测性维护以及更好的居住者舒适度和安全性来改善建筑管理。"
            }
        },
        {
            title: { en: "Environmental Services", th: "บริการด้านสิ่งแวดล้อม", zh: "环境服务" },
            image: "./images/image6.jpg",
            description: {
                en: "Managing, restoring, and protecting natural resources and ecosystems. Energy-saving services focus on optimizing consumption through efficiency measures.",
                th: "จัดการ ฟื้นฟู และปกป้องทรัพยากรธรรมชาติ ระบบนิเวศ และความหลากหลายทางชีวภาพเพื่อลดมลพิษและผลกระทบต่อสิ่งแวดล้อม",
                zh: "管理、恢复和保护自然资源、生态系统和生物多样性，以减少污染和环境影响。"
            }
        },
        {
            title: { en: "Security system", th: "ระบบรักษาความปลอดภัย", zh: "安全系统" },
            image: "./images/security system (2) - Copy.jpg",
            description: {
                en: "Provides critical protection by detecting and deterring unauthorized access. Offers peace of mind with real-time monitoring and emergency response.",
                th: "ระบบรักษาความปลอดภัยช่วยในการตรวจจับและป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต เพื่อให้ความปลอดภัยแก่ทรัพย์สินและผู้พักอาศัย",
                zh: "安全系统通过检测和阻止未经授权的访问来提供关键保护，确保财产和居住者的安全。"
            }
        },
        {
            title: { en: "Access control", th: "ระบบควบคุมการเข้าถึง", zh: "门禁控制" },
            image: "./images/access control.jpg",
            description: {
                en: "Enhances building security by allowing only authorized individuals to access specific areas. Delivers detailed tracking and monitoring.",
                th: "เพิ่มความปลอดภัยของอาคารโดยอนุญาตให้เฉพาะบุคคลที่ได้รับอนุญาตเข้าถึงพื้นที่เฉพาะ มีการติดตามและตรวจสอบโดยละเอียด",
                zh: "通过仅允许授权人员进入特定区域来增强建筑安全性。提供详细的跟踪和监控。"
            }
        },
        {
            title: { en: "Green construction", th: "การก่อสร้างที่เป็นมิตรต่อสิ่งแวดล้อม", zh: "绿色施工" },
            image: "./images/greeb construction.jpg",
            description: {
                en: "Focuses on sustainable building practices, using energy-efficient designs and renewable materials. Includes General Construction Management, Fit Out, renovation, and Vertical Gardens.",
                th: "เน้นการก่อสร้างอย่างยั่งยืน การออกแบบที่ประหยัดพลังงาน และลดของเสีย รวมถึงการบริหารการก่อสร้าง การตกแต่งภายใน และสวนแนวตั้ง",
                zh: "专注于采用节能设计、可再生材料和减少废物的可持续建筑实践。包括综合建筑管理、室内装修、翻新和垂直花园。"
            }
        },
        {
            title: { en: "Solar Solutions", th: "พลังงานแสงอาทิตย์", zh: "太阳能解决方案" },
            image: "./images/solar panel.jpg",
            description: {
                en: "Harness the power of the sun with our cutting-edge solar technologies.",
                th: "ควบคุมพลังของดวงอาทิตย์ด้วยเทคโนโลยีพลังงานแสงอาทิตย์ที่ล้ําสมัยของเรา",
                zh: "利用我们尖端的太阳能技术利用太阳能。"
            }
        },
        {
            title: { en: "EV charger", th: "เครื่องชาร์จรถยนต์ไฟฟ้า", zh: "电动汽车充电器" },
            image: "./images/ev charger.jpg",
            description: {
                en: "Fast, smart charging with features like Wi-Fi connectivity, adjustable power output, and universal compatibility, providing up to 30-50 miles of range per hour. Weatherproof, safe, and integrates with renewable energy systems.",
                th: "การชาร์จที่รวดเร็วและชาญฉลาดพร้อมคุณสมบัติต่างๆ เช่น การเชื่อมต่อ Wi-Fi และความเข้ากันได้สากล ให้ระยะทางสูงสุด 30-50 ไมล์ต่อชั่วโมง ทนทานต่อสภาพอากาศ ปลอดภัย และผสานรวมกับระบบพลังงานหมุนเวียน",
                zh: "具有 Wi-Fi 连接、可调节功率输出和通用兼容性等功能的快速智能充电。它防风雨、安全，并与可再生能源系统集成，确保为所有 EV 车型提供高效、环保的充电。"
            }
        },
        {
            title: { en: "Green Architecture", th: "สถาปัตยกรรมสีเขียว", zh: "绿色建筑" },
            image: "./images/GREEN.jpg",
            description: {
                en: "Designing eco-friendly buildings that harmonize with nature (Architectural, Interior, Landscape and detailed engineering design).",
                th: "ออกแบบอาคารที่เป็นมิตรกับสิ่งแวดล้อมที่กลมกลืนกับธรรมชาติ (การออกแบบสถาปัตยกรรม ภายใน และภูมิทัศน์ รวมถึงการตกแต่งและ วิศวกรรมรายละเอียด)",
                zh: "设计与自然和谐相处的环保建筑 (建筑、室内和景观设计以及装修/施工)。"
            }
        }
    ],
    reference: [
        {
            title: { en: "The Fountain Hatyai", th: "The Fountain Hatyai", zh: "The Fountain Hatyai" },
            image: "./images/image.jpg",
            details: [
                { label: { en: "Detail", th: "รายละเอียด", zh: "详细资料" }, value: { en: "Design & build of downtown shophouses with a restaurant and cafe", th: "ออกแบบและสร้างอาคารพาณิชย์ในตัวเมือง ด้วยร้านอาหารและคาเฟ่", zh: "设计&建造市中心的店屋设有餐厅和咖啡馆" } },
                { label: { en: "Location", th: "สถานที่ตั้ง", zh: "地点" }, value: { en: "Hatyai city", th: "หาดใหญ่", zh: "合艾" } },
                { label: { en: "Value", th: "มูลค่า", zh: "价值" }, value: { en: "THB 60,200,000", th: "60,200,000 บาท", zh: "THB 60,200,000" } }
            ],
            description: {
                en: "Townhouse for sale/rent, home office 7.5 million Baht (Rent 30,000). Situated near the Fountain Circle in the heart of Hat Yai, this property is easily accessible, feels safe, and has plenty of surrounding transportation options. It is next to a small park and exudes style and peace at night.",
                th: "ขาย/ให้เช่าทาวน์เฮ้าส์ โฮมออฟฟิศ 7.5 ล้านบาท (เช่า 30,000 )ใกล้วงเวียนน้ำพุ กลางเมืองหาดใหญ่ ตั้งอยู่ใกล้กับวงเวียนน้ําพุกลางหาดใหญ่ง่ายต่อการเข้าถึง ทรัพย์สินมีศักยภาพในการทําธุรกิจและน่าอยู่ ห่างจากโรงเรียนหาดใหญ่วิทยาลัยและโรงพยาบาลหาดใหญ่เพียง 400 เมตร",
                zh: "联排别墅出售/出租，家庭办公室 750万泰铢。位于合艾市中心喷泉环岛附近。这个楼盘交通便利，感觉安全，周边交通充足。也是一个宜居的地方。此外，合艾 Witayalai 学校和合艾医院相距约400米。"
            }
        },
        {
            title: { en: "Loft71", th: "Loft71", zh: "Loft71" },
            image: "./images/loft 71.jpg",
            details: [
                { label: { en: "Detail", th: "รายละเอียด", zh: "详细情况" }, value: { en: "Design & build of 350-sq.m. home offices", th: "ออกแบบและสร้างพื้นที่ 350 ตร.ม. โฮมออฟฟิศ", zh: "设计和建造350平方米家庭办公室" } },
                { label: { en: "Location", th: "สถานที่ตั้ง", zh: "位置" }, value: { en: "Ladprao 71", th: "ลาดพร้าว 71", zh: "Ladprao 71" } },
                { label: { en: "Value", th: "มูลค่า", zh: "价值" }, value: { en: "THB 30,000,000", th: "30,000,000 บาท", zh: "THB 30,000,000" } }
            ],
            description: {
                en: "Home office 12.8 million baht (rent 60,000). Near MRT Lat Phrao 71 station (Yellow Line) and Expressway. Surrounded by a pleasant, secure neighborhood with lots of delicious eateries. One of Bangkok's nicest environments.",
                th: "โฮมออฟฟิศ 12.8 ล้านบาท (เช่า 60,000 ) ใกล้ MRT สายสีเหลืองลาดพร้าว 71 และทางด่วน ล้อมรอบด้วยย่านที่ดีและปลอดภัยพร้อมร้านอาหารอร่อยมากมาย โฮมออฟฟิสนี้มีสภาพแวดล้อมที่ดีและปลอดภัยที่สุดแห่งหนึ่งในกรุงเทพฯ",
                zh: "家庭办公室1280万泰铢（租金6万）。靠近地铁黄线 Lat Phrao 71 和高速公路。周围环绕着宜人、安全的社区很多美味的餐馆。该物业拥有一间曼谷最好、最安全的环境。"
            }
        },
        {
            title: { en: "Satahip ACDC", th: "บ้านพักหน่วยบัญชาการ", zh: "Satahip ACDC" },
            image: "./images/Satahip ACDC.jpg",
            details: [
                { label: { en: "Detail", th: "รายละเอียด", zh: "详细" }, value: { en: "Construction of 30 houses", th: "ก่อสร้างบ้าน 30 หลัง", zh: "建造三十栋房屋" } },
                { label: { en: "Location", th: "สถานที่ตั้ง", zh: "位置" }, value: { en: "Satahip", th: "สัตหีบ", zh: "Satahip" } },
                { label: { en: "Value", th: "มูลค่า", zh: "价值" }, value: { en: "THB 20,100,000", th: "20,100,000 บาท", zh: "THB 20,100,000" } }
            ]
        }
    ],
    support: {
        title: { en: "Our contact", th: "ติดต่อเรา", zh: "我们的联系方式" },
        items: [
            { label: { en: "Email", th: "อีเมล์", zh: "电子邮件" }, value: "cblue.thailand@gmail.com" },
            { label: { en: "Phone", th: "โทรศัพท์", zh: "电话" }, value: "+66 (0)81 854 4291" }
        ],
        image: "./images/2.jpg"
    },
    supportForm: {
        // Header
        contactDetails: { en: "Contact Details", th: "รายละเอียดการติดต่อ", zh: "联系方式" },
        location: { en: "Location", th: "ที่ตั้ง", zh: "位置" },
        locationLabel: { en: "Project Location", th: "สถานที่ตั้งโครงการ", zh: "项目地点" },
        locationValue: { en: "Bangkok, Thailand", th: "กรุงเทพฯ, ประเทศไทย", zh: "泰国曼谷" },
        householdLocation: { en: "House Location", th: "สถานที่ตั้งบ้าน", zh: "房屋位置" },
        householdLocationPlaceholder: { en: "Bangkok, Thailand", th: "กรุงเทพฯ, ประเทศไทย", zh: "泰国曼谷" },
        heroQuote: { en: "\"We are here to help you build the future.\"", th: "\"เราพร้อมช่วยคุณสร้างอนาคต\"", zh: "\"我们在这里帮助您建设未来。\"" },

        // Form Title
        formTitle: { en: "How can we help?", th: "เราช่วยอะไรได้บ้าง?", zh: "我们能帮您什么?" },
        formSubtitle: { en: "Select an option below to get started.", th: "เลือกตัวเลือกด้านล่างเพื่อเริ่มต้น", zh: "请选择以下选项开始。" },

        // Inquiry Types
        inquiryTypes: {
            service: { en: "Project", th: "โครงการ", zh: "项目" },
            support: { en: "Get Support", th: "ขอความช่วยเหลือ", zh: "获取支持" },
            household: { en: "Household", th: "งานบ้าน", zh: "家政服务" }
        },

        // Common Fields
        fullName: { en: "Full Name", th: "ชื่อ-นามสกุล", zh: "全名" },
        fullNamePlaceholder: { en: "John Doe", th: "ชื่อ นามสกุล", zh: "张三" },
        emailAddress: { en: "Email Address", th: "อีเมล", zh: "电子邮箱" },
        emailPlaceholder: { en: "john@example.com", th: "example@email.com", zh: "example@email.com" },
        phoneNumber: { en: "Phone Number", th: "เบอร์โทรศัพท์", zh: "电话号码" },
        phonePlaceholder: { en: "+1 (555) 000-0000", th: "+66 XX XXX XXXX", zh: "+86 XXX XXXX XXXX" },
        company: { en: "Company", th: "บริษัท", zh: "公司" },
        companyPlaceholder: { en: "Acme Inc.", th: "บริษัท จำกัด", zh: "公司名称" },
        required: { en: "*", th: "*", zh: "*" },

        // Service Fields
        serviceInterested: { en: "Service Interested In", th: "บริการที่สนใจ", zh: "感兴趣的服务" },
        selectService: { en: "Select a service", th: "เลือกบริการ", zh: "选择服务" },
        budgetRange: { en: "Budget Range", th: "งบประมาณ", zh: "预算范围" },
        selectBudget: { en: "Select budget", th: "เลือกงบประมาณ", zh: "选择预算" },
        startDate: { en: "Preferred Start Date", th: "วันที่ต้องการเริ่มงาน", zh: "首选开始日期" },

        // Service Options
        serviceOptions: {
            // Original Options
            webDev: { en: "Website Development", th: "พัฒนาเว็บไซต์", zh: "网站开发" },
            mobileDev: { en: "Mobile App Development", th: "พัฒนาแอปมือถือ", zh: "移动应用开发" },
            aiIntegration: { en: "AI Integration", th: "ผสานรวม AI", zh: "AI 集成" },
            consulting: { en: "Consulting", th: "ที่ปรึกษา", zh: "咨询" },

            // New Solutions
            chatbot: { en: "AI Chatbot", th: "แชทบอท AI", zh: "AI聊天机器人" },
            software: { en: "Software Development", th: "พัฒนาซอฟต์แวร์", zh: "软件开发" },
            machineLearning: { en: "Machine Learning & AI", th: "ปัญญาประดิษฐ์", zh: "机器学习" },
            solar: { en: "Solar Panels", th: "แผงโซล่าเซลล์", zh: "太阳能电池板" },
            evCharger: { en: "EV Charger Installation", th: "ติดตั้งที่ชาร์จรถไฟฟ้า", zh: "电动车充电器安装" },
            greenArch: { en: "Eco-Friendly Building Design", th: "ออกแบบอาคารประหยัดพลังงาน", zh: "绿色建筑设计" },
            hvacMep: { en: "Air Conditioning & Plumbing Systems", th: "ระบบปรับอากาศและประปา", zh: "空调与管道系统" },
            automation: { en: "Smart Building Automation", th: "ระบบอาคารอัจฉริยะ", zh: "智能楼宇自动化" },
            envServices: { en: "Environmental Services", th: "บริการด้านสิ่งแวดล้อม", zh: "环境服务" },
            security: { en: "Security & CCTV Systems", th: "ระบบกล้องวงจรปิด", zh: "安防监控系统" },
            accessControl: { en: "Door & Access Control", th: "ระบบควบคุมประตู", zh: "门禁系统" },
            greenConst: { en: "Eco-Friendly Construction", th: "ก่อสร้างประหยัดพลังงาน", zh: "绿色施工" },
            smartHome: { en: "Smart Home", th: "บ้านอัจฉริยะ", zh: "智能家居" },
            smartFarming: { en: "Smart Farming", th: "ฟาร์มอัจฉริยะ", zh: "智能农业" },
            other: { en: "Other", th: "อื่นๆ", zh: "其他" }
        },

        // Household Options
        householdOptions: {
            plumbing: { en: "Plumbing", th: "ประปา", zh: "管道" },
            electrical: { en: "Electrical", th: "ไฟฟ้า", zh: "电气" },
            acRepair: { en: "A/C Repair", th: "ซ่อมแอร์", zh: "空调维修" },
            cleaning: { en: "Interior Decoration", th: "ตกแต่งภายใน", zh: "室内装饰" },
            pestControl: { en: "Landscaping", th: "ทำสวน", zh: "园艺" },
            gardening: { en: "Cladding/Roofing", th: "วัสดุหุ้มผนัง/วัสดุมุงหลังคา", zh: "外墙/屋顶材料" },
            other: { en: "Other", th: "อื่นๆ", zh: "其他" }
        },

        // Budget Options
        budgetOptions: {
            under5k: { en: "Less than $5,000", th: "น้อยกว่า 150,000 บาท", zh: "少于 $5,000" },
            "5kTo10k": { en: "$5,000 - $10,000", th: "150,000 - 300,000 บาท", zh: "$5,000 - $10,000" },
            "10kTo25k": { en: "$10,000 - $25,000", th: "300,000 - 750,000 บาท", zh: "$10,000 - $25,000" },
            "25kTo50k": { en: "$25,000 - $50,000", th: "750,000 - 1,500,000 บาท", zh: "$25,000 - $50,000" },
            above50k: { en: "$50,000+", th: "1,500,000 บาทขึ้นไป", zh: "$50,000+" }
        },

        // Support Fields
        issueType: { en: "Type of Issue", th: "ประเภทปัญหา", zh: "问题类型" },
        selectIssueType: { en: "Select issue type", th: "เลือกประเภทปัญหา", zh: "选择问题类型" },
        orderId: { en: "Order ID", th: "หมายเลขคำสั่งซื้อ", zh: "订单号" },
        orderIdPlaceholder: { en: "#12345", th: "#12345", zh: "#12345" },

        // Issue Types
        issueTypes: {
            technical: { en: "Technical Issue", th: "ปัญหาทางเทคนิค", zh: "技术问题" },
            billing: { en: "Billing / Payment", th: "การเรียกเก็บเงิน / การชำระเงิน", zh: "账单/付款" },
            accountAccess: { en: "Account Access", th: "การเข้าถึงบัญชี", zh: "账户访问" },
            featureRequest: { en: "Feature Request", th: "ขอคุณสมบัติใหม่", zh: "功能请求" },
            other: { en: "Other", th: "อื่นๆ", zh: "其他" }
        },

        // General Fields
        pleaseSpecify: { en: "Please specify...", th: "โปรดระบุ...", zh: "请注明..." },
        subject: { en: "Subject", th: "หัวข้อ", zh: "主题" },
        subjectPlaceholder: { en: "Inquiry Subject", th: "หัวข้อที่ต้องการสอบถาม", zh: "咨询主题" },

        // Message Field
        messageLabels: {
            service: { en: "Project Details / Requirements", th: "รายละเอียดโปรเจกต์ / ความต้องการ", zh: "项目详情/需求" },
            support: { en: "Description of Problem", th: "อธิบายปัญหา", zh: "问题描述" },
            household: { en: "Service Details", th: "รายละเอียดบริการ", zh: "服务详情" }
        },
        messagePlaceholders: {
            service: { en: "Tell us about your project goals...", th: "บอกเราเกี่ยวกับเป้าหมายโปรเจกต์ของคุณ...", zh: "请告诉我们您的项目目标..." },
            support: { en: "Please describe the issue you are facing...", th: "กรุณาอธิบายปัญหาที่คุณพบ...", zh: "请描述您遇到的问题..." },
            household: { en: "Describe the service you need...", th: "อธิบายบริการที่คุณต้องการ...", zh: "描述您需要的服务..." }
        },

        // Consent Messages
        consentMessages: {
            service: {
                en: "I confirm the information provided is accurate and agree to allow the team to contact me regarding my project.",
                th: "ข้าพเจ้ายืนยันว่าข้อมูลที่ให้ถูกต้อง และยินยอมให้ทีมงานติดต่อเกี่ยวกับโปรเจกต์ของข้าพเจ้า",
                zh: "我确认所提供的信息准确无误，并同意团队就我的项目与我联系。"
            },
            support: {
                en: "I authorize your team to review my request and contact me with updates.",
                th: "ข้าพเจ้าอนุญาตให้ทีมงานตรวจสอบคำขอและติดต่อกลับเพื่อแจ้งความคืบหน้า",
                zh: "我授权您的团队审核我的请求并与我联系更新情况。"
            },
            household: {
                en: "I request this service and authorize the team to contact me for scheduling.",
                th: "ข้าพเจ้าขอใช้บริการนี้และอนุญาตให้ทีมงานติดต่อเพื่อทำการนัดหมาย",
                zh: "我请求此服务并授权团队与我联系以进行安排。"
            }
        },

        // Button States
        buttons: {
            submit: { en: "Submit Request", th: "ส่งคำขอ", zh: "提交请求" },
            sending: { en: "Sending...", th: "กำลังส่ง...", zh: "发送中..." },
            success: { en: "Request Sent!", th: "ส่งคำขอสำเร็จ!", zh: "请求已发送!" }
        },

        // Error Messages
        errors: {
            requiredFields: { en: "Please fill in all required fields and accept the terms.", th: "กรุณากรอกข้อมูลที่จำเป็นทั้งหมดและยอมรับเงื่อนไข", zh: "请填写所有必填字段并接受条款。" },
            captcha: { en: "Please complete the reCAPTCHA verification.", th: "กรุณายืนยันตัวตนด้วย reCAPTCHA", zh: "请完成 reCAPTCHA 验证。" },
            network: { en: "Network error. Please check your connection.", th: "เกิดข้อผิดพลาดเครือข่าย กรุณาตรวจสอบการเชื่อมต่อ", zh: "网络错误，请检查您的连接。" },
            general: { en: "Something went wrong. Please try again later.", th: "เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง", zh: "出了点问题，请稍后重试。" }
        }
    },
    about: {
        intro: {
            title: { en: "Welcome to Cblue", th: "ยินดีต้อนรับสู่ Cblue", zh: "欢迎来到 Cblue" },
            text: {
                en: "As a group of experienced and highly skilled professionals, we design, engineer and construct leading-edge facilities and related infrastructure for residential buildings, industries and public civil works. We have the flexibility and the strength to deliver large or small projects successfully anywhere in Thailand.\n\nWe offer a comprehensive suite of services focused on AI/Digital Solutions, sustainable technology solutions, and construction engineering.\n\n• Digital Solutions: AI chatbot development, software development, ML.\n• Smart Technology: BMS, smart building controls.\n• Renewable Energy: Solar, wind turbines, EV charging.\n• Design & Engineering: Architectural, interior, landscape.\n• Construction: General construction, fit-outs, HVAC, MEP, retrofitting.\n• Fabrication: Metal sheet, steel structure, aluminium, glass.\n• Consulting: Market research, feasibility studies.",
                th: "ในฐานะกลุ่มผู้เชี่ยวชาญที่มีประสบการณ์และทักษะสูง เราออกแบบ วางระบบวิศวกรรม และก่อสร้างสิ่งอำนวยความสะดวกที่ล้ำสมัยและโครงสร้างพื้นฐานที่เกี่ยวข้องสำหรับอาคารที่พักอาศัย อุตสาหกรรม และงานโยธาสาธารณะ เรามีความยืดหยุ่นและศักยภาพที่จะส่งมอบโครงการทั้งขนาดใหญ่และขนาดเล็กให้ประสบความสำเร็จได้ทุกที่ในประเทศไทย\n\nเรานำเสนอบริการที่ครบวงจรโดยมุ่งเน้นที่โซลูชัน AI/ดิจิทัล เทคโนโลยีที่ยั่งยืน และวิศวกรรมการก่อสร้าง\n\n• โซลูชันดิจิทัล: การพัฒนาแชทบอท AI, การพัฒนาซอฟต์แวร์, Machine Learning\n• เทคโนโลยีอัจฉริยะ: BMS, ระบบควบคุมอาคารอัจฉริยะ\n• พลังงานหมุนเวียน: พลังงานแสงอาทิตย์, กังหันลม, การชาร์จรถยนต์ไฟฟ้า\n• การออกแบบและวิศวกรรม: สถาปัตยกรรม, ภายใน, ภูมิทัศน์\n• การก่อสร้าง: การก่อสร้างทั่วไป, การตกแต่งภายใน, HVAC, งานระบบ MEP, การปรับปรุงอาคาร\n• งานประกอบ: แผ่นโลหะ, โครงสร้างเหล็ก, อลูมิเนียม, กระจก\n• ที่ปรึกษา: การวิจัยตลาด, การศึกษาความเป็นไปได้",
                zh: "作为一群经验丰富且技术精湛的专业人士，我们设计、工程并建造最先进的设施及住宅楼、工业和公共土建工程的相关基础设施。我们拥有灵活性和实力，可以在泰国任何地方成功交付大型或小型项目。\n\n我们提供全方位的服务，专注于 AI/数字解决方案、可持续技术解决方案和建筑工程。\n\n• 数字解决方案：AI 聊天机器人开发、软件开发、机器学习。\n• 智能技术：BMS、智能建筑控制。\n• 可再生能源：太阳能、风力涡轮机、电动汽车充电。\n• 设计与工程：建筑、室内、景观。\n• 施工：一般施工、装修、HVAC、MEP、改造。\n• 制造：钣金、钢结构、铝材、玻璃。\n• 咨询：市场研究、可行性研究。"
            },
            image: "./images/beach.png"
        },
        mission: {
            title: { en: "Our Mission", th: "ภารกิจของเรา", zh: "我们的使命" },
            text: {
                en: "The future of our habitat will be defined by an urgent need for sustainability and resilience... Our mission is to provide the best, state-of-the-art green solutions and services on time, on budget and with safety and integrity.",
                th: "อนาคตของที่อยู่อาศัยของพวกเราจะถูกกำหนดโดยความต้องการเร่งด่วนสำหรับความยั่งยืนและความยืดหยุ่น... ภารกิจของเราคือการมอบโซลูชันและบริการสีเขียวที่ล้ำสมัยที่สุด ตรงเวลา ภายใต้งบประมาณที่กำหนด และด้วยความปลอดภัยและความซื่อสัตย์",
                zh: "我们栖息地的未来将由对可持续性和韧性的迫切需求所定义……我们的使命是按时、在预算内、安全且诚信地提供最好、最先进的绿色解决方案和服务。"
            },
            image: "./images/1.jpg"
        }
    }
};
