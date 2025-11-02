

import { OpenAI } from 'openai';

interface CompletionRequest {
    messages: { role: 'user' | 'assistant' | 'system', content: string, name?: string }[];
    stream?: boolean;
}

export type LLM = EnvLLM | MockLLM;

export class EnvLLM {
    private openai: OpenAI;
    constructor(public name: string) {

        this.openai = new OpenAI({
            apiKey: process.env.DEEPSEEK_API_KEY,
            baseURL: 'https://api.deepseek.com',
        });
    }

    createCompletion(message: CompletionRequest) {
        return this.openai.chat.completions.create({
            model: 'deepseek-reasoner',
            messages: message.messages,
            stream: message.stream,
        });
    }
}

export class MockLLM {
    constructor() {
    }

    createCompletion(message: CompletionRequest) {
        return {
            choices: [
                {
                    message: {
                        content: 'test',
                    },
                },
            ],
        }
    }
}

