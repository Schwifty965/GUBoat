import { toggleButton, output } from './config.js';
import { saveState } from './history.js';
import { showMessage } from './ui.js';

let recognition;
let isRecording = false;
let beforeSelection = '';
let afterSelection = '';

export function setupSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.lang = 'th-TH';
        recognition.interimResults = true;

        toggleButton.onclick = () => {
            if (isRecording) {
                recognition.stop();
            } else {
                beforeSelection = output.value.substring(0, output.selectionStart);
                afterSelection = output.value.substring(output.selectionEnd);
                if (output.selectionStart === output.selectionEnd && beforeSelection.length > 0 && !beforeSelection.endsWith(' ')) {
                    beforeSelection += ' ';
                }
                recognition.start();
            }
        };

        recognition.onresult = event => {
            let final_transcript = '';
            let interim_transcript = '';
            for (let i = 0; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final_transcript += event.results[i][0].transcript;
                } else {
                    interim_transcript += event.results[i][0].transcript;
                }
            }
            output.value = beforeSelection + final_transcript + interim_transcript + afterSelection;
            output.scrollTop = output.scrollHeight;
        };

        recognition.onstart = () => {
            isRecording = true;
            toggleButton.textContent = '⏹️ หยุดพูด';
            toggleButton.classList.add('recording');
            output.focus();
        };

        recognition.onend = () => {
            isRecording = false;
            toggleButton.textContent = '🎙️ เริ่มพูด';
            toggleButton.classList.remove('recording');
            output.dispatchEvent(new Event('input'));
            saveState(); // บันทึกสถานะหลังจากการพูดสิ้นสุด
        };

        recognition.onerror = event => {
            console.error("Speech recognition error:", event.error);
            isRecording = false;
            toggleButton.textContent = '🎙️ Error';
            showMessage("เกิดข้อผิดพลาดในการรับเสียง: " + event.error);
        };

    } else {
        document.querySelector('.container').innerHTML = '<h2>ขออภัย เบราว์เซอร์ของคุณไม่รองรับฟังก์ชันพิมพ์ด้วยเสียง</h2>';
    }
}
