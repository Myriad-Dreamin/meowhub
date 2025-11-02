import { describe, it, expect } from 'vitest'
import { Memory } from './memory.js';
import { MockLLM } from './llm.js';
import type { RecallMemoryRequest } from './memory.js';

describe('memory', () => {
    // 喵~主人最近眼睛疲劳吗？让我查查记忆看看有没有相关记录喵~ <RecallMemory> { "analysis": "主人最近经常感觉眼睛疲劳，可能和长时间使用电子设备、睡眠不足或环境光线不佳有关。我需要查看健康记录和对话记录来确认是否有类似症状或生活习惯。", "context": [ { "index": "memory/health-record.json", "reason": "查看健康记录，确认主人是否有过眼部疲劳、干眼症或其他视力问题历史。" }, { "index": "memory/conversation.json", "reason": "回忆对话记录，看看主人是否提到过近期用眼习惯、工作压力或睡眠质量等影响因素。" } ] } </RecallMemory>
    const request1 = `喵~主人最近眼睛疲劳吗？让我查查记忆看看有没有相关记录喵~ <Tool> { "tool": "RecallMemory", "analysis": "主人最近经常感觉眼睛疲劳，可能和长时间使用电子设备、睡眠不足或环境光线不佳有关。我需要查看健康记录和对话记录来确认是否有类似症状或生活习惯。", "context": [ { "index": "memory/health-record.json", "reason": "查看健康记录，确认主人是否有过眼部疲劳、干眼症或其他视力问题历史。" }, { "index": "memory/conversation.json", "reason": "回忆对话记录，看看主人是否提到过近期用眼习惯、工作压力或睡眠质量等影响因素。" } ] } </Tool>`;
    const memory = new Memory('./test/memory', new MockLLM());

    it('should extract memory', () => {
        const recallMemoryRequest = memory.extractRequest(request1);
        expect(recallMemoryRequest).toBeDefined();
        if ('error' in recallMemoryRequest) {
            throw new Error(recallMemoryRequest.error);
        }
        const v = recallMemoryRequest.value.value as unknown as RecallMemoryRequest;
        expect(v.analysis).toBe('主人最近经常感觉眼睛疲劳，可能和长时间使用电子设备、睡眠不足或环境光线不佳有关。我需要查看健康记录和对话记录来确认是否有类似症状或生活习惯。');
        expect(v.context).toBeDefined();
        expect(v.context.length).toBe(2);
        expect(v.context[0].index).toBe('memory/health-record.json');
        expect(v.context[0].reason).toBe('查看健康记录，确认主人是否有过眼部疲劳、干眼症或其他视力问题历史。');
        expect(v.context[1].index).toBe('memory/conversation.json');
        expect(v.context[1].reason).toBe('回忆对话记录，看看主人是否提到过近期用眼习惯、工作压力或睡眠质量等影响因素。');
    });

    it('should return error if tool request is not found', () => {
        const recallMemoryRequest = memory.extractRequest('喵~主人最近眼睛疲劳吗？让我查查记忆看看有没有相关记录喵~');
        expect(recallMemoryRequest).toBeDefined();
        if (!('error' in recallMemoryRequest)) {
            throw new Error('should return error if tool request is not found');
        }
    });

    it('should recall memory', async () => {
        const v = memory.extractRequest(request1);
        if ('error' in v) {
            throw new Error(v.error);
        }
        const response = await memory.recallMemory(v.value.value as unknown as RecallMemoryRequest);
        expect(response).toBeDefined();
        if ('error' in response) {
            throw new Error(response.error);
        }
        expect(response.value).toBe('## Index memory/health-record.json\ntest\n## Index memory/conversation.json\ntest');
    });
});
