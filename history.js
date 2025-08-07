import { state, output, undoButton, redoButton } from './config.js';

/**
 * บันทึกสถานะปัจจุบันของ textarea ลงใน history array
 */
export function saveState() {
    // ถ้ามีการ undo มาก่อนหน้า ให้ลบ history ในอนาคตทิ้งไป
    if (state.historyIndex < state.history.length - 1) {
        state.history.splice(state.historyIndex + 1);
    }

    // ไม่บันทึกสถานะซ้ำซ้อนกัน
    if (state.history[state.history.length - 1] === output.value) {
        return;
    }

    state.history.push(output.value);

    // จำกัดขนาดของ history
    if (state.history.length > state.MAX_HISTORY_SIZE) {
        state.history.shift(); // ลบอันที่เก่าที่สุดออก
    }
    
    // อัปเดต index ให้ชี้ไปที่สถานะล่าสุดเสมอ
    state.historyIndex = state.history.length - 1;

    updateUndoRedoButtons();
}

/**
 * โหลดสถานะจาก history มาแสดงใน textarea
 * @param {number} index - ตำแหน่งใน history array ที่จะโหลด
 */
export function loadState(index) {
    if (index >= 0 && index < state.history.length) {
        output.value = state.history[index];
        state.historyIndex = index;
        // การอัปเดตปุ่มจะถูกเรียกจากที่ที่เรียกใช้ฟังก์ชันนี้
    }
}

/**
 * อัปเดตสถานะ (เปิด/ปิด) ของปุ่ม Undo และ Redo
 */
export function updateUndoRedoButtons() {
    undoButton.disabled = state.historyIndex <= 0;
    redoButton.disabled = state.historyIndex >= state.history.length - 1;
}
