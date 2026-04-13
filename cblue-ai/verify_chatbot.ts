import { ChatService } from './src/services/ChatService.ts';

async function verify() {
    console.log("Starting verification...");

    // Test Case 1: English Input
    console.log("\nTest 1: English Input 'What is AI?'");
    const resEn = await ChatService.sendMessage("What is AI?");
    console.log("Response:", resEn.substring(0, 50) + "...");
    if (resEn.includes("Artificial Intelligence")) {
        console.log("✅ English detected correctly");
    } else {
        console.error("❌ English detection failed");
    }

    // Test Case 2: Thai Input
    console.log("\nTest 2: Thai Input 'AI คืออะไร'");
    const resTh = await ChatService.sendMessage("AI คืออะไร");
    console.log("Response:", resTh.substring(0, 50) + "...");
    if (resTh.includes("ปัญญาประดิษฐ์")) {
        console.log("✅ Thai detected correctly");
    } else {
        console.error("❌ Thai detection failed");
    }

    // Test Case 3: Chinese Input
    console.log("\nTest 3: Chinese Input '什么是AI'");
    const resZh = await ChatService.sendMessage("什么是AI");
    console.log("Response:", resZh.substring(0, 50) + "...");
    if (resZh.includes("人工智能")) {
        console.log("✅ Chinese detected correctly");
    } else {
        console.error("❌ Chinese detection failed");
    }

    // Test Case 4: Fallback
    console.log("\nTest 4: Unknown Input (Fallback)");
    const resFallback = await ChatService.sendMessage("adskjfhaskjfhkjsdhf");
    // Should default to En since no thai/chinese chars, so checks for english fallback or just generic?
    // detectLanguage will return 'en' for "adskjfhaskjfhkjsdhf".
    // prompts.ts for 'en' is "Sorry, I cannot answer..."
    console.log("Response:", resFallback);
    if (resFallback.includes("Sorry")) {
        console.log("✅ Fallback (EN) correct");
    } else {
        console.error("❌ Fallback (EN) failed");
    }
}

verify().catch(console.error);
