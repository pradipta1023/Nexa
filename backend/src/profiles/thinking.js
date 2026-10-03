export default {
    get model() {
        const isLocal = process.env.AI_PROVIDER === 'local';
        return isLocal ? (process.env.OLLAMA_CHAT_MODEL || 'llama3') : 'gemini-3.6-flash';
    },
    thinking_level: 'high',
    streaming: true
};
