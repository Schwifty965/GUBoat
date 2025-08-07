import { state, output, reviewList, reviewModalOverlay, aiHistoryLog } from './config.js';
import { showLoading, showMessage } from './ui.js';
import { saveState } from './history.js';

// --- Gemini API Functions ---
async function callGeminiAPI(prompt, jsonSchema = null) {
    if (!state.geminiApiKey) {
        showMessage("กรุณาตั้งค่า Gemini API Key ก่อนใช้งานครับ");
        return null;
    }
    showLoading(true);
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${state.geminiApiKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    if (jsonSchema) {
        payload.generationConfig = { responseMimeType: "application/json", responseSchema: jsonSchema };
    }
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return "ไม่ได้รับคำตอบจาก AI หรือคำตอบมีรูปแบบที่ไม่ถูกต้อง";
        }
    } catch (error) {
        console.error("Gemini API Error:", error);
        showMessage("เกิดข้อผิดพลาดในการเชื่อมต่อกับ Gemini API: " + error.message);
        return null;
    } finally {
        showLoading(false);
    }
}

export function addAiResponseToHistory(promptUsed, aiResponse) {
    const noHistoryMsg = aiHistoryLog.querySelector('p');
    if (noHistoryMsg && noHistoryMsg.textContent.includes('ไม่มีประวัติ')) {
        aiHistoryLog.innerHTML = '';
    }

    const responseEntry = document.createElement('div');
    responseEntry.className = 'ai-history-entry card';
    responseEntry.innerHTML = `
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
            <strong>คุณสั่ง AI:</strong> "${promptUsed}"
            <span style="float: right;">${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="ai-response-content">${aiResponse}</div>
        <button class="btn gemini-btn copy-ai-response-btn" style="padding: 8px 12px; font-size: 0.85rem;">📋 คัดลอกไปกล่องหลัก</button>
    `;
    aiHistoryLog.prepend(responseEntry);
    aiHistoryLog.scrollTop = 0;

    responseEntry.querySelector('.copy-ai-response-btn').onclick = () => {
        output.value = aiResponse;
        output.dispatchEvent(new Event('input'));
        saveState();
        showMessage("คัดลอกข้อความ AI ไปยังกล่องหลักแล้วครับ!");
    };
}

// --- AI Tools ---
export async function proofreadWithAI() {
    const text = output.value;
    if (!text.trim()) return showMessage("กรุณาพิมพ์เนื้อเรื่องก่อนใช้ AI ตรวจคำผิดครับ");
    const schema = { type: "ARRAY", items: { type: "OBJECT", properties: { original: { type: "STRING" }, corrected: { type: "STRING" }, reason: { type: "STRING" } }, required: ["original", "corrected", "reason"] } };
    const prompt = `ทำหน้าที่เป็นบรรณาธิการภาษาไทยมืออาชีพ วิเคราะห์ข้อความต่อไปนี้และหาจุดที่สะกดผิดหรือใช้ไวยากรณ์ผิดพลาด สำหรับแต่ละจุดที่พบ ให้ส่งคืนข้อมูลเป็นอาร์เรย์ของอ็อบเจ็กต์ JSON ที่มี key: "original", "corrected", และ "reason" เท่านั้น ห้ามส่งคืนข้อมูลอื่นใดนอกเหนือจากอาร์เรย์ JSON\n\n---\n${text}\n---`;
    const resultJson = await callGeminiAPI(prompt, schema);
    if (resultJson) {
        try {
            const suggestions = JSON.parse(resultJson);
            if (suggestions.length === 0) {
                showMessage("✨ ยอดเยี่ยม! AI ไม่พบคำผิดในสคริปต์ของคุณครับ");
                return;
            }
            displayReviewModal(suggestions);
        } catch (e) {
            showMessage("ไม่สามารถอ่านผลลัพธ์จาก AI ได้:\n" + resultJson);
        }
    }
}

function displayReviewModal(suggestions) {
    reviewList.innerHTML = '';
    suggestions.forEach((s, index) => {
        const item = document.createElement('li');
        item.className = 'review-item';
        item.dataset.index = index;
        item.dataset.original = s.original;
        item.dataset.corrected = s.corrected;
        item.dataset.status = 'accepted';
        item.innerHTML = `<div class="review-text"><span class="original">${s.original}</span> → <span class="corrected">${s.corrected}</span><div style="font-size: 0.8em; color: var(--text-secondary);">${s.reason}</div></div><div class="review-actions"><button class="action-btn accept" title="ยอมรับ">✅</button><button class="action-btn reject" title="ปฏิเสธ">❌</button></div>`;
        reviewList.appendChild(item);
    });
    reviewModalOverlay.style.display = 'flex';
}

export function applyAiChanges() {
    let text = output.value;
    const items = reviewList.querySelectorAll('.review-item');
    items.forEach(item => {
        if (item.dataset.status === 'accepted') {
            text = text.replaceAll(item.dataset.original, item.dataset.corrected);
        }
    });
    output.value = text;
    output.dispatchEvent(new Event('input'));
    saveState();
    reviewModalOverlay.style.display = 'none';
    showMessage("นำการเปลี่ยนแปลงไปใช้แล้วครับ!");
}

export async function rephraseWithAI() {
    const selectedText = output.value.substring(output.selectionStart, output.selectionEnd);
    if (!selectedText.trim()) return showMessage("กรุณาลากคลุมข้อความที่ต้องการให้ AI ขยายความก่อนครับ");
    const prompt = `โปรดขยายความหรือเขียนประโยคต่อไปนี้ใหม่ให้น่าตื่นเต้นและดึงดูดใจมากขึ้น โดยคงใจความเดิมไว้:\n\n"${selectedText}"`;
    const result = await callGeminiAPI(prompt);
    if (result) {
        addAiResponseToHistory(`ขยายความ: "${selectedText}"`, result);
    }
}

export async function generateTitleWithAI() {
    const text = output.value;
    if (!text.trim()) return showMessage("กรุณาพิมพ์เนื้อเรื่องก่อนสร้างชื่อตอนครับ");
    const prompt = `จากบทสปอยอนิเมะต่อไปนี้ โปรดช่วยคิดชื่อตอนที่น่าสนใจและดึงดูดผู้ชมมา 5 ชื่อ โดยไม่ต้องใส่คำว่า "ชื่อตอน" หรือ "ตอนที่" นำหน้า และไม่ต้องใช้สัญลักษณ์หัวข้อย่อย:\n\n---\n${text}\n---`;
    const result = await callGeminiAPI(prompt);
    if (result) {
        const formattedResult = `--- 🎬 ชื่อตอนที่ AI แนะนำ ---\n${result}\n---------------------------\n\n`;
        addAiResponseToHistory("คิดชื่อตอน", formattedResult);
    }
}

export async function sendCustomPromptToAI(customPromptInput) {
    const customPromptText = customPromptInput.value.trim();
    const mainContentText = output.value.trim();

    if (!customPromptText) {
        return showMessage("กรุณาพิมพ์คำสั่งสำหรับ AI ก่อนครับ");
    }
    if (!mainContentText) {
        return showMessage("กรุณาพิมพ์เนื้อหาในกล่องข้อความหลักก่อนครับ เพื่อให้ AI มีข้อมูลสำหรับประมวลผล");
    }

    const fullPrompt = `${customPromptText}\n\n--- ข้อความที่เกี่ยวข้อง ---\n${mainContentText}\n---`;
    const result = await callGeminiAPI(fullPrompt);
    if (result) {
        addAiResponseToHistory(customPromptText, result);
        customPromptInput.value = '';
    }
}
