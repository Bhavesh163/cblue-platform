"""Knowledge base with semantic matching for Cblue services"""

KNOWLEDGE_BASE = {
    "ai_general": {
        "keywords": ["what is ai", "ai คือ", "ai คืออะไร", "ai是什么", "什么是ai", "什么是人工智能"],
        "content": """AI (Artificial Intelligence) is the simulation of human intelligence in machines that are programmed to think, reason, learn, and make decisions like humans.

---

AI (ปัญญาประดิษฐ์) คือการจำลองความฉลาดของมนุษย์ในเครื่องจักรที่ถูกโปรแกรมให้สามารถคิด วิเคราะห์ เรียนรู้ และตัดสินใจได้เหมือนมนุษย์

---

人工智能（AI）是指在机器中模拟人类智能的技术，使其能够像人类一样思考、推理、学习和做出决策。"""
    },
    "chatbot_definition": {
        "keywords": ["what is a chatbot", "what is chatbot", "chatbot คือ", "แชตบอทคือ", "แชตบอทคืออะไร", "什么是聊天机器人"],
        "content": """A chatbot is a software application that can converse with users through text or voice, often used to provide information or automate customer service tasks.

---

แชตบอทคือโปรแกรมซอฟต์แวร์ที่สามารถสนทนากับผู้ใช้งานผ่านข้อความหรือเสียง มักใช้เพื่อให้ข้อมูลหรือช่วยงานบริการลูกค้าแบบอัตโนมัติ

---

聊天机器人是一种软件应用程序，可以通过文字或语音与用户进行对话，通常用于提供信息或自动化客户服务任务。"""
    },
    "ai_chatbot_development": {
        "keywords": ["what is ai chatbot development", "ai chatbot development คือ", "การพัฒนาแชตบอท ai คืออะไร", "什么是ai聊天机器人开发"],
        "content": """AI chatbot development is the process of building chatbots that use artificial intelligence and natural language processing (NLP) to understand, learn from, and respond intelligently to user inputs.

---

การพัฒนาแชตบอท AI คือกระบวนการสร้างแชตบอทที่ใช้เทคโนโลยีปัญญาประดิษฐ์และการประมวลผลภาษาธรรมชาติ (NLP) เพื่อให้เข้าใจ เรียนรู้ และตอบสนองต่อผู้ใช้อย่างชาญฉลาด

---

AI聊天机器人开发是构建使用人工智能和自然语言处理（NLP）技术的聊天机器人的过程，使其能够理解、学习并智能地回应用户输入。"""
    },
    "chatbot_development": {
        "keywords": ["what is chatbot development", "chatbot development คือ", "การพัฒนาแชตบอทคืออะไร", "什么是聊天机器人开发"],
        "content": """Chatbot development is the creation of automated conversational programs that can interact with users through predefined rules, scripts, or AI-based understanding.

---

การพัฒนาแชตบอทคือการสร้างโปรแกรมสนทนาอัตโนมัติที่สามารถโต้ตอบกับผู้ใช้ได้ตามกฎที่ตั้งไว้ล่วงหน้า หรือโดยใช้ความเข้าใจจาก AI

---

聊天机器人开发是创建能通过预设规则、脚本或基于AI理解与用户互动的自动化对话程序的过程。"""
    },
    "software_definition": {
        "keywords": ["what is software", "software คือ", "ซอฟต์แวร์คือ", "ซอฟต์แวร์คืออะไร", "什么是软件"],
        "content": """Software is a set of instructions, programs, or data that tell a computer how to perform specific tasks or functions.

---

ซอฟต์แวร์คือชุดคำสั่ง โปรแกรม หรือข้อมูลที่บอกคอมพิวเตอร์ให้ทำงานหรือดำเนินการตามที่กำหนดไว้

---

软件是一组指令、程序或数据，用来告诉计算机如何执行特定任务或功能。"""
    },
    "software_development": {
        "keywords": ["what is software development", "software development คือ", "การพัฒนาซอฟต์แวร์คืออะไร", "พัฒนาซอฟต์แวร์คืออะไร", "什么是软件开发"],
        "content": """Software development is the process of designing, coding, testing, and maintaining applications, systems, or programs to meet user needs.

---

การพัฒนาซอฟต์แวร์คือกระบวนการออกแบบ เขียนโค้ด ทดสอบ และดูแลรักษาโปรแกรมหรือระบบ เพื่อให้ตอบสนองความต้องการของผู้ใช้งาน

---

软件开发是设计、编程、测试和维护应用程序、系统或程序的过程，以满足用户需求。"""
    },
    "machine_learning": {
        "keywords": ["what is machine learning", "machine learning คือ", "การเรียนรู้ของเครื่องคืออะไร", "แมชชีนเลิร์นนิงคืออะไร", "什么是机器学习"],
        "content": """Machine Learning (ML) is a branch of AI that enables computers to learn from data and improve their performance without being explicitly programmed.

---

การเรียนรู้ของเครื่อง (Machine Learning - ML) คือสาขาหนึ่งของ AI ที่ทำให้คอมพิวเตอร์สามารถเรียนรู้จากข้อมูลและปรับปรุงประสิทธิภาพได้โดยไม่ต้องเขียนโปรแกรมใหม่ทั้งหมด

---

机器学习（ML）是人工智能的一个分支，使计算机能够从数据中学习并不断提高性能，而无需明确编程。"""
    },
    "ml_definition": {
        "keywords": ["what is ml", "ml คือ", "ml คืออะไร", "什么是ml"],
        "content": """ML stands for Machine Learning — a field of AI that allows computers to automatically learn patterns and make predictions from data.

---

ML คือคำย่อของ Machine Learning ซึ่งเป็นเทคโนโลยี AI ที่ช่วยให้คอมพิวเตอร์เรียนรู้รูปแบบข้อมูลและสามารถคาดการณ์หรือวิเคราะห์ได้โดยอัตโนมัติ

---

ML是机器学习（Machine Learning）的缩写，是人工智能的一个领域，使计算机能够自动学习数据模式并进行预测。"""
    },
    "machine_definition": {
        "keywords": ["what is a machine", "machine คือ", "เครื่องจักรคือ", "เครื่องจักรคืออะไร", "什么是机器"],
        "content": """A machine is a device or system that performs work or processes tasks using mechanical, electrical, or computational power.

---

เครื่องจักรคืออุปกรณ์หรือระบบที่ทำงานหรือประมวลผลโดยใช้พลังงานกล ไฟฟ้า หรือการคำนวณ

---

机器是使用机械、电气或计算能力来执行工作或处理任务的装置或系统。"""
    },
    "learning_definition": {
        "keywords": ["what is learning", "learning คือ", "การเรียนรู้คือ", "การเรียนรู้คืออะไร", "什么是学习"],
        "content": """Learning is the process of acquiring knowledge, understanding, or skills through study, experience, or teaching.

---

การเรียนรู้คือกระบวนการได้รับความรู้ ความเข้าใจ หรือทักษะ ผ่านการศึกษา ประสบการณ์ หรือการฝึกสอน

---

学习是通过学习、经验或教学获得知识、理解或技能的过程。"""
    },
    "artificial_intelligence": {
        "keywords": ["what is artificial intelligence", "artificial intelligence คือ", "ปัญญาประดิษฐ์คืออะไร", "ปัญญาประดิษฐ์คือ", "什么是人工智能"],
        "content": """Artificial intelligence is the ability of machines or computers to perform tasks that normally require human intelligence, such as reasoning, perception, and problem-solving.

---

ปัญญาประดิษฐ์คือความสามารถของเครื่องจักรหรือคอมพิวเตอร์ในการทำงานที่ต้องใช้ความฉลาดของมนุษย์ เช่น การให้เหตุผล การรับรู้ และการแก้ปัญหา

---

人工智能是机器或计算机执行通常需要人类智能的任务的能力，例如推理、感知和解决问题。"""
    },
    "computer_definition": {
        "keywords": ["what is computers", "what are computers", "คอมพิวเตอร์คือ", "คอมพิวเตอร์คืออะไร", "什么是计算机"],
        "content": """Computers are electronic devices that process data using instructions (software) to perform calculations, store information, and execute tasks.

---

คอมพิวเตอร์คืออุปกรณ์อิเล็กทรอนิกส์ที่ประมวลผลข้อมูลตามคำสั่ง (ซอฟต์แวร์) เพื่อคำนวณ จัดเก็บข้อมูล และดำเนินการต่าง ๆ

---

计算机是一种电子设备，通过执行指令（软件）来处理数据、进行计算、存储信息并执行任务。"""
    },
    "data_definition": {
        "keywords": ["what is data", "data คือ", "ข้อมูลคือ", "ข้อมูลคืออะไร", "什么是数据"],
        "content": """Data is information in raw or structured form, such as numbers, text, or images, that can be processed or analyzed by computers.

---

ข้อมูลคือข้อเท็จจริงหรือสารสนเทศในรูปแบบดิบหรือโครงสร้าง เช่น ตัวเลข ข้อความ หรือภาพ ที่สามารถนำไปประมวลผลหรือวิเคราะห์ได้

---

数据是以原始或结构化形式存在的信息，如数字、文本或图像，计算机可以处理或分析这些信息。"""
    },
    "solar": {
        "keywords": ["what is solar", "solar คือ", "พลังงานแสงอาทิตย์คืออะไร", "พลังงานจากแสงอาทิตย์คืออะไร", "พลังงานจากดวงอาทิตย์คืออะไร", "什么是太阳能"],
        "content": """Solar refers to energy derived from the sun's radiation, which can be converted into electricity or heat.

---

พลังงานแสงอาทิตย์หมายถึงพลังงานที่ได้จากรังสีของดวงอาทิตย์ ซึ่งสามารถเปลี่ยนเป็นพลังงานไฟฟ้าหรือความร้อนได้

---

太阳能指来自太阳辐射的能量，可以转化为电能或热能。"""
    },
    "solar_solutions": {
        "keywords": ["what is solar solutions", "solar solutions คือ", "โซลูชันพลังงานแสงอาทิตย์คืออะไร", "什么是太阳能解决方案"],
        "content": """Solar Solutions are systems or services that use solar energy technologies (like solar panels or solar water heaters) to provide renewable power or heating.

---

โซลูชันพลังงานแสงอาทิตย์หมายถึงระบบหรือบริการที่ใช้เทคโนโลยีพลังงานแสงอาทิตย์ (เช่น แผงโซลาร์เซลล์ หรือเครื่องทำน้ำร้อนพลังงานแสงอาทิตย์) เพื่อผลิตพลังงานหมุนเวียนหรือให้ความร้อน

---

太阳能解决方案是利用太阳能技术（如太阳能电池板或太阳能热水器）来提供可再生能源或供热的系统或服务。"""
    },
    "technologies": {
        "keywords": ["what is technologies", "what are technologies", "เทคโนโลยีคือ", "เทคโนโลยีคืออะไร", "什么是技术"],
        "content": """Technologies are tools, systems, or methods developed using scientific knowledge to solve problems or improve human life.

---

เทคโนโลยีคือเครื่องมือ ระบบ หรือวิธีการที่ถูกพัฒนาด้วยความรู้ทางวิทยาศาสตร์ เพื่อแก้ปัญหาหรือพัฒนาคุณภาพชีวิตมนุษย์

---

技术是利用科学知识开发的工具、系统或方法，用于解决问题或改善人类生活。"""
    },
    "ev": {
        "keywords": ["what is ev", "ev คือ", "ev คืออะไร", "什么是ev"],
        "content": """EV stands for Electric Vehicle — a vehicle powered by electricity stored in batteries instead of fossil fuels.

---

EV ย่อมาจาก Electric Vehicle หมายถึงยานพาหนะที่ขับเคลื่อนด้วยพลังงานไฟฟ้าที่เก็บในแบตเตอรี่แทนน้ำมันเชื้อเพลิง

---

EV是电动汽车（Electric Vehicle）的缩写，指使用储存在电池中的电能而非化石燃料驱动的车辆。"""
    },
    "ev_charger": {
        "keywords": ["what is ev charger", "ev charger คือ", "เครื่องชาร์จรถยนต์ไฟฟ้าคืออะไร", "เครื่องชาร์จไฟฟ้าคืออะไร", "ที่ชาร์จรถยนต์ไฟฟ้าคืออะไร", "什么是ev充电器"],
        "content": """An EV charger is a device that supplies electric energy to recharge the battery of an electric vehicle.

---

เครื่องชาร์จรถยนต์ไฟฟ้าคืออุปกรณ์ที่จ่ายพลังงานไฟฟ้าเพื่อชาร์จแบตเตอรี่ของรถยนต์ไฟฟ้า

---

电动汽车充电器是一种为电动车电池充电的设备。"""
    },
    "wifi_definition": {
        "keywords": ["what is wifi", "what is wi-fi", "wifi คือ", "wi-fi คืออะไร", "什么是wifi"],
        "content": """Wi-Fi is a wireless networking technology that allows devices to connect to the internet or communicate without physical cables.

---

Wi-Fi คือเทคโนโลยีเครือข่ายไร้สายที่ช่วยให้อุปกรณ์เชื่อมต่ออินเทอร์เน็ตหรือสื่อสารกันได้โดยไม่ต้องใช้สายเคเบิล

---

Wi-Fi是一种无线网络技术，允许设备在不使用物理电缆的情况下连接到互联网或进行通信。"""
    },
    "green_architecture": {
        "keywords": ["what is green architecture", "green architecture คือ", "สถาปัตยกรรมสีเขียวคืออะไร", "สถาปัตยกรรมเขียวคืออะไร", "什么是绿色建筑"],
        "content": """Green Architecture is an environmentally conscious design approach that reduces energy use, minimizes waste, and promotes sustainability in building construction.

---

สถาปัตยกรรมสีเขียวคือแนวคิดการออกแบบอาคารที่คำนึงถึงสิ่งแวดล้อม เน้นการประหยัดพลังงาน ลดของเสีย และสร้างความยั่งยืน

---

绿色建筑是一种注重环境保护的设计方法，旨在减少能源消耗、减少浪费并促进建筑可持续性。"""
    },
    "ecofriendly_definition": {
        "keywords": ["what is eco-friendly", "what is eco friendly", "what is ecofriendly", "eco-friendly คือ", "eco friendly คือ", "เป็นมิตรต่อสิ่งแวดล้อมหมายถึงอะไร", "มิตรต่อสิ่งแวดล้อมคืออะไร", "เป็นมิตรกับสิ่งแวดล้อมคืออะไร", "什么是环保"],
        "content": """Eco-friendly refers to products, practices, or systems that cause minimal harm to the environment.

---

เป็นมิตรต่อสิ่งแวดล้อมหมายถึงผลิตภัณฑ์หรือวิธีการที่ส่งผลกระทบต่อสิ่งแวดล้อมน้อยที่สุด

---

环保是指对环境危害最小的产品、做法或系统。"""
    },
    "hvac": {
        "keywords": ["what is hvac", "hvac คือ", "hvac คืออะไร", "什么是hvac"],
        "content": """HVAC stands for Heating, Ventilation, and Air Conditioning — systems used to regulate indoor climate and air quality.

---

HVAC ย่อมาจาก Heating, Ventilation, and Air Conditioning คือระบบที่ควบคุมอุณหภูมิ การระบายอากาศ และคุณภาพอากาศภายในอาคาร

---

HVAC是供暖（Heating）、通风（Ventilation）和空调（Air Conditioning）的缩写，用于调节室内气候和空气质量的系统。"""
    },
    "mep": {
        "keywords": ["what is mep", "mep คือ", "mep คืออะไร", "什么是mep"],
        "content": """MEP stands for Mechanical, Electrical, and Plumbing — the essential engineering systems integrated into building design and construction.

---

MEP ย่อมาจาก Mechanical, Electrical, and Plumbing คือระบบวิศวกรรมสำคัญที่ใช้ในการออกแบบและก่อสร้างอาคาร

---

MEP代表机械（Mechanical）、电气（Electrical）和管道（Plumbing）工程，是建筑设计和施工中不可或缺的系统。"""
    },
    "retrofit": {
        "keywords": ["what is retrofit", "retrofit คือ", "การปรับปรุงระบบ (retrofit) คืออะไร", "什么是改造"],
        "content": """Retrofit means upgrading or modifying existing buildings or systems to improve energy efficiency, performance, or sustainability.

---

การปรับปรุงระบบ (Retrofit) หมายถึงการอัปเกรดหรือปรับเปลี่ยนสิ่งปลูกสร้างหรือระบบเดิมให้มีประสิทธิภาพและประหยัดพลังงานมากขึ้น

---

改造是指升级或修改现有建筑或系统，以提高能源效率、性能或可持续性。"""
    },
    "controls": {
        "keywords": ["what is controls", "what are controls", "controls คือ", "ระบบควบคุมคืออะไร", "什么是控制系统"],
        "content": """Controls refer to systems or devices that manage and regulate equipment operations, such as temperature, lighting, or security systems.

---

ระบบควบคุมหมายถึงอุปกรณ์หรือระบบที่ใช้ในการจัดการและควบคุมการทำงานของอุปกรณ์ เช่น ระบบไฟฟ้า อุณหภูมิ หรือระบบรักษาความปลอดภัย

---

控制系统是用于管理和调节设备运行（如温度、照明或安全系统）的系统或装置。"""
    },
    "automation": {
        "keywords": ["what is automation", "automation คือ", "ระบบอัตโนมัติคืออะไร", "อัตโนมัติคืออะไร", "什么是自动化"],
        "content": """Automation is the use of technology to perform tasks automatically without human intervention.

---

ระบบอัตโนมัติหมายถึงการใช้เทคโนโลยีเพื่อให้เครื่องจักรหรือระบบทำงานได้โดยไม่ต้องมีการควบคุมจากมนุษย์

---

自动化是利用技术以最少的人工干预执行任务的过程。"""
    },
    "bas": {
        "keywords": ["what is bas", "bas คือ", "bas คืออะไร", "什么是bas"],
        "content": """BAS stands for Building Automation System — a centralized system that monitors and controls building functions like HVAC, lighting, and security.

---

BAS ย่อมาจาก Building Automation System คือระบบควบคุมส่วนกลางที่ใช้ในการตรวจสอบและจัดการการทำงานต่าง ๆ ของอาคาร เช่น HVAC แสงสว่าง และระบบความปลอดภัย

---

BAS是楼宇自动化系统（Building Automation System）的缩写，是一个集中控制HVAC、照明和安全等建筑功能的系统。"""
    },
    "smart_building": {
        "keywords": ["what is smart building", "smart building คือ", "อาคารอัจฉริยะคืออะไร", "อาคารสมาร์ทคืออะไร", "什么是智慧建筑"],
        "content": """A Smart Building uses technology and sensors to automatically control and optimize operations such as lighting, temperature, and energy use for efficiency and comfort.

---

อาคารอัจฉริยะคืออาคารที่ใช้เทคโนโลยีและเซนเซอร์เพื่อควบคุมและเพิ่มประสิทธิภาพการทำงาน เช่น ระบบไฟฟ้า อุณหภูมิ และการใช้พลังงาน

---

智慧建筑利用技术和传感器自动控制与优化照明、温度和能源使用等操作，以提高效率和舒适度。"""
    },
    "realtime_monitoring": {
        "keywords": ["what is real-time monitoring", "what is real time monitoring", "what is realtime monitoring", "real-time monitoring คือ", "real time monitoring คือ", "การตรวจสอบแบบเรียลไทม์คืออะไร", "การตรวจสอบเรียลไทม์คืออะไร", "什么是实时监控"],
        "content": """Real-time monitoring is the continuous observation and tracking of systems or data as events happen, allowing immediate response or adjustments.

---

การตรวจสอบแบบเรียลไทม์คือการติดตามและเฝ้าดูระบบหรือข้อมูลแบบต่อเนื่องในขณะที่เหตุการณ์กำลังเกิดขึ้น เพื่อให้สามารถตอบสนองหรือปรับเปลี่ยนได้ทันที

---

实时监控是对系统或数据进行持续观察和跟踪的过程，以便在事件发生时立即响应或调整。"""
    },
    "predictive_maintenance": {
        "keywords": ["what is predictive maintenance", "predictive maintenance คือ", "การบำรุงรักษาเชิงคาดการณ์คืออะไร", "什么是预测性维护"],
        "content": """Predictive maintenance uses data and AI to predict when equipment will fail, allowing maintenance before a breakdown occurs.

---

การบำรุงรักษาเชิงคาดการณ์คือการใช้ข้อมูลและ AI เพื่อทำนายการเสียของอุปกรณ์ และซ่อมแซมก่อนที่ความเสียหายจะเกิดขึ้นจริง

---

预测性维护利用数据和人工智能预测设备故障的时间，从而在设备损坏前进行维护。"""
    },
    "occupant_comfort": {
        "keywords": ["what is occupant comfort", "occupant comfort คือ", "ความสบายของผู้ใช้อาคารคืออะไร", "什么是居住者舒适度"],
        "content": """Occupant comfort refers to the physical and psychological well-being of people inside a building, influenced by factors like temperature, lighting, and air quality.

---

ความสบายของผู้ใช้อาคารหมายถึงความเป็นอยู่ที่ดีทั้งทางกายภาพและจิตใจของผู้อยู่อาศัย เช่น อุณหภูมิ แสง และคุณภาพอากาศ

---

居住者舒适度指建筑内部人员的身心舒适度，受温度、照明和空气质量等因素影响。"""
    },
    "environmental_services": {
        "keywords": ["what is environmental services", "what are environmental services", "environmental services คือ", "บริการด้านสิ่งแวดล้อมคืออะไร", "什么是环境服务"],
        "content": """Environmental services involve managing and protecting natural resources through waste management, pollution control, and sustainability programs.

---

บริการด้านสิ่งแวดล้อมคือการจัดการและปกป้องทรัพยากรธรรมชาติ เช่น การจัดการของเสีย การควบคุมมลพิษ และการพัฒนาอย่างยั่งยืน

---

环境服务包括通过废物管理、污染控制和可持续发展计划来管理和保护自然资源。"""
    },
    "energy_saving": {
        "keywords": ["what is energy saving", "energy saving คือ", "การประหยัดพลังงานคืออะไร", "ประหยัดพลังงานคืออะไร", "什么是节能"],
        "content": """Energy saving means reducing energy use through efficient technologies, behavior, or design, to lower costs and environmental impact.

---

การประหยัดพลังงานหมายถึงการลดการใช้พลังงานผ่านเทคโนโลยีที่มีประสิทธิภาพ พฤติกรรมที่เหมาะสม หรือการออกแบบที่ดี

---

节能是通过高效技术、行为或设计减少能源使用，从而降低成本和环境影响。"""
    },
    "environmental_footprints": {
        "keywords": ["what is environmental footprints", "what are environmental footprints", "environmental footprints คือ", "รอยเท้าสิ่งแวดล้อมคืออะไร", "什么是环境足迹"],
        "content": """Environmental footprints measure the total impact of human activities on the environment, including energy use, emissions, and resource consumption.

---

รอยเท้าสิ่งแวดล้อมหมายถึงผลกระทบทั้งหมดที่กิจกรรมของมนุษย์มีต่อสิ่งแวดล้อม เช่น การใช้พลังงาน การปล่อยคาร์บอน และการใช้ทรัพยากร

---

环境足迹衡量人类活动对环境的总影响，包括能源使用、排放和资源消耗。"""
    },
    "security_system": {
        "keywords": ["what is security system", "security system คือ", "ระบบรักษาความปลอดภัยคืออะไร", "ระบบความปลอดภัยคืออะไร", "什么是安防系统"],
        "content": """A security system is a set of devices and software designed to protect buildings or data from unauthorized access, theft, or harm.

---

ระบบรักษาความปลอดภัยคือชุดอุปกรณ์และซอฟต์แวร์ที่ออกแบบมาเพื่อป้องกันอาคารหรือข้อมูลจากการเข้าถึงโดยไม่ได้รับอนุญาตหรือการโจรกรรม

---

安防系统是一组设备和软件，用于保护建筑或数据免受未经授权的访问、盗窃或破坏。"""
    },
    "access_control": {
        "keywords": ["what is access control", "access control คือ", "การควบคุมการเข้าถึงคืออะไร", "ควบคุมการเข้าถึงคืออะไร", "什么是门禁控制"],
        "content": """Access control is a security process that restricts or grants entry to specific areas, systems, or information based on authorization.

---

การควบคุมการเข้าถึงคือกระบวนการรักษาความปลอดภัยที่จำกัดหรืออนุญาตให้บุคคลเข้าถึงพื้นที่หรือข้อมูลตามสิทธิ์ที่กำหนด

---

门禁控制是一种安全管理过程，根据授权限制或允许进入特定区域、系统或信息。"""
    },
    "green_construction": {
        "keywords": ["what is green construction", "green construction คือ", "การก่อสร้างสีเขียวคืออะไร", "การก่อสร้างเขียวคืออะไร", "什么是绿色施工"],
        "content": """Green construction involves building practices that are sustainable, energy-efficient, and environmentally responsible.

---

การก่อสร้างสีเขียวคือแนวทางการก่อสร้างที่ยั่งยืน มีประสิทธิภาพด้านพลังงาน และเป็นมิตรต่อสิ่งแวดล้อม

---

绿色施工是指可持续、节能且对环境负责的建筑实践。"""
    },
    "fitout": {
        "keywords": ["what is fit out", "what is fitout", "what is fit-out", "fit out คือ", "fit-out คือ", "งานตกแต่งภายในคืออะไร", "什么是室内装修"],
        "content": """Fit Out refers to the process of furnishing and equipping interior spaces to make them functional and ready for use.

---

งานตกแต่งภายใน (Fit Out) หมายถึงกระบวนการตกแต่งและติดตั้งอุปกรณ์ภายในอาคารให้พร้อมใช้งาน

---

室内装修是为使空间具备功能性并可投入使用而进行的布置与设备安装过程。"""
    },
    "renovation": {
        "keywords": ["what is renovation", "renovation คือ", "การปรับปรุงหรือรีโนเวทคืออะไร", "รีโนเวทคืออะไร", "การรีโนเวทคืออะไร", "什么是翻新"],
        "content": """Renovation means restoring, repairing, or upgrading existing buildings to improve functionality or appearance.

---

การปรับปรุงหรือรีโนเวทคือการซ่อมแซมหรือปรับปรุงอาคารเดิมให้ดีขึ้นทั้งในด้านรูปลักษณ์และการใช้งาน

---

翻新是修复、改进或升级现有建筑的过程，以提升功能或外观。"""
    },
    "reinstatement": {
        "keywords": ["what is reinstatement", "reinstatement คือ", "การคืนสภาพคืออะไร", "什么是恢复原状"],
        "content": """Reinstatement is the process of returning a property to its original condition, often after a lease ends or construction work is completed.

---

การคืนสภาพคือการนำทรัพย์สินหรืออาคารกลับคืนสู่สภาพเดิม มักทำหลังจากหมดสัญญาเช่าหรือหลังงานก่อสร้างเสร็จสิ้น

---

恢复原状是将物业恢复至原始状态的过程，通常发生在租约结束或施工完成后。"""
    },
    "vertical_garden": {
        "keywords": ["what is vertical garden", "vertical garden คือ", "สวนแนวตั้งคืออะไร", "什么是垂直花园"],
        "content": """A Vertical Garden is a structure where plants grow on vertically suspended panels, used for aesthetics, insulation, and air purification.

---

สวนแนวตั้งคือโครงสร้างที่ปลูกต้นไม้ในแนวตั้ง เพื่อความสวยงาม ฉนวนกันความร้อน และช่วยฟอกอากาศ

---

垂直花园是一种植物在垂直悬挂面板上生长的结构，用于美化、隔热和净化空气。"""
    },
    "smart_home": {
        "keywords": ["what is smart home", "smart home คือ", "บ้านอัจฉริยะคืออะไร", "บ้านสมาร์ทคืออะไร", "什么是智能家居"],
        "content": """A Smart Home uses interconnected devices and automation systems to control lighting, temperature, appliances, and security remotely.

---

บ้านอัจฉริยะคือบ้านที่ใช้เทคโนโลยีและระบบอัตโนมัติในการควบคุมไฟฟ้า อุณหภูมิ เครื่องใช้ไฟฟ้า และระบบรักษาความปลอดภัยได้จากระยะไกล

---

智能家居通过互联设备和自动化系统远程控制照明、温度、电器和安防系统。"""
    },
    "smart_farming": {
        "keywords": ["what is smart farming", "smart farming คือ", "เกษตรอัจฉริยะคืออะไร", "เกษตรสมาร์ทคืออะไร", "การเกษตรอัจฉริยะคืออะไร", "什么是智慧农业"],
        "content": """Smart farming uses IoT, sensors, and AI technologies to optimize agricultural production, reduce waste, and improve efficiency.

---

เกษตรอัจฉริยะคือการใช้เทคโนโลยี IoT เซนเซอร์ และ AI เพื่อเพิ่มประสิทธิภาพการผลิต ลดของเสีย และเพิ่มผลผลิตทางการเกษตร

---

智慧农业利用物联网（IoT）、传感器和人工智能技术优化农业生产、减少浪费并提高效率。"""
    },
    "website": {
        "keywords": ["what is a website", "website คือ", "เว็บไซต์คืออะไร", "什么是网站"],
        "content": """A website is a collection of web pages accessible via the internet, typically under a single domain name.

---

เว็บไซต์คือชุดของหน้าเว็บที่สามารถเข้าถึงได้ผ่านอินเทอร์เน็ต ภายใต้ชื่อโดเมนเดียวกัน

---

网站是一组网页的集合，可通过互联网访问，通常位于同一个域名下。"""
    },
    "website_development": {
        "keywords": ["what is website development", "website development คือ", "การพัฒนาเว็บไซต์คืออะไร", "พัฒนาเว็บไซต์คืออะไร", "什么是网站开发"],
        "content": """Website development is the process of designing, coding, and maintaining websites to ensure functionality, accessibility, and performance.

---

การพัฒนาเว็บไซต์คือกระบวนการออกแบบ เขียนโค้ด และดูแลเว็บไซต์ให้สามารถทำงานได้อย่างมีประสิทธิภาพและเข้าถึงได้ง่าย

---

网站开发是设计、编程和维护网站的过程，以确保其功能性、可访问性和性能。"""
    },
    "seo_definition": {
        "keywords": ["what is seo", "seo คือ", "seo คืออะไร", "什么是seo"],
        "content": """SEO (Search Engine Optimization) is the practice of improving a website's visibility in search engine results to attract more organic traffic.

---

SEO (Search Engine Optimization) คือการปรับปรุงเว็บไซต์ให้ติดอันดับสูงในการค้นหาผ่านเสิร์ชเอนจิน เพื่อเพิ่มจำนวนผู้เข้าชมแบบธรรมชาติ

---

SEO（搜索引擎优化）是提高网站在搜索引擎结果中可见度的实践，以吸引更多自然流量。"""
    },
    "coding_definition": {
        "keywords": ["what is coding", "coding คือ", "การเขียนโค้ดคืออะไร", "什么是编程"],
        "content": """Coding is the process of writing instructions in a programming language to create software, applications, or websites.

---

การเขียนโค้ดคือกระบวนการเขียนคำสั่งด้วยภาษาคอมพิวเตอร์เพื่อสร้างซอฟต์แวร์ แอปพลิเคชัน หรือเว็บไซต์

---

编程是用编程语言编写指令的过程，用于创建软件、应用程序或网站。"""
    },
    "contact_phone": {
        "keywords": ["what is your phone number", "your phone number", "phone number", "เบอร์โทร", "หมายเลขโทรศัพท์ของคุณคืออะไร", "เบอร์โทรศัพท์คืออะไร", "เบอร์ติดต่อ", "你的电话号码"],
        "content": """You can contact us at +66 (0)81 854 4291

---

คุณสามารถติดต่อฉันได้ที่ +66 (0)81 854 4291

---

您可以拨打 +66 (0)81 854 4291 联系我们。"""
    },
    "contact_email": {
        "keywords": ["what is your email", "your email", "email address", "อีเมล", "อีเมลของคุณคืออะไร", "อีเมลคืออะไร", "อีเมลติดต่อ", "你的电子邮件"],
        "content": """You can email me through cblue.thailand@gmail.com

---

คุณสามารถส่งอีเมลถึงฉันได้ที่ cblue.thailand@gmail.com

---

您可以通过 cblue.thailand@gmail.com 给我发送电子邮件。"""
    },
    "green_architecture_alt1": {
        "keywords": ["สถาปัตยกรรมที่เป็นมิตรต่อสิ่งแวดล้อมคืออะไร", "สถาปัตยกรรมที่เป็นมิตรต่อสิ่งแวดล้อม", "อะไรคือสถาปัตยกรรมที่เป็นมิตรต่อสิ่งแวดล้อม"],
        "content": """Green Architecture is an environmentally conscious design approach that reduces energy use, minimizes waste, and promotes sustainability in building construction.

---

สถาปัตยกรรมสีเขียวคือแนวคิดการออกแบบอาคารที่คำนึงถึงสิ่งแวดล้อม เน้นการประหยัดพลังงาน ลดของเสีย และสร้างความยั่งยืน

---

绿色建筑是一种注重环境保护的设计方法，旨在减少能源消耗、减少浪费并促进建筑可持续性。"""
    },
    "eco_friendly_construction": {
        "keywords": ["การก่อสร้างที่เป็นมิตรต่อสิ่งแวดล้อมคืออะไร", "ก่อสร้างที่เป็นมิตรต่อสิ่งแวดล้อมคืออะไร", "การก่อสร้างสีเขียวคืออะไร", "ก่อสร้างสีเขียวคืออะไร", "การก่อสร้างเขียวคืออะไร", "ก่อสร้างเขียวคืออะไร", "อะไรคือการก่อสร้างที่เป็นมิตรต่อสิ่งแวดล้อม", "อะไรคือก่อสร้างที่เป็นมิตรต่อสิ่งแวดล้อม", "อะไรคือการก่อสร้างสีเขียว", "อะไรคือก่อสร้างสีเขียว", "อะไรคือการก่อสร้างเขียว", "อะไรคือก่อสร้างเขียว", "เป็นมิตรต่อสิ่งแวดล้อมหมายถึง", "อะไรคือเป็นมิตรต่อสิ่งแวดล้อมหมายถึง"],
        "content": """Eco-friendly refers to products or practices that cause minimal harm to the environment.

---

เป็นมิตรต่อสิ่งแวดล้อมหมายถึงผลิตภัณฑ์หรือวิธีการที่ส่งผลกระทบต่อสิ่งแวดล้อมน้อยที่สุด

---

环保是指对环境危害最小的产品、做法或系统。"""
    },
    "ai_variations_th": {
        "keywords": ["ปัญญาประดิษฐ์คืออะไร", "เอไอคืออะไร", "อะไรคือปัญญาประดิษฐ์", "อะไรคือเอไอ", "ปัญญาประดิษฐ์", "เอไอ"],
        "content": """AI (Artificial Intelligence) is the simulation of human intelligence in machines that are programmed to think, reason, learn, and make decisions like humans.

---

ปัญญาประดิษฐ์ คือการจำลองความฉลาดของมนุษย์ในเครื่องจักรที่ถูกโปรแกรมให้สามารถคิด วิเคราะห์ เรียนรู้ และตัดสินใจได้เหมือนมนุษย์

---

人工智能（AI）是指在机器中模拟人类智能的技术，使其能够像人类一样思考、推理、学习和做出决策。"""
    },
    "chatbot_variations_th": {
        "keywords": ["แชตบอท", "อะไรคือแชตบอท"],
        "content": """A chatbot is a software application that can converse with users through text or voice, often used to provide information or automate customer service tasks.

---

แชตบอทคือโปรแกรมซอฟต์แวร์ที่สามารถสนทนากับผู้ใช้งานผ่านข้อความหรือเสียง มักใช้เพื่อให้ข้อมูลหรือช่วยงานบริการลูกค้าแบบอัตโนมัติ

---

聊天机器人是一种软件应用程序，可以通过文字或语音与用户进行对话，通常用于提供信息或自动化客户服务任务。"""
    },
    "ai_chatbot_dev_variations_th": {
        "keywords": ["การพัฒนาแชตบอท AI", "อะไรคือการพัฒนาแชตบอท AI"],
        "content": """AI chatbot development is the process of building chatbots that use artificial intelligence and natural language processing (NLP) to understand, learn from, and respond intelligently to user inputs.

---

การพัฒนาแชตบอท AI คือกระบวนการสร้างแชตบอทที่ใช้เทคโนโลยีปัญญาประดิษฐ์และการประมวลผลภาษาธรรมชาติ (NLP) เพื่อให้เข้าใจ เรียนรู้ และตอบสนองต่อผู้ใช้อย่างชาญฉลาด

---

AI聊天机器人开发是构建使用人工智能和自然语言处理（NLP）技术的聊天机器人的过程，使其能够理解、学习并智能地回应用户输入。"""
    },
    "chatbot_dev_variations_th": {
        "keywords": ["การพัฒนาแชตบอท", "อะไรคือการพัฒนาแชตบอท"],
        "content": """Chatbot development is the creation of automated conversational programs that can interact with users through predefined rules, scripts, or AI-based understanding.

---

การพัฒนาแชตบอทคือการสร้างโปรแกรมสนทนาอัตโนมัติที่สามารถโต้ตอบกับผู้ใช้ได้ตามกฎที่ตั้งไว้ล่วงหน้า หรือโดยใช้ความเข้าใจจาก AI

---

聊天机器人开发是创建能通过预设规则、脚本或基于AI理解与用户互动的自动化对话程序的过程。"""
    },
    "software_variations_th": {
        "keywords": ["ซอฟต์แวร์", "อะไรคือซอฟต์แวร์"],
        "content": """Software is a set of instructions, programs, or data that tell a computer how to perform specific tasks or functions.

---

ซอฟต์แวร์คือชุดคำสั่ง โปรแกรม หรือข้อมูลที่บอกคอมพิวเตอร์ให้ทำงานหรือดำเนินการตามที่กำหนดไว้

---

软件是一组指令、程序或数据，用来告诉计算机如何执行特定任务或功能。"""
    },
    "software_dev_variations_th": {
        "keywords": ["การพัฒนาซอฟต์แวร์", "อะไรคือการพัฒนาซอฟต์แวร์"],
        "content": """Software development is the process of designing, coding, testing, and maintaining applications, systems, or programs to meet user needs.

---

การพัฒนาซอฟต์แวร์คือกระบวนการออกแบบ เขียนโค้ด ทดสอบ และดูแลรักษาโปรแกรมหรือระบบ เพื่อให้ตอบสนองความต้องการของผู้ใช้งาน

---

软件开发是设计、编程、测试和维护应用程序、系统或程序的过程，以满足用户需求。"""
    },
    "machine_learning_variations_th": {
        "keywords": ["การเรียนรู้ของเครื่อง", "อะไรคือการเรียนรู้ของเครื่อง"],
        "content": """Machine Learning (ML) is a branch of AI that enables computers to learn from data and improve their performance without being explicitly programmed.

---

การเรียนรู้ของเครื่อง (Machine Learning - ML) คือสาขาหนึ่งของ AI ที่ทำให้คอมพิวเตอร์สามารถเรียนรู้จากข้อมูลและปรับปรุงประสิทธิภาพได้โดยไม่ต้องเขียนโปรแกรมใหม่ทั้งหมด

---

机器学习（ML）是人工智能的一个分支，使计算机能够从数据中学习并不断提高性能，而无需明确编程。"""
    },
    "ml_variations_th": {
        "keywords": ["ML", "อะไรคือML"],
        "content": """ML stands for Machine Learning — a field of AI that allows computers to automatically learn patterns and make predictions from data.

---

ML คือคำย่อของ Machine Learning ซึ่งเป็นเทคโนโลยี AI ที่ช่วยให้คอมพิวเตอร์เรียนรู้รูปแบบข้อมูลและสามารถคาดการณ์หรือวิเคราะห์ได้โดยอัตโนมัติ

---

ML是机器学习（Machine Learning）的缩写，是人工智能的一个领域，使计算机能够自动学习数据模式并进行预测。"""
    },
    "machine_variations_th": {
        "keywords": ["เครื่องจักร", "อะไรคือเครื่องจักร"],
        "content": """A machine is a device or system that performs work or processes tasks using mechanical, electrical, or computational power.

---

เครื่องจักรคืออุปกรณ์หรือระบบที่ทำงานหรือประมวลผลโดยใช้พลังงานกล ไฟฟ้า หรือการคำนวณ

---

机器是使用机械、电气或计算能力来执行工作或处理任务的装置或系统。"""
    },
    "learning_variations_th": {
        "keywords": ["การเรียนรู้", "อะไรคือการเรียนรู้"],
        "content": """Learning is the process of acquiring knowledge, understanding, or skills through study, experience, or teaching.

---

การเรียนรู้คือกระบวนการได้รับความรู้ ความเข้าใจ หรือทักษะ ผ่านการศึกษา ประสบการณ์ หรือการฝึกสอน

---

学习是通过研究、经验或教学获得知识、理解或技能的过程。"""
    },
    "computer_variations_th": {
        "keywords": ["คอมพิวเตอร์", "อะไรคือคอมพิวเตอร์"],
        "content": """Computers are electronic devices that process data using instructions (software) to perform calculations, store information, and execute tasks.

---

คอมพิวเตอร์คืออุปกรณ์อิเล็กทรอนิกส์ที่ประมวลผลข้อมูลตามคำสั่ง (ซอฟต์แวร์) เพื่อคำนวณ จัดเก็บข้อมูล และดำเนินการต่าง ๆ

---

计算机是一种电子设备，通过执行指令（软件）来处理数据、进行计算、存储信息并执行任务。"""
    },
    "data_variations_th": {
        "keywords": ["ข้อมูล", "อะไรคือข้อมูล"],
        "content": """Data is information in raw or structured form, such as numbers, text, or images, that can be processed or analyzed by computers.

---

ข้อมูลคือข้อเท็จจริงหรือสารสนเทศในรูปแบบดิบหรือโครงสร้าง เช่น ตัวเลข ข้อความ หรือภาพ ที่สามารถนำไปประมวลผลหรือวิเคราะห์ได้

---

数据是以原始或结构化形式存在的信息，如数字、文本或图像，计算机可以处理或分析这些信息。"""
    },
    "solar_variations_th": {
        "keywords": ["พลังงานแสงอาทิตย์", "อะไรคือพลังงานแสงอาทิตย์"],
        "content": """Solar refers to energy derived from the sun's radiation, which can be converted into electricity or heat.

---

พลังงานแสงอาทิตย์หมายถึงพลังงานที่ได้จากรังสีของดวงอาทิตย์ ซึ่งสามารถเปลี่ยนเป็นพลังงานไฟฟ้าหรือความร้อนได้

---

太阳能指来自太阳辐射的能量，可以转化为电能或热能。"""
    },
    "solar_solutions_variations_th": {
        "keywords": ["โซลูชันพลังงานแสงอาทิตย์", "อะไรคือโซลูชันพลังงานแสงอาทิตย์"],
        "content": """Solar Solutions are systems or services that use solar energy technologies (like solar panels or solar water heaters) to provide renewable power or heating.

---

โซลูชันพลังงานแสงอาทิตย์หมายถึงระบบหรือบริการที่ใช้เทคโนโลยีพลังงานแสงอาทิตย์ (เช่น แผงโซลาร์เซลล์ หรือเครื่องทำน้ำร้อนพลังงานแสงอาทิตย์) เพื่อผลิตพลังงานหมุนเวียนหรือให้ความร้อน

---

太阳能解决方案是利用太阳能技术（如太阳能电池板或太阳能热水器）来提供可再生能源或供热的系统或服务。"""
    },
    "technology_variations_th": {
        "keywords": ["เทคโนโลยี", "อะไรคือเทคโนโลยี"],
        "content": """Technologies are tools, systems, or methods developed using scientific knowledge to solve problems or improve human life.

---

เทคโนโลยีคือเครื่องมือ ระบบ หรือวิธีการที่ถูกพัฒนาด้วยความรู้ทางวิทยาศาสตร์ เพื่อแก้ปัญหาหรือพัฒนาคุณภาพชีวิตมนุษย์

---

技术是利用科学知识开发的工具、系统或方法，用于解决问题或改善人类生活。"""
    },
    "ev_variations_th": {
        "keywords": ["EV", "อะไรคือEV"],
        "content": """EV stands for Electric Vehicle — a vehicle powered by electricity stored in batteries instead of fossil fuels.

---

EV ย่อมาจาก Electric Vehicle หมายถึงยานพาหนะที่ขับเคลื่อนด้วยพลังงานไฟฟ้าที่เก็บในแบตเตอรี่แทนน้ำมันเชื้อเพลิง

---

EV是电动汽车（Electric Vehicle）的缩写，指使用储存在电池中的电能而非化石燃料驱动的车辆。"""
    },
    "ev_charger_variations_th": {
        "keywords": ["เครื่องชาร์จรถยนต์ไฟฟ้า", "อะไรคือเครื่องชาร์จรถยนต์ไฟฟ้า"],
        "content": """An EV charger is a device that supplies electric energy to recharge the battery of an electric vehicle.

---

เครื่องชาร์จรถยนต์ไฟฟ้าคืออุปกรณ์ที่จ่ายพลังงานไฟฟ้าเพื่อชาร์จแบตเตอรี่ของรถยนต์ไฟฟ้า

---

电动车充电器是一种为电动车电池充电的设备。"""
    },
    "wifi_variations_th": {
        "keywords": ["Wi-Fi", "อะไรคือWi-Fi"],
        "content": """Wi-Fi is a wireless networking technology that allows devices to connect to the internet or communicate without physical cables.

---

Wi-Fi คือเทคโนโลยีเครือข่ายไร้สายที่ช่วยให้อุปกรณ์เชื่อมต่ออินเทอร์เน็ตหรือสื่อสารกันได้โดยไม่ต้องใช้สายเคเบิล

---

Wi-Fi是一种无线网络技术，允许设备在不使用物理电缆的情况下连接到互联网或进行通信。"""
    },
    "green_arch_combined_th": {
        "keywords": ["สถาปัตยกรรมสีเขียว สถาปัตยกรรมเขียว", "อะไรคือสถาปัตยกรรมสีเขียว อะไรคือสถาปัตยกรรมเขียว"],
        "content": """Green Architecture is an environmentally conscious design approach that reduces energy use, minimizes waste, and promotes sustainability in building construction.

---

สถาปัตยกรรมสีเขียวคือแนวคิดการออกแบบอาคารที่คำนึงถึงสิ่งแวดล้อม เน้นการประหยัดพลังงาน ลดของเสีย และสร้างความยั่งยืน

---

绿色建筑是一种注重环境保护的设计方法，旨在减少能源消耗、减少浪费并促进建筑可持续性。"""
    },
    "hvac_variations_th": {
        "keywords": ["HVAC", "อะไรคือHVAC"],
        "content": """HVAC stands for Heating, Ventilation, and Air Conditioning — systems used to regulate indoor climate and air quality.

---

HVAC ย่อมาจาก Heating, Ventilation, and Air Conditioning คือระบบที่ควบคุมอุณหภูมิ การระบายอากาศ และคุณภาพอากาศภายในอาคาร

---

HVAC是供暖（Heating）、通风（Ventilation）和空调（Air Conditioning）的缩写，用于调节室内气候和空气质量的系统。"""
    },
    "mep_variations_th": {
        "keywords": ["MEP", "อะไรคือMEP"],
        "content": """MEP stands for Mechanical, Electrical, and Plumbing — the essential engineering systems integrated into building design and construction.

---

MEP ย่อมาจาก Mechanical, Electrical, and Plumbing คือระบบวิศวกรรมสำคัญที่ใช้ในการออกแบบและก่อสร้างอาคาร

---

MEP代表机械（Mechanical）、电气（Electrical）和管道（Plumbing）工程，是建筑设计和施工中不可或缺的系统。"""
    },
    "retrofit_variations_th": {
        "keywords": ["การปรับปรุงระบบ", "อะไรคือการปรับปรุงระบบ"],
        "content": """Retrofit means upgrading or modifying existing buildings or systems to improve energy efficiency, performance, or sustainability.

---

การปรับปรุงระบบ หมายถึงการอัปเกรดหรือปรับเปลี่ยนสิ่งปลูกสร้างหรือระบบเดิมให้มีประสิทธิภาพและประหยัดพลังงานมากขึ้น

---

改造是指升级或修改现有建筑或系统，以提高能源效率、性能或可持续性。"""
    },
    "controls_variations_th": {
        "keywords": ["ระบบควบคุม", "อะไรคือระบบควบคุม"],
        "content": """Controls refer to systems or devices that manage and regulate equipment operations, such as temperature, lighting, or security systems.

---

ระบบควบคุมหมายถึงอุปกรณ์หรือระบบที่ใช้ในการจัดการและควบคุมการทำงานของอุปกรณ์ เช่น ระบบไฟฟ้า อุณหภูมิ หรือระบบรักษาความปลอดภัย

---

控制系统是用于管理和调节设备运行（如温度、照明或安全系统）的系统或装置。"""
    },
    "automation_variations_th": {
        "keywords": ["ระบบอัตโนมัติ", "อะไรคือระบบอัตโนมัติ"],
        "content": """Automation is the use of technology to perform tasks automatically without human intervention.

---

ระบบอัตโนมัติหมายถึงการใช้เทคโนโลยีเพื่อให้เครื่องจักรหรือระบบทำงานได้โดยไม่ต้องมีการควบคุมจากมนุษย์

---

自动化是利用技术自动执行任务的过程，无需人工干预。"""
    },
    "bas_variations_th": {
        "keywords": ["BAS", "อะไรคือBAS"],
        "content": """BAS stands for Building Automation System — a centralized system that monitors and controls building functions like HVAC, lighting, and security.

---

BAS ย่อมาจาก Building Automation System คือระบบควบคุมส่วนกลางที่ใช้ในการตรวจสอบและจัดการการทำงานต่าง ๆ ของอาคาร เช่น HVAC แสงสว่าง และระบบความปลอดภัย

---

BAS是楼宇自动化系统（Building Automation System）的缩写，是一个集中控制HVAC、照明和安全等建筑功能的系统。"""
    },
    "smart_building_variations_th": {
        "keywords": ["อาคารอัจฉริยะ", "อะไรคืออาคารอัจฉริยะ"],
        "content": """A Smart Building uses technology and sensors to automatically control and optimize operations such as lighting, temperature, and energy use for efficiency and comfort.

---

อาคารอัจฉริยะคืออาคารที่ใช้เทคโนโลยีและเซนเซอร์เพื่อควบคุมและเพิ่มประสิทธิภาพการทำงาน เช่น ระบบไฟฟ้า อุณหภูมิ และการใช้พลังงาน

---

智慧建筑利用技术和传感器自动控制与优化照明、温度和能源使用等操作，以提高效率和舒适度。"""
    },
    "realtime_monitoring_variations_th": {
        "keywords": ["การตรวจสอบแบบเรียลไทม์", "อะไรคือการตรวจสอบแบบเรียลไทม์"],
        "content": """Real-time monitoring is the continuous observation and tracking of systems or data as events happen, allowing immediate response or adjustments.

---

การตรวจสอบแบบเรียลไทม์คือการติดตามและเฝ้าดูระบบหรือข้อมูลแบบต่อเนื่องในขณะที่เหตุการณ์กำลังเกิดขึ้น เพื่อให้สามารถตอบสนองหรือปรับเปลี่ยนได้ทันที

---

实时监控是对系统或数据进行持续观察和跟踪的过程，以便在事件发生时立即响应或调整。"""
    },
    "predictive_maintenance_variations_th": {
        "keywords": ["การบำรุงรักษาเชิงคาดการณ์", "อะไรคือการบำรุงรักษาเชิงคาดการณ์"],
        "content": """Predictive maintenance uses data and AI to predict when equipment will fail, allowing maintenance before a breakdown occurs.

---

การบำรุงรักษาเชิงคาดการณ์คือการใช้ข้อมูลและ AI เพื่อทำนายการเสียของอุปกรณ์ และซ่อมแซมก่อนที่ความเสียหายจะเกิดขึ้นจริง

---

预测性维护利用数据和人工智能预测设备故障的时间，从而在设备损坏前进行维护。"""
    },
    "occupant_comfort_variations_th": {
        "keywords": ["ความสบายของผู้ใช้อาคาร", "อะไรคือความสบายของผู้ใช้อาคาร"],
        "content": """Occupant comfort refers to the physical and psychological well-being of people inside a building, influenced by factors like temperature, lighting, and air quality.

---

ความสบายของผู้ใช้อาคารหมายถึงความเป็นอยู่ที่ดีทั้งทางกายภาพและจิตใจของผู้อยู่อาศัย เช่น อุณหภูมิ แสง และคุณภาพอากาศ

---

居住舒适度指建筑内部人员的身心舒适度，受温度、照明和空气质量等因素影响。"""
    },
    "environmental_services_variations_th": {
        "keywords": ["บริการด้านสิ่งแวดล้อม", "อะไรคือบริการด้านสิ่งแวดล้อม"],
        "content": """Environmental services involve managing and protecting natural resources through waste management, pollution control, and sustainability programs.

---

บริการด้านสิ่งแวดล้อมคือการจัดการและปกป้องทรัพยากรธรรมชาติ เช่น การจัดการของเสีย การควบคุมมลพิษ และการพัฒนาอย่างยั่งยืน

---

环境服务包括通过废物管理、污染控制和可持续发展计划来管理和保护自然资源。"""
    },
    "energy_saving_variations_th": {
        "keywords": ["การประหยัดพลังงาน", "อะไรคือการประหยัดพลังงาน"],
        "content": """Energy saving means reducing energy use through efficient technologies, behavior, or design, to lower costs and environmental impact.

---

การประหยัดพลังงานหมายถึงการลดการใช้พลังงานผ่านเทคโนโลยีที่มีประสิทธิภาพ พฤติกรรมที่เหมาะสม หรือการออกแบบที่ดี

---

节能是通过高效技术、行为或设计减少能源使用，从而降低成本和环境影响。"""
    },
    "environmental_footprint_variations_th": {
        "keywords": ["รอยเท้าสิ่งแวดล้อม", "อะไรคือรอยเท้าสิ่งแวดล้อม"],
        "content": """Environmental footprints measure the total impact of human activities on the environment, including energy use, emissions, and resource consumption.

---

รอยเท้าสิ่งแวดล้อมหมายถึงผลกระทบทั้งหมดที่กิจกรรมของมนุษย์มีต่อสิ่งแวดล้อม เช่น การใช้พลังงาน การปล่อยคาร์บอน และการใช้ทรัพยากร

---

环境足迹衡量人类活动对环境的总影响，包括能源使用、排放和资源消耗。"""
    },
    "security_system_variations_th": {
        "keywords": ["ระบบรักษาความปลอดภัย", "อะไรคือระบบรักษาความปลอดภัย"],
        "content": """A security system is a set of devices and software designed to protect buildings or data from unauthorized access, theft, or harm.

---

ระบบรักษาความปลอดภัยคือชุดอุปกรณ์และซอฟต์แวร์ที่ออกแบบมาเพื่อป้องกันอาคารหรือข้อมูลจากการเข้าถึงโดยไม่ได้รับอนุญาตหรือการโจรกรรม

---

安防系统是一组设备和软件，用于保护建筑或数据免受未经授权的访问、盗窃或破坏。"""
    },
    "access_control_variations_th": {
        "keywords": ["การควบคุมการเข้าถึง", "อะไรคือการควบคุมการเข้าถึง"],
        "content": """Access control is a security process that restricts or grants entry to specific areas, systems, or information based on authorization.

---

การควบคุมการเข้าถึงคือกระบวนการรักษาความปลอดภัยที่จำกัดหรืออนุญาตให้บุคคลเข้าถึงพื้นที่หรือข้อมูลตามสิทธิ์ที่กำหนด

---

门禁控制是一种安全管理过程，根据授权限制或允许进入特定区域、系统或信息。"""
    },
    "green_construction_variations_th": {
        "keywords": ["การก่อสร้างสีเขียว", "อะไรคือการก่อสร้างสีเขียว"],
        "content": """Green construction involves building practices that are sustainable, energy-efficient, and environmentally responsible.

---

การก่อสร้างสีเขียวคือแนวทางการก่อสร้างที่ยั่งยืน มีประสิทธิภาพด้านพลังงาน และเป็นมิตรต่อสิ่งแวดล้อม

---

绿色施工是指可持续、节能且对环境负责的建筑实践。"""
    },
    "fitout_variations_th": {
        "keywords": ["งานตกแต่งภายใน", "อะไรคืองานตกแต่งภายใน"],
        "content": """Fit Out refers to the process of furnishing and equipping interior spaces to make them functional and ready for use.

---

งานตกแต่งภายใน หมายถึงกระบวนการตกแต่งและติดตั้งอุปกรณ์ภายในอาคารให้พร้อมใช้งาน

---

室内装修是为使空间具备功能性并可投入使用而进行的布置与设备安装过程。"""
    },
    "renovation_variations_th": {
        "keywords": ["การปรับปรุงหรือรีโนเวท", "อะไรคือการปรับปรุงหรือรีโนเวท"],
        "content": """Renovation means restoring, repairing, or upgrading existing buildings to improve functionality or appearance.

---

การปรับปรุงหรือรีโนเวทคือการซ่อมแซมหรือปรับปรุงอาคารเดิมให้ดีขึ้นทั้งในด้านรูปลักษณ์และการใช้งาน

---

翻新是修复、改进或升级现有建筑的过程，以提升功能或外观。"""
    },
    "reinstatement_variations_th": {
        "keywords": ["การคืนสภาพ", "อะไรคือการคืนสภาพ"],
        "content": """Reinstatement is the process of returning a property to its original condition, often after a lease ends or construction work is completed.

---

การคืนสภาพคือการนำทรัพย์สินหรืออาคารกลับคืนสู่สภาพเดิม มักทำหลังจากหมดสัญญาเช่าหรือหลังงานก่อสร้างเสร็จสิ้น

---

恢复原状是将物业恢复至原始状态的过程，通常发生在租约结束或施工完成后。"""
    },
    "vertical_garden_variations_th": {
        "keywords": ["สวนแนวตั้ง", "อะไรคือสวนแนวตั้ง"],
        "content": """A Vertical Garden is a structure where plants grow on vertically suspended panels, used for aesthetics, insulation, and air purification.

---

สวนแนวตั้งคือโครงสร้างที่ปลูกต้นไม้ในแนวตั้ง เพื่อความสวยงาม ฉนวนกันความร้อน และช่วยฟอกอากาศ

---

垂直花园是一种植物在垂直悬挂面板上生长的结构，用于美化、隔热和净化空气。"""
    },
    "smart_home_variations_th": {
        "keywords": ["บ้านอัจฉริยะ", "อะไรคือบ้านอัจฉริยะ"],
        "content": """A Smart Home uses interconnected devices and automation systems to control lighting, temperature, appliances, and security remotely.

---

บ้านอัจฉริยะคือบ้านที่ใช้เทคโนโลยีและระบบอัตโนมัติในการควบคุมไฟฟ้า อุณหภูมิ เครื่องใช้ไฟฟ้า และระบบรักษาความปลอดภัยได้จากระยะไกล

---

智能家居通过互联设备和自动化系统远程控制照明、温度、电器和安防系统。"""
    },
    "smart_farming_variations_th": {
        "keywords": ["เกษตรอัจฉริยะ", "อะไรคือเกษตรอัจฉริยะ"],
        "content": """Smart farming uses IoT, sensors, and AI technologies to optimize agricultural production, reduce waste, and improve efficiency.

---

เกษตรอัจฉริยะคือการใช้เทคโนโลยี IoT เซนเซอร์ และ AI เพื่อเพิ่มประสิทธิภาพการผลิต ลดของเสีย และเพิ่มผลผลิตทางการเกษตร

---

智慧农业利用物联网（IoT）、传感器和人工智能技术优化农业生产、减少浪费并提高效率。"""
    },
    "website_variations_th": {
        "keywords": ["เว็บไซต์คื", "อะไรคือเว็บไซต์คื"],
        "content": """A website is a collection of web pages accessible via the internet, typically under a single domain name.

---

เว็บไซต์คือชุดของหน้าเว็บที่สามารถเข้าถึงได้ผ่านอินเทอร์เน็ต ภายใต้ชื่อโดเมนเดียวกัน

---

网站是一组网页的集合，可通过互联网访问，通常位于同一个域名下。"""
    },
    "website_dev_variations_th": {
        "keywords": ["การพัฒนาเว็บไซต์", "อะไรคือการพัฒนาเว็บไซต์"],
        "content": """Website development is the process of designing, coding, and maintaining websites to ensure functionality, accessibility, and performance.

---

การพัฒนาเว็บไซต์คือกระบวนการออกแบบ เขียนโค้ด และดูแลเว็บไซต์ให้สามารถทำงานได้อย่างมีประสิทธิภาพและเข้าถึงได้ง่าย

---

网站开发是设计、编程和维护网站的过程，以确保其功能性、可访问性和性能。"""
    },
    "seo_variations_th": {
        "keywords": ["SEO", "อะไรคือSEO"],
        "content": """SEO (Search Engine Optimization) is the practice of improving a website's visibility in search engine results to attract more organic traffic.

---

SEO (Search Engine Optimization) คือการปรับปรุงเว็บไซต์ให้ติดอันดับสูงในการค้นหาผ่านเสิร์ชเอนจิน เพื่อเพิ่มจำนวนผู้เข้าชมแบบธรรมชาติ

---

SEO（搜索引擎优化）是提高网站在搜索引擎结果中可见度的实践，以吸引更多自然流量。"""
    },
    "coding_variations_th": {
        "keywords": ["การเขียนโค้ด", "อะไรคือการเขียนโค้ด"],
        "content": """Coding is the process of writing instructions in a programming language to create software, applications, or websites.

---

การเขียนโค้ดคือกระบวนการเขียนคำสั่งด้วยภาษาคอมพิวเตอร์เพื่อสร้างซอฟต์แวร์ แอปพลิเคชัน หรือเว็บไซต์

---

编程是用编程语言编写指令的过程，用于创建软件、应用程序或网站。"""
    },
    "phone_variations_th": {
        "keywords": ["หมายเลขโทรศัพท์ของคุณค", "อะไรคือหมายเลขโทรศัพท์ของคุณค"],
        "content": """You can contact us at +66 (0)81 854 4291

---

คุณสามารถติดต่อฉันได้ที่ +66 (0)81 854 4291

---

您可以拨打 +66 (0)81 854 4291 联系我们。"""
    },
    "email_variations_th": {
        "keywords": ["อีเมลของคุณค", "อะไรคืออีเมลของคุณค"],
        "content": """You can email me through cblue.thailand@gmail.com

---

คุณสามารถส่งอีเมลถึงฉันได้ที่ cblue.thailand@gmail.com

---

您可以通过 cblue.thailand@gmail.com 给我发送电子邮件。"""
    },
    "ai_chinese": {
        "keywords": ["人工智能（AI）", "人工智能", "什么是人工智能"],
        "content": """AI (Artificial Intelligence) is the simulation of human intelligence in machines that are programmed to think, reason, learn, and make decisions like humans.

---

ปัญญาประดิษฐ์ คือการจำลองความฉลาดของมนุษย์ในเครื่องจักรที่ถูกโปรแกรมให้สามารถคิด วิเคราะห์ เรียนรู้ และตัดสินใจได้เหมือนมนุษย์

---

人工智能（AI，Artificial Intelligence）是指在机器中模拟人类智能的技术，使其能够像人类一样思考、推理、学习和做出决策。"""
    },
    "chatbot_chinese": {
        "keywords": ["聊天机器人（Chatbot）", "聊天机器人", "什么是聊天机器人"],
        "content": """A chatbot is a software application that can converse with users through text or voice, often used to provide information or automate customer service tasks.

---

แชตบอทคือโปรแกรมซอฟต์แวร์ที่สามารถสนทนากับผู้ใช้งานผ่านข้อความหรือเสียง มักใช้เพื่อให้ข้อมูลหรือช่วยงานบริการลูกค้าแบบอัตโนมัติ

---

聊天机器人是一种软件应用程序，可以通过文字或语音与用户进行对话，通常用于提供信息或自动化客户服务任务。"""
    },
    "ai_chatbot_dev_chinese": {
        "keywords": ["AI聊天机器人开发", "什么是AI聊天机器人开发"],
        "content": """AI chatbot development is the process of building chatbots that use artificial intelligence and natural language processing (NLP) to understand, learn from, and respond intelligently to user inputs.

---

การพัฒนาแชตบอท AI คือกระบวนการสร้างแชตบอทที่ใช้เทคโนโลยีปัญญาประดิษฐ์และการประมวลผลภาษาธรรมชาติ (NLP) เพื่อให้เข้าใจ เรียนรู้ และตอบสนองต่อผู้ใช้อย่างชาญฉลาด

---

AI聊天机器人开发是构建使用人工智能和自然语言处理（NLP）技术的聊天机器人的过程，使其能够理解、学习并智能地回应用户输入。"""
    },
    "chatbot_dev_chinese": {
        "keywords": ["聊天机器人开发", "什么是聊天机器人开发"],
        "content": """Chatbot development is the creation of automated conversational programs that can interact with users through predefined rules, scripts, or AI-based understanding.

---

การพัฒนาแชตบอทคือการสร้างโปรแกรมสนทนาอัตโนมัติที่สามารถโต้ตอบกับผู้ใช้ได้ตามกฎที่ตั้งไว้ล่วงหน้า หรือโดยใช้ความเข้าใจจาก AI

---

聊天机器人开发是创建能通过预设规则、脚本或基于AI理解与用户互动的自动化对话程序的过程。"""
    },
    "software_chinese": {
        "keywords": ["软件（Software）", "软件", "什么是软件"],
        "content": """Software is a set of instructions, programs, or data that tell a computer how to perform specific tasks or functions.

---

ซอฟต์แวร์คือชุดคำสั่ง โปรแกรม หรือข้อมูลที่บอกคอมพิวเตอร์ให้ทำงานหรือดำเนินการตามที่กำหนดไว้

---

软件是一组指令、程序或数据，用来告诉计算机如何执行特定任务或功能。"""
    },
    "software_dev_chinese": {
        "keywords": ["软件开发", "什么是软件开发"],
        "content": """Software development is the process of designing, coding, testing, and maintaining applications, systems, or programs to meet user needs.

---

การพัฒนาซอฟต์แวร์คือกระบวนการออกแบบ เขียนโค้ด ทดสอบ และดูแลรักษาโปรแกรมหรือระบบ เพื่อให้ตอบสนองความต้องการของผู้ใช้งาน

---

软件开发是设计、编程、测试和维护应用程序、系统或程序的过程，以满足用户需求。"""
    },
    "machine_learning_chinese": {
        "keywords": ["机器学习（Machine Learning, ML）", "机器学习", "什么是机器学习"],
        "content": """Machine Learning (ML) is a branch of AI that enables computers to learn from data and improve their performance without being explicitly programmed.

---

การเรียนรู้ของเครื่อง (Machine Learning - ML) คือสาขาหนึ่งของ AI ที่ทำให้คอมพิวเตอร์สามารถเรียนรู้จากข้อมูลและปรับปรุงประสิทธิภาพได้โดยไม่ต้องเขียนโปรแกรมใหม่ทั้งหมด

---

机器学习（ML）是人工智能的一个分支，使计算机能够从数据中学习并不断提高性能，而无需明确编程。"""
    },
    "ml_chinese": {
        "keywords": ["ML", "什么是ML"],
        "content": """ML stands for Machine Learning — a field of AI that allows computers to automatically learn patterns and make predictions from data.

---

ML คือคำย่อของ Machine Learning ซึ่งเป็นเทคโนโลยี AI ที่ช่วยให้คอมพิวเตอร์เรียนรู้รูปแบบข้อมูลและสามารถคาดการณ์หรือวิเคราะห์ได้โดยอัตโนมัติ

---

ML是机器学习（Machine Learning）的缩写，是人工智能的一个领域，使计算机能够自动学习数据模式并进行预测。"""
    },
    "machine_chinese": {
        "keywords": ["机器", "什么是机器"],
        "content": """A machine is a device or system that performs work or processes tasks using mechanical, electrical, or computational power.

---

เครื่องจักรคืออุปกรณ์หรือระบบที่ทำงานหรือประมวลผลโดยใช้พลังงานกล ไฟฟ้า หรือการคำนวณ

---

机器是使用机械、电气或计算能力来执行工作或处理任务的装置或系统。"""
    },
    "learning_chinese": {
        "keywords": ["学习", "什么是学习"],
        "content": """Learning is the process of acquiring knowledge, understanding, or skills through study, experience, or teaching.

---

การเรียนรู้คือกระบวนการได้รับความรู้ ความเข้าใจ หรือทักษะ ผ่านการศึกษา ประสบการณ์ หรือการฝึกสอน

---

学习是通过研究、经验或教学获得知识、理解或技能的过程。"""
    },
    "computer_chinese": {
        "keywords": ["计算机", "什么是计算机"],
        "content": """Computers are electronic devices that process data using instructions (software) to perform calculations, store information, and execute tasks.

---

คอมพิวเตอร์คืออุปกรณ์อิเล็กทรอนิกส์ที่ประมวลผลข้อมูลตามคำสั่ง (ซอฟต์แวร์) เพื่อคำนวณ จัดเก็บข้อมูล และดำเนินการต่าง ๆ

---

计算机是一种电子设备，通过执行指令（软件）来处理数据、进行计算、存储信息并执行任务。"""
    },
    "data_chinese": {
        "keywords": ["数据", "什么是数据"],
        "content": """Data is information in raw or structured form, such as numbers, text, or images, that can be processed or analyzed by computers.

---

ข้อมูลคือข้อเท็จจริงหรือสารสนเทศในรูปแบบดิบหรือโครงสร้าง เช่น ตัวเลข ข้อความ หรือภาพ ที่สามารถนำไปประมวลผลหรือวิเคราะห์ได้

---

数据是以原始或结构化形式存在的信息，如数字、文本或图像，计算机可以处理或分析这些信息。"""
    },
    "solar_chinese": {
        "keywords": ["太阳能（Solar）", "太阳能", "什么是太阳能"],
        "content": """Solar refers to energy derived from the sun's radiation, which can be converted into electricity or heat.

---

พลังงานแสงอาทิตย์หมายถึงพลังงานที่ได้จากรังสีของดวงอาทิตย์ ซึ่งสามารถเปลี่ยนเป็นพลังงานไฟฟ้าหรือความร้อนได้

---

太阳能指来自太阳辐射的能量，可以转化为电能或热能。"""
    },
    "solar_solutions_chinese": {
        "keywords": ["太阳能解决方案（Solar Solutions）", "太阳能解决方案", "什么是太阳能解决方案"],
        "content": """Solar Solutions are systems or services that use solar energy technologies (like solar panels or solar water heaters) to provide renewable power or heating.

---

โซลูชันพลังงานแสงอาทิตย์หมายถึงระบบหรือบริการที่ใช้เทคโนโลยีพลังงานแสงอาทิตย์ (เช่น แผงโซลาร์เซลล์ หรือเครื่องทำน้ำร้อนพลังงานแสงอาทิตย์) เพื่อผลิตพลังงานหมุนเวียนหรือให้ความร้อน

---

太阳能解决方案是利用太阳能技术（如太阳能电池板或太阳能热水器）来提供可再生能源或供热的系统或服务。"""
    },
    "technology_chinese": {
        "keywords": ["技术（Technologies）", "技术", "什么是技术"],
        "content": """Technologies are tools, systems, or methods developed using scientific knowledge to solve problems or improve human life.

---

เทคโนโลยีคือเครื่องมือ ระบบ หรือวิธีการที่ถูกพัฒนาด้วยความรู้ทางวิทยาศาสตร์ เพื่อแก้ปัญหาหรือพัฒนาคุณภาพชีวิตมนุษย์

---

技术是利用科学知识开发的工具、系统或方法，用于解决问题或改善人类生活。"""
    },
    "ev_chinese": {
        "keywords": ["电动车（EV）", "电动车", "什么是电动车"],
        "content": """EV stands for Electric Vehicle — a vehicle powered by electricity stored in batteries instead of fossil fuels.

---

EV ย่อมาจาก Electric Vehicle หมายถึงยานพาหนะที่ขับเคลื่อนด้วยพลังงานไฟฟ้าที่เก็บในแบตเตอรี่แทนน้ำมันเชื้อเพลิง

---

EV是电动汽车（Electric Vehicle）的缩写，指使用储存在电池中的电能而非化石燃料驱动的车辆。"""
    },
    "ev_charger_chinese": {
        "keywords": ["电动车充电器（EV Charger）", "电动车充电器", "什么是电动车充电器"],
        "content": """An EV charger is a device that supplies electric energy to recharge the battery of an electric vehicle.

---

เครื่องชาร์จรถยนต์ไฟฟ้าคืออุปกรณ์ที่จ่ายพลังงานไฟฟ้าเพื่อชาร์จแบตเตอรี่ของรถยนต์ไฟฟ้า

---

电动车充电器是一种为电动车电池充电的设备。"""
    },
    "wifi_chinese": {
        "keywords": ["无线网", "什么是无线网"],
        "content": """Wi-Fi is a wireless networking technology that allows devices to connect to the internet or communicate without physical cables.

---

Wi-Fi คือเทคโนโลยีเครือข่ายไร้สายที่ช่วยให้อุปกรณ์เชื่อมต่ออินเทอร์เน็ตหรือสื่อสารกันได้โดยไม่ต้องใช้สายเคเบิล

---

Wi-Fi是一种无线网络技术，允许设备在不使用物理电缆的情况下连接到互联网或进行通信。"""
    },
    "green_architecture_chinese": {
        "keywords": ["绿色建筑（Green Architecture）", "绿色建筑", "什么是绿色建筑"],
        "content": """Green Architecture is an environmentally conscious design approach that reduces energy use, minimizes waste, and promotes sustainability in building construction.

---

สถาปัตยกรรมสีเขียวคือแนวคิดการออกแบบอาคารที่คำนึงถึงสิ่งแวดล้อม เน้นการประหยัดพลังงาน ลดของเสีย และสร้างความยั่งยืน

---

绿色建筑是一种注重环境保护的设计方法，旨在减少能源消耗、减少浪费并促进建筑可持续性。"""
    },
    "eco_friendly_chinese": {
        "keywords": ["环保（Eco-friendly）", "环保", "什么是环保"],
        "content": """Eco-friendly refers to products, practices, or systems that cause minimal harm to the environment.

---

เป็นมิตรต่อสิ่งแวดล้อมหมายถึงผลิตภัณฑ์หรือวิธีการที่ส่งผลกระทบต่อสิ่งแวดล้อมน้อยที่สุด

---

环保是指对环境危害最小的产品、做法或系统。"""
    },
    "hvac_chinese": {
        "keywords": ["暖通空调", "什么是暖通空调"],
        "content": """HVAC stands for Heating, Ventilation, and Air Conditioning — systems used to regulate indoor climate and air quality.

---

HVAC ย่อมาจาก Heating, Ventilation, and Air Conditioning คือระบบที่ควบคุมอุณหภูมิ การระบายอากาศ และคุณภาพอากาศภายในอาคาร

---

HVAC是供暖（Heating）、通风（Ventilation）和空调（Air Conditioning）的缩写，用于调节室内气候和空气质量的系统。"""
    },
    "mep_chinese": {
        "keywords": ["机电水", "什么是机电水"],
        "content": """MEP stands for Mechanical, Electrical, and Plumbing — the essential engineering systems integrated into building design and construction.

---

MEP ย่อมาจาก Mechanical, Electrical, and Plumbing คือระบบวิศวกรรมสำคัญที่ใช้ในการออกแบบและก่อสร้างอาคาร

---

MEP代表机械（Mechanical）、电气（Electrical）和管道（Plumbing）工程，是建筑设计和施工中不可或缺的系统。"""
    },
    "retrofit_chinese": {
        "keywords": ["改造（Retrofit）", "改造", "什么是改造"],
        "content": """Retrofit means upgrading or modifying existing buildings or systems to improve energy efficiency, performance, or sustainability.

---

การปรับปรุงระบบ หมายถึงการอัปเกรดหรือปรับเปลี่ยนสิ่งปลูกสร้างหรือระบบเดิมให้มีประสิทธิภาพและประหยัดพลังงานมากขึ้น

---

改造是指升级或修改现有建筑或系统，以提高能源效率、性能或可持续性。"""
    },
    "controls_chinese": {
        "keywords": ["控制系统（Controls）", "控制系统", "什么是控制系统"],
        "content": """Controls refer to systems or devices that manage and regulate equipment operations, such as temperature, lighting, or security systems.

---

ระบบควบคุมหมายถึงอุปกรณ์หรือระบบที่ใช้ในการจัดการและควบคุมการทำงานของอุปกรณ์ เช่น ระบบไฟฟ้า อุณหภูมิ หรือระบบรักษาความปลอดภัย

---

控制系统是用于管理和调节设备运行（如温度、照明或安全系统）的系统或装置。"""
    },
    "automation_chinese": {
        "keywords": ["自动化（Automation）", "自动化", "什么是自动化"],
        "content": """Automation is the use of technology to perform tasks automatically without human intervention.

---

ระบบอัตโนมัติหมายถึงการใช้เทคโนโลยีเพื่อให้เครื่องจักรหรือระบบทำงานได้โดยไม่ต้องมีการควบคุมจากมนุษย์

---

自动化是利用技术自动执行任务的过程，无需人工干预。"""
    },
    "bas_chinese": {
        "keywords": ["楼宇自动化系统", "什么是楼宇自动化系统"],
        "content": """BAS stands for Building Automation System — a centralized system that monitors and controls building functions like HVAC, lighting, and security.

---

BAS ย่อมาจาก Building Automation System คือระบบควบคุมส่วนกลางที่ใช้ในการตรวจสอบและจัดการการทำงานต่าง ๆ ของอาคาร เช่น HVAC แสงสว่าง และระบบความปลอดภัย

---

BAS是楼宇自动化系统（Building Automation System）的缩写，是一个集中控制HVAC、照明和安全等建筑功能的系统。"""
    },
    "smart_building_chinese": {
        "keywords": ["智慧建筑（Smart Building）", "智慧建筑", "什么是智慧建筑"],
        "content": """A Smart Building uses technology and sensors to automatically control and optimize operations such as lighting, temperature, and energy use for efficiency and comfort.

---

อาคารอัจฉริยะคืออาคารที่ใช้เทคโนโลยีและเซนเซอร์เพื่อควบคุมและเพิ่มประสิทธิภาพการทำงาน เช่น ระบบไฟฟ้า อุณหภูมิ และการใช้พลังงาน

---

智慧建筑利用技术和传感器自动控制与优化照明、温度和能源使用等操作，以提高效率和舒适度。"""
    },
    "realtime_monitoring_chinese": {
        "keywords": ["实时监控（Real-time Monitoring）", "实时监控", "什么是实时监控"],
        "content": """Real-time monitoring is the continuous observation and tracking of systems or data as events happen, allowing immediate response or adjustments.

---

การตรวจสอบแบบเรียลไทม์คือการติดตามและเฝ้าดูระบบหรือข้อมูลแบบต่อเนื่องในขณะที่เหตุการณ์กำลังเกิดขึ้น เพื่อให้สามารถตอบสนองหรือปรับเปลี่ยนได้ทันที

---

实时监控是对系统或数据进行持续观察和跟踪的过程，以便在事件发生时立即响应或调整。"""
    },
    "predictive_maintenance_chinese": {
        "keywords": ["预测性维护（Predictive Maintenance）", "预测性维护", "什么是预测性维护"],
        "content": """Predictive maintenance uses data and AI to predict when equipment will fail, allowing maintenance before a breakdown occurs.

---

การบำรุงรักษาเชิงคาดการณ์คือการใช้ข้อมูลและ AI เพื่อทำนายการเสียของอุปกรณ์ และซ่อมแซมก่อนที่ความเสียหายจะเกิดขึ้นจริง

---

预测性维护利用数据和人工智能预测设备故障的时间，从而在设备损坏前进行维护。"""
    },
    "occupant_comfort_chinese": {
        "keywords": ["居住舒适度（Occupant Comfort）", "居住舒适度", "什么是居住舒适度"],
        "content": """Occupant comfort refers to the physical and psychological well-being of people inside a building, influenced by factors like temperature, lighting, and air quality.

---

ความสบายของผู้ใช้อาคารหมายถึงความเป็นอยู่ที่ดีทั้งทางกายภาพและจิตใจของผู้อยู่อาศัย เช่น อุณหภูมิ แสง และคุณภาพอากาศ

---

居住舒适度指建筑内部人员的身心舒适度，受温度、照明和空气质量等因素影响。"""
    },
    "environmental_services_chinese": {
        "keywords": ["环境服务（Environmental Services）", "环境服务", "什么是环境服务"],
        "content": """Environmental services involve managing and protecting natural resources through waste management, pollution control, and sustainability programs.

---

บริการด้านสิ่งแวดล้อมคือการจัดการและปกป้องทรัพยากรธรรมชาติ เช่น การจัดการของเสีย การควบคุมมลพิษ และการพัฒนาอย่างยั่งยืน

---

环境服务包括通过废物管理、污染控制和可持续发展计划来管理和保护自然资源。"""
    },
    "energy_saving_chinese": {
        "keywords": ["节能（Energy Saving）", "节能", "什么是节能"],
        "content": """Energy saving means reducing energy use through efficient technologies, behavior, or design, to lower costs and environmental impact.

---

การประหยัดพลังงานหมายถึงการลดการใช้พลังงานผ่านเทคโนโลยีที่มีประสิทธิภาพ พฤติกรรมที่เหมาะสม หรือการออกแบบที่ดี

---

节能是通过高效技术、行为或设计减少能源使用，从而降低成本和环境影响。"""
    },
    "environmental_footprint_chinese": {
        "keywords": ["环境足迹（Environmental Footprints）", "环境足迹", "什么是环境足迹"],
        "content": """Environmental footprints measure the total impact of human activities on the environment, including energy use, emissions, and resource consumption.

---

รอยเท้าสิ่งแวดล้อมหมายถึงผลกระทบทั้งหมดที่กิจกรรมของมนุษย์มีต่อสิ่งแวดล้อม เช่น การใช้พลังงาน การปล่อยคาร์บอน และการใช้ทรัพยากร

---

环境足迹衡量人类活动对环境的总影响，包括能源使用、排放和资源消耗。"""
    },
    "security_system_chinese": {
        "keywords": ["安防系统（Security System）", "安防系统", "什么是安防系统"],
        "content": """A security system is a set of devices and software designed to protect buildings or data from unauthorized access, theft, or harm.

---

ระบบรักษาความปลอดภัยคือชุดอุปกรณ์และซอฟต์แวร์ที่ออกแบบมาเพื่อป้องกันอาคารหรือข้อมูลจากการเข้าถึงโดยไม่ได้รับอนุญาตหรือการโจรกรรม

---

安防系统是一组设备和软件，用于保护建筑或数据免受未经授权的访问、盗窃或破坏。"""
    },
    "access_control_chinese": {
        "keywords": ["门禁控制（Access Control）", "门禁控制", "什么是门禁控制"],
        "content": """Access control is a security process that restricts or grants entry to specific areas, systems, or information based on authorization.

---

การควบคุมการเข้าถึงคือกระบวนการรักษาความปลอดภัยที่จำกัดหรืออนุญาตให้บุคคลเข้าถึงพื้นที่หรือข้อมูลตามสิทธิ์ที่กำหนด

---

门禁控制是一种安全管理过程，根据授权限制或允许进入特定区域、系统或信息。"""
    },
    "green_construction_chinese": {
        "keywords": ["绿色施工（Green Construction）", "绿色施工", "什么是绿色施工"],
        "content": """Green construction involves building practices that are sustainable, energy-efficient, and environmentally responsible.

---

การก่อสร้างสีเขียวคือแนวทางการก่อสร้างที่ยั่งยืน มีประสิทธิภาพด้านพลังงาน และเป็นมิตรต่อสิ่งแวดล้อม

---

绿色施工是指可持续、节能且对环境负责的建筑实践。"""
    },
    "fitout_chinese": {
        "keywords": ["室内装修（Fit Out）", "室内装修", "什么是室内装修"],
        "content": """Fit Out refers to the process of furnishing and equipping interior spaces to make them functional and ready for use.

---

งานตกแต่งภายใน หมายถึงกระบวนการตกแต่งและติดตั้งอุปกรณ์ภายในอาคารให้พร้อมใช้งาน

---

室内装修是为使空间具备功能性并可投入使用而进行的布置与设备安装过程。"""
    },
    "renovation_chinese": {
        "keywords": ["翻新（Renovation）", "翻新", "什么是翻新"],
        "content": """Renovation means restoring, repairing, or upgrading existing buildings to improve functionality or appearance.

---

การปรับปรุงหรือรีโนเวทคือการซ่อมแซมหรือปรับปรุงอาคารเดิมให้ดีขึ้นทั้งในด้านรูปลักษณ์และการใช้งาน

---

翻新是修复、改进或升级现有建筑的过程，以提升功能或外观。"""
    },
    "reinstatement_chinese": {
        "keywords": ["恢复原状（Reinstatement）", "恢复原状", "什么是恢复原状"],
        "content": """Reinstatement is the process of returning a property to its original condition, often after a lease ends or construction work is completed.

---

การคืนสภาพคือการนำทรัพย์สินหรืออาคารกลับคืนสู่สภาพเดิม มักทำหลังจากหมดสัญญาเช่าหรือหลังงานก่อสร้างเสร็จสิ้น

---

恢复原状是将物业恢复至原始状态的过程，通常发生在租约结束或施工完成后。"""
    },
    "vertical_garden_chinese": {
        "keywords": ["垂直花园（Vertical Garden）", "垂直花园", "什么是垂直花园"],
        "content": """A Vertical Garden is a structure where plants grow on vertically suspended panels, used for aesthetics, insulation, and air purification.

---

สวนแนวตั้งคือโครงสร้างที่ปลูกต้นไม้ในแนวตั้ง เพื่อความสวยงาม ฉนวนกันความร้อน และช่วยฟอกอากาศ

---

垂直花园是一种植物在垂直悬挂面板上生长的结构，用于美化、隔热和净化空气。"""
    },
    "smart_home_chinese": {
        "keywords": ["智能家居（Smart Home）", "智能家居", "什么是智能家居"],
        "content": """A Smart Home uses interconnected devices and automation systems to control lighting, temperature, appliances, and security remotely.

---

บ้านอัจฉริยะคือบ้านที่ใช้เทคโนโลยีและระบบอัตโนมัติในการควบคุมไฟฟ้า อุณหภูมิ เครื่องใช้ไฟฟ้า และระบบรักษาความปลอดภัยได้จากระยะไกล

---

智能家居通过互联设备和自动化系统远程控制照明、温度、电器和安防系统。"""
    },
    "smart_farming_chinese": {
        "keywords": ["智慧农业（Smart Farming）", "智慧农业", "什么是智慧农业"],
        "content": """Smart farming uses IoT, sensors, and AI technologies to optimize agricultural production, reduce waste, and improve efficiency.

---

เกษตรอัจฉริยะคือการใช้เทคโนโลยี IoT เซนเซอร์ และ AI เพื่อเพิ่มประสิทธิภาพการผลิต ลดของเสีย และเพิ่มผลผลิตทางการเกษตร

---

智慧农业利用物联网（IoT）、传感器和人工智能技术优化农业生产、减少浪费并提高效率。"""
    },
    "website_chinese": {
        "keywords": ["网站（Website）", "网站", "什么是网站"],
        "content": """A website is a collection of web pages accessible via the internet, typically under a single domain name.

---

เว็บไซต์คือชุดของหน้าเว็บที่สามารถเข้าถึงได้ผ่านอินเทอร์เน็ต ภายใต้ชื่อโดเมนเดียวกัน

---

网站是一组网页的集合，可通过互联网访问，通常位于同一个域名下。"""
    },
    "website_dev_chinese": {
        "keywords": ["网站开发（Website Development）", "网站开发", "什么是网站开发"],
        "content": """Website development is the process of designing, coding, and maintaining websites to ensure functionality, accessibility, and performance.

---

การพัฒนาเว็บไซต์คือกระบวนการออกแบบ เขียนโค้ด และดูแลเว็บไซต์ให้สามารถทำงานได้อย่างมีประสิทธิภาพและเข้าถึงได้ง่าย

---

网站开发是设计、编程和维护网站的过程，以确保其功能性、可访问性和性能。"""
    },
    "seo_chinese": {
        "keywords": ["搜索引擎优化", "什么是搜索引擎优化"],
        "content": """SEO (Search Engine Optimization) is the practice of improving a website's visibility in search engine results to attract more organic traffic.

---

SEO (Search Engine Optimization) คือการปรับปรุงเว็บไซต์ให้ติดอันดับสูงในการค้นหาผ่านเสิร์ชเอนจิน เพื่อเพิ่มจำนวนผู้เข้าชมแบบธรรมชาติ

---

SEO（搜索引擎优化）是提高网站在搜索引擎结果中可见度的实践，以吸引更多自然流量。"""
    },
    "coding_chinese": {
        "keywords": ["编程（Coding）", "编程", "什么是编程"],
        "content": """Coding is the process of writing instructions in a programming language to create software, applications, or websites.

---

การเขียนโค้ดคือกระบวนการเขียนคำสั่งด้วยภาษาคอมพิวเตอร์เพื่อสร้างซอฟต์แวร์ แอปพลิเคชัน หรือเว็บไซต์

---

编程是用编程语言编写指令的过程，用于创建软件、应用程序或网站。"""
    },
    "phone_chinese": {
        "keywords": ["话号码是什么", "电话号码", "你的电话号码"],
        "content": """You can contact us at +66 (0)81 854 4291

---

คุณสามารถติดต่อฉันได้ที่ +66 (0)81 854 4291

---

您可以拨打 +66 (0)81 854 4291 联系我们。"""
    },
    "email_chinese": {
        "keywords": ["子邮件是什么", "电子邮件", "你的电子邮件"],
        "content": """You can email me through cblue.thailand@gmail.com

---

คุณสามารถส่งอีเมลถึงฉันได้ที่ cblue.thailand@gmail.com

---

您可以发送邮件至 cblue.thailand@gmail.com。"""
    },
    "green_architecture_th": {
        "keywords": ["สถาปัตยกรรมสีเขียวคืออะไร"],
        "content": """สถาปัตยกรรมสีเขียวคือแนวคิดการออกแบบอาคารที่คำนึงถึงสิ่งแวดล้อม เน้นการประหยัดพลังงาน ลดของเสีย และสร้างความยั่งยืน"""
    },
    "cctv": {
        "keywords": ["what is cctv", "cctv คือ", "cctv คืออะไร", "กล้องวงจรปิด", "กล้องวงจรปิดคืออะไร", "什么是cctv", "闭路电视", "闭路电视是什么"],
        "content": """CCTV (Closed-Circuit Television) is a video surveillance system that monitors and records activities in specific areas for security purposes.

---

กล้องวงจรปิดคือระบบเฝ้าระวังด้วยวิดีโอที่ติดตามและบันทึกกิจกรรมในพื้นที่เฉพาะเพื่อวัตถุประสงค์ด้านความปลอดภัย

---

闭路电视是一种视频监控系统，用于监控和记录特定区域的活动以实现安全目的。"""
    },
    "alarm_systems": {
        "keywords": ["what is alarm systems", "what are alarm systems", "alarm systems คือ", "ระบบเตือนภัย", "ระบบเตือนภัยคืออะไร", "什么是报警系统", "报警系统", "报警系统是什么"],
        "content": """Alarm systems are security systems that detect unauthorized entry, fire, or other emergencies and alert users through sounds, notifications, or signals.

---

ระบบเตือนภัยคือระบบรักษาความปลอดภัยที่ตรวจจับการบุกรุก ไฟไหม้ หรือเหตุฉุกเฉินอื่นๆ และแจ้งเตือนผู้ใช้ผ่านเสียง การแจ้งเตือน หรือสัญญาณ

---

报警系统是检测未经授权进入、火灾或其他紧急情况并通过声音、通知或信号提醒用户的安全系统。"""
    },
    "intrusion_detection": {
        "keywords": ["what is intrusion detection", "intrusion detection คือ", "การตรวจจับการบุกรุก", "การตรวจจับการบุกรุกคืออะไร", "什么是入侵检测", "入侵检测", "入侵检测是什么"],
        "content": """Intrusion detection is technology that monitors networks or systems to identify unauthorized access attempts or security breaches.

---

การตรวจจับการบุกรุกคือเทคโนโลยีที่ตรวจสอบเครือข่ายหรือระบบเพื่อระบุความพยายามเข้าถึงโดยไม่ได้รับอนุญาตหรือการละเมิดความปลอดภัย

---

入侵检测是监控网络或系统以识别未经授权的访问尝试或安全漏洞的技术。"""
    },
    "motion_detectors": {
        "keywords": ["what is motion detectors", "what are motion detectors", "motion detectors คือ", "เครื่องตรวจจับการเคลื่อนไหว", "เครื่องตรวจจับการเคลื่อนไหวคืออะไร", "什么是运动探测器", "运动探测器", "运动探测器是什么"],
        "content": """Motion detectors are devices that sense movement in an area and trigger alarms or automated responses for security or automation purposes.

---

เครื่องตรวจจับการเคลื่อนไหวคืออุปกรณ์ที่รับรู้การเคลื่อนไหวในพื้นที่และกระตุ้นสัญญาณเตือนหรือการตอบสนองอัตโนมัติเพื่อความปลอดภัยหรือระบบอัตโนมัติ

---

运动探测器是感应区域内运动并触发警报或自动响应以实现安全或自动化目的的设备。"""
    },
    "motion_sensors": {
        "keywords": ["what is motion sensors", "what are motion sensors", "motion sensors คือ", "เซ็นเซอร์ตรวจจับการเคลื่อนไหว", "เซ็นเซอร์ตรวจจับการเคลื่อนไหวคืออะไร", "什么是运动传感器", "运动传感器", "运动传感器是什么"],
        "content": """Motion sensors are electronic devices that detect physical movement using infrared, microwave, or other technologies to activate lights, alarms, or systems.

---

เซ็นเซอร์ตรวจจับการเคลื่อนไหวคืออุปกรณ์อิเล็กทรอนิกส์ที่ตรวจจับการเคลื่อนไหวทางกายภาพโดยใช้อินฟราเรด ไมโครเวฟ หรือเทคโนโลยีอื่นๆ เพื่อเปิดไฟ สัญญาณเตือน หรือระบบต่างๆ

---

运动传感器是使用红外线、微波或其他技术检测物理运动以激活灯光、警报或系统的电子设备。"""
    },
    "cybersecurity": {
        "keywords": ["what is cybersecurity", "cybersecurity คือ", "ความปลอดภัยทางไซเบอร์", "ความปลอดภัยทางไซเบอร์คืออะไร", "什么是网络安全", "网络安全", "网络安全是什么"],
        "content": """Cybersecurity is the practice of protecting computer systems, networks, and data from digital attacks, unauthorized access, and damage.

---

ความปลอดภัยทางไซเบอร์คือการปฏิบัติในการปกป้องระบบคอมพิวเตอร์ เครือข่าย และข้อมูลจากการโจมตีทางดิจิทัล การเข้าถึงโดยไม่ได้รับอนุญาต และความเสียหาย

---

网络安全是保护计算机系统、网络和数据免受数字攻击、未经授权访问和损坏的实践。"""
    },
    "data_protection": {
        "keywords": ["what is data protection", "data protection คือ", "การปกป้องข้อมูล", "การปกป้องข้อมูลคืออะไร", "什么是数据保护", "数据保护", "数据保护是什么"],
        "content": """Data protection refers to measures and practices to safeguard sensitive information from unauthorized access, corruption, or loss.

---

การปกป้องข้อมูลคือมาตรการและแนวปฏิบัติในการปกป้องข้อมูลที่ละเอียดอ่อนจากการเข้าถึงโดยไม่ได้รับอนุญาต การเสียหาย หรือการสูญหาย

---

数据保护是保护敏感信息免受未经授权访问、损坏或丢失的措施和实践。"""
    },
    "network_security": {
        "keywords": ["what is network security", "network security คือ", "ความปลอดภัยของเครือข่าย", "ความปลอดภัยของเครือข่ายคืออะไร", "什么是网络安全", "网络安全"],
        "content": """Network security is the protection of computer networks from intrusions, attacks, and unauthorized access through firewalls, encryption, and monitoring.

---

ความปลอดภัยของเครือข่ายคือการปกป้องเครือข่ายคอมพิวเตอร์จากการบุกรุก การโจมตี และการเข้าถึงโดยไม่ได้รับอนุญาตผ่านไฟร์วอลล์ การเข้ารหัส และการตรวจสอบ

---

网络安全是通过防火墙、加密和监控保护计算机网络免受入侵、攻击和未经授权访问。"""
    },
    "identity_access_management": {
        "keywords": ["what is identity & access management", "what is identity and access management", "identity & access management คือ", "identity and access management คือ", "การจัดการตัวตนและการเข้าถึง", "การจัดการตัวตนและการเข้าถึงคืออะไร", "什么是身份和访问管理", "身份和访问管理", "身份和访问管理是什么"],
        "content": """Identity & access management (IAM) refers to systems and policies that control who can access resources and verify user identities in an organization.

---

การจัดการตัวตนและการเข้าถึงคือระบบและนโยบายที่ควบคุมว่าใครสามารถเข้าถึงทรัพยากรและตรวจสอบตัวตนของผู้ใช้ในองค์กร

---

身份和访问管理是控制谁可以访问资源并验证组织中用户身份的系统和策略。"""
    },
    "bms": {
        "keywords": ["what is bms", "bms คือ", "bms คืออะไร", "ระบบบริหารจัดการอาคาร", "ระบบบริหารจัดการอาคารคืออะไร", "什么是bms", "楼宇管理系统"],
        "content": """BMS (Building Management System) is a computer-based control system that monitors and manages building facilities like HVAC, lighting, and security.

---

ระบบบริหารจัดการอาคาร (BMS) คือระบบควบคุมที่ใช้คอมพิวเตอร์ซึ่งตรวจสอบและจัดการสิ่งอำนวยความสะดวกของอาคาร เช่น ระบบปรับอากาศ แสงสว่าง และความปลอดภัย

---

楼宇管理系统（BMS）是基于计算机的控制系统，用于监控和管理建筑设施，如暖通空调、照明和安全。"""
    },
    "mechanical": {
        "keywords": ["what is mechanical", "mechanical คือ", "ระบบเครื่องกล", "ระบบเครื่องกลคืออะไร", "什么是机械系统", "机械系统", "机械系统是什么"],
        "content": """Mechanical systems involve physical machinery and equipment, including HVAC, elevators, and other moving components in buildings.

---

ระบบเครื่องกลคือระบบที่เกี่ยวข้องกับเครื่องจักรและอุปกรณ์ทางกายภาพ รวมถึงระบบปรับอากาศ ลิฟต์ และส่วนประกอบที่เคลื่อนไหวอื่นๆ ในอาคาร

---

机械系统涉及物理机械和设备，包括暖通空调、电梯和建筑物中的其他移动部件。"""
    },
    "electrical": {
        "keywords": ["what is electrical", "electrical คือ", "ระบบไฟฟ้า", "ระบบไฟฟ้าคืออะไร", "什么是电气系统", "电气系统", "电气系统是什么"],
        "content": """Electrical systems distribute and control electrical power throughout a building, including wiring, panels, and electrical equipment.

---

ระบบไฟฟ้าคือระบบที่กระจายและควบคุมพลังงานไฟฟ้าทั่วทั้งอาคาร รวมถึงสายไฟ แผงควบคุม และอุปกรณ์ไฟฟ้า

---

电气系统是在整个建筑物中分配和控制电力的系统，包括布线、配电板和电气设备。"""
    },
    "plumbing": {
        "keywords": ["what is plumbing", "plumbing คือ", "ระบบประปา", "ระบบประปาคืออะไร", "什么是管道系统", "管道系统", "管道系统是什么"],
        "content": """Plumbing systems manage water supply, drainage, and sewage in buildings through pipes, fixtures, and related equipment.

---

ระบบประปาคือระบบที่จัดการน้ำประปา ระบบระบายน้ำ และน้ำเสียในอาคารผ่านท่อ อุปกรณ์ และอุปกรณ์ที่เกี่ยวข้อง

---

管道系统是通过管道、固定装置和相关设备管理建筑物中的供水、排水和污水的系统。"""
    },
    "fire_protection": {
        "keywords": ["what is fire protection", "fire protection คือ", "ระบบป้องกันอัคคีภัย", "ระบบป้องกันอัคคีภัยคืออะไร", "什么是消防系统", "消防系统", "消防系统是什么"],
        "content": """Fire protection refers to systems and measures designed to detect, prevent, and suppress fires, including alarms, sprinklers, and fire extinguishers.

---

ระบบป้องกันอัคคีภัยคือระบบและมาตรการที่ออกแบบมาเพื่อตรวจจับ ป้องกัน และดับไฟ รวมถึงสัญญาณเตือน สปริงเกลอร์ และเครื่องดับเพลิง

---

消防系统是设计用于检测、预防和扑灭火灾的系统和措施，包括警报器、喷淋系统和灭火器。"""
    },
    "power_control": {
        "keywords": ["what is power control", "power control คือ", "ระบบควบคุมพลังงาน", "ระบบควบคุมพลังงานคืออะไร", "什么是电源控制", "电源控制", "电源控制是什么"],
        "content": """Power control refers to systems that regulate and manage electrical power distribution, voltage, and consumption in buildings or facilities.

---

ระบบควบคุมพลังงานคือระบบที่ควบคุมและจัดการการกระจายพลังงานไฟฟ้า แรงดันไฟฟ้า และการใช้พลังงานในอาคารหรือสิ่งอำนวยความสะดวก

---

电源控制是调节和管理建筑物或设施中电力分配、电压和消耗的系统。"""
    },
    "lighting_control": {
        "keywords": ["what is lighting control", "lighting control คือ", "ระบบควบคุมแสงสว่าง", "ระบบควบคุมแสงสว่างคืออะไร", "什么是照明控制", "照明控制", "照明控制是什么"],
        "content": """Lighting control refers to automated systems that manage lighting levels, schedules, and energy efficiency through sensors, timers, and smart controls.

---

ระบบควบคุมแสงสว่างคือระบบอัตโนมัติที่จัดการระดับแสง ตารางเวลา และประสิทธิภาพการใช้พลังงานผ่านเซ็นเซอร์ ตัวจับเวลา และการควบคุมอัจฉริยะ

---

照明控制是通过传感器、定时器和智能控制管理照明水平、时间表和能源效率的自动化系统。"""
    },
    "what_solutions_offered": {
        "keywords": ["what solutions do you offer", "what solutions", "คุณมีโซลูชันอะไรบ้าง", "你们有什么解决方案"],
        "content": """We offer comprehensive solutions including:
• Digital Solutions: AI chatbot development, software development, and machine learning
• Smart Technology & Automation: Building Management Systems (BMS), smart building controls, automation, and energy-saving solutions
• Renewable Energy & EV Solutions: Solar power, wind turbines, and EV charging stations
• Design & Engineering: Full architectural, interior, landscape, and detailed engineering design
• Construction & Specialized Trades: General construction, fit-outs, HVAC, MEP systems, retrofitting, and green building
• Specialized Fabrication: Metal sheet, steel structure, aluminium, and glass work
• Consulting & Strategy: Market research, economic evaluations, feasibility studies, and project management

---

เรามีโซลูชันที่ครอบคลุม ได้แก่:
• โซลูชันดิจิทัล: พัฒนาแชทบอต AI, การพัฒนาซอฟต์แวร์, และการเรียนรู้ของเครื่อง
• เทคโนโลยีอัจฉริยะและระบบอัตโนมัติ: ระบบจัดการอาคาร (BMS), ระบบควบคุมอาคารอัจฉริยะ, ระบบอัตโนมัติ, และโซลูชันประหยัดพลังงาน
• พลังงานทดแทนและโซลูชัน EV: พลังงานแสงอาทิตย์, กังหันลม, และสถานีชาร์จรถไฟฟ้า
• การออกแบบและวิศวกรรม: การออกแบบสถาปัตยกรรมเต็มรูปแบบ, ภายใน, ภูมิสถาปัตย์, และการออกแบบทางวิศวกรรมโดยละเอียด
• การก่อสร้างและงานเฉพาะทาง: การก่อสร้างทั่วไป, งานตกแต่งภายใน, ระบบ HVAC, ระบบ MEP, การปรับปรุงอาคาร, และอาคารสีเขียว
• งานผลิตเฉพาะทาง: งานแผ่นเหล็ก, โครงสร้างเหล็ก, อลูมิเนียม, และงานกระจก
• ที่ปรึกษาและกลยุทธ์: การวิจัยตลาด, การประเมินทางเศรษฐกิจ, การศึกษาความเป็นไปได้, และการจัดการโครงการ

---

我们提供全面的解决方案，包括：
• 数字解决方案：AI聊天机器人开发、软件开发和机器学习
• 智能技术与自动化：楼宇管理系统（BMS）、智能楼宇控制、自动化及节能解决方案
• 可再生能源与电动车解决方案：太阳能、风力发电机和电动车充电站
• 设计与工程：全方位建筑、室内、景观及详细工程设计
• 建筑与专业工程：一般建筑、室内装修、暖通空调、机电管道系统、建筑改造及绿色建筑
• 专业制造：金属板、钢结构、铝材及玻璃工程
• 咨询与战略：市场研究、经济评估、可行性研究及项目管理"""
    },
    "how_can_you_help": {
        "keywords": ["how can you help", "how can you help me", "คุณสามารถช่วยอะไรได้บ้าง", "你们能提供什么帮助"],
        "content": """We can help you with:
• AI and digital transformation through chatbot development, software solutions, and machine learning
• Smart building automation and energy management systems
• Renewable energy installations including solar panels, wind turbines, and EV charging stations
• Complete design services from architecture to interior and landscape design
• Construction projects of all sizes with specialized trades including HVAC, MEP systems, and green building solutions
• Custom fabrication work in metal, steel, aluminium, and glass
• Professional consulting for market research, feasibility studies, and project management

We have the flexibility and strength to deliver projects successfully anywhere in Thailand, on time, on budget, with safety and integrity.

---

เราสามารถช่วยคุณได้ในด้าน:
• การเปลี่ยนผ่านสู่ดิจิทัลและ AI ผ่านการพัฒนาแชทบอท โซลูชันซอฟต์แวร์ และการเรียนรู้ของเครื่อง
• ระบบอัตโนมัติอาคารอัจฉริยะและระบบจัดการพลังงาน
• การติดตั้งพลังงานทดแทน รวมถึงแผงโซลาร์เซลล์ กังหันลม และสถานีชาร์จรถไฟฟ้า
• บริการออกแบบครบวงจร ตั้งแต่สถาปัตยกรรมไปจนถึงการออกแบบภายในและภูมิสถาปัตย์
• โครงการก่อสร้างทุกขนาดพร้อมงานเฉพาะทาง รวมถึงระบบ HVAC, ระบบ MEP และโซลูชันอาคารสีเขียว
• งานผลิตพิเศษด้านโลหะ เหล็ก อลูมิเนียม และกระจก
• บริการที่ปรึกษามืออาชีพสำหรับการวิจัยตลาด การศึกษาความเป็นไปได้ และการจัดการโครงการ

เรามีความยืดหยุ่นและความแข็งแกร่งในการส่งมอบโครงการได้สำเร็จทั่วประเทศไทย ตรงเวลา อยู่ในงบประมาณ ด้วยความปลอดภัยและซื่อสัตย์

---

我们可以帮助您：
• 通过聊天机器人开发、软件解决方案和机器学习实现AI和数字化转型
• 智能楼宇自动化和能源管理系统
• 可再生能源安装，包括太阳能电池板、风力发电机和电动车充电站
• 从建筑到室内和景观设计的完整设计服务
• 各种规模的建筑项目，包括暖通空调、机电管道系统和绿色建筑解决方案等专业工程
• 金属、钢材、铝材和玻璃的定制制造工作
• 市场研究、可行性研究和项目管理的专业咨询

我们兼具灵活性与实力，能够在泰国各地成功交付项目，按时、按预算、安全可靠。"""
    },
    "what_services_provided": {
        "keywords": ["what services do you provide", "what services", "คุณให้บริการอะไร", "你们提供什么服务"],
        "content": """We provide comprehensive services in:

Digital Solutions:
• AI chatbot development
• Software development
• Machine learning solutions

Smart Technology & Automation:
• Building Management Systems (BMS)
• Smart building controls
• Automation systems
• Energy-saving solutions

Renewable Energy & EV Solutions:
• Solar power systems
• Wind turbines
• EV charging stations

Design & Engineering:
• Architectural design
• Interior design
• Landscape design
• Detailed engineering design

Construction & Specialized Trades:
• General construction
• Fit-outs
• HVAC systems
• MEP systems
• Retrofitting
• Green building (including vertical gardens)

Specialized Fabrication:
• Metal sheet work
• Steel structure
• Aluminium work
• Glass work

Consulting & Strategy:
• Market research
• Economic evaluations
• Feasibility studies
• Project management

---

เราให้บริการครบวงจรใน:

โซลูชันดิจิทัล:
• พัฒนาแชทบอต AI
• พัฒนาซอฟต์แวร์
• โซลูชันการเรียนรู้ของเครื่อง

เทคโนโลยีอัจฉริยะและระบบอัตโนมัติ:
• ระบบจัดการอาคาร (BMS)
• ระบบควบคุมอาคารอัจฉริยะ
• ระบบอัตโนมัติ
• โซลูชันประหยัดพลังงาน

พลังงานทดแทนและโซลูชัน EV:
• ระบบพลังงานแสงอาทิตย์
• กังหันลม
• สถานีชาร์จรถไฟฟ้า

การออกแบบและวิศวกรรม:
• การออกแบบสถาปัตยกรรม
• การออกแบบภายใน
• การออกแบบภูมิสถาปัตย์
• การออกแบบทางวิศวกรรมโดยละเอียด

การก่อสร้างและงานเฉพาะทาง:
• การก่อสร้างทั่วไป
• งานตกแต่งภายใน
• ระบบ HVAC
• ระบบ MEP
• การปรับปรุงอาคาร
• อาคารสีเขียว (รวมถึงสวนแนวตั้ง)

งานผลิตเฉพาะทาง:
• งานแผ่นเหล็ก
• โครงสร้างเหล็ก
• งานอลูมิเนียม
• งานกระจก

ที่ปรึกษาและกลยุทธ์:
• การวิจัยตลาด
• การประเมินทางเศรษฐกิจ
• การศึกษาความเป็นไปได้
• การจัดการโครงการ

---

我们提供全面服务：

数字解决方案：
• AI聊天机器人开发
• 软件开发
• 机器学习解决方案

智能技术与自动化：
• 楼宇管理系统（BMS）
• 智能楼宇控制
• 自动化系统
• 节能解决方案

可再生能源与电动车解决方案：
• 太阳能系统
• 风力发电机
• 电动车充电站

设计与工程：
• 建筑设计
• 室内设计
• 景观设计
• 详细工程设计

建筑与专业工程：
• 一般建筑
• 室内装修
• 暖通空调系统
• 机电管道系统
• 建筑改造
• 绿色建筑（包括垂直花园）

专业制造：
• 金属板工程
• 钢结构
• 铝材工程
• 玻璃工程

咨询与战略：
• 市场研究
• 经济评估
• 可行性研究
• 项目管理"""
    },
    "who_are_you": {
        "keywords": ["who are you", "who are you and what do you do", "คุณคือใครและทำอะไร", "你是谁", "你做什么的"],
        "content": """We are Cblue - a group of experienced and highly skilled professionals who design, engineer, and construct leading-edge facilities and related infrastructure for residential buildings, industries, and public civil works.

We specialize in:
• AI/Digital Solutions
• Sustainable technology solutions
• Construction and engineering

We have the flexibility and strength to deliver large or small projects successfully anywhere in Thailand. Our mission is to provide the best, state-of-the-art green solutions and services on time, on budget, with safety and integrity.

Contact us:
Email: cblue.thailand@gmail.com
Phone: +66 (0)81 854 4291

---

เราคือ Cblue - กลุ่มผู้เชี่ยวชาญที่มีประสบการณ์และความสามารถสูง ที่ออกแบบ วิศวกรรม และก่อสร้างสิ่งอำนวยความสะดวกอันทันสมัยและโครงสร้างพื้นฐานที่เกี่ยวข้องสำหรับอาคารที่อยู่อาศัย อุตสาหกรรม และงานโยธาสาธารณะ

เราเชี่ยวชาญด้าน:
• โซลูชันด้าน AI/ดิจิทัล
• โซลูชันเทคโนโลยีที่ยั่งยืน
• การก่อสร้างและวิศวกรรม

เรามีความยืดหยุ่นและความแข็งแกร่งในการส่งมอบโครงการทั้งขนาดใหญ่และเล็กได้อย่างสำเร็จทั่วทุกพื้นที่ในประเทศไทย ภารกิจของเราคือนำเสนอโซลูชันสีเขียวที่ล้ำสมัยและบริการที่ดีที่สุด ตรงเวลา อยู่ในงบประมาณ ด้วยความปลอดภัยและซื่อสัตย์

ติดต่อเรา:
อีเมล: cblue.thailand@gmail.com
โทร: +66 (0)81 854 4291

---

我们是Cblue - 一群经验丰富且技术精湛的专业人士，我们设计、工程并建造领先的设施及相关基础设施，服务涵盖住宅建筑、工业及公共土木工程。

我们专注于：
• AI/数字解决方案
• 可持续技术解决方案
• 建筑工程

我们兼具灵活性与实力，能够成功交付各类大小项目，遍及泰国各地。我们的使命是按时提供最佳、最先进的绿色解决方案和服务，在预算范围内安全可靠。

联系我们：
邮箱：cblue.thailand@gmail.com
电话：+66 (0)81 854 4291"""
    },
    "introduce_yourself": {
        "keywords": ["can you introduce yourself", "introduce yourself", "introduce yourself and your work", "ขอแนะนำตัวและงานของคุณหน่อย", "请介绍一下你自己和你的工作"],
        "content": """Hello! We are Cblue - a team of experienced professionals specializing in cutting-edge solutions for a sustainable future.

About Us:
We design, engineer, and construct leading-edge facilities and infrastructure for residential buildings, industries, and public civil works throughout Thailand.

Our Expertise:
• Digital Solutions: AI chatbot development, software development, and machine learning
• Smart Technology: Building Management Systems, automation, and energy-saving solutions
• Renewable Energy: Solar power, wind turbines, and EV charging stations
• Design & Engineering: Architecture, interior, landscape, and detailed engineering
• Construction: General construction, HVAC, MEP systems, and green building
• Specialized Fabrication: Metal, steel, aluminium, and glass work
• Consulting: Market research, feasibility studies, and project management

Our Mission:
To provide the best, state-of-the-art green solutions and services on time, on budget, with safety and integrity. We're committed to creating a greener, smarter, and more resilient future.

Let us know how we can help you!
Contact: cblue.thailand@gmail.com | +66 (0)81 854 4291

---

สวัสดีค่ะ! เราคือ Cblue - ทีมผู้เชี่ยวชาญที่มีประสบการณ์ เชี่ยวชาญด้านโซลูชันที่ทันสมัยเพื่ออนาคตที่ยั่งยืน

เกี่ยวกับเรา:
เราออกแบบ วิศวกรรม และก่อสร้างสิ่งอำนวยความสะดวกและโครงสร้างพื้นฐานที่ทันสมัยสำหรับอาคารที่อยู่อาศัย อุตสาหกรรม และงานโยธาสาธารณะทั่วประเทศไทย

ความเชี่ยวชาญของเรา:
• โซลูชันดิจิทัล: พัฒนาแชทบอต AI, พัฒนาซอฟต์แวร์, และการเรียนรู้ของเครื่อง
• เทคโนโลยีอัจฉริยะ: ระบบจัดการอาคาร, ระบบอัตโนมัติ, และโซลูชันประหยัดพลังงาน
• พลังงานทดแทน: พลังงานแสงอาทิตย์, กังหันลม, และสถานีชาร์จรถไฟฟ้า
• การออกแบบและวิศวกรรม: สถาปัตยกรรม, ภายใน, ภูมิสถาปัตย์, และวิศวกรรมโดยละเอียด
• การก่อสร้าง: ก่อสร้างทั่วไป, ระบบ HVAC, ระบบ MEP, และอาคารสีเขียว
• งานผลิตเฉพาะทาง: งานโลหะ, เหล็ก, อลูมิเนียม, และกระจก
• ที่ปรึกษา: วิจัยตลาด, ศึกษาความเป็นไปได้, และจัดการโครงการ

ภารกิจของเรา:
นำเสนอโซลูชันสีเขียวที่ล้ำสมัยและบริการที่ดีที่สุด ตรงเวลา อยู่ในงบประมาณ ด้วยความปลอดภัยและซื่อสัตย์ เรามุ่งมั่นสร้างอนาคตที่เขียวขึ้น ฉลาดขึ้น และยืดหยุ่นมากขึ้น

บอกเราได้เลยว่าเราจะช่วยคุณได้อย่างไร!
ติดต่อ: cblue.thailand@gmail.com | +66 (0)81 854 4291

---

您好！我们是Cblue - 一支经验丰富的专业团队，专注于为可持续未来提供尖端解决方案。

关于我们：
我们在泰国各地为住宅建筑、工业和公共土木工程设计、工程并建造领先的设施和基础设施。

我们的专长：
• 数字解决方案：AI聊天机器人开发、软件开发和机器学习
• 智能技术：楼宇管理系统、自动化和节能解决方案
• 可再生能源：太阳能、风力发电机和电动车充电站
• 设计与工程：建筑、室内、景观和详细工程
• 建筑：一般建筑、暖通空调、机电管道系统和绿色建筑
• 专业制造：金属、钢材、铝材和玻璃工程
• 咨询：市场研究、可行性研究和项目管理

我们的使命：
按时提供最佳、最先进的绿色解决方案和服务，在预算范围内安全可靠。我们致力于创造更绿色、更智能、更具韧性的未来。

请告诉我们如何帮助您！
联系方式：cblue.thailand@gmail.com | +66 (0)81 854 4291"""
    },
    "company_specialization": {
        "keywords": ["what does your company specialize in", "company specialize", "บริษัทของคุณเชี่ยวชาญด้านอะไร", "你们公司专注于什么"],
        "content": """Our company specializes in three main areas:

1. AI/Digital Solutions
   - AI chatbot development
   - Software development
   - Machine learning applications

2. Sustainable Technology Solutions
   - Building Management Systems (BMS)
   - Smart building controls and automation
   - Energy-saving solutions
   - Renewable energy (solar, wind, EV charging)

3. Construction & Engineering
   - Architectural and engineering design
   - General construction and fit-outs
   - HVAC and MEP systems
   - Green building and retrofitting
   - Specialized fabrication (metal, steel, aluminium, glass)

We focus on creating sustainable, innovative solutions that combine cutting-edge technology with environmental responsibility. Our expertise allows us to deliver projects of any size successfully throughout Thailand, always on time, on budget, with safety and integrity.

---

บริษัทของเราเชี่ยวชาญใน 3 ด้านหลัก:

1. โซลูชันด้าน AI/ดิจิทัล
   - พัฒนาแชทบอต AI
   - พัฒนาซอฟต์แวร์
   - การประยุกต์ใช้การเรียนรู้ของเครื่อง

2. โซลูชันเทคโนโลยีที่ยั่งยืน
   - ระบบจัดการอาคาร (BMS)
   - ระบบควบคุมอาคารอัจฉริยะและระบบอัตโนมัติ
   - โซลูชันประหยัดพลังงาน
   - พลังงานทดแทน (แสงอาทิตย์, ลม, ชาร์จรถไฟฟ้า)

3. การก่อสร้างและวิศวกรรม
   - การออกแบบสถาปัตยกรรมและวิศวกรรม
   - การก่อสร้างทั่วไปและงานตกแต่งภายใน
   - ระบบ HVAC และ MEP
   - อาคารสีเขียวและการปรับปรุงอาคาร
   - งานผลิตเฉพาะทาง (โลหะ, เหล็ก, อลูมิเนียม, กระจก)

เรามุ่งเน้นการสร้างโซลูชันที่ยั่งยืนและนวัตกรรมที่ผสมผสานเทคโนโลยีที่ทันสมัยกับความรับผิดชอบต่อสิ่งแวดล้อม ความเชี่ยวชาญของเราช่วยให้เราสามารถส่งมอบโครงการทุกขนาดได้สำเร็จทั่วประเทศไทย ตรงเวลา อยู่ในงบประมาณ ด้วยความปลอดภัยและซื่อสัตย์

---

我们公司专注于三个主要领域：

1. AI/数字解决方案
   - AI聊天机器人开发
   - 软件开发
   - 机器学习应用

2. 可持续技术解决方案
   - 楼宇管理系统（BMS）
   - 智能楼宇控制和自动化
   - 节能解决方案
   - 可再生能源（太阳能、风能、电动车充电）

3. 建筑与工程
   - 建筑和工程设计
   - 一般建筑和室内装修
   - 暖通空调和机电管道系统
   - 绿色建筑和建筑改造
   - 专业制造（金属、钢材、铝材、玻璃）

我们专注于创造可持续的创新解决方案，将尖端技术与环境责任相结合。我们的专业知识使我们能够在泰国各地成功交付任何规模的项目，始终按时、按预算、安全可靠。"""
    },
    "what_are_your_solutions": {
        "keywords": ["what are your solutions", "what solutions", "your solutions", "โซลูชันของคุณคืออะไร", "โซลูชันของคุณมีอะไรบ้าง", "คุณมีโซลูชันอะไรบ้าง", "你们的解决方案是什么", "你们有什么解决方案", "你们提供什么解决方案"],
        "content": """We offer comprehensive solutions in three main areas:

1. AI/Digital Solutions - AI chatbot development, software development, and machine learning applications
2. Sustainable Technology Solutions - Building Management Systems (BMS), smart building controls, automation, energy-saving solutions, and renewable energy (solar, wind, EV charging)
3. Construction & Engineering - Architectural and engineering design, general construction and fit-outs, HVAC and MEP systems, green building and retrofitting, specialized fabrication

---

เรามีโซลูชันครบวงจรใน 3 ด้านหลัก:

1. โซลูชันด้าน AI/ดิจิทัล - พัฒนาแชทบอต AI, พัฒนาซอฟต์แวร์, และการประยุกต์ใช้การเรียนรู้ของเครื่อง
2. โซลูชันเทคโนโลยีที่ยั่งยืน - ระบบจัดการอาคาร (BMS), ระบบควบคุมอาคารอัจฉริยะ, ระบบอัตโนมัติ, โซลูชันประหยัดพลังงาน, และพลังงานทดแทน (แสงอาทิตย์, ลม, ชาร์จรถไฟฟ้า)
3. การก่อสร้างและวิศวกรรม - การออกแบบสถาปัตยกรรมและวิศวกรรม, การก่อสร้างทั่วไปและงานตกแต่งภายใน, ระบบ HVAC และ MEP, อาคารสีเขียวและการปรับปรุงอาคาร, งานผลิตเฉพาะทาง

---

我们在三个主要领域提供全面的解决方案：

1. AI/数字解决方案 - AI聊天机器人开发、软件开发和机器学习应用
2. 可持续技术解决方案 - 楼宇管理系统（BMS）、智能楼宇控制、自动化、节能解决方案和可再生能源（太阳能、风能、电动车充电）
3. 建筑与工程 - 建筑和工程设计、一般建筑和室内装修、暖通空调和机电管道系统、绿色建筑和建筑改造、专业制造"""
    },
    "who_are_you": {
        "keywords": ["who are you", "who is cblue", "about cblue", "คุณคือใคร", "cblue คือใคร", "เกี่ยวกับ cblue", "你是谁", "cblue是谁", "关于cblue", "你们是谁"],
        "content": """We are Cblue Thailand, a leading provider of green building, smart automation, and AI/Chatbot solutions and services across Thailand. We specialize in sustainable technology solutions and construction engineering, combining cutting-edge technology with environmental responsibility. Our expertise allows us to deliver projects of any size successfully throughout Thailand, always on time, on budget, with safety and integrity.

---

เราคือ Cblue Thailand ผู้ให้บริการชั้นนำด้านอาคารสีเขียว ระบบอัตโนมัติอัจฉริยะ และโซลูชัน AI/แชทบอทในประเทศไทย เราเชี่ยวชาญด้านโซลูชันเทคโนโลยีที่ยั่งยืนและวิศวกรรมการก่อสร้าง โดยผสมผสานเทคโนโลยีที่ทันสมัยกับความรับผิดชอบต่อสิ่งแวดล้อม ความเชี่ยวชาญของเราช่วยให้เราสามารถส่งมอบโครงการทุกขนาดได้สำเร็จทั่วประเทศไทย ตรงเวลา อยู่ในงบประมาณ ด้วยความปลอดภัยและซื่อสัตย์

---

我们是Cblue Thailand，是泰国领先的绿色建筑、智能自动化和AI/聊天机器人解决方案和服务提供商。我们专注于可持续技术解决方案和建筑工程，将尖端技术与环境责任相结合。我们的专业知识使我们能够在泰国各地成功交付任何规模的项目，始终按时、按预算、安全可靠。"""
    },
    "what_are_you_doing": {
        "keywords": ["what are you doing", "what do you do", "what does cblue do", "คุณทำอะไร", "cblue ทำอะไร", "คุณทำงานอะไร", "你在做什么", "你们做什么", "cblue做什么"],
        "content": """We provide specialized green building, smart automation, and AI/Chatbot solutions and services across Thailand. Our work includes:

- Developing AI chatbots and software solutions
- Implementing smart building automation and energy management systems
- Installing renewable energy systems (solar, wind, EV charging)
- Designing and constructing green buildings
- Providing HVAC, MEP, and building retrofit services
- Creating sustainable architectural and engineering solutions

---

เราให้บริการด้านอาคารสีเขียว ระบบอัตโนมัติอัจฉริยะ และโซลูชัน AI/แชทบอทเฉพาะทางทั่วประเทศไทย งานของเรารวมถึง:

- พัฒนาแชทบอต AI และโซลูชันซอฟต์แวร์
- ติดตั้งระบบอัตโนมัติอาคารอัจฉริยะและระบบจัดการพลังงาน
- ติดตั้งระบบพลังงานทดแทน (แสงอาทิตย์, ลม, ชาร์จรถไฟฟ้า)
- ออกแบบและก่อสร้างอาคารสีเขียว
- ให้บริการ HVAC, MEP และการปรับปรุงอาคาร
- สร้างโซลูชันสถาปัตยกรรมและวิศวกรรมที่ยั่งยืน

---

我们在泰国各地提供专业的绿色建筑、智能自动化和AI/聊天机器人解决方案和服务。我们的工作包括：

- 开发AI聊天机器人和软件解决方案
- 实施智能楼宇自动化和能源管理系统
- 安装可再生能源系统（太阳能、风能、电动车充电）
- 设计和建造绿色建筑
- 提供暖通空调、机电管道和建筑改造服务
- 创造可持续的建筑和工程解决方案"""
    },
    "what_do_you_offer": {
        "keywords": ["what do you offer", "what can you offer", "your offerings", "คุณเสนออะไร", "คุณมีอะไรเสนอ", "บริการของคุณ", "你们提供什么", "你们能提供什么", "你们的服务"],
        "content": """We offer a comprehensive suite of services focused on:

**AI/Digital Solutions:**
- AI chatbot development and deployment
- Custom software development
- Machine learning applications

**Smart Technology & Automation:**
- Building Management Systems (BMS)
- Smart building controls and automation
- Energy-saving solutions
- Security systems and access control

**Renewable Energy & EV Solutions:**
- Solar power systems
- Wind turbines
- EV charging stations

**Design & Engineering:**
- Architectural, interior, and landscape design
- Detailed engineering design
- Green building consultation

**Construction Services:**
- General construction management
- Project management and training
- Fit-out and renovation
- HVAC and MEP systems
- Vertical garden installations
- Specialized fabrication (metal, steel, aluminium, glass)

---

เรามีบริการครบวงจรที่มุ่งเน้น:

**โซลูชันด้าน AI/ดิจิทัล:**
- พัฒนาและติดตั้งแชทบอต AI
- พัฒนาซอฟต์แวร์ตามความต้องการ
- การประยุกต์ใช้การเรียนรู้ของเครื่อง

**เทคโนโลยีอัจฉริยะและระบบอัตโนมัติ:**
- ระบบจัดการอาคาร (BMS)
- ระบบควบคุมอาคารอัจฉริยะและระบบอัตโนมัติ
- โซลูชันประหยัดพลังงาน
- ระบบรักษาความปลอดภัยและระบบควบคุมการเข้าถึง

**พลังงานทดแทนและโซลูชัน EV:**
- ระบบพลังงานแสงอาทิตย์
- กังหันลม
- สถานีชาร์จรถยนต์ไฟฟ้า

**การออกแบบและวิศวกรรม:**
- การออกแบบสถาปัตยกรรม ภายใน และภูมิทัศน์
- การออกแบบวิศวกรรมโดยละเอียด
- คำปรึกษาอาคารสีเขียว

**บริการก่อสร้าง:**
- การบริหารโครงการก่อสร้างทั่วไป
- การบริหารโครงการและการฝึกอบรม
- งานตกแต่งภายในและการปรับปรุง
- ระบบ HVAC และ MEP
- การติดตั้งสวนแนวตั้ง
- งานผลิตเฉพาะทาง (โลหะ, เหล็ก, อลูมิเนียม, กระจก)

---

我们提供全面的服务套件，专注于：

**AI/数字解决方案：**
- AI聊天机器人开发和部署
- 定制软件开发
- 机器学习应用

**智能技术与自动化：**
- 楼宇管理系统（BMS）
- 智能楼宇控制和自动化
- 节能解决方案
- 安全系统和门禁控制

**可再生能源和电动车解决方案：**
- 太阳能系统
- 风力涡轮机
- 电动车充电站

**设计与工程：**
- 建筑、室内和景观设计
- 详细工程设计
- 绿色建筑咨询

**建筑服务：**
- 一般建筑管理
- 项目管理和培训
- 室内装修和翻新
- 暖通空调和机电管道系统
- 垂直花园安装
- 专业制造（金属、钢材、铝材、玻璃）"""
    },
    "what_solutions_do_you_offer": {
        "keywords": ["what solutions do you offer", "what solutions", "available solutions", "คุณเสนอโซลูชันอะไรบ้าง", "มีโซลูชันอะไรบ้าง", "โซลูชันที่มี", "你们提供什么解决方案", "有什么解决方案", "可用的解决方案"],
        "content": """We offer three main categories of solutions:

**1. AI/Digital Solutions**
- AI chatbot development for customer service automation
- Custom software development for business needs
- Machine learning applications for data analysis and predictions

**2. Sustainable Technology Solutions**
- Building Management Systems (BMS) for efficient building operations
- Smart building controls and automation systems
- Energy-saving solutions to reduce costs and environmental impact
- Renewable energy systems: solar panels, wind turbines, EV charging stations

**3. Construction & Engineering Solutions**
- Green building design and construction
- HVAC (Heating, Ventilation, Air Conditioning) systems
- MEP (Mechanical, Electrical, Plumbing) systems
- Building retrofit and renovation services
- Vertical garden installations
- Security systems and access control
- Specialized fabrication services

---

เรามีโซลูชัน 3 ประเภทหลัก:

**1. โซลูชันด้าน AI/ดิจิทัล**
- พัฒนาแชทบอต AI สำหรับระบบบริการลูกค้าอัตโนมัติ
- พัฒนาซอฟต์แวร์ตามความต้องการทางธุรกิจ
- การประยุกต์ใช้การเรียนรู้ของเครื่องสำหรับการวิเคราะห์ข้อมูลและการคาดการณ์

**2. โซลูชันเทคโนโลยีที่ยั่งยืน**
- ระบบจัดการอาคาร (BMS) สำหรับการดำเนินงานอาคารที่มีประสิทธิภาพ
- ระบบควบคุมอาคารอัจฉริยะและระบบอัตโนมัติ
- โซลูชันประหยัดพลังงานเพื่อลดต้นทุนและผลกระทบต่อสิ่งแวดล้อม
- ระบบพลังงานทดแทน: แผงโซลาร์เซลล์, กังหันลม, สถานีชาร์จรถยนต์ไฟฟ้า

**3. โซลูชันการก่อสร้างและวิศวกรรม**
- การออกแบบและก่อสร้างอาคารสีเขียว
- ระบบ HVAC (ระบบทำความร้อน ระบายอากาศ และปรับอากาศ)
- ระบบ MEP (ระบบเครื่องกล ไฟฟ้า และประปา)
- บริการปรับปรุงและรีโนเวทอาคาร
- การติดตั้งสวนแนวตั้ง
- ระบบรักษาความปลอดภัยและระบบควบคุมการเข้าถึง
- บริการผลิตเฉพาะทาง

---

我们提供三大类解决方案：

**1. AI/数字解决方案**
- AI聊天机器人开发用于客户服务自动化
- 定制软件开发满足业务需求
- 机器学习应用用于数据分析和预测

**2. 可持续技术解决方案**
- 楼宇管理系统（BMS）用于高效的建筑运营
- 智能楼宇控制和自动化系统
- 节能解决方案以降低成本和环境影响
- 可再生能源系统：太阳能电池板、风力涡轮机、电动车充电站

**3. 建筑与工程解决方案**
- 绿色建筑设计和施工
- 暖通空调系统
- 机电管道系统
- 建筑改造和翻新服务
- 垂直花园安装
- 安全系统和门禁控制
- 专业制造服务"""
    },
    "what_do_you_sell": {
        "keywords": ["what do you sell", "what are you selling", "your products", "คุณขายอะไร", "คุณขายอะไรบ้าง", "สินค้าของคุณ", "你们卖什么", "你们销售什么", "你们的产品"],
        "content": """We provide services and solutions rather than selling products. Our offerings include:

**Services:**
- AI chatbot development and deployment services
- Software development services
- Building automation and smart building implementation
- Energy management consulting
- Construction and engineering services
- Project management and training

**Solutions & Systems:**
- Building Management Systems (BMS)
- Solar energy systems
- EV charging station installations
- HVAC and MEP systems
- Security and access control systems
- Green building and retrofit solutions

We focus on delivering complete, integrated solutions tailored to your specific needs, combining technology, engineering, and construction expertise.

---

เรามีบริการและโซลูชันมากกว่าการขายสินค้า สิ่งที่เรานำเสนอรวมถึง:

**บริการ:**
- บริการพัฒนาและติดตั้งแชทบอต AI
- บริการพัฒนาซอฟต์แวร์
- การติดตั้งระบบอัตโนมัติและอาคารอัจฉริยะ
- คำปรึกษาการจัดการพลังงาน
- บริการก่อสร้างและวิศวกรรม
- การบริหารโครงการและการฝึกอบรม

**โซลูชันและระบบ:**
- ระบบจัดการอาคาร (BMS)
- ระบบพลังงานแสงอาทิตย์
- การติดตั้งสถานีชาร์จรถยนต์ไฟฟ้า
- ระบบ HVAC และ MEP
- ระบบรักษาความปลอดภัยและระบบควบคุมการเข้าถึง
- โซลูชันอาคารสีเขียวและการปรับปรุงอาคาร

เรามุ่งเน้นการส่งมอบโซลูชันที่สมบูรณ์และบูรณาการตามความต้องการเฉพาะของคุณ โดยผสมผสานความเชี่ยวชาญด้านเทคโนโลยี วิศวกรรม และการก่อสร้าง

---

我们提供服务和解决方案而不是销售产品。我们的服务包括：

**服务：**
- AI聊天机器人开发和部署服务
- 软件开发服务
- 楼宇自动化和智能建筑实施
- 能源管理咨询
- 建筑和工程服务
- 项目管理和培训

**解决方案和系统：**
- 楼宇管理系统（BMS）
- 太阳能系统
- 电动车充电站安装
- 暖通空调和机电管道系统
- 安全和门禁控制系统
- 绿色建筑和改造解决方案

我们专注于提供完整的、集成的解决方案，根据您的具体需求量身定制，结合技术、工程和建筑专业知识。"""
    },
    "what_are_your_offers": {
        "keywords": ["what are your offers", "your offers", "special offers", "ข้อเสนอของคุณคืออะไร", "คุณมีข้อเสนออะไรบ้าง", "ข้อเสนอพิเศษ", "你们的优惠是什么", "你们有什么优惠", "特别优惠"],
        "content": """We offer comprehensive solutions and services in:

**AI & Digital Transformation:**
- AI chatbot development for 24/7 customer service
- Custom software solutions for business automation
- Machine learning integration for smart decision-making

**Smart Building & Automation:**
- Building Management Systems (BMS) for centralized control
- Energy monitoring and optimization systems
- Smart lighting, HVAC, and security automation

**Renewable Energy Solutions:**
- Solar panel installation and maintenance
- Wind energy systems
- EV charging infrastructure

**Green Construction & Engineering:**
- Sustainable building design and construction
- HVAC and MEP system installation
- Building retrofit and energy efficiency upgrades
- Vertical garden and green space installations

**Professional Services:**
- Architectural and engineering design
- Project management and construction supervision
- Training and technical support
- Maintenance and after-sales service

Contact us for customized solutions tailored to your specific needs!

---

เรามีโซลูชันและบริการครบวงจรใน:

**AI และการเปลี่ยนแปลงทางดิจิทัล:**
- พัฒนาแชทบอต AI สำหรับบริการลูกค้า 24/7
- โซลูชันซอฟต์แวร์ตามความต้องการสำหรับระบบอัตโนมัติทางธุรกิจ
- การบูรณาการการเรียนรู้ของเครื่องสำหรับการตัดสินใจอัจฉริยะ

**อาคารอัจฉริยะและระบบอัตโนมัติ:**
- ระบบจัดการอาคาร (BMS) สำหรับการควบคุมแบบรวมศูนย์
- ระบบตรวจสอบและเพิ่มประสิทธิภาพพลังงาน
- ระบบอัตโนมัติสำหรับแสงสว่าง HVAC และความปลอดภัย

**โซลูชันพลังงานทดแทน:**
- การติดตั้งและบำรุงรักษาแผงโซลาร์เซลล์
- ระบบพลังงานลม
- โครงสร้างพื้นฐานสำหรับชาร์จรถยนต์ไฟฟ้า

**การก่อสร้างสีเขียวและวิศวกรรม:**
- การออกแบบและก่อสร้างอาคารที่ยั่งยืน
- การติดตั้งระบบ HVAC และ MEP
- การปรับปรุงอาคารและเพิ่มประสิทธิภาพพลังงาน
- การติดตั้งสวนแนวตั้งและพื้นที่สีเขียว

**บริการมืออาชีพ:**
- การออกแบบสถาปัตยกรรมและวิศวกรรม
- การบริหารโครงการและการควบคุมงานก่อสร้าง
- การฝึกอบรมและการสนับสนุนทางเทคนิค
- การบำรุงรักษาและบริการหลังการขาย

ติดต่อเราเพื่อรับโซลูชันที่ปรับแต่งตามความต้องการเฉพาะของคุณ!

---

我们在以下领域提供全面的解决方案和服务：

**AI与数字化转型：**
- AI聊天机器人开发用于24/7客户服务
- 定制软件解决方案用于业务自动化
- 机器学习集成用于智能决策

**智能建筑与自动化：**
- 楼宇管理系统（BMS）用于集中控制
- 能源监控和优化系统
- 智能照明、暖通空调和安全自动化

**可再生能源解决方案：**
- 太阳能电池板安装和维护
- 风能系统
- 电动车充电基础设施

**绿色建筑与工程：**
- 可持续建筑设计和施工
- 暖通空调和机电管道系统安装
- 建筑改造和能效升级
- 垂直花园和绿色空间安装

**专业服务：**
- 建筑和工程设计
- 项目管理和施工监督
- 培训和技术支持
- 维护和售后服务

联系我们获取根据您的具体需求定制的解决方案！"""
    },
    "about_organization": {
        "keywords": ["tell me about your organization", "about your organization", "about cblue", "who is cblue", "cblue thailand"],
        "content": """Cblue Thailand is a group of experienced and highly skilled professionals who design, engineer and construct leading-edge facilities and related infrastructure for residential buildings, industries and public civil works. We have the flexibility and strength to deliver large or small projects successfully anywhere in Thailand.
We offer a comprehensive suite of services focused on AI/Digital Solutions, sustainable technology solutions, and construction engineering. Our mission is to provide the best, state-of-the-art green solutions and services on time, on budget and with safety and integrity."""
    },
    "company_specialization": {
        "keywords": ["what does your company specialize in", "company specialization", "what do you specialize in", "specialties"],
        "content": """Cblue Thailand specializes in:
- **Digital Solutions**: AI chatbot development, software development, and machine learning
- **Smart Technology & Automation**: Building Management Systems (BMS), smart building controls, automation, and energy-saving solutions
- **Renewable Energy & EV Solutions**: Solar power, wind turbines, and EV charging stations
- **Design & Engineering**: Full architectural, interior, landscape, and detailed engineering design
- **Construction & Specialized Trades**: General construction, fit-outs, HVAC, MEP systems, retrofitting, and green building (including vertical gardens)
- **Specialized Fabrication**: Metal sheet, steel structure, aluminium, and glass work
- **Consulting & Strategy**: Market research, economic evaluations, feasibility studies, and project management"""
    },
    "business_type": {
        "keywords": ["what kind of business are you in", "what business are you in", "type of business", "business sector"],
        "content": """We are in the green building, smart automation, and AI/chatbot solutions business. We operate across multiple sectors including construction, engineering, renewable energy, smart technology, and digital solutions, serving residential buildings, industries, and public civil works throughout Thailand."""
    },
    "company_description": {
        "keywords": ["how would you describe your company", "describe your company", "company description", "what is your company"],
        "content": """Cblue Thailand is a comprehensive solutions provider that bridges traditional construction and engineering with cutting-edge technology. We focus on sustainable, environmentally-friendly approaches while integrating smart automation and AI solutions to create buildings and systems that are not only functional but also contribute to a carbon-neutral future."""
    },
    "organization_activities": {
        "keywords": ["tell me more about what your organization do", "what does your organization do", "organization activities", "what do you do"],
        "content": """Our organization transforms the built environment through sustainable practices and innovative technology. We design and construct eco-friendly buildings that harmonize with nature, implement smart building systems for energy efficiency, develop AI chatbots and software solutions, and provide renewable energy installations like solar panels and EV charging stations. We also specialize in vertical gardens, building automation systems, and comprehensive project management from concept to completion."""
    },
    "company_offerings": {
        "keywords": ["what does your company provide", "what do you provide", "company offerings", "what can you provide"],
        "content": """We provide:
- AI chatbot development and software solutions
- Green architecture and sustainable building design
- Solar energy systems and EV charging stations
- HVAC, MEP systems, and building retrofits
- Smart building controls and automation (BAS/BMS)
- Environmental services and energy-saving solutions
- Security systems and access control
- Construction management and fit-out services
- Vertical garden installations
- Smart home and smart farming solutions
- Website development"""
    },
    "core_services": {
        "keywords": ["core services", "core products", "main services", "primary services", "key services"],
        "content": """Our core services include:
1. **AI & Digital Solutions**: Chatbot development, machine learning, software development
2. **Green Building Solutions**: Sustainable architecture, green construction, vertical gardens
3. **Smart Technology**: Building automation, smart homes, IoT solutions
4. **Renewable Energy**: Solar panels, EV chargers, energy-saving systems
5. **Construction & Engineering**: HVAC, MEP, retrofitting, project management
6. **Security Solutions**: Access control, security systems
7. **Specialized Services**: Smart farming, website development"""
    },
    "company_mission": {
        "keywords": ["company mission", "company purpose", "mission statement", "your mission", "your purpose"],
        "content": """Our mission is to provide the best, state-of-the-art green solutions and services on time, on budget and with safety and integrity. We are committed to creating a sustainable future by transforming the built environment into a force for environmental restoration and sustainability, using innovative technology and a commitment to a carbon-free future."""
    },
    "solution_types": {
        "keywords": ["what kind of solutions", "solution types", "types of solutions", "solutions you provide"],
        "content": """We provide comprehensive solutions spanning:
- **Environmental Solutions**: Green building materials, energy-efficient designs, carbon reduction
- **Technology Solutions**: AI chatbots, building automation, smart controls, IoT integration
- **Energy Solutions**: Solar power systems, energy-saving technologies, EV charging infrastructure
- **Construction Solutions**: Sustainable building practices, retrofitting, MEP systems
- **Digital Solutions**: Software development, machine learning, website development"""
    },
    "what_company_does": {
        "keywords": ["what does your company do", "what do you do", "company activities", "your work"],
        "content": """Cblue Thailand designs, engineers, and constructs sustainable buildings and infrastructure while developing AI and smart technology solutions. We create eco-friendly environments that integrate renewable energy, smart automation, and green building practices to minimize environmental impact and maximize efficiency for residential, commercial, and industrial clients across Thailand."""
    },
    "contact_customer_service": {
        "keywords": ["contact customer service", "customer service contact", "how to contact", "contact information", "reach customer service"],
        "content": """**Email**: cblue.thailand@gmail.com  
**Phone**: +66 (0)81 854 4291"""
    },
    "business_hours": {
        "keywords": ["business hours", "working hours", "office hours", "what time open", "when are you open"],
        "content": """We work from 9AM to 5PM."""
    },
    "house_sales_rental": {
        "keywords": ["do you sell houses", "do you rent houses", "sell houses", "rent houses", "คุณขายบ้านด้วยเหรอ", "คุณขายบ้านหรือไม่", "คุณให้เช่าบ้าน", "คุณใครบ้าน", "คุณให้ชาวบ้าน", "你们卖房子吗", "你们租房子吗", "你们出售房屋吗", "你们出租房屋吗", "คุณขายหรือให้เช่าบ้านหรือไม่", "你们出售或出租房屋吗"],
        "content": """We do not sell or rent houses directly. However, we provide comprehensive services for residential building projects including:
- Green building design and construction
- Smart home automation systems
- Solar panel installation for homes
- HVAC and MEP systems
- Energy-efficient retrofitting
- Building management systems

We can help you build, renovate, or upgrade your residential property with sustainable and smart technology solutions.

---

เราไม่ได้ขายหรือให้เช่าบ้านโดยตรง แต่เราให้บริการที่ครอบคลุมสำหรับโครงการอาคารที่พักอาศัย ได้แก่:
- การออกแบบและก่อสร้างอาคารสีเขียว
- ระบบบ้านอัจฉริยะอัตโนมัติ
- การติดตั้งแผงโซลาร์เซลล์สำหรับบ้าน
- ระบบ HVAC และ MEP
- การปรับปรุงอาคารเพื่อประหยัดพลังงาน
- ระบบบริหารจัดการอาคาร

เราสามารถช่วยคุณสร้าง ปรับปรุง หรืออัพเกรดอสังหาริมทรัพย์ที่พักอาศัยของคุณด้วยโซลูชันเทคโนโลยีที่ยั่งยืนและอัจฉริยะ

---

我们不直接出售或出租房屋。但是，我们为住宅建筑项目提供全面的服务，包括:
- 绿色建筑设计和施工
- 智能家居自动化系统
- 住宅太阳能电池板安装
- 暖通空调和机电管道系统
- 节能改造
- 楼宇管理系统

我们可以帮助您建造、翻新或升级您的住宅物业，提供可持续和智能技术解决方案。"""
    },
    "house_location": {
        "keywords": ["where are your houses", "house location", "houses for sale location", "houses for rent location", "บ้านที่ขายหรือให้เช่าอยู่ที่ไหน", "บ้านของคุณอยู่ที่ไหน", "你们的房屋在哪里", "房屋位置", "你们的房屋在哪里出售", "你们的房屋在哪里出租"],
        "content": """We do not sell or rent houses. We are a construction and engineering company that provides building services throughout Thailand. We can help you with:
- Building new residential properties anywhere in Thailand
- Renovating existing homes
- Installing smart home systems
- Adding solar panels and renewable energy systems
- Implementing green building solutions

Contact us to discuss your residential project needs!

---

เราไม่ได้ขายหรือให้เช่าบ้าน เราเป็นบริษัทก่อสร้างและวิศวกรรมที่ให้บริการก่อสร้างทั่วประเทศไทย เราสามารถช่วยคุณได้ด้วย:
- สร้างอสังหาริมทรัพย์ที่พักอาศัยใหม่ทุกที่ในประเทศไทย
- ปรับปรุงบ้านที่มีอยู่
- ติดตั้งระบบบ้านอัจฉริยะ
- เพิ่มแผงโซลาร์เซลล์และระบบพลังงานหมุนเวียน
- ใช้โซลูชันอาคารสีเขียว

ติดต่อเราเพื่อหารือเกี่ยวกับความต้องการโครงการที่พักอาศัยของคุณ!

---

我们不出售或出租房屋。我们是一家建筑和工程公司，在泰国各地提供建筑服务。我们可以帮助您:
- 在泰国任何地方建造新的住宅物业
- 翻新现有房屋
- 安装智能家居系统
- 添加太阳能电池板和可再生能源系统
- 实施绿色建筑解决方案

联系我们讨论您的住宅项目需求!"""
    },
    "house_price": {
        "keywords": ["house price", "how much house", "price of house", "ราคาบ้าน", "ราคาเท่าไหร่", "บ้านราคาเท่าไร", "房价", "房屋价格", "价格是多少", "房子多少钱"],
        "content": """We do not sell houses, so we don't have house prices. However, we can provide you with cost estimates for:
- Building a new green home
- Smart home automation installation
- Solar panel system installation
- HVAC and MEP systems
- Building renovation and retrofitting
- Energy-efficient upgrades

The cost depends on your specific requirements, project size, and location. Contact us for a customized quote!

---

เราไม่ได้ขายบ้าน ดังนั้นเราจึงไม่มีราคาบ้าน อย่างไรก็ตาม เราสามารถให้ประมาณการค่าใช้จ่ายสำหรับ:
- สร้างบ้านสีเขียวใหม่
- ติดตั้งระบบบ้านอัจฉริยะอัตโนมัติ
- ติดตั้งระบบแผงโซลาร์เซลล์
- ระบบ HVAC และ MEP
- การปรับปรุงและรีโนเวทอาคาร
- การอัพเกรดเพื่อประหยัดพลังงาน

ค่าใช้จ่ายขึ้นอยู่กับความต้องการเฉพาะของคุณ ขนาดโครงการ และสถานที่ ติดต่อเราเพื่อขอใบเสนอราคาที่ปรับแต่งได้!

---

我们不出售房屋，所以没有房价。但是，我们可以为您提供以下费用估算:
- 建造新的绿色住宅
- 智能家居自动化安装
- 太阳能电池板系统安装
- 暖通空调和机电管道系统
- 建筑翻新和改造
- 节能升级

费用取决于您的具体要求、项目规模和位置。联系我们获取定制报价!"""
    },
    "house_types": {
        "keywords": ["what kind of house", "house types", "types of houses", "คุณขายบ้านประเภทไหน", "บ้านประเภทไหน", "ประเภทของบ้าน", "你们出售什么类型的房屋", "房屋类型", "什么类型的房子"],
        "content": """We don't sell houses, but we can design and build various types of residential properties including:
- Single-family homes
- Multi-family residential buildings
- Eco-friendly green homes
- Smart homes with automation
- Energy-efficient homes with solar panels
- Modern sustainable villas
- Residential condominiums

All our projects incorporate green building practices, smart technology, and energy-efficient solutions tailored to your needs.

---

เราไม่ได้ขายบ้าน แต่เราสามารถออกแบบและสร้างอสังหาริมทรัพย์ที่พักอาศัยประเภทต่างๆ ได้แก่:
- บ้านเดี่ยว
- อาคารที่พักอาศัยหลายครอบครัว
- บ้านสีเขียวที่เป็นมิตรต่อสิ่งแวดล้อม
- บ้านอัจฉริยะพร้อมระบบอัตโนมัติ
- บ้านประหยัดพลังงานพร้อมแผงโซลาร์เซลล์
- วิลล่าที่ยั่งยืนสมัยใหม่
- คอนโดมิเนียมที่พักอาศัย

โครงการทั้งหมดของเรารวมแนวปฏิบัติการก่อสร้างสีเขียว เทคโนโลยีอัจฉริยะ และโซลูชันประหยัดพลังงานที่ปรับแต่งตามความต้องการของคุณ

---

我们不出售房屋，但我们可以设计和建造各种类型的住宅物业，包括:
- 独栋住宅
- 多户住宅楼
- 环保绿色住宅
- 带自动化的智能住宅
- 带太阳能电池板的节能住宅
- 现代可持续别墅
- 住宅公寓

我们所有的项目都融入了绿色建筑实践、智能技术和根据您的需求定制的节能解决方案。"""
    },
    "solar_panel_types": {
        "keywords": ["solar panel types", "types of solar panels", "solar panels types", "แผงโซลาร์เซลล์มีประเภทไหนบ้าง", "ประเภทแผงโซลาร์เซลล์", "太阳能电池板类型", "太阳能电池板有哪些类型", "太阳能板种类"],
        "content": """We work with various types of solar panels including:

**1. Monocrystalline Solar Panels**
- Highest efficiency (15-22%)
- Best for limited space
- Longer lifespan (25-30 years)
- Higher cost but better performance

**2. Polycrystalline Solar Panels**
- Good efficiency (13-16%)
- More affordable option
- Suitable for larger installations
- Good value for money

**3. Thin-Film Solar Panels**
- Flexible and lightweight
- Lower efficiency but works in low light
- Good for specific applications
- Most affordable option

We can recommend the best type based on your budget, space, and energy needs.

---

เราทำงานกับแผงโซลาร์เซลล์หลายประเภท ได้แก่:

**1. แผงโซลาร์เซลล์โมโนคริสตัลไลน์**
- ประสิทธิภาพสูงสุด (15-22%)
- เหมาะสำหรับพื้นที่จำกัด
- อายุการใช้งานยาวนาน (25-30 ปี)
- ราคาสูงกว่าแต่ประสิทธิภาพดีกว่า

**2. แผงโซลาร์เซลล์โพลีคริสตัลไลน์**
- ประสิทธิภาพดี (13-16%)
- ตัวเลือกที่ราคาไม่แพง
- เหมาะสำหรับการติดตั้งขนาดใหญ่
- คุ้มค่ากับเงิน

**3. แผงโซลาร์เซลล์ฟิล์มบาง**
- ยืดหยุ่นและน้ำหนักเบา
- ประสิทธิภาพต่ำกว่าแต่ทำงานได้ในแสงน้อย
- เหมาะสำหรับการใช้งานเฉพาะ
- ตัวเลือกที่ราคาถูกที่สุด

เราสามารถแนะนำประเภทที่ดีที่สุดตามงบประมาณ พื้นที่ และความต้องการพลังงานของคุณ

---

我们使用各种类型的太阳能电池板，包括:

**1. 单晶硅太阳能电池板**
- 效率最高 (15-22%)
- 最适合有限空间
- 使用寿命更长 (25-30年)
- 成本较高但性能更好

**2. 多晶硅太阳能电池板**
- 效率良好 (13-16%)
- 更实惠的选择
- 适合大型安装
- 性价比高

**3. 薄膜太阳能电池板**
- 灵活轻便
- 效率较低但在弱光下工作
- 适合特定应用
- 最实惠的选择

我们可以根据您的预算、空间和能源需求推荐最佳类型。"""
    },
    "solar_equipment": {
        "keywords": ["solar panel equipment", "solar equipment", "solar panels equipment", "อุปกรณ์แผงโซลาร์เซลล์", "อุปกรณ์โซลาร์เซลล์", "太阳能设备", "太阳能电池板设备", "太阳能板设备有哪些"],
        "content": """A complete solar panel system includes:

**Main Components:**
- Solar Panels (PV modules)
- Solar Inverter (converts DC to AC power)
- Mounting Structure/Racking System
- Battery Storage System (optional)
- Charge Controller
- Electrical Wiring and Connectors

**Monitoring & Protection:**
- Monitoring System
- Circuit Breakers
- Surge Protection Devices
- Junction Boxes
- Grounding Equipment

**Additional Equipment:**
- Meter (for grid-tied systems)
- Combiner Box
- Disconnect Switches
- Cable Management Systems

We provide complete installation including all necessary equipment and can customize the system based on your energy requirements.

---

ระบบแผงโซลาร์เซลล์ที่สมบูรณ์ประกอบด้วย:

**ส่วนประกอบหลัก:**
- แผงโซลาร์เซลล์ (โมดูล PV)
- อินเวอร์เตอร์โซลาร์เซลล์ (แปลง DC เป็น AC)
- โครงสร้างติดตั้ง/ระบบแร็ค
- ระบบแบตเตอรี่สำรอง (ตัวเลือก)
- ตัวควบคุมการชาร์จ
- สายไฟฟ้าและตัวเชื่อมต่อ

**การตรวจสอบและป้องกัน:**
- ระบบตรวจสอบ
- เซอร์กิตเบรกเกอร์
- อุปกรณ์ป้องกันไฟกระชาก
- กล่องแยกสาย
- อุปกรณ์ต่อสายดิน

**อุปกรณ์เพิ่มเติม:**
- มิเตอร์ (สำหรับระบบเชื่อมต่อกริด)
- กล่องรวมสาย
- สวิตช์ตัดการเชื่อมต่อ
- ระบบจัดการสายเคเบิล

เราให้บริการติดตั้งที่สมบูรณ์รวมถึงอุปกรณ์ที่จำเป็นทั้งหมด และสามารถปรับแต่งระบบตามความต้องการพลังงานของคุณ

---

完整的太阳能电池板系统包括:

**主要组件:**
- 太阳能电池板 (光伏组件)
- 太阳能逆变器 (将直流电转换为交流电)
- 安装结构/支架系统
- 电池储能系统 (可选)
- 充电控制器
- 电气布线和连接器

**监控与保护:**
- 监控系统
- 断路器
- 浪涌保护装置
- 接线盒
- 接地设备

**附加设备:**
- 电表 (用于并网系统)
- 汇流箱
- 断开开关
- 电缆管理系统

我们提供包括所有必要设备的完整安装，并可根据您的能源需求定制系统。"""
    },
    "solar_farms": {
        "keywords": ["solar farm", "solar farms", "what is solar farm", "ฟาร์มโซลาร์เซลล์", "ฟาร์มพลังงานแสงอาทิตย์", "什么是太阳能农场", "太阳能农场", "太阳能发电场"],
        "content": """A solar farm (also called solar park or solar power plant) is a large-scale solar installation that generates electricity from sunlight using many solar panels across a large area of land.

**Key Features:**
- Large-scale renewable energy generation
- Hundreds to thousands of solar panels
- Connected to the electrical grid
- Commercial electricity production
- Typically 1 MW to hundreds of MW capacity

**Benefits:**
- Clean, renewable energy source
- Reduces carbon emissions
- Low operating costs after installation
- Long-term energy production (25+ years)
- Can be built on unused land

**Our Services:**
We can design, engineer, and construct solar farms including:
- Site assessment and feasibility studies
- Complete system design
- Installation and commissioning
- Grid connection
- Monitoring systems
- Maintenance services

Contact us to discuss your solar farm project!

---

ฟาร์มโซลาร์เซลล์ (เรียกอีกอย่างว่าสวนโซลาร์หรือโรงไฟฟ้าพลังงานแสงอาทิตย์) คือการติดตั้งโซลาร์เซลล์ขนาดใหญ่ที่ผลิตไฟฟ้าจากแสงอาทิตย์โดยใช้แผงโซลาร์เซลล์จำนวนมากในพื้นที่ขนาดใหญ่

**คุณสมบัติหลัก:**
- การผลิตพลังงานหมุนเวียนขนาดใหญ่
- แผงโซลาร์เซลล์หลายร้อยถึงหลายพันแผง
- เชื่อมต่อกับโครงข่ายไฟฟ้า
- การผลิตไฟฟ้าเชิงพาณิชย์
- ความจุโดยทั่วไป 1 เมกะวัตต์ถึงหลายร้อยเมกะวัตต์

**ประโยชน์:**
- แหล่งพลังงานหมุนเวียนที่สะอาด
- ลดการปล่อยคาร์บอน
- ต้นทุนการดำเนินงานต่ำหลังการติดตั้ง
- การผลิตพลังงานระยะยาว (25+ ปี)
- สามารถสร้างบนที่ดินที่ไม่ได้ใช้งาน

**บริการของเรา:**
เราสามารถออกแบบ วิศวกรรม และสร้างฟาร์มโซลาร์เซลล์ รวมถึง:
- การประเมินสถานที่และการศึกษาความเป็นไปได้
- การออกแบบระบบที่สมบูรณ์
- การติดตั้งและการเริ่มใช้งาน
- การเชื่อมต่อกริด
- ระบบตรวจสอบ
- บริการบำรุงรักษา

ติดต่อเราเพื่อหารือเกี่ยวกับโครงการฟาร์มโซลาร์เซลล์ของคุณ!

---

太阳能农场（也称为太阳能公园或太阳能发电厂）是一个大规模的太阳能装置，使用大面积土地上的许多太阳能电池板从阳光中发电。

**主要特点:**
- 大规模可再生能源发电
- 数百到数千块太阳能电池板
- 连接到电网
- 商业发电
- 通常容量为1兆瓦到数百兆瓦

**优势:**
- 清洁的可再生能源
- 减少碳排放
- 安装后运营成本低
- 长期能源生产 (25年以上)
- 可以建在未使用的土地上

**我们的服务:**
我们可以设计、工程和建造太阳能农场，包括:
- 场地评估和可行性研究
- 完整的系统设计
- 安装和调试
- 电网连接
- 监控系统
- 维护服务

联系我们讨论您的太阳能农场项目!"""
    },
    "house_sales_rental_inquiry": {
        "keywords": ["do you sell houses", "do you rent houses", "sell houses", "rent houses", "คุณขายบ้านด้วยเหรอ", "คุณขายบ้านหรือไม่", "คุณให้เช่าบ้าน", "คุณใครบ้าน", "คุณให้ชาวบ้าน", "你们卖房子吗", "你们租房子吗", "你们出售房屋吗", "你们出租房屋吗", "คุณขายหรือให้เช่าบ้านหรือไม่", "你们出售或出租房屋吗"],
        "content": """We do not sell or rent houses directly. Our expertise is in construction, renovation, and green building projects. We can build a house for you or renovate an existing one.

---

เราไม่ได้ขายหรือให้เช่าบ้านโดยตรง ความเชี่ยวชาญของเราคือการก่อสร้าง การปรับปรุง และโครงการอาคารสีเขียว เราสามารถสร้างบ้านให้คุณหรือปรับปรุงบ้านที่มีอยู่ได้

---

我们不直接出售或出租房屋。我们的专长是建筑、装修和绿色建筑项目。我们可以为您建造房屋或翻新现有房屋。"""
    },
    "house_location_inquiry": {
        "keywords": ["Where are your houses for sales/rent?", "บ้านสำหรับขาย/เช่าของคุณอยู่ที่ไหน", "你们待售/出租的房子在哪里"],
        "content": """Since we do not sell or rent houses, we do not have listings. However, we can build or renovate a property for you at your desired location in Thailand.

---

เนื่องจากเราไม่ได้ขายหรือให้เช่าบ้าน เราจึงไม่มีรายการบ้าน อย่างไรก็ตาม เราสามารถสร้างหรือปรับปรุงอสังหาริมทรัพย์ให้คุณได้ตามสถานที่ที่คุณต้องการในประเทศไทย

---

由于我们不销售或出租房屋，因此我们没有房源。但是，我们可以根据您在泰国的要求为您建造或翻新房产。"""
    },
    "house_price_inquiry": {
        "keywords": ["what is the price?", "ราคาเท่าไหร่", "价格是多少"],
        "content": """The price of our services depends on the project's scope, materials, and location. For a detailed quote on building or renovating a property, please contact us with your specific requirements.

---

ราคาบริการของเราขึ้นอยู่กับขอบเขตของโครงการ วัสดุ และสถานที่ สำหรับใบเสนอราคาโดยละเอียดเกี่ยวกับการสร้างหรือปรับปรุงอสังหาริมทรัพย์ โปรดติดต่อเราพร้อมแจ้งความต้องการเฉพาะของคุณ

---

我们服务的价格取决于项目的范围、材料和位置。有关建筑或翻新房产的详细报价，请联系我们并告知您的具体要求。"""
    },
    "house_types_inquiry": {
        "keywords": ["What kind of house do you sell/rent?", "คุณขาย/ให้เช่าบ้านประเภทไหน", "你们出售/出租什么样的房子"],
        "content": """We do not sell or rent houses, but we can build any type of house you desire, with a focus on green and sustainable construction, including smart homes and eco-friendly villas.

---

เราไม่ได้ขายหรือให้เช่าบ้าน แต่เราสามารถสร้างบ้านประเภทใดก็ได้ที่คุณต้องการ โดยเน้นที่การก่อสร้างที่เป็นมิตรกับสิ่งแวดล้อมและยั่งยืน รวมถึงบ้านอัจฉริยะและวิลล่าที่เป็นมิตรกับสิ่งแวดล้อม

---

我们不销售或出租房屋，但我们可以建造您想要的任何类型的房屋，重点是绿色和可持续建筑，包括智能家居和环保别墅。"""
    },
    "solar_panel_details": {
        "keywords": ["Solar panels, solar farms? Solar panels types? Solar panels equipment?", "แผงโซลาร์เซลล์, โซลาร์ฟาร์ม? ประเภทของแผงโซลาร์เซลล์? อุปกรณ์แผงโซลาร์เซลล์?", "太阳能电池板，太阳能农场？太阳能电池板的类型？太阳能电池板设备？"],
        "content": """Yes, we offer comprehensive solar solutions. We design and install solar panel systems for residential and commercial use, as well as large-scale solar farms. We provide various panel types, such as monocrystalline and polycrystalline, along with all necessary equipment like inverters, batteries, and mounting structures. Contact us for a detailed consultation.

---

ใช่ เรามีโซลูชันพลังงานแสงอาทิตย์ที่ครอบคลุม เราออกแบบและติดตั้งระบบแผงโซลาร์เซลล์สำหรับที่อยู่อาศัยและเชิงพาณิชย์ รวมถึงโซลาร์ฟาร์มขนาดใหญ่ เรามีแผงโซลาร์เซลล์หลายประเภท เช่น โมโนคริสตัลไลน์และโพลีคริสตัลไลน์ พร้อมด้วยอุปกรณ์ที่จำเป็นทั้งหมด เช่น อินเวอร์เตอร์ แบตเตอรี่ และโครงสร้างการติดตั้ง ติดต่อเราเพื่อขอคำปรึกษาโดยละเอียด

---

是的，我们提供全面的太阳能解决方案。我们设计和安装用于住宅和商业用途的太阳能电池板系统，以及大型太阳能农场。我们提供各种类型的电池板，例如单晶和多晶，以及所有必要的设备，如逆变器、电池和安装结构。请联系我们进行详细咨询。"""
    }
}

def detect_language(text: str) -> str:
    """Detect language: th, zh, or en"""
    import re
    thai_chars = len(re.findall(r'[\u0E00-\u0E7F]', text))
    chinese_chars = len(re.findall(r'[\u4E00-\u9FFF]', text))
    total_chars = len(text.strip())
    
    if total_chars == 0:
        return 'en'
    
    if thai_chars / total_chars > 0.3:
        return 'th'
    elif chinese_chars / total_chars > 0.3:
        return 'zh'
    return 'en'

def extract_language_content(content: str, lang: str) -> str:
    """Extract content for specific language from multilingual content"""
    if '---' not in content:
        return content
    
    sections = content.split('---')
    
    if lang == 'en':
        return sections[0].strip()
    elif lang == 'th' and len(sections) > 1:
        return sections[1].strip()
    elif lang == 'zh' and len(sections) > 2:
        return sections[2].strip()
    
    return sections[0].strip()

def normalize_text(text: str) -> str:
    """Normalize text by removing hyphens and extra spaces for better matching"""
    return text.replace('-', ' ').replace('  ', ' ').strip()

def find_relevant_content(query: str) -> str:
    """Find relevant content using keyword matching with synonyms"""
    query_lower = query.lower()
    query_normalized = normalize_text(query_lower)
    lang = detect_language(query)
    matches = []
    
    # Check if query is a single word (no spaces or only one word)
    # If so, treat it as "what is <word>"
    query_words = query_normalized.strip().split()
    is_single_word = len(query_words) == 1
    
    # If single word query, expand it based on language
    if is_single_word:
        single_word = query_words[0]
        if lang == 'th':
            # For Thai, add variations: "word คือ", "word คืออะไร"
            expanded_queries = [single_word, f"{single_word} คือ", f"{single_word} คืออะไร", 
                              f"{single_word}คือ", f"{single_word}คืออะไร"]
        elif lang == 'zh':
            # For Chinese, add variations: "什么是word", "word是什么"
            expanded_queries = [single_word, f"什么是{single_word}", f"{single_word}是什么"]
        else:
            # For English, add "what is word"
            expanded_queries = [single_word, f"what is {single_word}", f"what is a {single_word}",
                              f"what are {single_word}"]
    else:
        expanded_queries = [query_lower, query_normalized]
    
    # Search through all expanded query variations
    for search_query in expanded_queries:
        for topic, data in KNOWLEDGE_BASE.items():
            for keyword in data["keywords"]:
                keyword_lower = keyword.lower()
                keyword_normalized = normalize_text(keyword_lower)
                if keyword_lower in search_query or keyword_normalized in search_query or search_query in keyword_lower:
                    content = extract_language_content(data["content"], lang)
                    if content not in matches:  # Avoid duplicates
                        matches.append(content)
                    break
        if matches:  # If we found matches, stop searching
            break
    
    if matches:
        return "\n\n".join(matches)
    
    fallback = {
        'th': """ขออภัย ฉันไม่พบข้อมูลที่ตรงกับคำถามของคุณ กรุณาลองถามใหม่หรือติดต่อเราที่:
อีเมล: cblue.thailand@gmail.com
โทร: +66 (0)81 854 4291""",
        'zh': """抱歉，我没有找到与您问题相关的信息。请重新提问或联系我们：
邮箱：cblue.thailand@gmail.com
电话：+66 (0)81 854 4291""",
        'en': """Sorry, I couldn't find information matching your question. Please try asking differently or contact us at:
Email: cblue.thailand@gmail.com
Phone: +66 (0)81 854 4291"""
    }
    
    return fallback.get(lang, fallback['en'])
